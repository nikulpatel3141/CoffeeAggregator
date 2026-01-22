mod github_auth;

use anyhow::Result;
use axum::{routing::{get, post}, Router};
use chrono::Utc;
use firestore::FirestoreDb;
use serde::{Deserialize, Serialize};
use std::process::Command;
use tokio::net::TcpListener;
use tracing::info;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Coffee {
    name: String,
    roaster: String,
    origin: Option<String>,
    region: Option<String>,
    tasting_notes: Vec<String>,
    price: Option<String>,
    weight: Option<String>,  // e.g., "250g", "1kg"
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
    // Initialize logging first
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .init();

    info!("🚀 Coffee Builder starting up...");

    let port = std::env::var("PORT").unwrap_or_else(|_| {
        info!("PORT env var not set, defaulting to 8080");
        "8080".to_string()
    });
    let addr = format!("0.0.0.0:{}", port);

    info!("📡 Attempting to bind to {}", addr);

    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => {
            info!("✅ Successfully bound to {}", l.local_addr()?);
            l
        }
        Err(e) => {
            tracing::error!("❌ Failed to bind to {}: {}", addr, e);
            eprintln!("ERROR: Failed to bind to {}: {}", addr, e);
            return Err(e.into());
        }
    };

    info!("🔧 Setting up HTTP router...");
    let app = Router::new()
        .route("/", post(build_handler))
        .route("/health", get(health_handler));

    info!("✅ Builder service ready and listening on {}", listener.local_addr()?);
    info!("🎯 Waiting for POST requests to trigger builds...");
    info!("💚 Health check available at /health");

    if let Err(e) = axum::serve(listener, app).await {
        tracing::error!("❌ Server error: {}", e);
        eprintln!("ERROR: Server error: {}", e);
        return Err(e.into());
    }

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

async fn health_handler() -> &'static str {
    "OK"
}

async fn run_build() -> Result<()> {
    info!("Starting static site build");

    let project_id = std::env::var("GCP_PROJECT_ID")?;
    let website_repo_url = std::env::var("REPO_URL")?; // Website deployment repo
    let target_branch = std::env::var("TARGET_BRANCH").unwrap_or_else(|_| "main".to_string());

    // Generate GitHub App installation token
    info!("Authenticating with GitHub App");
    let github_token = if let (Ok(app_id), Ok(installation_id), Ok(private_key)) = (
        std::env::var("GITHUB_APP_ID"),
        std::env::var("GITHUB_APP_INSTALLATION_ID"),
        std::env::var("GITHUB_APP_PRIVATE_KEY"),
    ) {
        github_auth::get_github_token(&app_id, &installation_id, &private_key).await?
    } else {
        // Fallback to PAT for backward compatibility (will be removed)
        info!("GitHub App credentials not found, falling back to GITHUB_TOKEN");
        std::env::var("GITHUB_TOKEN")?
    };

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

    // Clone main repo to get frontend source
    info!("Cloning main repository for frontend source");
    let source_repo = "github.com/nikulpatel3141/CoffeeAggregator";
    let source_branch = "main"; // Clone from main branch
    clone_source_repo(&github_token, source_repo, source_branch).await?;

    // Clone or update the website deployment repository
    info!("Setting up website deployment repository");
    setup_git_repo(&github_token, &website_repo_url, &target_branch).await?;

    // Copy frontend source from main repo to website repo
    info!("Copying frontend source code");
    copy_frontend_to_website().await?;

    // Export data to JSON files
    info!("Exporting data to JSON");
    export_to_json(&coffees).await?;

    // Commit and push to website repo
    info!("Committing and pushing to GitHub");
    commit_and_push(&target_branch).await?;

    info!("Build completed successfully");
    Ok(())
}

