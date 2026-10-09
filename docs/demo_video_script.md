# 🎬 3-Minute Demo Video Script & Storyboard
### FloodSense: WeMakeDevs Environmental Hacks Submission

> **Strict Rule:** Video runtime must not exceed **3 minutes (180 seconds)**. Keep cadence crisp, authoritative, and focused on working code and real AWS cloud components.

---

## ⏱️ Video Timing & Sequence Matrix

| Timestamp | Segment Name | Visual / Screen Focus | Spoken Narration |
| :---: | :--- | :--- | :--- |
| **0:00 – 0:25** | **The Real Problem** | Title slide $\rightarrow$ B-roll of flooded urban underpasses & weather app saying *"Heavy Rain"*. | *"Every monsoon, cities don't just face heavy rainfall—they face extreme, highly localized flooding. While one neighborhood remains completely safe, an underpass three kilometers away is waist-deep in water. Current systems simply tell people: 'It's raining.' But citizens and municipal authorities need to know: Which specific streets will flood, at what hour, why, and what must be done right now?"* |
| **0:25 – 0:55** | **The Platform & Live Map** | FloodSense Command Center UI. Dark-mode dashboard with live telemetry cards and color-coded map. | *"Introducing FloodSense: an AI-powered hyperlocal flood intelligence and response platform built entirely on AWS Serverless. At the center is our real-time Flood Risk Map. Monitored zones receive a 0 to 100 risk score based on rainfall intensity, accumulated water, elevation, and historical drainage vulnerability."* |
| **0:55 – 1:30** | **Explainable Risk & Forecast** | Mouse clicks on **Kalamboli** polygon (🔴 87%). Factor breakdown drawer slides out with forecast graph. | *"When we click on Kalamboli, the system doesn't just display 87% Critical risk—it explains why: 28 points from storm intensity, 21 from 3-hour accumulation, and 13 from its low 7-meter elevation basin. Furthermore, our forward forecast graph shows authorities that water levels will cross critical thresholds between 2 PM and 3 PM, giving responders precious lead time before roads submerge."* |
| **1:30 – 2:05** | **Citizen Report & Verification** | Switch to mobile view. Submit *"Knee Deep"* report with photo. Map updates with new pin; status updates to **Prediction Confirmed**. | *"FloodSense closes the loop between predictive models and ground reality through crowd-sourced verification. A citizen on the ground opens the mobile app, logs 'Knee-deep water', and uploads a photo directly to Amazon S3. The moment reports cluster in Kalamboli, FloodSense correlates them with our risk model and updates the incident status to 'Prediction Confirmed'—providing verifiable ground truth."* |
| **2:05 – 2:35** | **Response Center & AI Analyst** | Click **Response Center**. Open **Incident #1024**. Query the **AI Flood Analyst**. | *"In the Municipal Response Center, authorities see prioritized incidents and tactical deployment recommendations. When we ask our AI Flood Analyst for guidance, it queries Amazon Bedrock with verified telemetry. Crucially, the AI never guesses the numbers—it strictly translates our deterministic risk engine data into immediate tactical directives, recommending pump deployments and road diversions."* |
| **2:35 – 2:50** | **AWS Architecture in Console** | Switch browser tabs to AWS Console: Lambda functions, DynamoDB tables, S3 bucket, and CloudWatch metrics. | *"Under the hood, FloodSense runs on AWS: Amazon EventBridge triggers our Lambda risk calculations every 15 minutes, persisting telemetry to Amazon DynamoDB. Citizen imagery uploads securely to Amazon S3, critical alerts dispatch through Amazon SNS, and system health is monitored via Amazon CloudWatch."* |
| **2:50 – 3:00** | **Call to Action & Closing** | FloodSense logo: *Predict. Verify. Respond.* | *"FloodSense moves urban disaster management from reactive observation to proactive, localized intelligence. Predict. Verify. Respond. Thank you."* |

---

## 🎥 Pre-Recording Checklist

- [ ] **Browser Tabs Prepared:**
  1. Main FloodSense React application running on `localhost:5173` or deployed Vercel URL.
  2. AWS Console Tab 1: **AWS Lambda** (Functions: `RiskEngine`, `ReportProcessor`).
  3. AWS Console Tab 2: **Amazon DynamoDB** (Items view of `FloodsenseZones` & `FloodsenseIncidents`).
  4. AWS Console Tab 3: **Amazon S3** (`floodsense-media` bucket showing uploaded photos).
  5. AWS Console Tab 4: **Amazon CloudWatch** (Dashboard with invocation charts).
- [ ] **Screen Resolution:** Recorded at 1080p (1920x1080) at 60 FPS.
- [ ] **Audio:** Clear microphone audio without background fan or keyboard clicks.
- [ ] **Cadence:** Maintain steady speaking tempo. Practice reading against a stopwatch to ensure the speech ends precisely at the 2:55 mark.
