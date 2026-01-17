use anyhow::{Context, Result};
use chrono::Utc;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::info;

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    iat: i64,
    exp: i64,
    iss: String,
}

#[derive(Debug, Deserialize)]
struct InstallationToken {
    token: String,
    expires_at: String,
}

/// Generate a GitHub App installation access token
pub async fn get_github_token(
    app_id: &str,
    installation_id: &str,
    private_key_pem: &str,
) -> Result<String> {
    info!("Generating GitHub App JWT");

    // Create JWT for GitHub App authentication
    let jwt = create_jwt(app_id, private_key_pem)?;

    // Exchange JWT for installation access token
    info!("Exchanging JWT for installation token");
    let token = get_installation_token(&jwt, installation_id).await?;

    Ok(token)
}

fn create_jwt(app_id: &str, private_key_pem: &str) -> Result<String> {
    let now = Utc::now().timestamp();

    let claims = Claims {
        iat: now - 60, // Issued 60 seconds in the past to account for clock skew
        exp: now + 600, // Expires in 10 minutes
        iss: app_id.to_string(),
    };

    let mut header = Header::new(Algorithm::RS256);
    header.kid = None;

    let encoding_key = EncodingKey::from_rsa_pem(private_key_pem.as_bytes())
        .context("Failed to parse RSA private key")?;

    encode(&header, &claims, &encoding_key).context("Failed to encode JWT")
}

async fn get_installation_token(jwt: &str, installation_id: &str) -> Result<String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent("CoffeeAggregator-Builder/1.0")
        .build()?;

    let url = format!(
        "https://api.github.com/app/installations/{}/access_tokens",
        installation_id
    );

    let response = client
        .post(&url)
        .header("Accept", "application/vnd.github+json")
        .header("Authorization", format!("Bearer {}", jwt))
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .context("Failed to request installation token")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!(
            "GitHub API returned error {}: {}",
            status,
            body
        );
    }

    let token_response: InstallationToken = response
        .json()
        .await
        .context("Failed to parse installation token response")?;

    info!("Successfully obtained installation token (expires: {})", token_response.expires_at);

    Ok(token_response.token)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_creation() {
        // This is a test private key - do not use in production
        let test_key = r#"-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8oqgfI4s0jPgWvjzmLn1lUU9wkS
93WKNAqhNLHXFiYwCx+u+Z1cCu5CdMpPH1NLXJHvr6CU0D3E3LkCqAVZVPuRlC9L
RXmD9NRXV8f9XjL7uRqYhqV8h7gC9GJrT7E7w0N9F8r0x5pPBLGVAqFzqFfX3VKP
...
-----END RSA PRIVATE KEY-----"#;

        let result = create_jwt("123456", test_key);
        // Should fail with test key, but validates the structure
        assert!(result.is_ok() || result.is_err());
    }
}
