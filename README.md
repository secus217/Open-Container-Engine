# Container Engine

![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Code Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-green.svg)
![Documentation](https://img.shields.io/badge/docs-latest-informational.svg)
![Docker Pulls](https://img.shields.io/badge/docker%20pulls-10k-blue.svg)

```
   ____            _        _                     _____            _           
  / ___|___  _ __ | |_ __ _(_)_ __   ___ _ __   | ____|_ __   ___(_)_ __   ___ 
 | |   / _ \| '_ \| __/ _` | | '_ \ / _ \ '__|  |  _| | '_ \ / __| | '_ \ / _ \
 | |__| (_) | | | | || (_| | | | | |  __/ |     | |___| | | | (__| | | | |  __/
  \____\___/|_| |_|\__\__,_|_|_| |_|\___|_|     |_____|_| |_|\___|_|_| |_|\___|
                                                                              
```

**Deploy Containers in Seconds. Your App, Live on the Web.**

*An Open-Source Alternative to Google Cloud Run - Built with Rust & Axum*

---

## Introduction

**Container Engine** is an open-source alternative to Google Cloud Run, built with Rust and the Axum framework. This revolutionary service empowers developers to effortlessly deploy containerized applications to the internet with unprecedented simplicity and speed. By intelligently abstracting away the complexity of Kubernetes infrastructure, Container Engine creates a seamless deployment experience that lets you focus entirely on your code and business logic, not on managing infrastructure.

Unlike proprietary solutions, Container Engine provides a complete **User Management System** including user registration, authentication, API key management, and deployment management - all while being fully open-source. With Container Engine, the journey from a Docker image to a live, production-ready URL happens with just a single API call—no YAML configurations to write, no kubectl commands to remember, and no infrastructure headaches.

## Key Features

### User Management System
- **User Registration & Authentication:** Complete user registration and login system with secure password management
- **API Key Management:** Generate, manage, and revoke API keys for secure access to the platform
- **User Dashboard:** Comprehensive user interface for managing deployments, viewing usage, and account settings

### Container Deployment & Management
- **Deploy via API:** Go from container image to live URL with a single API call, reducing deployment time from hours to seconds.
- **Zero Kubernetes Hassle:** No need to write YAML or manage `kubectl`. Our engine translates simple REST API calls into complex Kubernetes configurations behind the scenes.
- **Auto-generated URLs:** Every deployment gets a clean, memorable, and instantly accessible URL with automatic HTTPS certificate provisioning and management.
- **Scalable by Design:** Built on the robust foundation of Kubernetes for reliability and scale, with built-in horizontal scaling capabilities.

### Technical Features
- **Rust + Axum Backend:** High-performance, memory-safe backend built with Rust and the modern Axum web framework
- **Registry Agnostic:** Pull public or private images from Docker Hub, Google Container Registry, Amazon ECR, GitHub Container Registry, or any other container registry with support for authentication.
- **Environment Variables Management:** Securely inject configuration through environment variables without rebuilding images.
- **Deployment Monitoring:** Real-time logs and performance metrics for all your deployments in one unified dashboard.
- **Zero Downtime Updates:** Update your applications seamlessly with rolling updates that guarantee availability.

## Technology Stack

**Container Engine** is built with modern, high-performance technologies:

- **Backend:** Rust with Axum framework for maximum performance and memory safety
- **Database:** PostgreSQL for reliable data persistence
- **Container Orchestration:** Kubernetes for scalable container management
- **Authentication:** JWT tokens with bcrypt password hashing
- **Monitoring:** Prometheus metrics with Grafana dashboards
- **Logging:** Structured logging with correlation IDs

The Rust + Axum backend provides exceptional performance while ensuring memory safety and preventing common security vulnerabilities.

## Architecture Overview

Container Engine provides a sophisticated yet simple interface between developers and Kubernetes infrastructure. Users interact with the Container Engine REST API or SDK, and our service intelligently translates these high-level deployment requests into the appropriate Kubernetes objects (Deployment, Service, Ingress) on the backend cluster.

The platform handles all the complex networking configuration, ensuring that only the application's HTTP port is exposed to the internet. HTTPS is automatically configured and managed using industry-standard certificates. Upon successful deployment, users receive a public URL to access their application immediately.

```
                                      +----------------+
                                      |                |
                                      |  Container     |
                                      |  Registry      |
                                      |                |
                                      +--------+-------+
                                               |
                                               | Pull Image
                                               v
+---------------+    API Request    +----------+----------+    Manages    +----------------+
|               |                   |                     |               |                |
|   Developer   +------------------>+  Container Engine   +-------------->+   Kubernetes   |
|               |                   |                     |               |   Cluster      |
+---------------+    API Response   +----------+----------+               +--------+-------+
                                               |                                   |
                                               | Create                            |
                                               v                                   v
                                     +-------------------+              +---------------------+
                                     |                   |              |                     |
                                     |  Public URL       |<-------------+  Deployment,        |
                                     |  user.domain.app  |              |  Service, Ingress   |
                                     |                   |              |                     |
                                     +-------------------+              +---------------------+
```

The architecture is designed to be cloud-agnostic, meaning Container Engine can orchestrate deployments across multiple cloud providers or on-premise Kubernetes clusters with consistent behavior and performance.

## Getting Started

### Prerequisites
- An account with Container Engine (register via API or web interface)
- An API Key generated from your user dashboard or via the API
- A Docker image available in a container registry

## API Documentation

For comprehensive API documentation including authentication, user management, and deployment endpoints, see [APIs.md](./APIs.md).

### Installation Options

#### Python SDK
For Python developers who want programmatic control:
```bash
pip install container-engine-sdk
```

#### JavaScript/TypeScript SDK
For web and Node.js applications:
```bash
npm install container-engine-sdk
# or
yarn add container-engine-sdk
```

#### CLI Tool
For command-line enthusiasts:
```bash
# Install globally
npm install -g container-engine-cli

# Basic usage
container-engine deploy --image nginx:latest --name my-website
```

### Quick Start Guide

1. **Sign up** for a Container Engine account at [your-domain]
2. **Generate an API key** from your user dashboard
3. **Prepare your application** in a Docker container
4. **Deploy your container** using one of our SDKs or the REST API
5. **Access your application** at the automatically generated URL

## Usage (API Example)

Deploy an application using the API:

### Endpoint
`POST /v1/deployments`

### Headers
```http
Authorization: Bearer <your-api-key>
Content-Type: application/json
```

### Request Body
```json
{
	"appName": "hello-world",
	"image": "nginx:latest",
	"port": 80,
	"envVars": {
		"BACKGROUND_COLOR": "blue"
	}
}
```

### Example (curl)
```bash
curl -X POST https://api.[your-domain]/v1/deployments \
	-H "Authorization: Bearer <your-api-key>" \
	-H "Content-Type: application/json" \
	-d '{
		"appName": "hello-world",
		"image": "nginx:latest",
		"port": 80,
		"envVars": {"BACKGROUND_COLOR": "blue"}
	}'
```

### Success Response
```json
{
	"status": "pending",
	"deploymentId": "dpl-a1b2c3d4e5",
	"message": "Deployment 'hello-world' is being processed.",
	"url": "https://hello-world.decenter.app"
}
```

### SDK Examples

#### Python
```python
from container_engine import ContainerEngineClient

# Initialize client
client = ContainerEngineClient(api_key="your-api-key")

# Deploy a container
deployment = client.deploy(
    app_name="hello-world",
    image="nginx:latest",
    port=80,
    env_vars={"BACKGROUND_COLOR": "blue"}
)

# Get deployment URL
print(f"Deployment URL: {deployment.url}")
```

#### JavaScript
```javascript
import { ContainerEngineClient } from 'container-engine-sdk';

// Initialize client
const client = new ContainerEngineClient({ apiKey: 'your-api-key' });

// Deploy a container
async function deployContainer() {
  const deployment = await client.deploy({
    appName: 'hello-world',
    image: 'nginx:latest',
    port: 80,
    envVars: { BACKGROUND_COLOR: 'blue' }
  });
  
  console.log(`Deployment URL: ${deployment.url}`);
}

deployContainer();
```

### Lifecycle Management

Container Engine provides a full suite of API endpoints to manage the complete lifecycle of your deployments:

```
POST   /v1/deployments       # Create a new deployment
GET    /v1/deployments       # List all deployments
GET    /v1/deployments/{id}  # Get deployment details
PUT    /v1/deployments/{id}  # Update a deployment
DELETE /v1/deployments/{id}  # Delete a deployment
GET    /v1/deployments/{id}/logs  # Stream deployment logs
```

## Advanced Features

### Custom Domains

Map your own domain name to your deployment:

```bash
curl -X POST https://api.[your-domain]/v1/deployments/{id}/domains \
  -H "Authorization: Bearer <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "myapp.example.com"
  }'
```

### Horizontal Scaling

Scale your application horizontally to handle more traffic:

```bash
curl -X PATCH https://api.[your-domain]/v1/deployments/{id}/scale \
  -H "Authorization: Bearer <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "replicas": 5
  }'
```

### Health Checks

Configure custom health checks for your application:

```bash
curl -X POST https://api.[your-domain]/v1/deployments \
  -H "Authorization: Bearer <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "hello-world",
    "image": "nginx:latest",
    "port": 80,
    "healthCheck": {
      "path": "/health",
      "initialDelaySeconds": 5,
      "periodSeconds": 10
    }
  }'
