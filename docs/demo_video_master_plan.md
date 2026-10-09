# 🎬 The 3-Minute Demo Video Master Plan
### Winning the WeMakeDevs Environmental Hacks Judging

> **The Golden Rule from the Judges:**  
> *"There is no live demo, so the video is what the judges see. Three minutes, recorded, to show what it does, who it is for, and where AWS fits."*

This guide gives you the **exact visual storyboard, word-for-word voiceover script, tab-switching timeline, and AWS console checkpoints** to guarantee maximum points across all 5 judging criteria in under 180 seconds.

---

## 🎯 How the Video Hits Every Judging Criterion

| Timestamp | Video Focus | Judging Criterion Satisfied | What Judges Check Off |
| :---: | :--- | :--- | :--- |
| **0:00 – 0:35** | The Problem & Target Users | **01. Idea & Impact** | Real environmental problem identified (monsoon flash floods / waterlogging). Clear target users (citizens & municipal authorities). |
| **0:35 – 1:15** | Live Map & Explainable Risk | **03. Design & Usability** | Anyone can understand the UI: color-coded risk (0–100), transparent factor breakdown bars, and 3-hour forward forecast. |
| **1:15 – 1:50** | Citizen Report & Verification | **04. Execution** | The system *actually works*. Live citizen report with photo submitted $\rightarrow$ status updates to *"Prediction Confirmed"*. |
| **1:50 – 2:40** | AWS Console Walkthrough | **02. Built on AWS** | Indisputable proof of AWS services: Lambda invocations, DynamoDB tables, S3 photo bucket, CloudWatch metrics, EventBridge cron. |
| **2:40 – 3:00** | Grounded AI & Impact Closing | **05. Video Synthesis & Vision** | Amazon Bedrock AI explanation. Memorable tagline: *Predict. Verify. Respond.* |

---

## ⏱️ Second-by-Second Video Storyboard & Script

### 🕒 [0:00 – 0:35] The Problem & Who It Is For
* **Screen View:** Start on a clean title slide / your dark-mode UI homepage (`flood-monitoring-v1`).
* **Visual Action:** Scroll smoothly past the header down to the live ward cards.
* **🎙️ Voiceover (Speak clearly and steadily):**
> *"Every monsoon, cities don't just face heavy rainfall—they face extreme, highly localized flooding. While one neighborhood remains safe, an underpass three kilometers away is waist-deep in water.*
> 
> *Current systems simply tell people: 'It's raining.' But for citizens trying to get home safely, and municipal disaster cells allocating emergency pumps, that's not actionable.*
> 
> *This is **FloodSense**: an AI-powered hyperlocal flood intelligence and response platform built entirely on AWS Serverless."*

---

### 🕒 [0:35 – 1:15] What It Does & Design Usability
* **Screen View:** Switch to the **Command Center / Map view**.
* **Visual Action:** Click on **Kurla (L Ward)** or **Kalamboli** (🔴 87% Critical). The side drawer slides open showing the breakdown bars and forecast curve.
* **🎙️ Voiceover:**
> *"FloodSense transforms flood monitoring from passive observation into explainable risk intelligence.*
> 
> *On our Command Center, every ward receives a 0 to 100 risk score. When a municipal official clicks on Kurla, our system doesn't just show an 87% Critical alert—it explains exactly why: 28 points from instantaneous rainfall rate, 21 points from 3-hour accumulated runoff, and 13 points from low topographic elevation.*
> 
> *Below that, our predictive forecast curve shows authorities that water levels will peak at 2 PM, giving emergency teams precious lead time before roads submerge."*

---

### 🕒 [1:15 – 1:50] The Execution: Working Closed-Loop Workflow
* **Screen View:** Click **Report Flooding** modal (or mobile view).
* **Visual Action:** Select *"Knee Deep"*, choose an image file, and click **Submit Report**. Show the instant confirmation and the incident badge changing to **"PREDICTION CONFIRMED"**.
* **🎙️ Voiceover:**
> *"Crucially, FloodSense closes the loop between predictive models and ground reality through verified citizen reporting.*
> 
> *A citizen on the street opens the reporting interface, tags water at knee level, attaches photo evidence, and submits.*
> 
> *The image uploads directly to Amazon S3 via a cryptographic pre-signed URL, while our Lambda ingestion service clusters the coordinates. The moment reports corroborate the risk model, the incident status automatically elevates to **Prediction Confirmed**—giving municipal dispatchers verified ground truth."*

---

