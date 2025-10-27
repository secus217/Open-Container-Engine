use axum::{
    extract::{Path, Query, State},
    response::Json,
};
use chrono::Utc;
use serde_json::{json, Value};
use std::collections::HashMap;
use tracing::{error, info, warn};
use uuid::Uuid;
use validator::Validate;
use crate::jobs::deployment_job::DeploymentJob;
use crate::services::domain_validator::DomainValidator;
// SSL certificate management is now simplified

use crate::{
    auth::AuthUser, 
    deployment::models::*, 
    error::AppError, 
    handlers::auth::PaginationQuery, 
    notifications::NotificationType,
    services::kubernetes::KubernetesService, 
    AppState, 
};

pub async fn create_deployment(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateDeploymentRequest>,
) -> Result<Json<DeploymentResponse>, AppError> {
    payload.validate()?;

    // Check if app name already exists for this user
    let _existing = sqlx::query!(
        "SELECT id FROM deployments WHERE user_id = $1 AND app_name = $2",
        user.user_id,
        payload.app_name
    )
    .fetch_optional(&state.db.pool)
    .await?;

    if _existing.is_some() {
        return Err(AppError::conflict("App name"));
    }

    let deployment_id = Uuid::new_v4();
    let now = Utc::now();
    let _url = format!(
        "https://{}.{}",
        payload.app_name, state.config.domain_suffix
    );

    // Convert optional fields to JSON
    let env_vars_value = payload.env_vars.unwrap_or_default();
    let env_vars_json = serde_json::to_value(&env_vars_value)?;
    let resources = Some(serde_json::to_value(payload.resources.unwrap_or_default())?);
    let health_check = payload
        .health_check
        .map(|hc| serde_json::to_value(hc))
        .transpose()?;
    sqlx::query!(
        r#"
            INSERT INTO deployments (
                id, user_id, app_name, image, port, env_vars, replicas,
                resources, health_check, status, url, created_at, updated_at,
                deployed_at, error_message
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            "#,
        deployment_id,
        user.user_id,
        payload.app_name,
        payload.image,
        payload.port,
        env_vars_json,
        payload.replicas.unwrap_or(1),
        resources,
        health_check,
        "pending",
        "".to_string(), // url will be set after deployment
        now,
        now,
        Option::<chrono::DateTime<chrono::Utc>>::None, // deployed_at - null initially
        None::<String>                                 // error_message
    )
    .execute(&state.db.pool)
    .await?;
    

    // TODO: Implement Kubernetes deployment logic here
    let job = DeploymentJob::new(
        deployment_id,
        user.user_id,
        payload.app_name.clone(),
        payload.image.clone(),
        payload.port,
        Some(env_vars_value), // Pass the actual HashMap instead of Option
        payload.replicas,
        resources,
        health_check,
    );
    if let Err(_) = state.deployment_sender.send(job).await {
        // Rollback the database record
        let _ = sqlx::query!("DELETE FROM deployments WHERE id = $1", deployment_id)
            .execute(&state.db.pool)
            .await;

        return Err(AppError::internal("Failed to queue deployment"));
    }

    // Send notification about deployment creation
    state.notification_manager
        .send_to_user(
            user.user_id,
            NotificationType::DeploymentCreated {
                deployment_id,
                app_name: payload.app_name.clone(),
            },
        )
        .await;

    // For now, we'll just return the response

    Ok(Json(DeploymentResponse {    
        id: deployment_id,
        app_name: payload.app_name,
        image: payload.image,
        status: "pending".to_string(),
        url: None,
        created_at: now,
        message: "Deployment is being processed".to_string(),
    }))
}

pub async fn list_deployments(
    State(state): State<AppState>,
    user: AuthUser,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Json<DeploymentListResponse>, AppError> {
    let limit = pagination.limit.min(100) as i64;

    let offset = ((pagination.page - 1) * pagination.limit) as i64;

    let deployments = sqlx::query_as!(
        DeploymentListItem,
        r#"
        SELECT id, app_name, image, status, url, replicas, created_at, updated_at
        FROM deployments 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        user.user_id,
        limit,
        offset
    )
    .fetch_all(&state.db.pool)
    .await?;

    let total = sqlx::query!(
        "SELECT COUNT(*) as count FROM deployments WHERE user_id = $1",
        user.user_id
    )
    .fetch_one(&state.db.pool)
    .await?
    .count
    .unwrap_or(0) as u64;

    let total_pages = ((total as f64) / (pagination.limit as f64)).ceil() as u32;

    Ok(Json(DeploymentListResponse {
        deployments,
        pagination: PaginationInfo {
            page: pagination.page,
            limit: pagination.limit,
            total,
            total_pages,
        },
    }))
}

pub async fn get_deployment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
) -> Result<Json<Deployment>, AppError> {
    let deployment = sqlx::query_as!(
        Deployment,
        "SELECT * FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    Ok(Json(deployment))
}

pub async fn update_deployment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
    Json(payload): Json<UpdateDeploymentRequest>,
) -> Result<Json<Value>, AppError> {
    payload.validate()?;

    // Check if deployment exists and belongs to user
    let _existing = sqlx::query!(
        "SELECT id FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Update deployment
    let env_vars = payload
        .env_vars
        .map(|ev| serde_json::to_value(ev))
        .transpose()?;
    let resources = payload
        .resources
        .map(|r| serde_json::to_value(r))
        .transpose()?;

    sqlx::query!(
        r#"
        UPDATE deployments 
        SET image = COALESCE($1, image),
            env_vars = COALESCE($2, env_vars),
            replicas = COALESCE($3, replicas),
            resources = COALESCE($4, resources),
            status = 'updating',
            updated_at = NOW()
        WHERE id = $5
        "#,
        payload.image,
        env_vars,
        payload.replicas,
        resources,
        deployment_id
    )
    .execute(&state.db.pool)
    .await?;

    // TODO: Implement Kubernetes update logic here

    Ok(Json(json!({
        "id": deployment_id,
        "status": "updating",
        "message": "Deployment update in progress",
        "updated_at": Utc::now()
    })))
}

#[utoipa::path(
    patch,
    path = "/v1/deployments/{deployment_id}/env",
    params(
        ("deployment_id" = Uuid, Path, description = "Deployment ID")
    ),
    request_body = UpdateEnvVarsRequest,
    responses(
        (status = 200, description = "Environment variables updated successfully"),
        (status = 404, description = "Deployment not found"),
        (status = 401, description = "Unauthorized"),
    ),
    tag = "Deployments"
)]
pub async fn update_env_vars(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
    Json(payload): Json<UpdateEnvVarsRequest>,
) -> Result<Json<Value>, AppError> {
    payload.validate()?;

    // Check if deployment exists and belongs to user
    let deployment = sqlx::query!(
        "SELECT id, app_name, env_vars FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Get existing env vars
    let mut existing_env_vars: HashMap<String, String> = 
        serde_json::from_value(deployment.env_vars).unwrap_or_default();

    // Merge with new env vars (new values overwrite existing ones)
    for (key, value) in payload.env_vars.iter() {
        existing_env_vars.insert(key.clone(), value.clone());
    }

    // Convert back to JSON
    let updated_env_vars_json = serde_json::to_value(&existing_env_vars)?;

    // Update deployment in database
    sqlx::query!(
        r#"
        UPDATE deployments 
        SET env_vars = $1,
            status = 'updating',
            updated_at = NOW()
        WHERE id = $2
        "#,
        updated_env_vars_json,
        deployment_id
    )
    .execute(&state.db.pool)
    .await?;

    let app_name = deployment.app_name.clone();

    // Create deployment job to apply env var changes
    let job = DeploymentJob::new_env_update(
        deployment_id,
        user.user_id,
        app_name.clone(),
        Some(existing_env_vars.clone()),
    );

    // Send job to worker queue
    if let Err(_) = state.deployment_sender.send(job).await {
        // Rollback status on queue failure
        let _ = sqlx::query!(
            "UPDATE deployments SET status = 'failed', error_message = 'Failed to queue env vars update' WHERE id = $1",
            deployment_id
        )
        .execute(&state.db.pool)
        .await;

        return Err(AppError::internal("Failed to queue env vars update"));
    }

    // Send notification about env vars update
    state.notification_manager
        .send_to_user(
            user.user_id,
            NotificationType::DeploymentUpdated {
                deployment_id,
                app_name: app_name.clone(),
                changes: "Environment variables updated".to_string(),
            },
        )
        .await;

    Ok(Json(json!({
        "id": deployment_id,
        "status": "updating",
        "message": "Environment variables update in progress",
        "updated_env_vars": existing_env_vars,
        "updated_at": Utc::now()
    })))
}

#[utoipa::path(
    get,
    path = "/v1/deployments/{deployment_id}/env",
    params(
        ("deployment_id" = Uuid, Path, description = "Deployment ID")
    ),
    responses(
        (status = 200, description = "Environment variables retrieved successfully", body = EnvVarsResponse),
        (status = 404, description = "Deployment not found"),
        (status = 401, description = "Unauthorized"),
    ),
    tag = "Deployments"
)]
pub async fn get_env_vars(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
) -> Result<Json<EnvVarsResponse>, AppError> {
    // Check if deployment exists and belongs to user
    let deployment = sqlx::query!(
        "SELECT id, app_name, env_vars, updated_at FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Parse env vars from JSON
    let env_vars: HashMap<String, String> = 
        serde_json::from_value(deployment.env_vars).unwrap_or_default();

    Ok(Json(EnvVarsResponse {
        deployment_id,
        app_name: deployment.app_name,
        env_vars,
        updated_at: deployment.updated_at,
    }))
}

pub async fn scale_deployment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
    Json(payload): Json<ScaleDeploymentRequest>,
) -> Result<Json<Value>, AppError> {
    payload.validate()?;

    // Get deployment info for creating the job
    let deployment = sqlx::query!(
        "SELECT app_name FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Update status to "scaling" in database first
    sqlx::query!(
        "UPDATE deployments SET status = 'scaling', updated_at = NOW() WHERE id = $1",
        deployment_id
    )
    .execute(&state.db.pool)
    .await?;

    // Create scale job
    let job = DeploymentJob::new_scale(
        deployment_id,
        user.user_id,
        payload.replicas,
        deployment.app_name,
    );

    // Send job to worker queue
    if let Err(_) = state.deployment_sender.send(job).await {
        // Rollback status on queue failure
        let _ = sqlx::query!(
            "UPDATE deployments SET status = 'failed', error_message = 'Failed to queue scale operation' WHERE id = $1",
            deployment_id
        )
        .execute(&state.db.pool)
        .await;

        return Err(AppError::internal("Failed to queue scale operation"));
    }

    Ok(Json(json!({
        "id": deployment_id,
        "status": "scaling",
        "message": "Scale operation queued",
        "target_replicas": payload.replicas
    })))
}

pub async fn start_deployment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    // Check if deployment exists and belongs to user
    let deployment = sqlx::query!(
        "SELECT app_name FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Update status to "starting"
    sqlx::query!(
        "UPDATE deployments SET status = 'starting', updated_at = NOW() WHERE id = $1",
        deployment_id
    )
    .execute(&state.db.pool)
    .await?;

    // Create start job
    let job = DeploymentJob::new_start(
        deployment_id,
        user.user_id,
        deployment.app_name,
    );

    // Send job to worker queue
    if let Err(_) = state.deployment_sender.send(job).await {
        // Rollback status on queue failure
        let _ = sqlx::query!(
            "UPDATE deployments SET status = 'failed', error_message = 'Failed to queue start operation' WHERE id = $1",
            deployment_id
        )
        .execute(&state.db.pool)
        .await;

        return Err(AppError::internal("Failed to queue start operation"));
    }

    Ok(Json(json!({
        "id": deployment_id,
        "status": "starting",
        "message": "Start operation queued"
    })))
}


pub async fn stop_deployment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    // Check if deployment exists and belongs to user
    let deployment = sqlx::query!(
        "SELECT app_name FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Update status to "stopping"
    sqlx::query!(
        "UPDATE deployments SET status = 'stopping', updated_at = NOW() WHERE id = $1",
        deployment_id
    )
    .execute(&state.db.pool)
    .await?;

    // Create stop job
    let job = DeploymentJob::new_stop(
        deployment_id,
        user.user_id,
        deployment.app_name,
    );

    // Send job to worker queue
    if let Err(_) = state.deployment_sender.send(job).await {
        // Rollback status on queue failure
        let _ = sqlx::query!(
            "UPDATE deployments SET status = 'failed', error_message = 'Failed to queue stop operation' WHERE id = $1",
            deployment_id
        )
        .execute(&state.db.pool)
        .await;

        return Err(AppError::internal("Failed to queue stop operation"));
    }

    Ok(Json(json!({
        "id": deployment_id,
        "status": "stopping",
        "message": "Stop operation queued"
    })))
}

#[utoipa::path(
    post,
    path = "/v1/deployments/{deployment_id}/restart",
    params(
        ("deployment_id" = Uuid, Path, description = "Deployment ID")
    ),
    responses(
        (status = 200, description = "Restart operation queued successfully"),
        (status = 404, description = "Deployment not found"),
        (status = 401, description = "Unauthorized"),
    ),
    tag = "Deployments"
)]
pub async fn restart_deployment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    // Check if deployment exists and belongs to user
    let deployment = sqlx::query!(
        "SELECT app_name FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Update status to "restarting"
    sqlx::query!(
        "UPDATE deployments SET status = 'restarting', updated_at = NOW() WHERE id = $1",
        deployment_id
    )
    .execute(&state.db.pool)
    .await?;

    // Create restart job
    let job = DeploymentJob::new_restart(
        deployment_id,
        user.user_id,
        deployment.app_name,
    );

    // Send job to worker queue
    if let Err(_) = state.deployment_sender.send(job).await {
        // Rollback status on queue failure
        let _ = sqlx::query!(
            "UPDATE deployments SET status = 'failed', error_message = 'Failed to queue restart operation' WHERE id = $1",
            deployment_id
        )
        .execute(&state.db.pool)
        .await;

        return Err(AppError::internal("Failed to queue restart operation"));
    }

    Ok(Json(json!({
        "id": deployment_id,
        "status": "restarting",
        "message": "Restart operation queued"
    })))
}

