use k8s_openapi::api::apps::v1::{Deployment as K8sDeployment, DeploymentSpec};
use k8s_openapi::api::core::v1::Namespace;
use k8s_openapi::api::core::v1::{
    Container, ContainerPort, EnvVar, HTTPGetAction, Probe,
    ResourceRequirements as K8sResourceRequirements, Service, ServicePort, ServiceSpec,
};
use k8s_openapi::api::networking::v1::{
    HTTPIngressPath, HTTPIngressRuleValue, Ingress, IngressBackend, IngressRule,
    IngressServiceBackend, IngressSpec, ServiceBackendPort,
};
use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;
use kube::{api::PostParams, Api, Client};
use serde_json::Value;
use std::collections::BTreeMap;
use tokio::process::Command;
use tracing::{error, info, warn};
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
#[derive(Debug, Clone)]
pub struct PodInfo {
    pub name: String,
    pub status: String,
    pub ready: bool,
    pub restart_count: i32,
    pub node_name: Option<String>,
    pub created_at: Option<String>,
}

impl KubernetesService {
    pub async fn new(namespace: Option<String>) -> Result<Self, AppError> {
        // Load config from custom kubeconfig file
        let config = Self::load_kubeconfig().await?;
        
        let client = Client::try_from(config)
            .map_err(|e| AppError::internal(&format!("Failed to create k8s client: {}", e)))?;

        // Test connection to cluster
        Self::validate_connection(&client).await?;

        let namespace = namespace.unwrap_or_else(|| "default".to_string());


        Ok(Self { client, namespace })
    }

    pub async fn create_deployment_namespace(
        &self,
        deployment_id: &Uuid,
        user_id: &Uuid,
    ) -> Result<String, AppError> {
        let namespace_name = self.generate_deployment_namespace(deployment_id);

        let namespaces: Api<Namespace> = Api::all(self.client.clone());

        if namespaces.get(&namespace_name).await.is_ok() {
    
            return Ok(namespace_name);
        }

        let namespace = Namespace {
            metadata: ObjectMeta {
                name: Some(namespace_name.clone()),
                labels: Some(BTreeMap::from([
                    (
                        "app.kubernetes.io/managed-by".to_string(),
                        "container-engine".to_string(),
                    ),
                    (
                        "container-engine.io/user-id".to_string(),
                        user_id.to_string(),
                    ),
                    (
                        "container-engine.io/deployment-id".to_string(),
                        deployment_id.to_string(),
                    ),
                    (
                        "container-engine.io/type".to_string(),
                        "deployment-namespace".to_string(),
                    ),
                ])),
                ..Default::default()
            },
            ..Default::default()
        };

        namespaces
            .create(&PostParams::default(), &namespace)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to create namespace: {}", e)))?;


        Ok(namespace_name)
    }

    pub async fn for_deployment(deployment_id: &Uuid, user_id: &Uuid) -> Result<Self, AppError> {
        // Load config from custom kubeconfig file
        let config = Self::load_kubeconfig().await?;
        
        let client = Client::try_from(config)
            .map_err(|e| AppError::internal(&format!("Failed to create k8s client: {}", e)))?;

        // Test connection to cluster
        Self::validate_connection(&client).await?;

        let namespace = Self::generate_deployment_namespace_static(deployment_id);

        let service = Self {
            client,
            namespace: namespace.clone(),
        };

        service
            .create_deployment_namespace(deployment_id, user_id)
            .await?;

        Ok(service)
    }

    // Validate connection to Kubernetes cluster
    async fn validate_connection(client: &Client) -> Result<(), AppError> {
        // Test connection by checking API server version
        match client.apiserver_version().await {
            Ok(_) => Ok(()),
            Err(e) => {
                Err(AppError::internal(&format!(
                    "Failed to connect to Kubernetes API server: {}. Please check your kubeconfig and cluster status.", e
                )))
            }
        }
    }

    // Helper method to load kubeconfig from file
    async fn load_kubeconfig() -> Result<kube::Config, AppError> {
        use kube::Config;
        use std::env;
        use std::path::Path;

        // Get kubeconfig path from environment variable or use default
        let kubeconfig_path =
            env::var("KUBECONFIG_PATH").unwrap_or_else(|_| "./k8sConfig.yaml".to_string());

        if Path::new(&kubeconfig_path).exists() {
            // Set KUBECONFIG environment variable to point to our file
            let absolute_path = std::fs::canonicalize(&kubeconfig_path).map_err(|e| {
                AppError::internal(&format!(
                    "Failed to get absolute path for {}: {}",
                    kubeconfig_path, e
                ))
            })?;

            env::set_var("KUBECONFIG", &absolute_path);

            Config::infer().await.map_err(|e| {
                AppError::internal(&format!(
                    "Failed to load kubeconfig from {}: {}",
                    kubeconfig_path, e
                ))
            })
        } else {
            return Err(AppError::internal(&format!(
                "Kubeconfig file not found at '{}'. Please ensure the file exists and KUBECONFIG_PATH is set correctly.",
                kubeconfig_path
            )));
        }
    }

    

    fn generate_deployment_namespace(&self, deployment_id: &Uuid) -> String {
        Self::generate_deployment_namespace_static(deployment_id)
    }

    fn generate_deployment_namespace_static(deployment_id: &Uuid) -> String {
        format!(
            "open-container-engine-deploy-{}",
            deployment_id
                .to_string()
                .replace("-", "")
                .chars()
                .take(12)
                .collect::<String>()
        )
    }

    fn generate_user_namespace(&self, user_id: &uuid::Uuid) -> String {
        Self::generate_user_namespace_static(user_id)
    }

    fn generate_user_namespace_static(user_id: &uuid::Uuid) -> String {
        format!(
            "user-{}",
            user_id
                .to_string()
                .replace("-", "")
                .chars()
                .take(12)
                .collect::<String>()
        )
    }

    pub async fn delete_deployment_namespace(&self, deployment_id: &Uuid) -> Result<(), AppError> {
        let namespace_name = self.generate_deployment_namespace(deployment_id);
        let namespaces: Api<Namespace> = Api::all(self.client.clone());

        match namespaces
            .delete(&namespace_name, &kube::api::DeleteParams::default())
            .await
        {
            Ok(_) => {

                Ok(())
            }
            Err(e) => {
                warn!("Failed to delete namespace {}: {}", namespace_name, e);
                Err(AppError::internal(&format!(
                    "Failed to delete namespace: {}",
                    e
                )))
            }
        }
    }