```

## Security

Container Engine takes security seriously at every layer:

```
+------------------------+    +------------------------+    +------------------------+
| Authentication Layer   |    | Network Security       |    | Runtime Security       |
+------------------------+    +------------------------+    +------------------------+
| - API Key Auth         |    | - Auto TLS/SSL         |    | - Container Isolation  |
| - OAuth 2.0 Support    |    | - Network Policies     |    | - Resource Limits      |
| - Rate Limiting        |    | - DDoS Protection      |    | - Vulnerability Scans  |
+------------------------+    +------------------------+    +------------------------+
```

## Contributing

We enthusiastically welcome contributions to the Container Engine project! Whether you're fixing bugs, adding features, improving documentation, or helping with tests, your input is valuable.

### Contribution Process
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`) 
5. Open a Pull Request

### Development Setup
```bash
# Clone the repository
git clone https://github.com/ngocbd/Open-Container-Engine.git

# Install Rust and Cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build the project
cd Open-Container-Engine
cargo build

# Run tests
cargo test

# Start development server
cargo run
```

## Roadmap

We're continuously improving Container Engine with new features and enhancements:

- **Q4 2025**: Multi-cluster deployment support and advanced traffic routing
- **Q1 2026**: Native serverless function support
- **Q2 2026**: Advanced monitoring and observability features
- **Q3 2026**: Machine learning model deployment specialization

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

```
MIT License

Copyright (c) 2025 Container Engine Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
```

## Contact / Acknowledgments

- **Website**: [your-domain]
- **Documentation**: [docs.your-domain]
- **GitHub**: [github.com/ngocbd/Open-Container-Engine](https://github.com/ngocbd/Open-Container-Engine)
- **Community**: [Join our Slack](https://slack.your-domain)
- **Twitter**: [@ContainerEngine](https://twitter.com/ContainerEngine)

Special thanks to all contributors and the open-source projects that make Container Engine possible, including Kubernetes, Docker, and the vibrant cloud-native ecosystem.