pub async fn delete_deployment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    // First, check if deployment exists and belongs to user
    let deployment = sqlx::query!(
        "SELECT id, app_name, status FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    info!("Deleting deployment: {} ({})", deployment_id, deployment.app_name);

    // Update status to "deleting" first
    sqlx::query!(
        "UPDATE deployments SET status = 'deleting', updated_at = NOW() WHERE id = $1",
        deployment_id
    )
    .execute(&state.db.pool)
    .await?;

    // Create Kubernetes service for this specific deployment's namespace
    let k8s_service = match KubernetesService::for_deployment(&deployment_id, &user.user_id).await {
        Ok(service) => service,
        Err(e) => {
            error!("Failed to create K8s service for deployment {} (user {}): {}", 
                   deployment_id, user.user_id, e);
            // Still try to delete from database even if K8s cleanup fails
            let _result = sqlx::query!(
                "DELETE FROM deployments WHERE id = $1 AND user_id = $2",
                deployment_id,
                user.user_id
            )
            .execute(&state.db.pool)
            .await?;

            return Ok(Json(json!({
                "message": "Deployment deleted from database, but Kubernetes cleanup may have failed",
                "warning": format!("Failed to connect to Kubernetes: {}", e),
                "deployment_id": deployment_id,
                "app_name": deployment.app_name
            })));
        }
    };

    // Delete from Kubernetes (this will delete the entire namespace and all resources)
    match k8s_service.delete_deployment(&deployment_id).await {
        Ok(_) => {
            info!("Successfully deleted Kubernetes namespace and all resources for deployment: {}", deployment_id);
        }
        Err(e) => {
            warn!("Failed to delete Kubernetes resources for deployment {}: {}", deployment_id, e);
            // Continue with database deletion even if K8s deletion fails
            // But add the error to response
        }
    }

    // Delete from database
    let result = sqlx::query!(
        "DELETE FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .execute(&state.db.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::not_found("Deployment"));
    }

    info!("Successfully deleted deployment: {} from database", deployment_id);

    Ok(Json(json!({
        "message": "Deployment deleted successfully",
        "deployment_id": deployment_id,
        "app_name": deployment.app_name,
        "namespace_deleted": true
    })))
}



