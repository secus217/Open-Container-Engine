use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use std::collections::HashMap;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Deployment {
    pub id: Uuid,
    pub user_id: Uuid,
    pub app_name: String,
    pub image: String,
    pub port: i32,
    pub env_vars: Value, // JSON object
    pub replicas: i32,
    pub resources: Value, // JSON object
    pub health_check: Option<Value>, // JSON object
    pub status: String,
    pub url: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deployed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateDeploymentRequest {
    #[validate(length(min = 1, max = 63))]
    pub app_name: String,
    #[validate(length(min = 1))]
    pub image: String,
    #[validate(range(min = 1, max = 65535))]
    pub port: i32,
    pub env_vars: Option<HashMap<String, String>>,
    #[validate(range(min = 1, max = 100))]
    pub replicas: Option<i32>,
    pub resources: Option<ResourceRequirements>,
    pub health_check: Option<HealthCheck>,
    pub registry_auth: Option<RegistryAuth>,
}

#[derive(Debug, Serialize, Deserialize, Validate, Default)]
pub struct ResourceRequirements {
    pub cpu: Option<String>,
    pub memory: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct HealthCheck {
    #[validate(length(min = 1))]
    pub path: String,
    #[validate(range(min = 0, max = 300))]
    pub initial_delay_seconds: Option<i32>,
    #[validate(range(min = 1, max = 300))]
    pub period_seconds: Option<i32>,
    #[validate(range(min = 1, max = 60))]
    pub timeout_seconds: Option<i32>,
    #[validate(range(min = 1, max = 10))]
    pub failure_threshold: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct RegistryAuth {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct DeploymentResponse {
    pub id: Uuid,
    pub app_name: String,
    pub image: String,
    pub status: String,
    pub url: String,
    pub created_at: DateTime<Utc>,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct DeploymentListItem {
    pub id: Uuid,
    pub app_name: String,
    pub image: String,
    pub status: String,
    pub url: String,
    pub replicas: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct DeploymentListResponse {
    pub deployments: Vec<DeploymentListItem>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub page: u32,
    pub limit: u32,
    pub total: u64,
    pub total_pages: u32,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateDeploymentRequest {
    pub image: Option<String>,
    pub env_vars: Option<HashMap<String, String>>,
    #[validate(range(min = 1, max = 100))]
    pub replicas: Option<i32>,
    pub resources: Option<ResourceRequirements>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ScaleDeploymentRequest {
    #[validate(range(min = 0, max = 100))]
    pub replicas: i32,
}

#[derive(Debug, Deserialize)]
pub struct LogsQuery {
    pub tail: Option<i32>,
    pub follow: Option<bool>,
    pub since: Option<DateTime<Utc>>,
    pub until: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: String,
    pub message: String,
    pub source: String,
}

#[derive(Debug, Serialize)]
pub struct LogsResponse {
    pub logs: Vec<LogEntry>,
}

#[derive(Debug, Deserialize)]
pub struct MetricsQuery {
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub resolution: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MetricPoint {
    pub timestamp: DateTime<Utc>,
    pub value: f64,
}

#[derive(Debug, Serialize)]
pub struct MetricsResponse {
    pub metrics: HashMap<String, Vec<MetricPoint>>,
}

#[derive(Debug, Serialize)]
pub struct DeploymentStatus {
    pub status: String,
    pub health: String,
    pub replicas: ReplicaStatus,
    pub last_health_check: Option<DateTime<Utc>>,
    pub uptime: String,
    pub restart_count: i32,
}

#[derive(Debug, Serialize)]
pub struct ReplicaStatus {
    pub desired: i32,
    pub ready: i32,
    pub available: i32,
}

#[derive(Debug, Deserialize, Validate)]
pub struct AddDomainRequest {
    #[validate(length(min = 1, max = 253))]
    pub domain: String,
}

#[derive(Debug, Serialize)]
pub struct DomainResponse {
    pub id: Uuid,
    pub domain: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub dns_records: Vec<DnsRecord>,
}

#[derive(Debug, Serialize)]
pub struct DnsRecord {
    pub record_type: String,
    pub name: String,
    pub value: String,
}

#[derive(Debug, Serialize)]
pub struct DomainListResponse {
    pub domains: Vec<DomainListItem>,
}

#[derive(Debug, Serialize)]
pub struct DomainListItem {
    pub id: Uuid,
    pub domain: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub verified_at: Option<DateTime<Utc>>,
}