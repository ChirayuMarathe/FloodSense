# ☁️ AWS Cloud Architecture Specification
### FloodSense: AI-Powered Hyperlocal Flood Intelligence & Response Platform

---

## 1. Architecture Overview

FloodSense is built entirely upon an **event-driven, serverless cloud architecture** on AWS. Designed for resilience during severe weather events, it decouples ingestion, real-time risk calculation, citizen crowd-sourcing, search indexing, and alerting.

The solution satisfies all **WeMakeDevs AWS Environmental Hacks** mandatory cloud requirements by utilizing native AWS serverless primitives: **AWS Lambda, Amazon API Gateway, Amazon DynamoDB, Amazon S3, Amazon EventBridge, Amazon SNS, Amazon OpenSearch Service, Amazon CloudWatch**, and **Amazon Bedrock**.

```mermaid
flowchart TD
    subgraph Ingestion ["Ingestion & Trigger Layer"]
        EB[Amazon EventBridge<br/>Every 15 Minutes Cron]
        Users[Web Clients & Citizens]
        Responders[Municipal Dispatchers]
    end

    subgraph API ["Gateway & Compute Layer"]
        APIGW[Amazon API Gateway<br/>REST API + CORS]
        L_Risk[AWS Lambda<br/>Risk & Forecast Engine]
        L_Report[AWS Lambda<br/>Citizen Report Ingestion]
        L_Incident[AWS Lambda<br/>Incident & Triage Manager]
        L_AI[AWS Lambda<br/>Bedrock AI Analyst Gateway]
        L_Alert[AWS Lambda<br/>Threshold Monitor]
    end

    subgraph Storage ["Persistence & Query Layer"]
        S3_Data[(Amazon S3<br/>Raw Telemetry & GeoJSON)]
        S3_Media[(Amazon S3<br/>Citizen Photo Uploads)]
        DDB_Zones[(Amazon DynamoDB<br/>Zones & Live Risk)]
        DDB_Reports[(Amazon DynamoDB<br/>Citizen Reports)]
        DDB_Incidents[(Amazon DynamoDB<br/>Emergency Incidents)]
        DDB_Alerts[(Amazon DynamoDB<br/>Historical Alerts)]
        OS[(Amazon OpenSearch Service<br/>Incident Full-Text Search)]
    end

    subgraph Messaging ["Notifications & Observability"]
        SNS[Amazon SNS<br/>Critical Flood Alert Topic]
        CW[Amazon CloudWatch<br/>Logs, Alarms & Metrics]
        Bedrock[Amazon Bedrock<br/>Claude 3.5 Sonnet / Haiku]
    end

    %% Cron Ingestion Flow
    EB -->|cron(*/15 * * * ? *)| L_Risk
    L_Risk -->|Fetch Baselines| S3_Data
    L_Risk -->|Save Risk Scores| DDB_Zones
    L_Risk -->|Check Thresholds (Score > 75)| L_Alert
    L_Alert -->|Publish| SNS
    L_Alert -->|Record Alert| DDB_Alerts

    %% Client Ingestion & API Flow
    Users -->|GET /api/dashboard, /risk, /forecast| APIGW
    Responders -->|GET /api/incidents, /alerts| APIGW
    Users -->|POST /api/reports| APIGW
    Users -->|Direct Pre-Signed Upload| S3_Media
    Users -->|POST /api/ai/explain-risk| APIGW

    APIGW --> L_Risk
    APIGW --> L_Report
    APIGW --> L_Incident
    APIGW --> L_AI

    %% Report Processing Flow
    L_Report -->|Store Raw Report| DDB_Reports
    L_Report -->|Index Metadata| OS
    L_Report -->|Cluster & Verify| L_Incident
    L_Incident -->|Update Active Incident| DDB_Incidents

    %% AI Analyst Flow
    L_AI -->|Fetch Verified Context| DDB_Zones
    L_AI -->|Fetch Active Reports| DDB_Reports
    L_AI -->|Structured Prompt with Data| Bedrock

    %% Observability
    L_Risk -.-> CW
    L_Report -.-> CW
    L_Incident -.-> CW
    APIGW -.-> CW
```

---

## 2. AWS Services Breakdown & Strategic Justification

| Service | Primary Role in FloodSense | Strategic Hackathon Justification |
| :--- | :--- | :--- |
| **Amazon API Gateway** | Managed REST API layer exposing endpoints to React frontend with automatic rate-limiting and validation. | Ensures secure, scalable API facade without maintaining an EC2 reverse proxy. Handles CORS seamlessly. |
| **AWS Lambda** | Stateless compute executing the Risk Calculation Engine, Report Processing, and Alert Evaluation. | Scales to zero under calm weather; instantly handles spikes during extreme monsoon storms without server management. |
| **Amazon DynamoDB** | Ultra-low latency NoSQL key-value store for live zone risk, active citizen reports, incidents, and alerts. | Predictable single-digit millisecond latency; on-demand billing; perfect for partition-based querying by `zone_id`. |
| **Amazon S3** | Object storage hosting raw meteorological datasets, GeoJSON boundary files, and citizen photo evidence. | Cost-effective storage of unstructured assets; direct browser client pre-signed URL uploads prevent Lambda memory bottlenecks. |
| **Amazon EventBridge** | Serverless event bus running cron schedules to trigger automatic weather ingestion every 15 minutes. | Automates continuous risk recalculation without running a perpetual background worker process. |
| **Amazon OpenSearch Service** | Full-text and spatial search engine for historical incident records, affected roads, and text queries. | Enables municipal staff to perform rich queries (e.g. *"floods in Panvel with >80mm rain and road blockage"*). |
| **Amazon SNS** | Push notification service broadcasting urgent flood warnings via SMS, email, and mobile push hooks. | Decouples alert generation from delivery; dispatches critical warnings to thousands of citizens in seconds. |
| **Amazon CloudWatch** | Centralized log ingestion, custom metrics (e.g. `CalculatedCriticalZones`, `ReportProcessingLatency`), and alarms. | Provides operational observability showcased directly during the hackathon evaluation and demo video. |
| **Amazon Bedrock** | Foundation model inference (Claude 3.5 Sonnet/Haiku) generating grounded explanations and action guides. | Provides native AWS AI capabilities with strict zero-data-retention compliance and low-latency API integration. |

