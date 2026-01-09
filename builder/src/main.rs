use anyhow::Result;
use axum::{routing::post, Router};
use chrono::Utc;
use firestore::FirestoreDb;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::process::Command;
use tracing::info;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Coffee {
    name: String,
    roaster: String,
    origin: Option<String>,
    region: Option<String>,
    tasting_notes: Vec<String>,
    price: Option<String>,
    url: String,
    in_stock: bool,
    scraped_at: String,
}

#[derive(Serialize)]
struct BuildMetadata {
    built_at: String,
    total_coffees: usize,
    roasters: Vec<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let app = Router::new().route("/", post(build_handler));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("Starting builder service on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}

async fn build_handler() -> &'static str {
    match run_build().await {
        Ok(_) => {
            info!("Build completed successfully");
            "OK"
        }
        Err(e) => {
            tracing::error!("Build failed: {}", e);
            "ERROR"
        }
    }
}

async fn run_build() -> Result<()> {
    info!("Starting static site build");

    let project_id = std::env::var("GCP_PROJECT_ID")?;
    let github_token = std::env::var("GITHUB_TOKEN")?;
    let repo_url = std::env::var("REPO_URL")?; // e.g., "github.com/user/repo"

    let db = FirestoreDb::new(&project_id).await?;

    // Fetch all coffees from Firestore
    info!("Fetching coffees from Firestore");
    let coffees: Vec<Coffee> = db
        .fluent()
        .select()
        .from("coffees")
        .obj()
        .query()
        .await?;

    info!("Found {} coffees", coffees.len());

    // Clone or update the repository
    info!("Setting up Git repository");
    setup_git_repo(&github_token, &repo_url).await?;

    // Export data to JSON files
    info!("Exporting data to JSON");
    export_to_json(&coffees).await?;

    // Commit and push to GitHub
    info!("Committing and pushing to GitHub");
    commit_and_push().await?;

    info!("Build completed successfully");
    Ok(())
}

async fn setup_git_repo(github_token: &str, repo_url: &str) -> Result<()> {
    let repo_path = "/tmp/coffee-tracker-repo";

    // Check if repo already exists
    if std::path::Path::new(repo_path).exists() {
        info!("Repository exists, pulling latest changes");
        std::env::set_current_dir(repo_path)?;

        // Pull latest changes
        let output = Command::new("git")
            .args(&["pull", "origin", "main"])
            .output()?;

        if !output.status.success() {
            tracing::warn!(
                "Git pull failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
            // If pull fails, remove and re-clone
            std::fs::remove_dir_all(repo_path)?;
            clone_repo(github_token, repo_url, repo_path).await?;
        }
    } else {
        clone_repo(github_token, repo_url, repo_path).await?;
    }

    Ok(())
}

async fn clone_repo(github_token: &str, repo_url: &str, repo_path: &str) -> Result<()> {
    info!("Cloning repository");

    // Use token for authentication
    let auth_url = format!("https://{}@{}", github_token, repo_url);

    let output = Command::new("git")
        .args(&["clone", &auth_url, repo_path])
        .output()?;

    if !output.status.success() {
        anyhow::bail!(
            "Failed to clone repository: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    std::env::set_current_dir(repo_path)?;

    // Configure git
    Command::new("git")
        .args(&["config", "user.name", "Coffee Scraper Bot"])
        .output()?;

    Command::new("git")
        .args(&["config", "user.email", "bot@coffeetracker.com"])
        .output()?;

    Ok(())
}

async fn export_to_json(coffees: &[Coffee]) -> Result<()> {
    let data_dir = "/tmp/coffee-tracker-repo/frontend/public/data";
    std::fs::create_dir_all(data_dir)?;

    // Export all coffees
    let coffees_json = serde_json::to_string_pretty(coffees)?;
    std::fs::write(format!("{}/coffees.json", data_dir), coffees_json)?;

    // Group by roaster
    let mut by_roaster = std::collections::HashMap::new();
    for coffee in coffees {
        by_roaster
            .entry(coffee.roaster.clone())
            .or_insert_with(Vec::new)
            .push(coffee);
    }

    for (roaster, coffees) in by_roaster {
        let filename = roaster.to_lowercase().replace(" ", "-");
        let json = serde_json::to_string_pretty(&coffees)?;
        std::fs::write(format!("{}/{}.json", data_dir, filename), json)?;
    }

    // Export metadata
    let roasters: Vec<String> = by_roaster.keys().cloned().collect();
    let metadata = BuildMetadata {
        built_at: Utc::now().to_rfc3339(),
        total_coffees: coffees.len(),
        roasters,
    };
    let metadata_json = serde_json::to_string_pretty(&metadata)?;
    std::fs::write(format!("{}/metadata.json", data_dir), metadata_json)?;

    info!("Exported data to JSON files");
    Ok(())
}

async fn commit_and_push() -> Result<()> {
    // Add changes
    let output = Command::new("git")
        .args(&["add", "frontend/public/data/"])
        .output()?;

    if !output.status.success() {
        tracing::warn!("Git add warning: {}", String::from_utf8_lossy(&output.stderr));
    }

    // Check if there are changes to commit
    let status_output = Command::new("git")
        .args(&["status", "--porcelain"])
        .output()?;

    if status_output.stdout.is_empty() {
        info!("No changes to commit");
        return Ok(());
    }

    // Commit changes
    let commit_msg = format!("Update coffee data - {}", Utc::now().format("%Y-%m-%d %H:%M UTC"));
    let output = Command::new("git")
        .args(&["commit", "-m", &commit_msg])
        .output()?;

    if !output.status.success() {
        anyhow::bail!(
            "Failed to commit: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    // Push to GitHub
    let output = Command::new("git")
        .args(&["push", "origin", "main"])
        .output()?;

    if !output.status.success() {
        anyhow::bail!("Failed to push: {}", String::from_utf8_lossy(&output.stderr));
    }

    info!("Successfully pushed changes to GitHub");
    Ok(())
}