    pub async fn delete_user_namespace(&self, user_id: &uuid::Uuid) -> Result<(), AppError> {
        let namespace_name = self.generate_user_namespace(user_id);
        let namespaces: Api<Namespace> = Api::all(self.client.clone());

        match namespaces
            .delete(&namespace_name, &kube::api::DeleteParams::default())
            .await
        {
            Ok(_) => {

                Ok(())
            }
            Err(e) => {
                warn!("Failed to delete namespace {}: {}", namespace_name, e);
                Err(AppError::internal(&format!(
                    "Failed to delete namespace: {}",
                    e
                )))
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
                    (
                        "app.kubernetes.io/name".to_string(),
                        self.sanitize_app_name(&job.app_name),
                    ),
                    (
                        "app.kubernetes.io/managed-by".to_string(),
                        "container-engine".to_string(),
                    ),
                    (
                        "container-engine.io/deployment-id".to_string(),
                        job.deployment_id.to_string(),
                    ),
                ])),
                ..Default::default()
            },
            spec: Some(ServiceSpec {
                selector: Some(selector_labels),
                ports: Some(vec![ServicePort {
                    port: job.port, // External port (82) - user requested
                    target_port: Some(
                        k8s_openapi::apimachinery::pkg::util::intstr::IntOrString::Int(job.port), // Container port (80) - actual
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


        Ok(result)
    }

    async fn create_ingress(&self, job: &DeploymentJob) -> Result<Ingress, AppError> {
        let ingress_name = self.generate_ingress_name(&job.deployment_id);
        let service_name = self.generate_service_name(&job.deployment_id);
        let cluster_domain = self.get_cluster_domain().await?;
        let ingress_class = self.get_ingress_class().await?;

        let deployment_suffix = job
            .deployment_id
            .to_string()
            .replace("-", "")
            .chars()
            .take(8)
            .collect::<String>();

        let host = format!(
            "{}-{}.{}",
            self.sanitize_app_name(&job.app_name),
            deployment_suffix,
            cluster_domain
        );

        let ingress = Ingress {
            metadata: ObjectMeta {
                name: Some(ingress_name.clone()),
                namespace: Some(self.namespace.clone()),
                labels: Some(BTreeMap::from([
                    (
                        "app.kubernetes.io/name".to_string(),
                        self.sanitize_app_name(&job.app_name),
                    ),
                    (
                        "app.kubernetes.io/managed-by".to_string(),
                        "container-engine".to_string(),
                    ),
                    (
                        "container-engine.io/deployment-id".to_string(),
                        job.deployment_id.to_string(),
                    ),
                ])),
                annotations: None,
                ..Default::default()
            },
            spec: Some(IngressSpec {
                ingress_class_name: Some(ingress_class),
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
                                        number: Some(job.port),
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


        Ok(result)
    }
    async fn get_cluster_domain(&self) -> Result<String, AppError> {
    use std::env;

    // Priority order:
    // 1. Environment variable CLUSTER_DOMAIN
    // 2. Environment variable DOMAIN_SUFFIX  
    // 3. Try to detect cluster type and get appropriate domain
    // 4. Extract IP from kubeconfig and use nip.io

    if let Ok(domain) = env::var("CLUSTER_DOMAIN") {
        return Ok(domain);
    }

    if let Ok(domain_suffix) = env::var("DOMAIN_SUFFIX") {
        return Ok(domain_suffix);
    }

    // Try to detect cluster type
    match self.detect_cluster_type().await {
        Ok(cluster_type) => {
            match cluster_type.as_str() {
                "microk8s" => {
                    match self.get_cluster_ip_from_config().await {
                        Ok(ip) => {
                            let domain = format!("{}.nip.io", ip.replace(".", "-"));
                            Ok(domain)
                        }
                        Err(_) => {
                            Ok("localhost.nip.io".to_string())
                        }
                    }
                }
                "minikube" => {
                    match self.get_minikube_ip_safe().await {
                        Ok(ip) => {
                            let domain = format!("{}.nip.io", ip.replace(".", "-"));
                            Ok(domain)
                        }
                        Err(_) => {
                            Ok("localhost.nip.io".to_string())
                        }
                    }
                }
                "kind" => {
                    Ok("localhost.nip.io".to_string())
                }
                "docker-desktop" => {
                    Ok("localhost.nip.io".to_string())
                }
                _ => {
                    match self.get_cluster_ip_from_config().await {
                        Ok(ip) => {
                            let domain = format!("{}.nip.io", ip.replace(".", "-"));
                            Ok(domain)
                        }
                        Err(_) => {
                            Ok("k8s.local".to_string())
                        }
                    }
                }
            }
        }
        Err(_) => {
            match self.get_cluster_ip_from_config().await {
                Ok(ip) => {
                    let domain = format!("{}.nip.io", ip.replace(".", "-"));
                    Ok(domain)
                }
                Err(_) => {
                    Ok("k8s.local".to_string())
                }
            }
        }
    }
}

    // New method to automatically detect available IngressClass
    async fn get_ingress_class(&self) -> Result<String, AppError> {
        use k8s_openapi::api::networking::v1::IngressClass;
        use kube::api::{Api, ListParams};
        use std::env;

        // Check if user specified a preference via environment
        if let Ok(class) = env::var("INGRESS_CLASS") {
            return Ok(class);
        }

        // Get all available IngressClasses
        let ingress_classes: Api<IngressClass> = Api::all(self.client.clone());
        
        match ingress_classes.list(&ListParams::default()).await {
            Ok(classes) => {
                if classes.items.is_empty() {
                    return Ok("nginx".to_string());
                }

                // Priority order for common IngressClass names
                let preferred_classes = ["nginx", "public", "haproxy", "traefik", "istio"];
                
                for preferred in &preferred_classes {
                    for class in &classes.items {
                        if let Some(name) = &class.metadata.name {
                            if name == preferred {
                                return Ok(name.clone());
                            }
                        }
                    }
                }

                // If no preferred class found, use the first available
                if let Some(first_class) = classes.items.first() {
                    if let Some(name) = &first_class.metadata.name {
                        return Ok(name.clone());
                    }
                }

                Ok("nginx".to_string())
            }
            Err(_) => {
                Ok("nginx".to_string())
            }
        }
    }

// Add new method to extract IP from kubeconfig
async fn get_cluster_ip_from_config(&self) -> Result<String, AppError> {
    use std::env;
    use std::path::Path;
    
    let kubeconfig_path = env::var("KUBECONFIG_PATH").unwrap_or_else(|_| "./k8sConfig.yaml".to_string());
    
    if !Path::new(&kubeconfig_path).exists() {
        return Err(AppError::internal("Kubeconfig file not found"));
    }

    let content = tokio::fs::read_to_string(&kubeconfig_path).await
        .map_err(|e| AppError::internal(&format!("Failed to read kubeconfig: {}", e)))?;

    // Parse YAML to extract server URL
    let config: serde_yaml::Value = serde_yaml::from_str(&content)
        .map_err(|e| AppError::internal(&format!("Failed to parse kubeconfig YAML: {}", e)))?;

    if let Some(clusters) = config.get("clusters").and_then(|c| c.as_sequence()) {
        if let Some(cluster) = clusters.first() {
            if let Some(server) = cluster.get("cluster")
                .and_then(|c| c.get("server"))
                .and_then(|s| s.as_str()) {
                
                // Extract IP from server URL (e.g., "https://192.168.91.101:16443")
                if let Some(url_part) = server.strip_prefix("https://") {
                    if let Some(ip_port) = url_part.split(':').next() {
                        return Ok(ip_port.to_string());
                    }
                }
            }
        }
    }

    Err(AppError::internal("Failed to extract cluster IP from kubeconfig"))
}

// Update detect_cluster_type to recognize MicroK8s
async fn detect_cluster_type(&self) -> Result<String, AppError> {
    // Check if running in Kind
    if let Ok(_) = std::env::var("KIND_CLUSTER_NAME") {
        return Ok("kind".to_string());
    }
    
    // Check context name for cluster type
    if let Ok(output) = Command::new("kubectl")
        .args(["config", "current-context"])
        .output()
        .await
    {
        if output.status.success() {
            let context = String::from_utf8_lossy(&output.stdout).to_lowercase();
            if context.contains("microk8s") {
                return Ok("microk8s".to_string());
            }
            if context.contains("docker-desktop") {
                return Ok("docker-desktop".to_string());
            }
            if context.contains("kind") {
                return Ok("kind".to_string());
            }
            if context.contains("minikube") {
                return Ok("minikube".to_string());
            }
        }
    }
    
    // Get cluster info from API server
    match self.client.apiserver_version().await {
        Ok(version) => {
            let git_version = version.git_version.to_lowercase();
            
            if git_version.contains("minikube") {
                return Ok("minikube".to_string());
            }
            
            Ok("unknown".to_string())
        }
        Err(e) => Err(AppError::internal(&format!("Failed to get cluster info: {}", e)))
    }
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
        use tokio::time::{timeout, Duration};

        // Get pod name with timeout
        let pod_name = timeout(Duration::from_secs(10), self.get_pod_name(deployment_id))
            .await
            .map_err(|_| AppError::internal("Timeout while getting pod name"))?
            .map_err(|e| AppError::internal(&format!("Failed to get pod name: {}", e)))?;
        
        tracing::info!("Streaming logs from pod: {}", pod_name);
        let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);

        // Check if pod exists and is ready first
        let pod = pods.get(&pod_name).await
            .map_err(|e| AppError::internal(&format!("Pod {} not found: {}", pod_name, e)))?;

        if let Some(status) = &pod.status {
            if let Some(phase) = &status.phase {
                tracing::info!("Pod {} is in phase: {}", pod_name, phase);
                if phase != "Running" && phase != "Succeeded" {
                    return Err(AppError::internal(&format!("Pod {} is not ready (phase: {})", pod_name, phase)));
                }
            }
        }

        let mut log_params = LogParams {
            follow: false, // Don't follow to avoid timeout
            previous: false,
            since_seconds: None,
            timestamps: true,
            ..Default::default()
        };

        if let Some(tail) = tail_lines {
            log_params.tail_lines = Some(tail);
        }

        // Get logs with timeout
        let logs_result = timeout(
            Duration::from_secs(30),
            pods.logs(&pod_name, &log_params)
        )
        .await
        .map_err(|_| AppError::internal("Timeout while fetching logs"))?
        .map_err(|e| AppError::internal(&format!("Failed to fetch logs: {}", e)))?;

        // Convert string logs to stream
        let lines: Vec<String> = logs_result
            .lines()
            .map(|line| format!("{}\n", line))
            .collect();

        let stream = futures_util::stream::iter(
            lines.into_iter().map(|line| Ok(Bytes::from(line)))
        );

        Ok(Box::pin(stream))
    }

    pub async fn get_logs(
        &self,
        deployment_id: &Uuid,
        tail_lines: Option<i64>,
    ) -> Result<String, AppError> {
        use k8s_openapi::api::core::v1::Pod;
        use kube::api::{Api, LogParams};
        use tokio::time::{timeout, Duration};

        let pod_name = timeout(Duration::from_secs(10), self.get_pod_name(deployment_id))
            .await
            .map_err(|_| AppError::internal("Timeout while getting pod name"))?
            .map_err(|e| AppError::internal(&format!("Failed to get pod name: {}", e)))?;
        
        tracing::info!("Getting logs from pod: {}", pod_name);
        let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);

        let mut log_params = LogParams {
            follow: false,
            previous: false,
            timestamps: true,
            ..Default::default()
        };

        if let Some(tail) = tail_lines {
            log_params.tail_lines = Some(tail);
        }

        let logs = timeout(
            Duration::from_secs(15),
            pods.logs(&pod_name, &log_params)
        )
        .await
        .map_err(|_| AppError::internal("Timeout while fetching logs"))?
        .map_err(|e| AppError::internal(&format!("Failed to fetch logs: {}", e)))?;

        Ok(logs)
    }

    // Dedicated method for real WebSocket streaming (with follow=true)
    pub async fn stream_logs_realtime(
        &self,
        deployment_id: &Uuid,
        tail_lines: Option<i64>,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<Bytes, std::io::Error>> + Send>>, AppError> {
        use k8s_openapi::api::core::v1::Pod;
        use kube::api::{Api, LogParams};
        use tokio::time::{timeout, Duration};

        let pod_name = timeout(Duration::from_secs(10), self.get_pod_name(deployment_id))
            .await
            .map_err(|_| AppError::internal("Timeout while getting pod name"))?
            .map_err(|e| AppError::internal(&format!("Failed to get pod name: {}", e)))?;
        
        tracing::info!("Real-time streaming logs from pod: {}", pod_name);
        let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);

        // Check if pod exists and is ready first
        let pod = pods.get(&pod_name).await
            .map_err(|e| AppError::internal(&format!("Pod {} not found: {}", pod_name, e)))?;

        if let Some(status) = &pod.status {
            if let Some(phase) = &status.phase {
                tracing::info!("Pod {} is in phase: {}", pod_name, phase);
                if phase != "Running" && phase != "Succeeded" {
                    return Err(AppError::internal(&format!("Pod {} is not ready (phase: {})", pod_name, phase)));
                }
            }
        }

        let mut log_params = LogParams {
            follow: true, // Enable real-time streaming
            previous: false,
            since_seconds: None,
            timestamps: true,
            ..Default::default()
        };

        if let Some(tail) = tail_lines {
            log_params.tail_lines = Some(tail);
        }

        // Create log stream for real-time following
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

    

    // Safe method to get Minikube IP without failing
    async fn get_minikube_ip_safe(&self) -> Result<String, AppError> {
        let output = Command::new("minikube")
            .arg("ip")
            .output()
            .await
            .map_err(|e| {
                AppError::internal(&format!("Minikube command not available: {}", e))
            })?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::internal(&format!(
                "Minikube IP command failed: {}",
                error_msg
            )));
        }

        let ip = String::from_utf8(output.stdout)
            .map_err(|e| AppError::internal(&format!("Failed to parse minikube output: {}", e)))?
            .trim()
            .to_string();

        if ip.is_empty() {
            return Err(AppError::internal("Minikube returned empty IP"));
        }

        Ok(ip)
    }

   

    // Keep the old method name for backward compatibility, but make it flexible
    async fn get_minikube_ip(&self) -> Result<String, AppError> {
        // This method now delegates to the more flexible get_cluster_domain
        self.get_cluster_domain().await
    }

    pub async fn deploy_application(&self, job: &DeploymentJob) -> Result<(), AppError> {
        // Create deployment first
        self.create_deployment(job).await?;

        // Create service with correct port
        self.create_service(job).await?;

        // Create ingress pointing to correct service port
        self.create_ingress(job).await?;

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
                container_port: job.port, // Container actual port
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

    pub async fn scale_deployment(
        &self,
        deployment_id: &Uuid,
        replicas: i32,
    ) -> Result<(), AppError> {
        let deployment_name = self.generate_deployment_name(deployment_id);
        let deployments: Api<K8sDeployment> = Api::namespaced(self.client.clone(), &self.namespace);

        let mut deployment = deployments.get(&deployment_name).await.map_err(|e| {
            AppError::internal(&format!(
                "Failed to get deployment {}: {}",
                deployment_name, e
            ))
        })?;

        if let Some(spec) = deployment.spec.as_mut() {
            spec.replicas = Some(replicas);
        }

        deployments
            .replace(
                &deployment_name,
                &kube::api::PostParams::default(),
                &deployment,
            )
            .await
            .map_err(|e| {
                AppError::internal(&format!(
                    "Failed to scale deployment {}: {}",
                    deployment_name, e
                ))
            })?;


        Ok(())
    }

    pub async fn delete_deployment(&self, deployment_id: &Uuid) -> Result<(), AppError> {
        // Only need to delete namespace, all resources will be automatically deleted
        self.delete_deployment_namespace(deployment_id).await
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
    pub async fn get_deployment_pods(&self, deployment_id: &Uuid) -> Result<Vec<PodInfo>, AppError> {
    use k8s_openapi::api::core::v1::Pod;
    use kube::api::{Api, ListParams};

    let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);
    let lp = ListParams::default().labels(&format!("deployment-id={}", deployment_id));

    let pod_list = pods
        .list(&lp)
        .await
        .map_err(|e| AppError::internal(&format!("Failed to list pods: {}", e)))?;

    let mut pod_infos = Vec::new();
    for pod in pod_list.items {
        // Skip pods that are marked for deletion (Terminating state)
        if pod.metadata.deletion_timestamp.is_some() {
            continue;
        }

        if let Some(name) = &pod.metadata.name {
            let status = if let Some(pod_status) = &pod.status {
                pod_status.phase.clone().unwrap_or_else(|| "Unknown".to_string())
            } else {
                "Unknown".to_string()
            };

            // Only include pods that are not in Terminating state
            if status == "Terminating" {
                continue;
            }

            let ready = if let Some(pod_status) = &pod.status {
                pod_status.container_statuses
                    .as_ref()
                    .map(|statuses| statuses.iter().all(|cs| cs.ready))
                    .unwrap_or(false)
            } else {
                false
            };

            pod_infos.push(PodInfo {
                name: name.clone(),
                status,
                ready,
                restart_count: if let Some(pod_status) = &pod.status {
                    pod_status.container_statuses
                        .as_ref()
                        .map(|statuses| statuses.iter().map(|cs| cs.restart_count).sum())
                        .unwrap_or(0)
                } else {
                    0
                },
                node_name: pod.spec.as_ref().and_then(|s| s.node_name.clone()),
                created_at: pod.metadata.creation_timestamp
                    .map(|ts| ts.0.format("%Y-%m-%d %H:%M:%S UTC").to_string()),
            });
        }
    }

    Ok(pod_infos)
}

/// Get all pods for deployment including terminating ones (for debugging)
pub async fn get_deployment_pods_all(&self, deployment_id: &Uuid) -> Result<Vec<PodInfo>, AppError> {
    use k8s_openapi::api::core::v1::Pod;
    use kube::api::{Api, ListParams};

    let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);
    let lp = ListParams::default().labels(&format!("deployment-id={}", deployment_id));

    let pod_list = pods
        .list(&lp)
        .await
        .map_err(|e| AppError::internal(&format!("Failed to list pods: {}", e)))?;

    let mut pod_infos = Vec::new();
    for pod in pod_list.items {
        if let Some(name) = &pod.metadata.name {
            let status = if let Some(pod_status) = &pod.status {
                // Check if pod is marked for deletion
                if pod.metadata.deletion_timestamp.is_some() {
                    "Terminating".to_string()
                } else {
                    pod_status.phase.clone().unwrap_or_else(|| "Unknown".to_string())
                }
            } else {
                "Unknown".to_string()
            };

            let ready = if let Some(pod_status) = &pod.status {
                pod_status.container_statuses
                    .as_ref()
                    .map(|statuses| statuses.iter().all(|cs| cs.ready))
                    .unwrap_or(false)
            } else {
                false
            };

            pod_infos.push(PodInfo {
                name: name.clone(),
                status,
                ready,
                restart_count: if let Some(pod_status) = &pod.status {
                    pod_status.container_statuses
                        .as_ref()
                        .map(|statuses| statuses.iter().map(|cs| cs.restart_count).sum())
                        .unwrap_or(0)
                } else {
                    0
                },
                node_name: pod.spec.as_ref().and_then(|s| s.node_name.clone()),
                created_at: pod.metadata.creation_timestamp
                    .map(|ts| ts.0.format("%Y-%m-%d %H:%M:%S UTC").to_string()),
            });
        }
    }

    Ok(pod_infos)
}

pub async fn get_pod_logs(
    &self,
    pod_name: &str,
    tail_lines: Option<i64>,
) -> Result<String, AppError> {
    use k8s_openapi::api::core::v1::Pod;
    use kube::api::{Api, LogParams};
    use tokio::time::{timeout, Duration};

    tracing::info!("Getting logs from specific pod: {}", pod_name);
    let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);

    // Verify pod exists first
    pods.get(pod_name).await
        .map_err(|e| AppError::internal(&format!("Pod {} not found: {}", pod_name, e)))?;

    let mut log_params = LogParams {
        follow: false,
        previous: false,
        timestamps: true,
        ..Default::default()
    };

    if let Some(tail) = tail_lines {
        log_params.tail_lines = Some(tail);
    }

    let logs = timeout(
        Duration::from_secs(15),
        pods.logs(pod_name, &log_params)
    )
    .await
    .map_err(|_| AppError::internal("Timeout while fetching logs"))?
    .map_err(|e| AppError::internal(&format!("Failed to fetch logs: {}", e)))?;

    Ok(logs)
}
pub async fn stream_pod_logs(
    &self,
    pod_name: &str,
    tail_lines: Option<i64>,
) -> Result<Pin<Box<dyn Stream<Item = Result<Bytes, std::io::Error>> + Send>>, AppError> {
    use k8s_openapi::api::core::v1::Pod;
    use kube::api::{Api, LogParams};

    tracing::info!("Streaming logs from specific pod: {}", pod_name);
    let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);

    // Verify pod exists and is ready
    let pod = pods.get(pod_name).await
        .map_err(|e| AppError::internal(&format!("Pod {} not found: {}", pod_name, e)))?;

    if let Some(status) = &pod.status {
        if let Some(phase) = &status.phase {
            tracing::info!("Pod {} is in phase: {}", pod_name, phase);
            if phase != "Running" && phase != "Succeeded" {
                return Err(AppError::internal(&format!("Pod {} is not ready (phase: {})", pod_name, phase)));
            }
        }
    }

    let mut log_params = LogParams {
        follow: false,
        previous: false,
        since_seconds: None,
        timestamps: true,
        ..Default::default()
    };

    if let Some(tail) = tail_lines {
        log_params.tail_lines = Some(tail);
    }

    let logs_result = pods.logs(pod_name, &log_params)
        .await
        .map_err(|e| AppError::internal(&format!("Failed to fetch logs: {}", e)))?;

    let lines: Vec<String> = logs_result
        .lines()
        .map(|line| format!("{}\n", line))
        .collect();

    let stream = futures_util::stream::iter(
        lines.into_iter().map(|line| Ok(Bytes::from(line)))
    );

    Ok(Box::pin(stream))
}
pub async fn stream_pod_logs_realtime(
    &self,
    pod_name: &str,
    tail_lines: Option<i64>,
) -> Result<Pin<Box<dyn Stream<Item = Result<Bytes, std::io::Error>> + Send>>, AppError> {
    use k8s_openapi::api::core::v1::Pod;
    use kube::api::{Api, LogParams};

    tracing::info!("Real-time streaming logs from specific pod: {}", pod_name);
    let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);

    // Verify pod exists and is ready
    let pod = pods.get(pod_name).await
        .map_err(|e| AppError::internal(&format!("Pod {} not found: {}", pod_name, e)))?;

    if let Some(status) = &pod.status {
        if let Some(phase) = &status.phase {
            tracing::info!("Pod {} is in phase: {}", pod_name, phase);
            if phase != "Running" && phase != "Succeeded" {
                return Err(AppError::internal(&format!("Pod {} is not ready (phase: {})", pod_name, phase)));
            }
        }
    }

    let mut log_params = LogParams {
        follow: true, // Enable real-time streaming
        previous: false,
        since_seconds: None,
        timestamps: true,
        ..Default::default()
    };

    if let Some(tail) = tail_lines {
        log_params.tail_lines = Some(tail);
    }

    let async_buf_read = pods
        .log_stream(pod_name, &log_params)
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
pub async fn get_deployment_logs_merged(
    &self,
    deployment_id: &Uuid,
    tail_lines: Option<i64>,
) -> Result<String, AppError> {
    let pods = self.get_deployment_pods(deployment_id).await?;
    let mut all_logs = Vec::new();

    for pod_info in pods {
        match self.get_pod_logs(&pod_info.name, tail_lines).await {
            Ok(pod_logs) => {
                // Add pod identifier to each log line
                let prefixed_logs: Vec<String> = pod_logs
                    .lines()
                    .map(|line| format!("[{}] {}", pod_info.name, line))
                    .collect();
                all_logs.extend(prefixed_logs);
            }
            Err(e) => {
                tracing::warn!("Failed to get logs from pod {}: {}", pod_info.name, e);
                all_logs.push(format!("[{}] ERROR: Failed to get logs: {}", pod_info.name, e));
            }
        }
    }

    // Sort logs by timestamp if they have timestamps
    all_logs.sort();

    Ok(all_logs.join("\n"))
}

    /// Create or update ingress for custom domain with SSL certificate
    pub async fn create_custom_domain_ingress(
        &self,
        deployment_id: &Uuid,
        domain: &str,
        certificate_secret_name: &str,
    ) -> Result<(), AppError> {
        use k8s_openapi::api::networking::v1::IngressTLS;

        let ingress_name = format!("custom-{}", self.generate_ingress_name(deployment_id));
        let service_name = self.generate_service_name(deployment_id);

        // Get the deployment to determine the port
        let deployments: Api<K8sDeployment> = Api::namespaced(self.client.clone(), &self.namespace);
        let deployment_name = self.generate_deployment_name(deployment_id);
        
        let deployment = deployments
            .get(&deployment_name)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to get deployment: {}", e)))?;

        let port = deployment
            .spec
            .as_ref()
            .and_then(|spec| spec.template.spec.as_ref())
            .and_then(|pod_spec| pod_spec.containers.first())
            .and_then(|container| container.ports.as_ref())
            .and_then(|ports| ports.first())
            .map(|port| port.container_port)
            .unwrap_or(80);

        let ingress = Ingress {
            metadata: ObjectMeta {
                name: Some(ingress_name.clone()),
                namespace: Some(self.namespace.clone()),
                labels: Some(BTreeMap::from([
                    ("app.kubernetes.io/name".to_string(), "custom-domain".to_string()),
                    ("app.kubernetes.io/managed-by".to_string(), "container-engine".to_string()),
                    ("container-engine.io/deployment-id".to_string(), deployment_id.to_string()),
                    ("container-engine.io/custom-domain".to_string(), domain.to_string()),
                ])),
                annotations: Some(BTreeMap::from([
                    ("cert-manager.io/cluster-issuer".to_string(), "letsencrypt-prod".to_string()),
                    ("nginx.ingress.kubernetes.io/ssl-redirect".to_string(), "true".to_string()),
                    ("nginx.ingress.kubernetes.io/force-ssl-redirect".to_string(), "true".to_string()),
                ])),
                ..Default::default()
            },
            spec: Some(IngressSpec {
                tls: Some(vec![IngressTLS {
                    hosts: Some(vec![domain.to_string()]),
                    secret_name: Some(certificate_secret_name.to_string()),
                }]),
                rules: Some(vec![IngressRule {
                    host: Some(domain.to_string()),
                    http: Some(HTTPIngressRuleValue {
                        paths: vec![HTTPIngressPath {
                            path: Some("/".to_string()),
                            path_type: "Prefix".to_string(),
                            backend: IngressBackend {
                                service: Some(IngressServiceBackend {
                                    name: service_name,
                                    port: Some(ServiceBackendPort {
                                        number: Some(port),
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

        // Check if ingress already exists and update, otherwise create
        match ingresses.get(&ingress_name).await {
            Ok(_) => {
                ingresses
                    .replace(&ingress_name, &PostParams::default(), &ingress)
                    .await
                    .map_err(|e| AppError::internal(&format!("Failed to update custom domain ingress: {}", e)))?;

            }
            Err(_) => {
                ingresses
                    .create(&PostParams::default(), &ingress)
                    .await
                    .map_err(|e| AppError::internal(&format!("Failed to create custom domain ingress: {}", e)))?;

            }
        }

        Ok(())
    }

    /// Create Kubernetes secret for SSL certificate
    pub async fn create_ssl_certificate_secret(
        &self,
        secret_name: &str,
        certificate_pem: &str,
        private_key_pem: &str,
    ) -> Result<(), AppError> {
        use k8s_openapi::api::core::v1::Secret;
        use std::collections::BTreeMap;

        let secret = Secret {
            metadata: ObjectMeta {
                name: Some(secret_name.to_string()),
                namespace: Some(self.namespace.clone()),
                labels: Some(BTreeMap::from([
                    ("app.kubernetes.io/managed-by".to_string(), "container-engine".to_string()),
                    ("container-engine.io/certificate-type".to_string(), "ssl".to_string()),
                ])),
                ..Default::default()
            },
            data: Some(BTreeMap::from([
                ("tls.crt".to_string(), k8s_openapi::ByteString(certificate_pem.as_bytes().to_vec())),
                ("tls.key".to_string(), k8s_openapi::ByteString(private_key_pem.as_bytes().to_vec())),
            ])),
            type_: Some("kubernetes.io/tls".to_string()),
            ..Default::default()
        };

        let secrets: Api<Secret> = Api::namespaced(self.client.clone(), &self.namespace);

        // Check if secret already exists and update, otherwise create
        match secrets.get(secret_name).await {
            Ok(_) => {
                secrets
                    .replace(secret_name, &PostParams::default(), &secret)
                    .await
                    .map_err(|e| AppError::internal(&format!("Failed to update SSL certificate secret: {}", e)))?;

            }
            Err(_) => {
                secrets
                    .create(&PostParams::default(), &secret)
                    .await
                    .map_err(|e| AppError::internal(&format!("Failed to create SSL certificate secret: {}", e)))?;

            }
        }

        Ok(())
    }

    /// Remove custom domain ingress
    pub async fn remove_custom_domain_ingress(
        &self,
        deployment_id: &Uuid,
        _domain: &str,
    ) -> Result<(), AppError> {
        let ingress_name = format!("custom-{}", self.generate_ingress_name(deployment_id));
        let ingresses: Api<Ingress> = Api::namespaced(self.client.clone(), &self.namespace);

        match ingresses.delete(&ingress_name, &Default::default()).await {
            Ok(_) => {
                Ok(())
            }
            Err(e) => {
                if e.to_string().contains("NotFound") {
                    info!("Custom domain ingress {} already removed", ingress_name);
                    Ok(())
                } else {
                    Err(AppError::internal(&format!("Failed to remove custom domain ingress: {}", e)))
                }
            }
        }
    }

    /// Remove SSL certificate secret
    pub async fn remove_ssl_certificate_secret(&self, secret_name: &str) -> Result<(), AppError> {
        use k8s_openapi::api::core::v1::Secret;

        let secrets: Api<Secret> = Api::namespaced(self.client.clone(), &self.namespace);

        match secrets.delete(secret_name, &Default::default()).await {
            Ok(_) => {
                info!("Removed SSL certificate secret: {}", secret_name);
                Ok(())
            }
            Err(e) => {
                if e.to_string().contains("NotFound") {
                    info!("SSL certificate secret {} already removed", secret_name);
                    Ok(())
                } else {
                    Err(AppError::internal(&format!("Failed to remove SSL certificate secret: {}", e)))
                }
            }
        }
    }

    /// Get ingress IP or hostname for DNS configuration
    pub async fn get_ingress_endpoint(&self) -> Result<String, AppError> {
        use k8s_openapi::api::core::v1::Service;

        // Try to get the ingress controller service
        let services: Api<Service> = Api::namespaced(self.client.clone(), "ingress-nginx");

        match services.get("ingress-nginx-controller").await {
            Ok(service) => {
                if let Some(status) = service.status {
                    if let Some(load_balancer) = status.load_balancer {
                        if let Some(ingress) = load_balancer.ingress {
                            for ing in ingress {
                                if let Some(ip) = ing.ip {
                                    return Ok(ip);
                                }
                                if let Some(hostname) = ing.hostname {
                                    return Ok(hostname);
                                }
                            }
                        }
                    }
                }
                Err(AppError::internal("Ingress controller service has no external IP/hostname"))
            }
            Err(_) => {
                // Fallback: try to get from any ingress-nginx service
                warn!("Could not find ingress-nginx-controller service, using fallback");
                Ok("127.0.0.1".to_string()) // Fallback for local development
            }
        }
    }

    /// Update environment variables of an existing deployment
    pub async fn update_deployment_env_vars(
        &self,
        deployment_id: &Uuid,
        app_name: &str,
        image: &str,
        port: i32,
        env_vars: &std::collections::HashMap<String, String>,
        replicas: i32,
        resources: Option<&crate::deployment::models::ResourceRequirements>,
        health_check: Option<&crate::deployment::models::HealthCheck>,
    ) -> Result<(), AppError> {
        use k8s_openapi::api::apps::v1::Deployment;
        use k8s_openapi::api::core::v1::EnvVar;

        let deployment_name = self.generate_deployment_name(deployment_id);
        
        info!(
            "Updating environment variables for deployment: {} ({})",
            deployment_name, app_name
        );

        // Validate environment variables before applying
        self.validate_env_vars(env_vars)?;

        let deployments: Api<Deployment> = Api::namespaced(self.client.clone(), &self.namespace);

        // Get existing deployment
        let mut existing_deployment = deployments
            .get(&deployment_name)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to get existing deployment: {}", e)))?;

        // Store original deployment for rollback
        let original_deployment = existing_deployment.clone();

        // Convert env vars to Kubernetes format with additional validation
        let k8s_env_vars: Vec<EnvVar> = env_vars
            .iter()
            .filter_map(|(k, v)| {
                // Skip invalid env var names/values
                if self.is_valid_env_var_name(k) && self.is_valid_env_var_value(v) {
                    Some(EnvVar {
                        name: k.clone(),
                        value: Some(v.clone()),
                        ..Default::default()
                    })
                } else {
                    warn!("Skipping invalid environment variable: {}={}", k, v);
                    None
                }
            })
            .collect();

        // Create resource requirements
        let resources_json = resources.map(|r| serde_json::to_value(r).unwrap_or_default());
        let k8s_resources = self.parse_resource_requirements(&resources_json);

        // Create health check probes
        let health_check_json = health_check.map(|hc| serde_json::to_value(hc).unwrap_or_default());
        let (liveness_probe, readiness_probe) = self.parse_health_probes(&health_check_json, port);

        // Update only the container spec in the existing deployment
        if let Some(ref mut spec) = existing_deployment.spec {
            if let Some(ref mut pod_spec) = spec.template.spec {
                if let Some(container) = pod_spec.containers.first_mut() {
                    // Update container environment variables
                    container.env = if k8s_env_vars.is_empty() { None } else { Some(k8s_env_vars) };
                    
                    // Update other container properties
                    container.image = Some(image.to_string());
                    container.resources = k8s_resources;
                    container.liveness_probe = liveness_probe;
                    container.readiness_probe = readiness_probe;
                }
            }
            
            // Update replicas
            spec.replicas = Some(replicas);
        }

        // Apply the update (using patch to preserve immutable fields)
        match deployments
            .replace(&deployment_name, &Default::default(), &existing_deployment)
            .await
        {
            Ok(_) => {
                info!(
                    "Successfully updated environment variables for deployment: {}",
                    deployment_name
                );

                // Wait and verify the deployment is rolling out successfully
                match self.verify_deployment_update(&deployment_name, 60).await {
                    Ok(_) => {
                        info!("Deployment update verified successfully for: {}", deployment_name);
                        Ok(())
                    }
                    Err(e) => {
                        error!("Deployment update failed verification: {}", e);
                        
                        // Attempt rollback to original state
                        warn!("Attempting rollback for deployment: {}", deployment_name);
                        if let Err(rollback_err) = deployments
                            .replace(&deployment_name, &Default::default(), &original_deployment)
                            .await
                        {
                            error!("Rollback also failed: {}", rollback_err);
                        } else {
                            warn!("Successfully rolled back deployment: {}", deployment_name);
                        }
                        
                        Err(AppError::internal(&format!(
                            "Deployment update failed and was rolled back: {}. Check environment variables format and container configuration.",
                            e
                        )))
                    }
                }
            }
            Err(e) => {
                error!(
                    "Failed to update deployment {} environment variables: {}",
                    deployment_name, e
                );
                Err(AppError::internal(&format!(
                    "Failed to update deployment environment variables: {}. This could be due to invalid environment variable format or Kubernetes resource constraints.",
                    e
                )))
            }
        }
    }

    /// Restart a deployment by performing a rolling restart
    pub async fn restart_deployment(&self, deployment_id: &Uuid) -> Result<(), AppError> {
        use k8s_openapi::api::apps::v1::Deployment;

        use std::collections::BTreeMap;

        let deployment_name = self.generate_deployment_name(deployment_id);
        
        info!("Restarting deployment: {}", deployment_name);

        let deployments: Api<Deployment> = Api::namespaced(self.client.clone(), &self.namespace);

        // Get current deployment
        let current_deployment = deployments
            .get(&deployment_name)
            .await
            .map_err(|e| AppError::internal(&format!("Failed to get deployment for restart: {}", e)))?;

        // Add restart annotation to trigger rolling restart
        let mut deployment = current_deployment.clone();
        let restart_time = chrono::Utc::now().to_rfc3339();
        
        // Add restart annotation to metadata
        if let Some(ref mut annotations) = deployment.metadata.annotations {
            annotations.insert(
                "kubectl.kubernetes.io/restartedAt".to_string(),
                restart_time,
            );
        } else {
            let mut annotations = BTreeMap::new();
            annotations.insert(
                "kubectl.kubernetes.io/restartedAt".to_string(),
                restart_time,
            );
            deployment.metadata.annotations = Some(annotations);
        }

        // Apply the restart annotation
        match deployments
            .replace(&deployment_name, &Default::default(), &deployment)
            .await
        {
            Ok(_) => {
                info!("Successfully triggered restart for deployment: {}", deployment_name);
                Ok(())
            }
            Err(e) => {
                error!("Failed to restart deployment {}: {}", deployment_name, e);
                Err(AppError::internal(&format!("Failed to restart deployment: {}", e)))
            }
        }
    }

    /// Validate environment variables format
    fn validate_env_vars(&self, env_vars: &std::collections::HashMap<String, String>) -> Result<(), AppError> {
        for (key, value) in env_vars {
            if !self.is_valid_env_var_name(key) {
                return Err(AppError::bad_request(&format!(
                    "Invalid environment variable name '{}'. Names must contain only alphanumeric characters and underscores, and cannot start with a number.",
                    key
                )));
            }
            
            if !self.is_valid_env_var_value(value) {
                return Err(AppError::bad_request(&format!(
                    "Invalid environment variable value for '{}'. Values cannot contain null bytes.",
                    key
                )));
            }

            // Check for common problematic patterns
            if value.contains('\n') || value.contains('\r') {
                warn!("Environment variable '{}' contains newline characters which may cause issues", key);
            }

            if value.len() > 131072 { // 128KB limit
                return Err(AppError::bad_request(&format!(
                    "Environment variable '{}' value is too large (max 128KB)",
                    key
                )));
            }
        }
        
        // Check total env vars count (Kubernetes limit is around 1MB for all env vars)
        if env_vars.len() > 1000 {
            return Err(AppError::bad_request("Too many environment variables (max 1000)"));
        }

        Ok(())
    }

    /// Check if environment variable name is valid
    fn is_valid_env_var_name(&self, name: &str) -> bool {
        if name.is_empty() || name.len() > 253 {
            return false;
        }

        // Must start with letter or underscore
        let first_char = name.chars().next().unwrap();
        if !first_char.is_ascii_alphabetic() && first_char != '_' {
            return false;
        }

        // Can only contain alphanumeric characters and underscores
        name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
    }

    /// Check if environment variable value is valid
    fn is_valid_env_var_value(&self, value: &str) -> bool {
        // Cannot contain null bytes
        !value.contains('\0')
    }

    /// Verify deployment update is successful
    async fn verify_deployment_update(&self, deployment_name: &str, timeout_seconds: u64) -> Result<(), AppError> {
        use k8s_openapi::api::apps::v1::Deployment;
        use tokio::time::{sleep, Duration, timeout};

        let deployments: Api<Deployment> = Api::namespaced(self.client.clone(), &self.namespace);
        let start_time = std::time::Instant::now();
        
        // Wait for deployment to be updated
        let result = timeout(Duration::from_secs(timeout_seconds), async {
            loop {
                match deployments.get(deployment_name).await {
                    Ok(deployment) => {
                        if let Some(status) = &deployment.status {
                            let replicas = status.replicas.unwrap_or(0);
                            let ready_replicas = status.ready_replicas.unwrap_or(0);
                            let updated_replicas = status.updated_replicas.unwrap_or(0);
                            let unavailable_replicas = status.unavailable_replicas.unwrap_or(0);

                            info!(
                                "Deployment {} status: {}/{} ready, {}/{} updated, {} unavailable",
                                deployment_name, ready_replicas, replicas, updated_replicas, replicas, unavailable_replicas
                            );

                            // Check if deployment is complete
                            if replicas > 0 && ready_replicas == replicas && updated_replicas == replicas && unavailable_replicas == 0 {
                                return Ok(());
                            }

                            // Check for deployment failure conditions
                            if let Some(conditions) = &status.conditions {
                                for condition in conditions {
                                    if condition.type_ == "Progressing" && condition.status == "False" {
                                        if let Some(reason) = &condition.reason {
                                            if reason == "ProgressDeadlineExceeded" {
                                                return Err(AppError::internal(&format!(
                                                    "Deployment failed: Progress deadline exceeded. Reason: {}",
                                                    condition.message.as_ref().unwrap_or(&"No message".to_string())
                                                )));
                                            }
                                        }
                                    }
                                    
                                    if condition.type_ == "ReplicaFailure" && condition.status == "True" {
                                        return Err(AppError::internal(&format!(
                                            "Deployment failed: Replica failure. Reason: {}",
                                            condition.message.as_ref().unwrap_or(&"No message".to_string())
                                        )));
                                    }
                                }
                            }

                            // Check if we're making progress
                            if start_time.elapsed() > Duration::from_secs(30) && ready_replicas == 0 {
                                // Try to get pod information to provide better error details
                                // Extract deployment ID from deployment name (format: app-{first8chars})
                                let deployment_id_part = deployment_name.replace("app-", "");
                                if deployment_id_part.len() >= 8 {
                                    // This is a simplified check - we'll try to get pods directly by labels
                                    use k8s_openapi::api::core::v1::Pod;
                                    use kube::api::{Api, ListParams};
                                    
                                    let pods: Api<Pod> = Api::namespaced(self.client.clone(), &self.namespace);
                                    if let Ok(pod_list) = pods.list(&ListParams::default().labels(&format!("app={}", deployment_name.replace("app-", "")))).await {
                                        let failed_pods: Vec<_> = pod_list.items.iter()
                                            .filter_map(|p| {
                                                if let (Some(name), Some(status)) = (&p.metadata.name, &p.status) {
                                                    let unknown_status = "Unknown".to_string();
                                                    let phase = status.phase.as_ref().unwrap_or(&unknown_status);
                                                    if phase.contains("Error") || phase.contains("Failed") || 
                                                       (status.container_statuses.as_ref().map_or(false, |cs| 
                                                           cs.iter().any(|c| c.state.as_ref().map_or(false, |s| 
                                                               s.waiting.as_ref().map_or(false, |w| 
                                                                   w.reason.as_ref().map_or(false, |r| 
                                                                       r.contains("CrashLoopBackOff") || r.contains("ImagePullBackOff") || r.contains("ErrImagePull")
                                                                   )
                                                               )
                                                           ))
                                                       )) {
                                                        Some(format!("{}: {}", name, phase))
                                                    } else {
                                                        None
                                                    }
                                                } else {
                                                    None
                                                }
                                            })
                                            .collect();
                                        
                                        if !failed_pods.is_empty() {
                                            return Err(AppError::internal(&format!(
                                                "Deployment update failed - pods are in error state: {}. This is likely due to invalid environment variables or container configuration.",
                                                failed_pods.join(", ")
                                            )));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        return Err(AppError::internal(&format!("Failed to get deployment status: {}", e)));
                    }
                }
                
                sleep(Duration::from_secs(2)).await;
            }
        }).await;

        match result {
            Ok(Ok(())) => Ok(()),
            Ok(Err(e)) => Err(e),
            Err(_) => Err(AppError::internal(&format!(
                "Deployment update verification timed out after {} seconds. Check environment variables and pod logs for details.",
                timeout_seconds
            ))),
        }
    }
}
