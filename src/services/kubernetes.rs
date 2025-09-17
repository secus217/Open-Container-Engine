use k8s_openapi::api::apps::v1::{Deployment as K8sDeployment, DeploymentSpec};
use k8s_openapi::api::core::v1::{
    Container, ContainerPort, EnvVar, HTTPGetAction, Probe,
    ResourceRequirements as K8sResourceRequirements, Service, ServicePort, ServiceSpec,
};
use k8s_openapi::api::core::v1::Namespace;
use k8s_openapi::api::networking::v1::{
    HTTPIngressPath, HTTPIngressRuleValue, Ingress, IngressBackend, IngressRule,
    IngressServiceBackend, IngressSpec, ServiceBackendPort,
};
use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;
use kube::{api::PostParams, Api, Client};
use serde_json::Value;
use std::collections::BTreeMap;
use tokio::process::Command;
use tracing::{info, warn};
use uuid::Uuid;

use crate::jobs::deployment_job::DeploymentJob;
use crate::AppError;
use bytes::Bytes;
use futures_util::{AsyncBufReadExt, Stream};
use std::pin::Pin;

#[derive(Clone)]
pub struct KubernetesService {
    client: Client,
    namespace: String,
}

impl KubernetesService {
    pub async fn new(namespace: Option<String>) -> Result<Self, AppError> {
        let client = Client::try_default()
            .await
            .map_err(|e| AppError::internal(&format!("Failed to create k8s client: {}", e)))?;

        let namespace = namespace.unwrap_or_else(|| "default".to_string());

        info!(
            "Initialized Kubernetes service for namespace: {}",
            namespace
        );
        Ok(Self { client, namespace })
    }

    pub async fn create_deployment_namespace(&self, deployment_id: &Uuid, user_id: &Uuid) -> Result<String, AppError> {
        let namespace_name = self.generate_deployment_namespace(deployment_id);
        
        let namespaces: Api<Namespace> = Api::all(self.client.clone());
        
        if namespaces.get(&namespace_name).await.is_ok() {
            info!("Namespace {} already exists", namespace_name);
            return Ok(namespace_name);
        }

        let namespace = Namespace {
            metadata: ObjectMeta {
                name: Some(namespace_name.clone()),
                labels: Some(BTreeMap::from([
                    ("app.kubernetes.io/managed-by".to_string(), "container-engine".to_string()),
                    ("container-engine.io/user-id".to_string(), user_id.to_string()),
                    ("container-engine.io/deployment-id".to_string(), deployment_id.to_string()),
                    ("container-engine.io/type".to_string(), "deployment-namespace".to_string()),
                ])),
                ..Default::default()
            },
            ..Default::default()
        };

        namespaces
            .create(&PostParams::default(), &namespace)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to create namespace: {}", e)))?;

        info!("Created namespace: {} for deployment: {} (user: {})", namespace_name, deployment_id, user_id);
        Ok(namespace_name)
    }

    pub async fn for_deployment(deployment_id: &Uuid, user_id: &Uuid) -> Result<Self, AppError> {
        let client = Client::try_default()
            .await
            .map_err(|e| AppError::internal(&format!("Failed to create k8s client: {}", e)))?;

        let namespace = Self::generate_deployment_namespace_static(deployment_id);
        
        let mut service = Self { client, namespace: namespace.clone() };
        
        service.create_deployment_namespace(deployment_id, user_id).await?;
        
        Ok(service)
    }


   

    fn generate_deployment_namespace(&self, deployment_id: &Uuid) -> String {
        Self::generate_deployment_namespace_static(deployment_id)
    }

    fn generate_deployment_namespace_static(deployment_id: &Uuid) -> String {
        format!(
            "deploy-{}",
            deployment_id.to_string().replace("-", "").chars().take(12).collect::<String>()
        )
    }

