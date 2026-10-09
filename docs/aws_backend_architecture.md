# 🚀 AWS Backend & Infrastructure Deep-Dive
### FloodSense: Production-Ready Serverless Cloud Implementation

Since your **UI and frontend components are already built and proven in V1**, 100% of the hackathon engineering effort is directed into the **AWS Cloud Backend**.

This document outlines the complete AWS serverless architecture, resource configurations, deployment mechanisms, and how the frontend hooks into live AWS endpoints.

---

## 🏗️ Master AWS Cloud Architecture

```mermaid
flowchart TB
    subgraph Client ["Existing V1 UI (Vercel / Local)"]
        UI_Map[Map & Ward Cards]
        UI_Report[Citizen Photo & Report Form]
        UI_AI[AI Analyst Chat Drawer]
        UI_Response[Emergency Incident Center]
    end

    subgraph APIGW ["Amazon API Gateway (REST API)"]
        R_Zones["GET /api/zones"]
        R_Risk["GET /api/risk/{id}"]
        R_Forecast["GET /api/risk/{id}/forecast"]
        R_Presigned["POST /api/reports/presigned-url"]
        R_Reports["POST /api/reports"]
        R_Incidents["GET /api/incidents"]
        R_AI["POST /api/ai/explain-risk"]
    end

    subgraph Compute ["AWS Lambda Execution Layer (Python 3.12 / Graviton)"]
        L_Risk["RiskEngineLambda<br/>• Normalization & scoring<br/>• 3h forward forecast<br/>• DynamoDB batch write"]
        L_Report["ReportProcessorLambda<br/>• S3 pre-signed URL gen<br/>• Spatial clustering<br/>• Incident confirmation"]
        L_AI["BedrockAIAnalystLambda<br/>• DynamoDB telemetry fetch<br/>• Anti-hallucination prompt<br/>• Claude 3.5 Sonnet / Haiku"]
        L_Incident["IncidentManagerLambda<br/>• Active triage updates<br/>• OpenSearch index query"]
    end

    subgraph Storage ["Amazon DynamoDB (On-Demand Capacity)"]
        DDB_Zones[("FloodsenseZones<br/>PK: zone_id")]
        DDB_Telemetry[("FloodsenseRiskTelemetry<br/>PK: zone_id, SK: timestamp")]
        DDB_Reports[("FloodsenseCitizenReports<br/>PK: report_id, GSI: zone_id")]
        DDB_Incidents[("FloodsenseIncidents<br/>PK: incident_id, GSI: status")]
        DDB_Alerts[("FloodsenseAlerts<br/>PK: alert_id")]
    end

    subgraph ObjectStorage ["Amazon S3 Buckets"]
        S3_Data[("s3://floodsense-datasets<br/>• Ward GeoJSON<br/>• Elevation baselines")]
        S3_Media[("s3://floodsense-media<br/>• Citizen photo uploads")]
    end

    subgraph Automation ["Orchestration & Notification"]
        EB["Amazon EventBridge<br/>cron(*/15 * * * ? *)"]
        SNS["Amazon SNS<br/>Critical Alerts Topic"]
        CW["Amazon CloudWatch<br/>Logs, Alarms & Metrics"]
        Bedrock["Amazon Bedrock<br/>Foundation Model Service"]
    end

    %% Client calls
    UI_Map -->|Fetch Live Data| R_Zones
    UI_Map -->|Fetch Granular Risk| R_Risk
    UI_Report -->|Request Pre-signed URL| R_Presigned
    UI_Report -->|Direct Binary Upload| S3_Media
    UI_Report -->|Submit Report JSON| R_Reports
    UI_AI -->|Query LLM| R_AI
    UI_Response -->|Triage Operations| R_Incidents

    %% API Gateway to Lambda
    R_Zones --> L_Risk
    R_Risk --> L_Risk
    R_Forecast --> L_Risk
    R_Presigned --> L_Report
    R_Reports --> L_Report
    R_Incidents --> L_Incident
    R_AI --> L_AI

    %% Cron Automation
    EB -->|Trigger 15m Recalculation| L_Risk

    %% Lambda to Storage & AWS Services
    L_Risk -->|Read Baselines| S3_Data
    L_Risk -->|Upsert Risk Scores| DDB_Zones
    L_Risk -->|Log Telemetry Time-Series| DDB_Telemetry
    L_Risk -->|Publish if Risk >= 75%| SNS

    L_Report -->|Store Report| DDB_Reports
    L_Report -->|Verify & Cluster| DDB_Incidents

    L_AI -->|Fetch Ground Truth| DDB_Zones
    L_AI -->|Inference (Zero Hallucination)| Bedrock

    L_Incident --> DDB_Incidents

    %% Observability
    L_Risk -.-> CW
    L_Report -.-> CW
    L_AI -.-> CW
```

---

## 📦 What We Are Creating For The AWS Build

To make this completely plug-and-play on AWS:

1. **`infrastructure/cloudformation_template.yaml`**: Complete AWS SAM / CloudFormation template deploying all 5 DynamoDB tables, 2 S3 buckets, SNS Topic, IAM roles, and CloudWatch metrics in 1 command.
2. **`backend/lambdas/risk_engine/lambda_function.py`**: Deterministic risk calculation with exact weights (Rainfall 35%, Accumulation 25%, Elevation 15%, History 15%, Citizen 10%), forecast curve, and threshold alerting.
3. **`backend/lambdas/citizen_reports/lambda_function.py`**: S3 pre-signed URL generation, citizen report ingestion, 500m / 90min spatial clustering, and incident verification.
4. **`backend/lambdas/ai_analyst/lambda_function.py`**: Amazon Bedrock runtime integration (Claude 3.5) with strict telemetry grounding.
5. **`backend/lambdas/incidents/lambda_function.py`**: Incident queue and dispatch checklist manager.
6. **`backend/scripts/seed_dynamodb.py`**: Python script that populates the DynamoDB tables with real ward data (Kurla, Dadar, Andheri East, Kalamboli, Panvel, Taloja) so your app works immediately upon launch.
7. **`frontend_adapter/floodsense_api.js`**: A lightweight drop-in JavaScript file that plugs into your existing V1 React UI and routes all calls to your live API Gateway!