### 🕒 [1:50 – 2:40] Built on AWS: The Cloud Console Walkthrough
* **Screen View:** Switch to browser tabs showing the **AWS Management Console**. *(Judges heavily inspect this segment).*
* **Visual Action (Move through 4 tabs with deliberate cursor movements):**
  1. **Tab 1: Amazon DynamoDB Console** $\rightarrow$ Show `FloodsenseZones` and click `FloodsenseCitizenReports` showing the newly submitted report item.
  2. **Tab 2: AWS Lambda Console** $\rightarrow$ Show `FloodsenseRiskEngine` and `FloodsenseCitizenReportFunction`. Click **Monitor** tab showing the real invocation spikes and sub-100ms duration.
  3. **Tab 3: Amazon S3 Console** $\rightarrow$ Open `floodsense-media-*` showing the uploaded photo under `reports/`.
  4. **Tab 4: Amazon EventBridge Console** $\rightarrow$ Show the `Floodsense15MinRiskCron` rule running active every 15 minutes.
* **🎙️ Voiceover:**
> *"Here is how FloodSense is architected natively on AWS:*
> 
> *First, **Amazon EventBridge** runs an automated cron schedule every 15 minutes, triggering our Python **AWS Lambda** Risk Engine to calculate normalized factor scores without server management.*
> 
> *All telemetry, active alerts, and citizen observations persist in **Amazon DynamoDB** with single-digit millisecond latency, as seen here in our tables.*
> 
> *Citizen evidence photos upload directly to private **Amazon S3** buckets, while critical threshold breaches dispatch through **Amazon SNS**.*
> 
> *Finally, operational health and execution metrics are monitored end-to-end via **Amazon CloudWatch**."*

---

### 🕒 [2:40 – 3:00] Grounded AI Analyst & Closing Pitch
* **Screen View:** Switch back to the web application. Open the **AI Flood Analyst** drawer.
* **Visual Action:** Type *"Why is Kurla critical and what should responders do?"* Show the structured tactical response streaming back.
* **🎙️ Voiceover:**
> *"To support municipal triage, our AI Flood Analyst queries **Amazon Bedrock**. The AI is strictly grounded in our DynamoDB telemetry—never hallucinating numbers, but translating raw hydrological data into immediate tactical directives for pump deployment and traffic diversion.*
> 
> *FloodSense: Predict. Verify. Respond.*
> 
> *Thank you."*

---

## 🖥️ Screen Recording Setup Guide

### 1. Browser Tab Setup (Open in this exact order):
1. **Tab 1:** `http://localhost:3000` or `https://flood-monitoring-v1.vercel.app` (Your Web Application)
2. **Tab 2:** AWS Console $\rightarrow$ **DynamoDB** (`FloodsenseZones` & `FloodsenseCitizenReports` items view)
3. **Tab 3:** AWS Console $\rightarrow$ **Lambda** (`FloodsenseRiskEngine` $\rightarrow$ Monitor tab)
4. **Tab 4:** AWS Console $\rightarrow$ **S3** (`floodsense-media-*` bucket items view)
5. **Tab 5:** AWS Console $\rightarrow$ **EventBridge** (Schedules view)

### 2. Recording Tool Recommendations:
* **OBS Studio (Recommended):** 1080p (1920x1080), 60 FPS, Bitrate: 6000 Kbps. Set a hotkey for Start/Stop.
* **Or Loom / Clipchamp:** Clear screen recording with optional small circular webcam in the bottom corner (showing your face builds strong credibility with judges).

### 3. Audio & Voice Rules:
* **No background noise:** Record in a quiet room with headphones/mic.
* **Pace:** Aim for ~130–140 words per minute. The total script above is ~360 words, which fits naturally into **2 minutes and 45 seconds**, leaving a 15-second safety buffer!
* **Timer:** Keep your phone stopwatch running on your desk so you can watch your seconds live while recording.

---

## 📋 Pre-Flight Recording Checklist

- [ ] Does the video stay **strictly under 3 minutes (0:00 – 2:55)**?
- [ ] Did you clearly name the track (**Heat & Water**) and problem (**monsoon flooding / waterlogging**)?
- [ ] Did you identify the users (**citizens & municipal emergency responders**)?
- [ ] Did you demonstrate a **working end-to-end action** (submitting a report and seeing it verify the model)?
- [ ] Did you show the **AWS Management Console** tabs with real items and Lambda metrics?
- [ ] Is the audio crisp and clear without filler words (*"um", "like"* )?
