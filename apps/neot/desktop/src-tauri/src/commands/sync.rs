use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiSyncResult {
    accepted: usize,
    cursor: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    accepted: usize,
    cursor: Option<String>,
}

#[tauri::command]
pub async fn sync_neot(
    api_url: String,
    access_token: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<SyncResult> {
    if !api_url.starts_with("https://") && !api_url.starts_with("http://127.0.0.1") {
        return Err(DesktopError::Policy(
            "NEOT sync requires HTTPS or local development.".into(),
        ));
    }
    let pending = state.with_database(|database| database.pending_sync_count())?;
    let response = reqwest::Client::new()
        .post(format!(
            "{}/api/neot/sync/desktop/v1/batch",
            api_url.trim_end_matches('/')
        ))
        .bearer_auth(access_token)
        .json(&serde_json::json!({ "pendingCount": pending, "records": [] }))
        .send()
        .await?
        .error_for_status()?
        .json::<ApiSyncResult>()
        .await?;
    Ok(SyncResult {
        accepted: response.accepted,
        cursor: response.cursor,
    })
}
