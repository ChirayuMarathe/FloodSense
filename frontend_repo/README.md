# 🌊 FloodSense — 3D Command Center Web Application

An enterprise-grade, 3D geospatial digital twin and municipal flood command center built with **Next.js 14**, **CesiumJS 3D WebGL**, and **AWS Serverless Cloud Integration**.

---

## 🚀 Key Features

* **Volumetric 3D Flood Prisms (CesiumJS WebGL):**
  * Dynamic 3D extruded risk columns (up to 480m) that rise and fall in real-time according to rainfall accumulation and hydrologic runoff load.
  * Luminescent frosted titanium aesthetic with high-contrast glowing edges.
  * De-cluttered tactical HUD micro-pills anchored to 3D column rooftops.
  * Instant isometric 38° tilt and 2D top-down perspective camera controls.
* **Frosted Obsidian Design System:**
  * Clean, high-contrast monochrome design language (Linear/Palantir aesthetic).
  * Clash Grotesk, Satoshi, and JetBrains Mono typography.
  * Seamless dark-mode overlays, mission telemetry stat cards, and threat spectrum ribbons.
* **Comprehensive Command Center Routes:**
  * **`/map`**: Fullscreen 3D Cesium globe with volumetric risk prisms, simulation scrubber, and ward details.
  * **`/dashboard`**: Mission telemetry cards, sorting ward vulnerability assessment table, and live weather telemetry.
  * **`/alerts`**: Unified mission status & threat spectrum ribbon, proportional severity distribution bar, and event timeline.
  * **`/reports`**: Deep-dive analytical dossiers per ward, historical flood matching (2005/2017/2019/2021), and evacuation route inspection.
* **Citizen Ground-Truth & AWS Integration:**
  * Ground-truth photo evidence reporting modal with direct Amazon S3 uploads and Amazon DynamoDB persistence.
  * Real-time sync with Amazon API Gateway backend endpoints.
* **Grounded AI EOC Analyst Terminal:**
  * Natural language intelligence assistant grounded strictly in verified DynamoDB telemetry, eliminating hallucinations.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 14 (App Router)
* **3D Engine:** CesiumJS 1.127+ (WebGL)
* **Styling:** Tailwind CSS, Framer Motion, Lucide Icons
* **State Management:** Zustand
* **Cloud Backend:** AWS Lambda, Amazon API Gateway, Amazon DynamoDB, Amazon S3, Amazon SNS

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_CESIUM_TOKEN="your_cesium_token"
   NEXT_PUBLIC_FLOODSENSE_API_URL="https://jd8e1lou1k.execute-api.ap-south-1.amazonaws.com"
   ```

3. **Run Dev Server:**
   ```bash
   npm run dev
   ```

4. **Open:** Navigate to `http://localhost:3000` in your browser.
