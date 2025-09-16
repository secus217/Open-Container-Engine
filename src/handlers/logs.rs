// src/handlers/logs.rs

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    response::Response,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

use crate::{AppError, AppState};

#[derive(Deserialize)]
pub struct LogsQuery {
    pub tail: Option<i64>,
    pub follow: Option<bool>,
}

#[derive(Serialize)]
pub struct LogsResponse {
    pub logs: String,
}

/// WebSocket endpoint for streaming logs
pub async fn ws_logs_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>, // Changed from Arc<AppState> to AppState
    Path(deployment_id): Path<Uuid>,
    Query(query): Query<LogsQuery>,
) -> Response {
    let state = Arc::new(state);
    ws.on_upgrade(move |socket| handle_socket(socket, state, deployment_id, query))
}

async fn handle_socket(
    socket: WebSocket,
    state: Arc<AppState>,
    deployment_id: Uuid,
    query: LogsQuery,
) {
    let (mut sender, mut receiver) = socket.split();

    // Send initial connection message
    let _ = sender
        .send(Message::Text("Connected to log stream".to_string()))
        .await;

    // Get kubernetes service from app state
    // Note: You need to add k8s_service to your AppState
    match state
        .k8s_service
        .stream_logs(&deployment_id, query.tail)
        .await
    {
        Ok(mut log_stream) => {
            info!("Started log stream for deployment: {}", deployment_id);

            // Spawn task to handle incoming messages (keepalive)
            let keepalive_handle = tokio::spawn(async move {
                while let Some(msg) = receiver.next().await {
                    if let Ok(msg) = msg {
                        if matches!(msg, Message::Close(_)) {
                            break;
                        }
                    }
                }
            });

            // Stream logs to client
            while let Some(result) = log_stream.next().await {
                match result {
                    Ok(bytes) => {
                        let text = String::from_utf8_lossy(&bytes);
                        if let Err(e) = sender.send(Message::Text(text.into_owned())).await {
                            error!("Failed to send log: {}", e);
                            break;
                        }
                    }
                    Err(e) => {
                        error!("Error reading log stream: {}", e);
                        let _ = sender.send(Message::Text(format!("Error: {}", e))).await;
                        break;
                    }
                }
            }

            // Cleanup
            keepalive_handle.abort();
            let _ = sender.send(Message::Close(None)).await;
        }
        Err(e) => {
            error!("Failed to start log stream: {}", e);
            let _ = sender.send(Message::Text(format!("Error: {}", e))).await;
            let _ = sender.send(Message::Close(None)).await;
        }
    }
}