    fn generate_user_namespace(&self, user_id: &uuid::Uuid) -> String {
        Self::generate_user_namespace_static(user_id)
    }

    fn generate_user_namespace_static(user_id: &uuid::Uuid) -> String {
        format!(
            "user-{}",
            user_id.to_string().replace("-", "").chars().take(12).collect::<String>()
        )
    }

    pub async fn delete_deployment_namespace(&self, deployment_id: &Uuid) -> Result<(), AppError> {
        let namespace_name = self.generate_deployment_namespace(deployment_id);
        let namespaces: Api<Namespace> = Api::all(self.client.clone());

        match namespaces.delete(&namespace_name, &kube::api::DeleteParams::default()).await {
            Ok(_) => {
                info!("Deleted namespace: {} for deployment: {}", namespace_name, deployment_id);
                Ok(())
            },
            Err(e) => {
                warn!("Failed to delete namespace {}: {}", namespace_name, e);
                Err(AppError::internal(&format!("Failed to delete namespace: {}", e)))
            }
        }
    }

    pub async fn delete_user_namespace(&self, user_id: &uuid::Uuid) -> Result<(), AppError> {
        let namespace_name = self.generate_user_namespace(user_id);
        let namespaces: Api<Namespace> = Api::all(self.client.clone());

        match namespaces.delete(&namespace_name, &kube::api::DeleteParams::default()).await {
            Ok(_) => {
                info!("Deleted namespace: {} for user: {}", namespace_name, user_id);
                Ok(())
            },
            Err(e) => {
                warn!("Failed to delete namespace {}: {}", namespace_name, e);
                Err(AppError::internal(&format!("Failed to delete namespace: {}", e)))
            }
        }
    }

