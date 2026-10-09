# 🔗 Frontend + AWS Integration Report
### Linking `Flood_Monitoring_V1` (Next.js) Directly to AWS Serverless Backend

---

## 1. Cloned Repository & Setup Overview
We cloned your exact GitHub frontend repository:  
👉 **`https://github.com/ChirayuMarathe/Flood_Monitoring_V1`** into the local workspace at `frontend_repo/`.

Your frontend is a Next.js 16 (App Router) + React 19 + Tailwind CSS + Lucide + Mapbox/Cesium application with 3-city support (*Mumbai, Pune, Navi Mumbai*).

---

## 2. Completed AWS Enhancements in `frontend_repo`

### 1. New AWS Client Module: [`frontend_repo/src/lib/aws/floodsense-aws.ts`](file:///frontend_repo/src/lib/aws/floodsense-aws.ts)
A TypeScript service that bridges the frontend directly to the AWS cloud:
- `fetchAwsDashboardSummary()`: Pulls live metrics from API Gateway $\rightarrow$ DynamoDB.
- `fetchAwsWardRisk(wardId)`: Fetches granular factor breakdown bars (Rainfall 35%, Accumulation 25%, Elevation 15%, etc.).
- `fetchAwsWardForecast(wardId)`: Retrieves 6-hour risk projection curve.
- `submitAwsCitizenReport(input)`: Generates cryptographic pre-signed S3 URL, uploads photo evidence directly to private S3 bucket, and records the report in DynamoDB.
- `fetchAwsActiveIncidents()`: Queries active municipal incident queue.
- `dispatchAwsIncidentAction(id, action, unit)`: Dispatches pumps/barricades.

---

### 2. New Citizen Ground-Truth Reporting Modal: [`CitizenReportModal.tsx`](file:///frontend_repo/src/components/flood-dashboard/CitizenReportModal.tsx)
- Added an interactive mobile-ready modal for ground crowd-sourcing:
  - Ward selector (Kurla, Dadar, Kalamboli, etc.)
  - Depth selector chips (*Road Wet, Ankle Deep, Knee Deep, Waist Deep, Severe Deluge*)
  - Photo attachment with live image preview
  - Direct S3 binary upload
  - Success screen showing `Status: PREDICTION_CONFIRMED`
- Integrated directly into the main application navigation header in [`frontend_repo/src/app/(app)/layout.tsx`](file:///frontend_repo/src/app/%28app%29/layout.tsx) with a prominent **"Report Flooding"** action button.

---

### 3. Native Amazon Bedrock Priority Routing: [`frontend_repo/src/app/api/rag-alert/route.ts`](file:///frontend_repo/src/app/api/rag-alert/route.ts)
- Upgraded the AI alert route:
  - If `NEXT_PUBLIC_FLOODSENSE_API_URL` is set, it calls the **AWS Bedrock (Claude 3.5)** endpoint on API Gateway.
  - Returns `provider: "Amazon Bedrock (Claude 3.5)"`.
  - Automatically falls back to Groq if the AWS API Gateway is offline during local testing.
- Added an **"AWS Bedrock"** badge in the Emergency Terminal header in [`frontend_repo/src/components/flood-dashboard/RAGTerminal.tsx`](file:///frontend_repo/src/components/flood-dashboard/RAGTerminal.tsx).

---

### 4. AWS Cloud Sync Telemetry Badge: [`frontend_repo/src/app/(app)/dashboard/page.tsx`](file:///frontend_repo/src/app/%28app%29/dashboard/page.tsx)
- Replaced the generic indicator with an active **"AWS Cloud Sync (DDB • S3)"** pulsing badge in the dashboard header so judges immediately see the cloud connection during screen recording.

---

### 5. Updated Environment Configuration: [`frontend_repo/.env.example`](file:///frontend_repo/.env.example)
Added the necessary cloud connection parameters:
```env
# AWS SERVERLESS & BEDROCK BACKEND
NEXT_PUBLIC_FLOODSENSE_API_URL="https://YOUR-API-GATEWAY-ID.execute-api.us-east-1.amazonaws.com/prod"
NEXT_PUBLIC_AWS_S3_MEDIA_BUCKET="floodsense-media"
AWS_REGION="us-east-1"
BEDROCK_MODEL_ID="anthropic.claude-3-5-haiku-20241022-v1:0"
```

---

## 3. How to Run & Record the Live Demo

```bash
# 1. Navigate to the frontend directory
cd frontend_repo

# 2. Copy the environment template
cp .env.example .env.local

# 3. Add your deployed API Gateway endpoint in .env.local:
# NEXT_PUBLIC_FLOODSENSE_API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com/prod

# 4. Start the development server
npm run dev
```

When you open `http://localhost:3000`:
1. The **System Dashboard** displays live ward telemetry with the **AWS Cloud Sync (DDB • S3)** badge.
2. The header features the **Report Flooding** button—clicking it lets you submit a live photo to S3 and DynamoDB!
3. The **Emergency Terminal** drawer displays tactical briefings powered by **Amazon Bedrock**.
4. You can smoothly toggle over to the **AWS Console tabs** to show judges the DynamoDB records, S3 bucket items, and CloudWatch metrics!
