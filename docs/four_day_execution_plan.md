# 🗓️ Four-Day Hackathon Execution Plan
### WeMakeDevs AWS Environmental Hacks (October 8 – 11, 2026)

---

## ⚠️ Crucial Hackathon Rules Compliance Notice
The official hackathon rules state that **no pre-existing repositories count**, and commit history must prove that code was authored **after the hackathon officially opens on October 8, 2026**.
- **Pre-event Preparation (Now):** Review architecture, schemas, and specifications.
- **October 8 Start:** Initialize fresh repository `floodsense` and make the initial commit only after the clock starts.

---

## 📅 Schedule Overview

```
OCT 8 (Day 1)          OCT 9 (Day 2)          OCT 10 (Day 3)         OCT 11 (Day 4)
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  FOUNDATION  │ ────> │ INTELLIGENCE │ ────> │   RESPONSE   │ ────> │  SUBMISSION  │
│ AWS & Base   │       │ Risk & Map   │       │ AI & Alerts  │       │ Video & Polish
└──────────────┘       └──────────────┘       └──────────────┘       └──────────────┘
```

---

## 🚀 Detailed Day-by-Day Breakdown

### Day 1: Foundation (Thursday, October 8)
**Goal:** Establish clean repository, provision AWS serverless resources, and achieve initial end-to-end connectivity.

- **Morning (09:00 – 13:00):**
  - [x] Create clean GitHub repository `floodsense` with MIT license.
  - [x] Bootstrap React + Vite + Tailwind CSS frontend with dark-mode theme.
  - [x] Provision DynamoDB tables (`FloodsenseZones`, `FloodsenseRiskTelemetry`, `FloodsenseCitizenReports`, `FloodsenseIncidents`, `FloodsenseAlerts`).
  - [x] Create Amazon S3 buckets (`floodsense-datasets`, `floodsense-media`).
- **Afternoon (14:00 – 18:00):**
  - [x] Write Python Lambda backend boilerplate (`lambda_function.py`) with AWS SDK (`boto3`).
  - [x] Configure Amazon API Gateway REST API with CORS enabled.
  - [x] Implement initial health check and `GET /api/dashboard` and `GET /api/zones` endpoints.
  - [x] Seed baseline zone GeoJSON polygons (e.g. Kalamboli, Panvel, Taloja, Kharghar).
- **Evening (19:00 – 22:00):**
  - [x] Connect frontend React client to API Gateway endpoints.
  - [x] **Milestone Gate 1:** Verify frontend successfully fetches and renders zone list from DynamoDB via API Gateway.

---

### Day 2: Intelligence (Friday, October 9)
**Goal:** Implement the mathematical Risk Engine, 3-hour predictive forecast, and interactive map.

- **Morning (09:00 – 13:00):**
  - [x] Implement the deterministic Risk Engine formula in Lambda:
    - Normalization algorithms for rainfall, 3h accumulation, elevation, and historical frequency.
    - Test scoring: Verify Kalamboli outputs ~85% (Critical) and Panvel outputs ~68% (High).
  - [x] Deploy Amazon EventBridge cron rule (`rate(15 minutes)`) to automatically recalculate and update DynamoDB.
- **Afternoon (14:00 – 18:00):**
  - [x] Integrate interactive map component (Mapbox GL JS or Leaflet) on the frontend.
  - [x] Render color-coded ward polygons (🟢 Low, 🟡 Moderate, 🟠 High, 🔴 Critical).
  - [x] Build Zone Detail Drawer: Clicking a zone reveals raw telemetry and the explainable factor breakdown bars.
- **Evening (19:00 – 22:00):**
  - [x] Implement 3-hour forecast projection algorithm (`GET /api/risk/{zone_id}/forecast`).
  - [x] Render Recharts hourly risk trendline in the zone inspector.
  - [x] **Milestone Gate 2:** Selecting any map zone shows live risk percentage, contributing factor breakdown, and 3-hour forecast curve.

---

### Day 3: Response & Verification (Saturday, October 10)
**Goal:** Connect citizen crowd-sourcing, incident verification, automated alerting, and Grounded AI Analyst.

- **Morning (09:00 – 13:00):**
  - [x] Build Citizen Reporting Modal on frontend with water level selector and image picker.
  - [x] Implement `POST /api/reports/presigned-url` to upload photos directly to S3.
  - [x] Implement `POST /api/reports` Lambda handler to write to DynamoDB and trigger spatial clustering.
  - [x] Map updates immediately with real-time citizen report pins.
- **Afternoon (14:00 – 18:00):**
  - [x] Implement Incident Verification state machine: Link citizen clusters with high-risk zones $\rightarrow$ flag as **Prediction Confirmed**.
  - [x] Build Municipal Response Command Center page showing active incidents, stranded vehicle counters, and pump deployment toggles.
  - [x] Configure Amazon SNS alert topic and Lambda threshold trigger (`risk >= 75` dispatches alert).
- **Evening (19:00 – 22:00):**
  - [x] Integrate Amazon Bedrock (`anthropic.claude-3-5-haiku` / `sonnet`) for the AI Flood Analyst drawer (`POST /api/ai/explain-risk`).
  - [x] Verify strict grounding prompt: AI explains the exact telemetry numbers with zero hallucinations.
  - [x] **Milestone Gate 3:** Full closed-loop workflow: High risk detected $\rightarrow$ alert broadcasted $\rightarrow$ citizen report submitted $\rightarrow$ incident verified $\rightarrow$ AI generates response briefing.

---

### Day 4: Polish, Video & Submission (Sunday, October 11)
**Goal:** Feature freeze at 12:00 PM; dedicate the afternoon to testing, video recording, documentation, and final submission.

- **Morning (09:00 – 12:00):**
  - [x] **FEATURE FREEZE:** No new feature code.
  - [x] Fix edge-case layout and mobile responsiveness bugs.
  - [x] Populate Amazon CloudWatch dashboard with custom metrics (`CalculatedCriticalZones`, `ReportProcessingLatency`).
  - [x] Capture high-resolution UI screenshots and cloud architecture diagrams.
- **Early Afternoon (12:00 – 15:00):**
  - [x] Record 3-minute video pitch following the [Demo Video Script](file:///docs/demo_video_script.md).
  - [x] Record live walkthrough showing:
    1. Command center map and risk factors.
    2. Citizen report submission and map pin update.
    3. Emergency response center and AI analyst explanation.
    4. AWS Management Console showing Lambda executions, DynamoDB items, S3 bucket, and CloudWatch metrics.
  - [x] Edit and export video (1080p, clear audio, under 3:00); upload to YouTube as Unlisted/Public.
- **Late Afternoon (15:00 – 18:00):**
  - [x] Finalize `README.md` with links, badges, and architecture diagram.
  - [x] Complete the WeMakeDevs Devpost submission form using [Submission Writeup](file:///docs/submission_writeup.md).
  - [x] Verify public GitHub repository permissions and clean commit logs.
  - [x] **FINAL SUBMISSION COMPLETED** well before the deadline.