    async fn create_service(&self, job: &DeploymentJob) -> Result<Service, AppError> {
        let service_name = self.generate_service_name(&job.deployment_id);
        let selector_labels = BTreeMap::from([
            ("app".to_string(), self.sanitize_app_name(&job.app_name)),
            ("deployment-id".to_string(), job.deployment_id.to_string()),
        ]);

        let service = Service {
            metadata: ObjectMeta {
                name: Some(service_name.clone()),
                namespace: Some(self.namespace.clone()),
                labels: Some(BTreeMap::from([
                    ("app.kubernetes.io/name".to_string(), self.sanitize_app_name(&job.app_name)),
                    ("app.kubernetes.io/managed-by".to_string(), "container-engine".to_string()),
                    ("container-engine.io/deployment-id".to_string(), job.deployment_id.to_string()),
                ])),
                ..Default::default()
            },
            spec: Some(ServiceSpec {
                selector: Some(selector_labels),
                ports: Some(vec![ServicePort {
                    port: job.port, // External port (82) - user requested
                    target_port: Some(
                        k8s_openapi::apimachinery::pkg::util::intstr::IntOrString::Int(80), // Container port (80) - actual
                    ),
                    name: Some("http".to_string()),
                    protocol: Some("TCP".to_string()),
                    ..Default::default()
                }]),
                type_: Some("ClusterIP".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        let services: Api<Service> = Api::namespaced(self.client.clone(), &self.namespace);

        let result = services
            .create(&PostParams::default(), &service)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to create k8s service: {}", e)))?;

        info!("Created service: {} mapping external port {} -> container port 80", service_name, job.port);
        Ok(result)
    }

    async fn create_ingress(&self, job: &DeploymentJob) -> Result<Ingress, AppError> {
        let ingress_name = self.generate_ingress_name(&job.deployment_id);
        let service_name = self.generate_service_name(&job.deployment_id);
        let minikube_ip = self.get_minikube_ip().await?;
        
        let deployment_suffix = job.deployment_id
            .to_string()
            .replace("-", "")
            .chars()
            .take(8)
            .collect::<String>();
        
        let host = format!(
            "{}-{}.{}.nip.io",
            self.sanitize_app_name(&job.app_name),
            deployment_suffix, 
            minikube_ip.replace(".", "-")
        );

        let ingress = Ingress {
            metadata: ObjectMeta {
                name: Some(ingress_name.clone()),
                namespace: Some(self.namespace.clone()),
                labels: Some(BTreeMap::from([
                    ("app.kubernetes.io/name".to_string(), self.sanitize_app_name(&job.app_name)),
                    ("app.kubernetes.io/managed-by".to_string(), "container-engine".to_string()),
                    ("container-engine.io/deployment-id".to_string(), job.deployment_id.to_string()),
                ])),
                annotations: Some(BTreeMap::from([
                    ("nginx.ingress.kubernetes.io/rewrite-target".to_string(), "/".to_string()),
                    ("kubernetes.io/ingress.class".to_string(), "nginx".to_string()),
                    ("nginx.ingress.kubernetes.io/ssl-redirect".to_string(), "false".to_string()),
                ])),
                ..Default::default()
            },
            spec: Some(IngressSpec {
                rules: Some(vec![IngressRule {
                    host: Some(host.clone()),
                    http: Some(HTTPIngressRuleValue {
                        paths: vec![HTTPIngressPath {
                            path: Some("/".to_string()),
                            path_type: "Prefix".to_string(),
                            backend: IngressBackend {
                                service: Some(IngressServiceBackend {
                                    name: service_name,
                                    port: Some(ServiceBackendPort {
                                        number: Some(job.port), // Sử dụng port từ job
                                        ..Default::default()
                                    }),
                                }),
                                ..Default::default()
                            },
                        }],
                    }),
                }]),
                ..Default::default()
            }),
            ..Default::default()
        };

        let ingresses: Api<Ingress> = Api::namespaced(self.client.clone(), &self.namespace);

        let result = ingresses
            .create(&PostParams::default(), &ingress)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to create ingress: {}", e)))?;

        info!("Created ingress: {} with host: {} pointing to service port: {}", ingress_name, host, job.port);
        Ok(result)
    }

    async fn get_pod_name(&self, deployment_id: &Uuid) -> Result<String, AppError> {
        use k8s_openapi::api::core::v1::Pod;
        use kube::api::{Api, ListParams};

        let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);
        let lp = ListParams::default().labels(&format!("deployment-id={}", deployment_id));

        let pod_list = pods
            .list(&lp)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to list pods: {}", e)))?;

        if let Some(pod) = pod_list.items.first() {
            if let Some(pod_name) = &pod.metadata.name {
                return Ok(pod_name.clone());
            }
        }

        Err(AppError::not_found("No pods found for deployment"))
    }

    pub async fn stream_logs(
        &self,
        deployment_id: &Uuid,
        tail_lines: Option<i64>,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<Bytes, std::io::Error>> + Send>>, AppError> {
        use k8s_openapi::api::core::v1::Pod;
        use kube::api::{Api, LogParams};

        let pod_name = self.get_pod_name(deployment_id).await?;
        tracing::info!("Streaming logs from pod: {}", pod_name);
        let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);

        let mut log_params = LogParams {
            follow: true,
            ..Default::default()
        };

        if let Some(tail) = tail_lines {
            log_params.tail_lines = Some(tail);
        }

        let async_buf_read = pods
            .log_stream(&pod_name, &log_params)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to create log stream: {}", e)))?;

        let stream = futures_util::stream::unfold(async_buf_read, |mut reader| async move {
            let mut line = String::new();
            match reader.read_line(&mut line).await {
                Ok(0) => None, // EOF
                Ok(_) => Some((Ok(Bytes::from(line)), reader)),
                Err(e) => Some((Err(e), reader)),
            }
        });

        Ok(Box::pin(stream))
    }

    fn sanitize_app_name(&self, app_name: &str) -> String {
        app_name
            .replace(' ', "-")
            .to_lowercase()
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c == '-' || c == '.' {
                    c
                } else {
                    '-'
                }
            })
            .collect::<String>()
    }

    fn generate_ingress_name(&self, deployment_id: &Uuid) -> String {
        format!(
            "ing-{}",
            deployment_id
                .to_string()
                .replace("-", "")
                .chars()
                .take(8)
                .collect::<String>()
        )
    }

    pub async fn get_ingress_url(&self, deployment_id: &Uuid) -> Result<Option<String>, AppError> {
        let ingress_name = self.generate_ingress_name(deployment_id);
        let ingresses: Api<Ingress> = Api::namespaced(self.client.clone(), &self.namespace);

        match ingresses.get(&ingress_name).await {
            Ok(ingress) => {
                if let Some(spec) = ingress.spec {
                    if let Some(rules) = spec.rules {
                        if let Some(rule) = rules.first() {
                            if let Some(host) = &rule.host {
                                return Ok(Some(format!("http://{}", host)));
                            }
                        }
                    }
                }
                Ok(None)
            }
            Err(e) => {
                warn!("Failed to get ingress {}: {}", ingress_name, e);
                Ok(None)
            }
        }
    }

    async fn get_minikube_ip(&self) -> Result<String, AppError> {
        info!("Getting Minikube IP address...");

        let output = Command::new("minikube")
            .arg("ip")
            .output()
            .await
            .map_err(|e| {
                AppError::internal(&format!("Failed to execute 'minikube ip' command: {}", e))
            })?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::internal(&format!(
                "Minikube command failed: {}",
                error_msg
            )));
        }