async fn setup_git_repo(github_token: &str, repo_url: &str, target_branch: &str) -> Result<()> {
    let repo_path = "/tmp/coffee-tracker-repo";

    // Check if repo already exists
    if std::path::Path::new(repo_path).exists() {
        info!("Repository exists, pulling latest changes from {}", target_branch);
        std::env::set_current_dir(repo_path)?;

        // Fetch all branches
        let output = Command::new("git")
            .args(&["fetch", "origin"])
            .output()?;

        if !output.status.success() {
            tracing::warn!(
                "Git fetch failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
            // If fetch fails, remove and re-clone
            std::fs::remove_dir_all(repo_path)?;
            clone_repo(github_token, repo_url, repo_path, target_branch).await?;
            return Ok(());
        }

        // Checkout target branch
        let output = Command::new("git")
            .args(&["checkout", target_branch])
            .output()?;

        if !output.status.success() {
            info!("Branch {} doesn't exist locally, creating it", target_branch);
            // Try to create branch from origin if it exists
            Command::new("git")
                .args(&["checkout", "-b", target_branch, &format!("origin/{}", target_branch)])
                .output()
                .or_else(|_| {
                    // If origin branch doesn't exist, create orphan branch
                    info!("Creating new orphan branch {}", target_branch);
                    Command::new("git")
                        .args(&["checkout", "--orphan", target_branch])
                        .output()
                })?;
        }

        // Pull latest changes from target branch
        let output = Command::new("git")
            .env("GIT_TERMINAL_PROMPT", "0")
            .env("GIT_ASKPASS", "echo")
            .args(&["pull", "origin", target_branch])
            .output()?;

        if !output.status.success() {
            tracing::warn!(
                "Git pull failed (might be a new branch): {}",
                String::from_utf8_lossy(&output.stderr)
            );
        }
    } else {
        clone_repo(github_token, repo_url, repo_path, target_branch).await?;
    }

    Ok(())
}

async fn clone_repo(github_token: &str, repo_url: &str, repo_path: &str, target_branch: &str) -> Result<()> {
    info!("Cloning repository (branch: {})", target_branch);

    // Use token for authentication with proper GitHub format
    // GitHub requires: https://x-access-token:TOKEN@github.com/...
    let auth_url = format!("https://x-access-token:{}@{}", github_token, repo_url);

    // Clone with specific branch if it exists, otherwise clone and create branch
    let output = Command::new("git")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "echo")
        .args(&["clone", "--branch", target_branch, &auth_url, repo_path])
        .output()?;

    if !output.status.success() {
        // Branch might not exist, try cloning without branch and create it
        info!("Branch {} not found, cloning default branch and creating it", target_branch);
        let output = Command::new("git")
            .env("GIT_TERMINAL_PROMPT", "0")
            .env("GIT_ASKPASS", "echo")
            .args(&["clone", &auth_url, repo_path])
            .output()?;

        if !output.status.success() {
            anyhow::bail!(
                "Failed to clone repository: {}",
                String::from_utf8_lossy(&output.stderr)
            );
        }

        std::env::set_current_dir(repo_path)?;

        // Create and checkout target branch
        Command::new("git")
            .args(&["checkout", "-b", target_branch])
            .output()?;
    } else {
        std::env::set_current_dir(repo_path)?;
    }

    // Configure git
    Command::new("git")
        .args(&["config", "user.name", "Coffee Aggregator Bot"])
        .output()?;

    Command::new("git")
        .args(&["config", "user.email", "noreply@github.com"])
        .output()?;

    Ok(())
}

async fn clone_source_repo(github_token: &str, repo_url: &str, branch: &str) -> Result<()> {
    let source_path = "/tmp/coffee-source-repo";
    let auth_url = format!("https://x-access-token:{}@{}", github_token, repo_url);

    // Remove if exists
    if std::path::Path::new(source_path).exists() {
        std::fs::remove_dir_all(source_path)?;
    }

    // Clone the main repo with specific branch
    let output = Command::new("git")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "echo")
        .args(&["clone", "--branch", branch, &auth_url, source_path])
        .output()?;

    if !output.status.success() {
        anyhow::bail!(
            "Failed to clone source repository: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    info!("Source repository cloned successfully");
    Ok(())
}

async fn copy_frontend_to_website() -> Result<()> {
    let source = "/tmp/coffee-source-repo/frontend";
    let dest = "/tmp/coffee-tracker-repo/frontend";

    // Remove existing frontend directory if it exists
    if std::path::Path::new(&dest).exists() {
        std::fs::remove_dir_all(&dest)?;
    }

    // Copy entire frontend directory
    copy_dir_all(source, dest)?;

    info!("Frontend source copied to website repo");
    Ok(())
}

fn copy_dir_all(src: impl AsRef<std::path::Path>, dst: impl AsRef<std::path::Path>) -> std::io::Result<()> {
    std::fs::create_dir_all(&dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let dst_path = dst.as_ref().join(entry.file_name());
        if ty.is_dir() {
            // Skip node_modules and .next directories
            if entry.file_name() == "node_modules" || entry.file_name() == ".next" {
                continue;
            }
            copy_dir_all(entry.path(), dst_path)?;
        } else {
            std::fs::copy(entry.path(), dst_path)?;
        }
    }
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

    for (roaster, coffees) in &by_roaster {
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

async fn commit_and_push(target_branch: &str) -> Result<()> {
    // Ensure we're in the website repo directory
    std::env::set_current_dir("/tmp/coffee-tracker-repo")?;

    // Configure git user for commits
    Command::new("git")
        .args(&["config", "user.name", "Coffee Aggregator Bot"])
        .output()?;

    Command::new("git")
        .args(&["config", "user.email", "noreply@github.com"])
        .output()?;

    // Add all frontend changes (entire Next.js app + data)
    let output = Command::new("git")
        .args(&["add", "frontend/"])
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
    let commit_msg = format!("Update frontend and coffee data - {}", Utc::now().format("%Y-%m-%d %H:%M UTC"));
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
    info!("Pushing to branch: {}", target_branch);
    let output = Command::new("git")
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "echo")
        .args(&["push", "-u", "origin", target_branch])
        .output()?;

    if !output.status.success() {
        anyhow::bail!("Failed to push: {}", String::from_utf8_lossy(&output.stderr));
    }

    info!("Successfully pushed changes to GitHub (branch: {})", target_branch);
    Ok(())
}
