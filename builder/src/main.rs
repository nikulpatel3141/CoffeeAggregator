use anyhow::Result;
use chrono::Utc;
use coffee_common::Coffee;
use firestore::FirestoreDb;
use serde::Serialize;
use std::process::Command;
use tracing::info;

#[derive(Serialize)]
struct BuildMetadata {
    built_at: String,
    total_coffees: usize,
    roasters: Vec<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .init();

    info!("🚀 Coffee Builder starting...");

    // Run the builder
    run_build().await?;

    info!("✅ Build completed successfully");

    Ok(())
}

async fn run_build() -> Result<()> {
    info!("Starting static site build");

    let project_id = std::env::var("GCP_PROJECT_ID")?;
    let website_repo_url = std::env::var("REPO_URL")?;
    let target_branch = std::env::var("TARGET_BRANCH").unwrap_or_else(|_| "main".to_string());
    let github_token = std::env::var("GITHUB_TOKEN")?;

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

    // Clone or update the website deployment repository
    info!("Setting up website deployment repository");
    setup_git_repo(&github_token, &website_repo_url, &target_branch).await?;

    // Copy frontend source from the workspace (already checked out by GitHub Actions)
    // This ensures we use the exact same code that triggered the pipeline
    info!("Copying frontend source code from workspace");
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
        .args(&["config", "user.email", "nikulpatel3141@users.noreply.github.com"])
        .output()?;

    Ok(())
}

async fn copy_frontend_to_website() -> Result<()> {
    // Try multiple possible locations for the frontend directory
    // 1. GITHUB_WORKSPACE env var (set by GitHub Actions)
    // 2. Relative path from builder directory (../frontend)
    // 3. Current directory's frontend subdirectory

    let possible_paths = vec![
        std::env::var("GITHUB_WORKSPACE")
            .map(|ws| format!("{}/frontend", ws))
            .unwrap_or_default(),
        "../frontend".to_string(),
        "./frontend".to_string(),
        "frontend".to_string(),
    ];

    let source = possible_paths
        .iter()
        .find(|p| !p.is_empty() && std::path::Path::new(p).exists())
        .ok_or_else(|| anyhow::anyhow!(
            "Frontend source directory not found. Tried: {:?}. GITHUB_WORKSPACE={:?}",
            possible_paths,
            std::env::var("GITHUB_WORKSPACE")
        ))?;

    let dest = "/tmp/coffee-tracker-repo";

    info!("Copying frontend from {} to {}", source, dest);

    // Copy frontend contents directly to root of website repo (not in a subdirectory)
    // This means package.json, app/, components/, etc. go to the root
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let file_name = entry.file_name();
        
        // Skip node_modules and build artifacts
        if file_name == "node_modules" || file_name == ".next" || file_name == ".git" {
            continue;
        }

        let source_path = entry.path();
        let dest_path = std::path::Path::new(&dest).join(&file_name);
        
        // Remove existing file/directory if it exists
        if dest_path.exists() {
            if dest_path.is_dir() {
                std::fs::remove_dir_all(&dest_path)?;
            } else {
                std::fs::remove_file(&dest_path)?;
            }
        }

        // Copy file or directory
        if source_path.is_dir() {
            copy_dir_all(&source_path, &dest_path)?;
        } else {
            std::fs::copy(&source_path, &dest_path)?;
        }
    }

    info!("Frontend contents copied to website repo root");
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
    // Export to public/data in the root of the website repo
    let data_dir = "/tmp/coffee-tracker-repo/public/data";
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
        .args(&["config", "user.email", "nikulpatel3141@users.noreply.github.com"])
        .output()?;

    // Add all changes (since frontend contents are now at root)
    let output = Command::new("git")
        .args(&["add", "."])
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
    let commit_msg = format!("Update coffee data and frontend - {}", Utc::now().format("%Y-%m-%d %H:%M UTC"));
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