        let ip = String::from_utf8(output.stdout)
            .map_err(|e| AppError::internal(&format!("Failed to parse minikube output: {}", e)))?
            .trim()
            .to_string();

        if ip.is_empty() {
            return Err(AppError::internal("Minikube returned empty IP address"));
        }

        info!("Minikube IP: {}", ip);
        Ok(ip)
    }

    pub async fn deploy_application(&self, job: &DeploymentJob) -> Result<(), AppError> {
        info!("Deploying application: {} to Kubernetes on port: {}", job.app_name, job.port);

        // Create deployment first
        self.create_deployment(job).await?;

        // Create service with correct port
        self.create_service(job).await?;
        
        // Create ingress pointing to correct service port
        self.create_ingress(job).await?;
        
        info!(
            "Successfully created Kubernetes resources for: {} on port {}",
            job.app_name, job.port
        );
        Ok(())
    }

    async fn create_deployment(&self, job: &DeploymentJob) -> Result<K8sDeployment, AppError> {
        let deployment_name = self.generate_deployment_name(&job.deployment_id);
        let labels = self.generate_labels(job);

        let env_vars: Vec<EnvVar> = job
            .env_vars
            .iter()
            .map(|(k, v)| EnvVar {
                name: k.clone(),
                value: Some(v.clone()),
                ..Default::default()
            })
            .collect();

        let resources = self.parse_resource_requirements(&job.resources);
        let (readiness_probe, liveness_probe) =
            self.parse_health_probes(&job.health_check, job.port);

        let container = Container {
            name: "app".to_string(),
            image: Some(job.github_image_tag.clone()),
            ports: Some(vec![ContainerPort {
                container_port: 80, // Container actual port
                name: Some("http".to_string()),
                protocol: Some("TCP".to_string()),
                ..Default::default()
            }]),
            env: if env_vars.is_empty() {
                None
            } else {
                Some(env_vars)
            },
            resources,
            readiness_probe,
            liveness_probe,
            image_pull_policy: Some("Always".to_string()),
            ..Default::default()
        };

        let deployment = K8sDeployment {
            metadata: ObjectMeta {
                name: Some(deployment_name.clone()),
                namespace: Some(self.namespace.clone()),
                labels: Some(labels.clone()),
                ..Default::default()
            },
            spec: Some(DeploymentSpec {
                replicas: Some(job.replicas),
                selector: k8s_openapi::apimachinery::pkg::apis::meta::v1::LabelSelector {
                    match_labels: Some(labels.clone()),
                    ..Default::default()
                },
                template: k8s_openapi::api::core::v1::PodTemplateSpec {
                    metadata: Some(ObjectMeta {
                        labels: Some(labels),
                        ..Default::default()
                    }),
                    spec: Some(k8s_openapi::api::core::v1::PodSpec {
                        containers: vec![container],
                        restart_policy: Some("Always".to_string()),
                        ..Default::default()
                    }),
                },
                ..Default::default()
            }),
            ..Default::default()
        };

        let deployments: Api<K8sDeployment> = Api::namespaced(self.client.clone(), &self.namespace);

        let result = deployments
            .create(&PostParams::default(), &deployment)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to create k8s deployment: {}", e)))?;

        info!("Created k8s deployment: {} on port {}", deployment_name, job.port);
        Ok(result)
    }

    pub async fn get_service_external_ip(
        &self,
        deployment_id: &Uuid,
    ) -> Result<Option<String>, AppError> {
        let service_name = self.generate_service_name(deployment_id);
        let services: Api<Service> = Api::namespaced(self.client.clone(), &self.namespace);

        match services.get(&service_name).await {
            Ok(service) => {
                if let Some(status) = service.status {
                    if let Some(load_balancer) = status.load_balancer {
                        if let Some(ingress_list) = load_balancer.ingress {
                            if let Some(ingress) = ingress_list.first() {
                                return Ok(ingress.ip.clone());
                            }
                        }
                    }
                }
                Ok(None)
            }
            Err(e) => {
                warn!("Failed to get service {}: {}", service_name, e);
                Ok(None)
            }
        }
    }

    pub async fn get_deployment_status(&self, deployment_id: &Uuid) -> Result<String, AppError> {
        let deployment_name = self.generate_deployment_name(deployment_id);
        let deployments: Api<K8sDeployment> = Api::namespaced(self.client.clone(), &self.namespace);

        match deployments.get(&deployment_name).await {
            Ok(deployment) => {
                if let Some(status) = deployment.status {
                    let ready_replicas = status.ready_replicas.unwrap_or(0);
                    let replicas = status.replicas.unwrap_or(0);

                    if ready_replicas == replicas && replicas > 0 {
                        Ok("running".to_string())
                    } else {
                        Ok("deploying".to_string())
                    }
                } else {
                    Ok("deploying".to_string())
                }
            }
            Err(_) => Ok("failed".to_string()),
        }
    }

    pub async fn scale_deployment(&self, deployment_id: &Uuid, replicas: i32) -> Result<(), AppError> {
        let deployment_name = self.generate_deployment_name(deployment_id);
        let deployments: Api<K8sDeployment> = Api::namespaced(self.client.clone(), &self.namespace);

        let mut deployment = deployments
            .get(&deployment_name)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to get deployment {}: {}", deployment_name, e)))?;

        if let Some(spec) = deployment.spec.as_mut() {
            spec.replicas = Some(replicas);
        }

        deployments
            .replace(&deployment_name, &kube::api::PostParams::default(), &deployment)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to scale deployment {}: {}", deployment_name, e)))?;

        info!("Scaled deployment {} to {} replicas", deployment_name, replicas);
        Ok(())
    }

    pub async fn delete_deployment(&self, deployment_id: &Uuid) -> Result<(), AppError> {
        info!("Deleting deployment namespace: {}", self.namespace);
        
        // Chỉ cần delete namespace, tất cả resources sẽ tự động bị xóa
        let result = self.delete_deployment_namespace(deployment_id).await;
        
        match result {
            Ok(_) => {
                info!("Successfully deleted deployment {} and all its resources", deployment_id);
                Ok(())
            }
            Err(e) => {
                warn!("Failed to delete deployment namespace: {}", e);
                Err(e)
            }
        }
    }

    fn generate_deployment_name(&self, deployment_id: &Uuid) -> String {
        format!(
            "app-{}",
            deployment_id
                .to_string()
                .replace("-", "")
                .chars()
                .take(8)
                .collect::<String>()
        )
    }

    fn generate_service_name(&self, deployment_id: &Uuid) -> String {
        format!(
            "svc-{}",
            deployment_id
                .to_string()
                .replace("-", "")
                .chars()
                .take(8)
                .collect::<String>()
        )
    }

    fn generate_labels(&self, job: &DeploymentJob) -> BTreeMap<String, String> {
        BTreeMap::from([
            ("app".to_string(), self.sanitize_app_name(&job.app_name)),
            ("deployment-id".to_string(), job.deployment_id.to_string()),
            ("managed-by".to_string(), "deployment-service".to_string()),
        ])
    }

    fn parse_resource_requirements(
        &self,
        resources: &Option<Value>,
    ) -> Option<K8sResourceRequirements> {
        if let Some(res) = resources {
            let mut limits = BTreeMap::new();
            let mut requests = BTreeMap::new();

            if let Some(cpu_limit) = res.get("cpu_limit").and_then(|v| v.as_str()) {
                limits.insert(
                    "cpu".to_string(),
                    k8s_openapi::apimachinery::pkg::api::resource::Quantity(cpu_limit.to_string()),
                );
            }
            if let Some(memory_limit) = res.get("memory_limit").and_then(|v| v.as_str()) {
                limits.insert(
                    "memory".to_string(),
                    k8s_openapi::apimachinery::pkg::api::resource::Quantity(
                        memory_limit.to_string(),
                    ),
                );
            }

            if let Some(cpu_request) = res.get("cpu_request").and_then(|v| v.as_str()) {
                requests.insert(
                    "cpu".to_string(),
                    k8s_openapi::apimachinery::pkg::api::resource::Quantity(
                        cpu_request.to_string(),
                    ),
                );
            }
            if let Some(memory_request) = res.get("memory_request").and_then(|v| v.as_str()) {
                requests.insert(
                    "memory".to_string(),
                    k8s_openapi::apimachinery::pkg::api::resource::Quantity(
                        memory_request.to_string(),
                    ),
                );
            }

            Some(K8sResourceRequirements {
                claims: None,
                limits: if limits.is_empty() {
                    None
                } else {
                    Some(limits)
                },
                requests: if requests.is_empty() {
                    None
                } else {
                    Some(requests)
                },
            })
        } else {
            None
        }
    }

    fn parse_health_probes(
        &self,
        health_check: &Option<Value>,
        default_port: i32,
    ) -> (Option<Probe>, Option<Probe>) {
        if let Some(hc) = health_check {
            if let Some(path) = hc.get("path").and_then(|v| v.as_str()) {
                let port = hc
                    .get("port")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(default_port as i64) as i32;
                let initial_delay = hc
                    .get("initial_delay")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(30) as i32;
                let period = hc.get("period").and_then(|v| v.as_i64()).unwrap_or(10) as i32;
                let timeout = hc.get("timeout").and_then(|v| v.as_i64()).unwrap_or(5) as i32;

                let probe = Probe {
                    http_get: Some(HTTPGetAction {
                        path: Some(path.to_string()),
                        port: k8s_openapi::apimachinery::pkg::util::intstr::IntOrString::Int(port),
                        scheme: Some("HTTP".to_string()),
                        ..Default::default()
                    }),
                    initial_delay_seconds: Some(initial_delay),
                    period_seconds: Some(period),
                    timeout_seconds: Some(timeout),
                    failure_threshold: Some(3),
                    success_threshold: Some(1),
                    ..Default::default()
                };

                return (Some(probe.clone()), Some(probe));
            }
        }

        (None, None)
    }
}
