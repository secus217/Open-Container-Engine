use axum::{
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde_json::{json, Value};
use std::net::SocketAddr;
use tower::ServiceBuilder;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod config;
mod database;
mod deployment;
mod error;
mod handlers;
mod user;

use config::Config;
use database::Database;
use error::AppError;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub redis: redis::Client,
    pub config: Config,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "container_engine=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::new()?;
    tracing::info!("Starting Container Engine API server");

    // Initialize database
    let db = Database::new(&config.database_url).await?;
    
    // Run migrations
    db.migrate().await?;
    tracing::info!("Database migrations completed");

    // Initialize Redis
    let redis_client = redis::Client::open(config.redis_url.clone())?;
    
    // Test Redis connection
    let mut redis_conn = redis_client.get_multiplexed_async_connection().await?;
    redis::cmd("PING").query_async::<_, String>(&mut redis_conn).await?;
    tracing::info!("Redis connection established");

    // Create app state
    let state = AppState {
        db,
        redis: redis_client,
        config: config.clone(),
    };

    // Build our application with routes
    let app = create_app(state);

    // Run the server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn create_app(state: AppState) -> Router {
    Router::new()
        // Health check endpoint
        .route("/health", get(health_check))
        
        // Authentication routes
        .route("/v1/auth/register", post(handlers::auth::register))
        .route("/v1/auth/login", post(handlers::auth::login))
        .route("/v1/auth/refresh", post(handlers::auth::refresh_token))
        .route("/v1/auth/logout", post(handlers::auth::logout))
        
        // API Key management
        .route("/v1/api-keys", get(handlers::auth::list_api_keys))
        .route("/v1/api-keys", post(handlers::auth::create_api_key))
        .route("/v1/api-keys/:key_id", axum::routing::delete(handlers::auth::revoke_api_key))
        
        // User profile management
        .route("/v1/user/profile", get(handlers::user::get_profile))
        .route("/v1/user/profile", axum::routing::put(handlers::user::update_profile))
        .route("/v1/user/password", axum::routing::put(handlers::user::change_password))
        
        // Deployment management
        .route("/v1/deployments", get(handlers::deployment::list_deployments))
        .route("/v1/deployments", post(handlers::deployment::create_deployment))
        .route("/v1/deployments/:deployment_id", get(handlers::deployment::get_deployment))
        .route("/v1/deployments/:deployment_id", axum::routing::put(handlers::deployment::update_deployment))
        .route("/v1/deployments/:deployment_id", axum::routing::delete(handlers::deployment::delete_deployment))
        .route("/v1/deployments/:deployment_id/scale", axum::routing::patch(handlers::deployment::scale_deployment))
        .route("/v1/deployments/:deployment_id/start", post(handlers::deployment::start_deployment))
        .route("/v1/deployments/:deployment_id/stop", post(handlers::deployment::stop_deployment))
        .route("/v1/deployments/:deployment_id/logs", get(handlers::deployment::get_logs))
        .route("/v1/deployments/:deployment_id/metrics", get(handlers::deployment::get_metrics))
        .route("/v1/deployments/:deployment_id/status", get(handlers::deployment::get_status))
        
        // Domain management
        .route("/v1/deployments/:deployment_id/domains", get(handlers::deployment::list_domains))
        .route("/v1/deployments/:deployment_id/domains", post(handlers::deployment::add_domain))
        .route("/v1/deployments/:deployment_id/domains/:domain_id", axum::routing::delete(handlers::deployment::remove_domain))
        
        // Add middleware
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive())
        )
        .with_state(state)
}

async fn health_check() -> Result<Json<Value>, AppError> {
    Ok(Json(json!({
        "status": "healthy",
        "service": "container-engine",
        "version": env!("CARGO_PKG_VERSION")
    })))
}