use crate::environment;
use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};

#[derive(Debug, Serialize)]
pub struct GotifyMessage {
    pub title: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extras: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct GotifyResponse {
    pub id: i32,
    pub message: String,
    pub title: String,
    pub priority: i32,
    pub date: String,
}

#[derive(Debug, Serialize)]
pub struct CreateApplicationRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct ApplicationResponse {
    pub id: i32,
    pub token: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub internal: bool,
    pub image: String,
}

pub struct GotifyClient {
    base_url: String,
    client: reqwest::Client,
}

impl GotifyClient {
    pub fn new() -> Self {
        let base_url = environment::gotify_url().to_string();

        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    pub async fn send_notification(
        &self,
        token: String,
        title: impl Into<String>,
        message: impl Into<String>,
        priority: Option<i32>,
    ) -> Result<GotifyResponse, String> {
        let url = format!("{}/message", self.base_url);

        let payload = GotifyMessage {
            title: title.into(),
            message: message.into(),
            priority,
            extras: None,
        };

        info!("Sending Gotify notification to: {}", url);

        match self
            .client
            .post(&url)
            .header("X-Gotify-Key", token)
            .json(&payload)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<GotifyResponse>().await {
                        Ok(gotify_response) => {
                            info!(
                                "Gotify notification sent successfully: {:?}",
                                gotify_response
                            );
                            Ok(gotify_response)
                        }
                        Err(e) => {
                            error!("Failed to parse Gotify response: {:?}", e);
                            Err(format!("Failed to parse response: {}", e))
                        }
                    }
                } else {
                    let status = response.status();
                    let body = response
                        .text()
                        .await
                        .unwrap_or_else(|_| "Could not read response body".to_string());
                    error!("Gotify request failed with status {}: {}", status, body);
                    Err(format!("Request failed with status {}: {}", status, body))
                }
            }
            Err(e) => {
                error!("Failed to send Gotify notification: {:?}", e);
                Err(format!("Network error: {}", e))
            }
        }
    }

    pub async fn send_simple_notification(
        &self,
        token: String,
        title: impl Into<String>,
        message: impl Into<String>,
    ) -> Result<GotifyResponse, String> {
        self.send_notification(token, title, message, Some(5)).await
    }

    pub async fn create_application_with_basic_auth(
        &self,
        name: impl Into<String>,
        description: Option<String>,
    ) -> Result<ApplicationResponse, String> {
        let username = match environment::gotify_defaultuser_name() {
            Some(u) => u,
            None => {
                warn!("GOTIFY_DEFAULTUSER_NAME not configured");
                return Err("GOTIFY_DEFAULTUSER_NAME not configured".to_string());
            }
        };

        let password = match environment::gotify_defaultuser_pass() {
            Some(p) => p,
            None => {
                warn!("GOTIFY_DEFAULTUSER_PASS not configured");
                return Err("GOTIFY_DEFAULTUSER_PASS not configured".to_string());
            }
        };

        let url = format!("{}/application", self.base_url);

        let payload = CreateApplicationRequest {
            name: name.into(),
            description,
        };

        info!("Creating Gotify application with basic auth at: {}", url);

        match self
            .client
            .post(&url)
            .basic_auth(username, Some(password))
            .json(&payload)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<ApplicationResponse>().await {
                        Ok(app_response) => {
                            info!(
                                "Gotify application created successfully with basic auth: {:?}",
                                app_response
                            );
                            Ok(app_response)
                        }
                        Err(e) => {
                            error!("Failed to parse Gotify application response: {:?}", e);
                            Err(format!("Failed to parse response: {}", e))
                        }
                    }
                } else {
                    let status = response.status();
                    let body = response
                        .text()
                        .await
                        .unwrap_or_else(|_| "Could not read response body".to_string());
                    error!("Gotify request failed with status {}: {}", status, body);
                    Err(format!("Request failed with status {}: {}", status, body))
                }
            }
            Err(e) => {
                error!("Failed to create Gotify application: {:?}", e);
                Err(format!("Network error: {}", e))
            }
        }
    }

    pub async fn delete_application(&self, app_id: i64) -> Result<(), String> {
        let username = match environment::gotify_defaultuser_name() {
            Some(u) => u,
            None => {
                warn!("GOTIFY_DEFAULTUSER_NAME not configured");
                return Err("GOTIFY_DEFAULTUSER_NAME not configured".to_string());
            }
        };

        let password = match environment::gotify_defaultuser_pass() {
            Some(p) => p,
            None => {
                warn!("GOTIFY_DEFAULTUSER_PASS not configured");
                return Err("GOTIFY_DEFAULTUSER_PASS not configured".to_string());
            }
        };

        let url = format!("{}/application/{}", self.base_url, app_id);

        info!(
            "Deleting Gotify application with ID: {} from: {}",
            app_id, url
        );

        match self
            .client
            .delete(&url)
            .basic_auth(username, Some(password))
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    info!("Gotify application {} deleted successfully", app_id);
                    Ok(())
                } else {
                    let status = response.status();
                    let body = response
                        .text()
                        .await
                        .unwrap_or_else(|_| "Could not read response body".to_string());
                    error!(
                        "Gotify delete request failed with status {}: {}",
                        status, body
                    );
                    Err(format!("Request failed with status {}: {}", status, body))
                }
            }
            Err(e) => {
                error!("Failed to delete Gotify application: {:?}", e);
                Err(format!("Network error: {}", e))
            }
        }
    }
}

impl Default for GotifyClient {
    fn default() -> Self {
        Self::new()
    }
}