pub async fn get_metrics(
    _state: State<AppState>,
    _user: AuthUser,
    _deployment_id: Path<Uuid>,
    _query: Query<MetricsQuery>,
) -> Result<Json<MetricsResponse>, AppError> {
    // TODO: Implement metrics retrieval
    Ok(Json(MetricsResponse {
        metrics: HashMap::new(),
    }))
}

pub async fn get_status(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
) -> Result<Json<DeploymentStatus>, AppError> {
    let deployment = sqlx::query!(
        "SELECT status, replicas FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // TODO: Get real status from Kubernetes
    Ok(Json(DeploymentStatus {
        status: deployment.status,
        health: "healthy".to_string(),
        replicas: ReplicaStatus {
            desired: deployment.replicas,
            ready: deployment.replicas,
            available: deployment.replicas,
        },
        last_health_check: Some(Utc::now()),
        uptime: "0s".to_string(),
        restart_count: 0,
    }))
}

// Domain management
pub async fn list_domains(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
) -> Result<Json<DomainListResponse>, AppError> {
    // Check if deployment exists and belongs to user
    let _deployment = sqlx::query!(
        "SELECT id FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Get domains for this deployment
    let domains = sqlx::query_as!(
        DomainListItem,
        r#"
        SELECT id, domain, status, created_at, verified_at
        FROM domains 
        WHERE deployment_id = $1
        ORDER BY created_at DESC
        "#,
        deployment_id
    )
    .fetch_all(&state.db.pool)
    .await?;

    Ok(Json(DomainListResponse { domains }))
}

pub async fn add_domain(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
    Json(payload): Json<AddDomainRequest>,
) -> Result<Json<DomainResponse>, AppError> {
    payload.validate()?;

    // Check if deployment exists and belongs to user
    let deployment = sqlx::query!(
        "SELECT id, app_name FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Check if domain already exists
    let existing_domain = sqlx::query!(
        "SELECT id FROM domains WHERE domain = $1",
        payload.domain
    )
    .fetch_optional(&state.db.pool)
    .await?;

    if existing_domain.is_some() {
        return Err(AppError::conflict("Domain already exists"));
    }

    // Initialize domain validator to check format
    let domain_validator = DomainValidator::new()?;
    domain_validator.validate_domain_format(&payload.domain)?;

    // Get node IP for DNS configuration
    let k8s_service = KubernetesService::for_deployment(&deployment_id, &user.user_id).await?;
    let node_ip = match k8s_service.get_node_ip().await {
        Ok(ip) => ip,
        Err(_) => {
            // Fallback to ingress endpoint if node IP not available
            k8s_service.get_ingress_endpoint().await.unwrap_or_else(|_| "127.0.0.1".to_string())
        }
    };

    // Create simple DNS records that user needs to create
    let dns_records = vec![
        crate::deployment::models::DnsRecord {
            record_type: "A".to_string(),
            name: payload.domain.clone(),
            value: node_ip.clone(),
            ttl: 300,
        },
        crate::deployment::models::DnsRecord {
            record_type: "CNAME".to_string(),
            name: format!("www.{}", payload.domain),
            value: payload.domain.clone(),
            ttl: 300,
        },
    ];

    // Insert domain into database
    let domain_id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query!(
        r#"
        INSERT INTO domains (id, deployment_id, domain, status, created_at)
        VALUES ($1, $2, $3, 'configured', $4)
        "#,
        domain_id,
        deployment_id,
        payload.domain,
        now
    )
    .execute(&state.db.pool)
    .await?;

    // Insert DNS records for reference
    for record in &dns_records {
        sqlx::query!(
            r#"
            INSERT INTO dns_records (id, domain_id, record_type, record_name, record_value, ttl)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
            Uuid::new_v4(),
            domain_id,
            record.record_type,
            record.name,
            record.value,
            record.ttl as i32
        )
        .execute(&state.db.pool)
        .await?;
    }

    // Create Kubernetes Ingress for the custom domain (without SSL for now)
    match k8s_service.create_custom_domain_ingress_simple(&deployment_id, &payload.domain).await {
        Ok(_) => {
            info!("Successfully created Kubernetes ingress for domain: {}", payload.domain);
        }
        Err(e) => {
            warn!("Failed to create Kubernetes ingress for domain {}: {}", payload.domain, e);
            // Update domain status to failed in database
            let _ = sqlx::query!(
                "UPDATE domains SET status = 'failed' WHERE id = $1",
                domain_id
            )
            .execute(&state.db.pool)
            .await;
            
            return Err(AppError::internal(&format!("Failed to create ingress: {}", e)));
        }
    }

    // Create instructions for user
    let instructions = format!(
        "Please create the following DNS records at your domain provider:\n\
        1. A Record: {} -> {}\n\
        2. CNAME Record: www.{} -> {}\n\
        \nAfter creating these records, your domain will point to your application. \
        DNS propagation may take up to 48 hours.\n\
        \nKubernetes ingress has been configured to route traffic to your application.",
        payload.domain, node_ip, payload.domain, payload.domain
    );

    info!("Domain {} added for deployment {} with node IP: {}", payload.domain, deployment_id, node_ip);

    Ok(Json(DomainResponse {
        id: domain_id,
        domain: payload.domain,
        status: "configured".to_string(),
        created_at: now,
        dns_records,
        node_ip,
        instructions,
    }))
}

pub async fn remove_domain(
    State(state): State<AppState>,
    user: AuthUser,
    Path((deployment_id, domain_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Value>, AppError> {
    // Check if deployment belongs to user
    let _deployment = sqlx::query!(
        "SELECT id FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Get domain info
    let domain = sqlx::query!(
        "SELECT id, domain FROM domains WHERE id = $1 AND deployment_id = $2",
        domain_id,
        deployment_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Domain"))?;

    info!("Removing custom domain: {} ({})", domain.domain, domain_id);

    // Remove Kubernetes ingress and SSL certificate
    let k8s_service = KubernetesService::for_deployment(&deployment_id, &user.user_id).await?;
    
    // Remove custom domain ingress
    if let Err(e) = k8s_service.remove_custom_domain_ingress(&deployment_id, &domain.domain).await {
        warn!("Failed to remove Kubernetes ingress for domain {}: {}", domain.domain, e);
    }

    // Remove SSL certificate secret
    let secret_name = format!("ssl-{}", domain_id);
    if let Err(e) = k8s_service.remove_ssl_certificate_secret(&secret_name).await {
        warn!("Failed to remove SSL certificate secret for domain {}: {}", domain.domain, e);
    }

    // Remove from database (this will cascade to related records)
    let result = sqlx::query!(
        "DELETE FROM domains WHERE id = $1 AND deployment_id = $2",
        domain_id,
        deployment_id
    )
    .execute(&state.db.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::not_found("Domain"));
    }

    info!("Successfully removed custom domain: {}", domain.domain);

    Ok(Json(json!({
        "message": "Domain removed successfully",
        "domain_id": domain_id,
        "domain": domain.domain
    })))
}

// SSL certificate provisioning is now handled separately by the user
// This simplified approach just provides the node IP for DNS configuration

pub async fn get_node_ip(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deployment_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Check if deployment exists and belongs to user
    let _deployment = sqlx::query!(
        "SELECT id FROM deployments WHERE id = $1 AND user_id = $2",
        deployment_id,
        user.user_id
    )
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Deployment"))?;

    // Get node IP for DNS configuration
    let k8s_service = KubernetesService::for_deployment(&deployment_id, &user.user_id).await?;
    let node_ip = match k8s_service.get_node_ip().await {
        Ok(ip) => ip,
        Err(_) => {
            // Fallback to ingress endpoint if node IP not available
            k8s_service.get_ingress_endpoint().await.unwrap_or_else(|_| "127.0.0.1".to_string())
        }
    };

    Ok(Json(serde_json::json!({
        "node_ip": node_ip
    })))
}
