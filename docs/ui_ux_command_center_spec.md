# 🎨 Frontend UI/UX & Command Center Specification
### FloodSense: Design System, Layouts & Visual Polish

---

## 1. Design Philosophy: Emergency Command Center Aesthetics

Disaster response software demands high contrast, instant legibility under high-stress conditions, and an authoritative visual polish.

### Key Visual Tenets:
- **Dark Mode Command Center:** Sleek deep-slate background (`#0B0F19` and `#111827`) reduces glare and makes vibrant risk colors immediately pop.
- **Vibrant Status Palette:** High-visibility semantic colors for immediate cognitive recognition:
  - 🟢 **Low Risk (0–25):** `Emerald-400` (`#34D399`) / `Emerald-500/20` glow
  - 🟡 **Moderate Risk (26–50):** `Amber-400` (`#FBBF24`) / `Amber-500/20` glow
  - 🟠 **High Risk (51–75):** `Orange-500` (`#F97316`) / `Orange-500/20` glow
  - 🔴 **Critical Risk (76–100):** `Rose-500` (`#F43F5E`) / `Rose-500/25` pulse glow
- **Glassmorphism & Micro-Interactions:** Subtle card borders (`border-white/10`), frosted backdrops (`backdrop-blur-md`), and gentle pulse rings on active emergency incidents.
- **Modern Typography:** `Inter` / `Outfit` font family for crisp numeric readouts and data tables.

---

## 2. Navigation Architecture

```
/
├── 📊 Dashboard (Flood Command Center Overview)
├── 🗺️ Flood Map (Interactive Ward Polygons & Risk Inspector)
├── 🚨 Smart Alerts (Severity-tiered Notifications & Directives)
├── 🚒 Response Center (Municipal Incident Triage & Deployment)
├── 👥 Citizen Reports (Crowd-sourced Observations & Submit Modal)
├── 📈 Historical Analysis (Prediction vs. Reality & Accuracy Metrics)
└── 🤖 AI Flood Analyst (Grounded Bedrock Interactive Briefing)
```

---

## 3. Page Layouts & Component Breakdown

### 3.1 Command Center (`/` or `/dashboard`)
The central landing screen providing instant situational awareness:

1. **Top Metric Strip (4 Cards):**
   - **Active Flood Risks:** e.g., `12 Zones` (with `+2 in last hour` trend indicator)
   - **Critical Hotspots:** e.g., `2 Zones` (flashing red indicator: Kalamboli, Taloja)
   - **Live Citizen Reports:** e.g., `47 Reports` (with 14 verified knee-level)
   - **Broadcasted Alerts:** e.g., `8 Active` (direct link to alerts page)
2. **Centerpiece Map Viewport (60% width):**
   - High-contrast map with overlaid zone polygons colored by risk score.
   - Interactive hover tooltips showing zone name, risk %, and current rainfall.
3. **Zone Inspector Drawer / Side Panel (40% width):**
   - Selected Zone Headline: `Kalamboli (Ward 14) - 87% CRITICAL`
   - **Explainable Factor Contribution Bars:**
     - Rainfall Intensity: `████████ 82% (28.7 pts)`
     - 3-Hour Accumulation: `█████████ 87% (21.8 pts)`
     - Low Elevation Basin: `█████████ 90% (13.4 pts)`
     - Historical Floods: `████████ 84% (12.6 pts)`
     - Citizen Reports: `████████ 82% (8.2 pts)`
   - **6-Hour Predictive Curve (Recharts):** Line graph illustrating risk progression reaching peak at 14:00.

---

### 3.2 Fullscreen Flood Map (`/map`)
Dedicated spatial inspection view:
- **Map Filters:** Toggle layers for *Radar Precipitation Heatmap*, *Topographic Elevation Contours*, *Historical Flood Hotspots*, and *Citizen Report Pins*.
- **Report Pins:** Color-coded markers for individual crowd-sourced reports (clicking opens user photo and description).

---

### 3.3 Smart Alerts (`/alerts`)
Organized chronologically into severity bands:
- **🔴 CRITICAL ALERTS:** Bold red cards featuring location, expected surge window, root causes, and official public safety advice.
- **🟠 HIGH ALERTS:** Caution advisories for adjacent transit corridors.
- **🟡 ADVISORIES:** Standard drainage monitoring updates.
- **Direct SNS Dispatch Hook:** Municipal dispatchers can trigger instant SMS broadcast with a single button.

---

### 3.4 Municipal Response Center (`/incidents`)
Built for emergency dispatchers and municipal engineers:
- **Incident Queue Table:**
  - Incident ID (`INC1024`), Location, Verification Status (`PREDICTION CONFIRMED`), Ground Reports count, Stranded Vehicles count, Assigned Unit status (`Pump Unit 3 Deployed`).
- **One-Click Tactical Deployment Checklists:**
  - [x] Barricade Kalamboli Circle underpass
  - [ ] Dispatch secondary dewatering pump
  - [ ] Broadcast transit rerouting advisory

---

### 3.5 Citizen Reporting Page & Modal (`/reports`)
Accessible on mobile devices for ground observations:
- **Sticky "Report Flooding" Action Button:** High-visibility floating action button.
- **Modal Submission Steps:**
  1. Auto-detect GPS coordinates or select zone dropdown.
  2. One-tap water level chips: *Road Wet*, *Ankle Deep*, *Knee Deep*, *Waist Deep*, *Severe*.
  3. Photo capture / upload with immediate thumbnail preview.
  4. Landmark description input.
  5. Instant submission receipt with tracking ID.

---

### 3.6 Grounded AI Analyst Drawer (`/ai-analyst`)
Natural language assistant interface:
- **Preset Quick Prompts:**
  - *"Why is Kalamboli at critical risk?"*
  - *"Which routes in Navi Mumbai are impassable right now?"*
  - *"Generate emergency briefing for municipal ward officer."*
- **Streaming Response Bubble:** Formatted with markdown headers, bold callouts, and structured action checklists.
- **Telemetry Grounding Badge:** Clickable badge revealing the exact JSON payload fed from DynamoDB into Amazon Bedrock to ensure 100% transparency.

---

### 3.7 Historical Data & Prediction vs. Reality (`/history`)
The technical validation showcase for hackathon judges:
- **Model Evaluation Card:**
  - **Accuracy:** `85.4%`
  - **Precision:** `82.1%`
  - **Recall:** `89.0%`
- **Correlation Matrix Table:** Compares calculated risk score at $T-3\text{h}$ against actual confirmed citizen flood reports, proving real-world model efficacy.