---

## 3. Data Pipelines & Lifecycle

### Pipeline A: Automated 15-Minute Risk Pipeline (EventBridge Driven)
1. **Trigger:** Amazon EventBridge rule `FloodSense-TelemetryCron` triggers every 15 minutes (`rate(15 minutes)`).
2. **Fetch:** `RiskEngineLambda` runs:
   - Retrieves live weather observations (rainfall intensity, humidity, barometric pressure) from weather APIs or simulation mocks in S3.
   - Reads geographic zone baselines (elevation, drainage capacity, runoff coefficient) from S3 `s3://floodsense-datasets/zones/`.
   - Reads the latest 3-hour citizen report density from DynamoDB `CitizenReportsTable`.
3. **Compute:** Calculates the 0–100 Risk Index and 3-hour forecast for each zone using deterministic weighting algorithms.
4. **Update:** Batches updates to `ZonesTable` in DynamoDB.
5. **Evaluate:** If `RiskScore >= 75` (Critical threshold) and no active alert exists within the last 45 minutes, invokes `AlertDispatcherLambda`.
6. **Publish:** `AlertDispatcherLambda` writes the alert to DynamoDB and dispatches a notification payload to Amazon SNS.

### Pipeline B: Citizen Ground-Truth Pipeline (Interactive)
1. **Capture:** Citizen opens the mobile-responsive reporting interface, inputs observed water level (`Ankle`, `Knee`, `Waist`, `Severe`), optional notes, and captures a photo.
2. **Media Upload:** Frontend calls API Gateway to request an S3 pre-signed upload URL (`s3://floodsense-reports/photos/<report_id>.jpg`) and uploads the image directly to S3.
3. **Payload Submission:** Frontend submits report JSON via `POST /api/reports`.
4. **Storage & Indexing:** `ReportProcessorLambda`:
   - Validates geolocation falls within supported zones.
   - Saves record in DynamoDB `CitizenReportsTable`.
   - Indexes text and coordinates in Amazon OpenSearch Service.
5. **Incident Clustering:** Lambda queries adjacent reports within a 500-meter radius over the last 90 minutes. If report count exceeds threshold (e.g., $\ge 3$), it creates or links to an **Active Incident** in `IncidentsTable`, immediately flagging it as **Prediction Confirmed**.

### Pipeline C: Grounded AI Analyst Pipeline
1. **Inquiry:** Citizen or Municipal Official queries the AI Analyst (e.g., *"Why is Kalamboli marked Critical and what routes are unsafe?"*).
2. **Grounding Fetch:** `AIAnalystLambda` intercepts request:
   - Queries DynamoDB for Kalamboli's numerical risk telemetry (`risk: 87`, `rainfall: 82mm`, `elevation: 7m`, `historical_incidents: 21`).
   - Queries OpenSearch for recent verified citizen reports in that zone.
3. **Context Injection:** Injects verified facts into a strict, zero-hallucination system prompt.
4. **Inference:** Calls Amazon Bedrock.
5. **Return:** Streams plain-English, actionable explanation back to the user with zero fabricated metrics.

---

## 4. Security & Network Architecture

- **Principle of Least Privilege (IAM):** Every Lambda execution role has narrow IAM policies granting access only to targeted DynamoDB tables, S3 prefixes, and SNS topics.
- **Client Security:** All public API Gateway requests are secured over TLS 1.3 with CORS restrictions enabled for the web client origin.
- **Direct S3 Pre-Signed URLs:** S3 buckets remain completely private (`BlockPublicAcls = true`, `BlockPublicPolicy = true`). Image uploads and downloads use time-limited (15-minute) cryptographic pre-signed URLs.
- **Environment Isolation:** Secrets and configuration endpoints are managed via AWS Systems Manager Parameter Store / AWS Secrets Manager.

---

## 5. Cost & Free-Tier Optimization Strategy

To ensure zero cost during hackathon development and testing:
- **DynamoDB:** Configured with `PAY_PER_REQUEST` (On-Demand) billing to stay well within AWS Free Tier limits (25 read/write capacity units free permanently).
- **Lambda:** Configured with 512 MB ARM64 (Graviton2) architecture for 20% lower latency and optimal performance within the 1 million free requests/month tier.
- **S3:** Standard storage with lifecycle rules deleting temporary test media after 7 days.
- **OpenSearch:** Utilizing OpenSearch Serverless or single t3.small.search instance during development, spun down when idle.
- **CloudWatch:** Log retention set to 3 days to eliminate persistent storage charges.
