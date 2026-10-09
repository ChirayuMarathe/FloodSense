# 🧮 Risk Engine Methodology & Formula Specification
### FloodSense: Explainable Numerical Flood Risk Calculation

---

## 1. Architectural Philosophy: Why Explainability Matters

During disaster scenarios, emergency responders and citizens cannot rely on black-box predictions. If an authority is asked to deploy water pumps, barricade roads, or initiate evacuations, they need to know **exactly why** an area is at risk.

> **Engineering Rule:** The AI Large Language Model (LLM) **NEVER** calculates the flood risk score.  
> Numerical calculation is handled strictly by a deterministic, mathematically transparent **Risk Engine** running inside AWS Lambda. The AI layer is solely utilized to convert structured output into plain-English tactical summaries.

```
┌─────────────────────────┐
│ Telemetry & Sensor Data │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Deterministic Formula   │  ──> Output: 87.25% Risk (Score: 87)
│ Inside AWS Lambda       │      Breakdown: Rainfall 31.5, Accum 21.2, etc.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Grounded AI Analyst     │  ──> Plain-English Explanation:
│ (Amazon Bedrock)        │      "Primary risk driven by low elevation (7m)
└─────────────────────────┘      and 131mm 3h rain accumulation."
```

---

## 2. Mathematical Risk Formulation

The Hyperlocal Flood Risk Score is normalized to an index of **0 to 100**, categorized into four operational tiers:

| Score Range | Severity Tier | Map Indicator | Operational Action |
| :---: | :---: | :---: | :--- |
| **0 – 25** | **Low** | 🟢 Green | Routine monitoring; standard transit conditions. |
| **26 – 50** | **Moderate** | 🟡 Yellow | Advisory notice; monitor storm drains; weather alerts active. |
| **51 – 75** | **High** | 🟠 Orange | Municipal response standby; avoid low-lying underpasses. |
| **76 – 100** | **Critical** | 🔴 Red | Immediate alert broadcast; road closures; deploy drainage teams. |

### The Core Formula

$$\text{Risk Score} = \sum_{i=1}^{5} (W_i \times F_i)$$

Where $W_i$ represents the assigned component weight ($\sum W_i = 1.0$), and $F_i$ represents the normalized factor score ($0 \le F_i \le 100$).

$$\begin{aligned}
\text{Risk Score} = & \; 0.35 \times F_{\text{rainfall}} \\
& + 0.25 \times F_{\text{accumulation}} \\
& + 0.15 \times F_{\text{elevation}} \\
& + 0.15 \times F_{\text{history}} \\
& + 0.10 \times F_{\text{citizen}}
\end{aligned}$$

---

## 3. Sub-Factor Normalization Functions

### 1. Real-Time Rainfall Intensity ($F_{\text{rainfall}}$) — Weight: 35%
Monitors the instantaneous rain rate over the preceding 60 minutes ($R_{\text{cur}}$ in mm/hr).
- Minimum baseline: $0\text{ mm/hr}$ $\rightarrow 0$ points
- Extreme deluge saturation limit: $100\text{ mm/hr}$ $\rightarrow 100$ points

$$F_{\text{rainfall}} = \min\left(100, \; \frac{R_{\text{cur}}}{100} \times 100\right)$$

### 2. 3-Hour Accumulated Precipitation ($F_{\text{accumulation}}$) — Weight: 25%
Sustained rainfall saturates ground absorption and overflows stormwater drainage basins ($A_{3\text{h}}$ in mm over past 3 hours).
- Saturation threshold: $150\text{ mm}$ over 3 hours represents maximum vulnerability.

$$F_{\text{accumulation}} = \min\left(100, \; \frac{A_{3\text{h}}}{150} \times 100\right)$$

### 3. Topographic Elevation Vulnerability ($F_{\text{elevation}}$) — Weight: 15%
In coastal or delta cities (e.g. Mumbai, Navi Mumbai, Chennai), low elevation relative to sea level ($E$ in meters) and tidal surge triggers severe backflow.
- Areas at $\le 2\text{m}$ sea level receive maximum vulnerability (100).
- Areas at $\ge 50\text{m}$ sea level receive minimal vulnerability (0).

$$F_{\text{elevation}} = \max\left(0, \; \min\left(100, \; \left(1 - \frac{E - 2}{50 - 2}\right) \times 100\right)\right)$$

### 4. Historical Flood Incident Frequency ($F_{\text{history}}$) — Weight: 15%
Reflects historical chronic waterlogging points based on past municipal event archives ($H_{\text{count}}$ logged over previous 5 monsoon seasons).
- Baseline: 0 events $\rightarrow 0$
- Chronic flood hotspot: $\ge 25$ logged events $\rightarrow 100$

$$F_{\text{history}} = \min\left(100, \; \frac{H_{\text{count}}}{25} \times 100\right)$$

### 5. Verified Citizen Ground Reports ($F_{\text{citizen}}$) — Weight: 10%
Provides real-time ground truth. Individual reports within the zone during the last 2 hours are weighted by reported water severity:
- Road Wet: weight 0.2
- Ankle Deep: weight 0.5
- Knee Deep: weight 0.8
- Waist Deep / Severe: weight 1.0

$$\text{Report Points} = \sum_{k=1}^{N} \text{Weight}_k$$
$$F_{\text{citizen}} = \min\left(100, \; \frac{\text{Report Points}}{10} \times 100\right)$$

---

## 4. End-to-End Calculation Example: Kalamboli Zone

Let us trace a real-world calculation during a monsoon event in the Kalamboli ward:

| Telemetry Variable | Raw Observed Value | Normalization Formula | Factor Score ($F_i$) | Weight ($W_i$) | Weighted Contribution |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **Instant Rainfall ($R_{\text{cur}}$)** | $82\text{ mm/hr}$ | $\frac{82}{100} \times 100$ | **82.0** | 0.35 | **28.70** |
| **3h Accumulation ($A_{3\text{h}}$)** | $131\text{ mm}$ | $\frac{131}{150} \times 100$ | **87.3** | 0.25 | **21.83** |
| **Elevation ($E$)** | $7.0\text{ m}$ | $(1 - \frac{5}{48}) \times 100$ | **89.5** | 0.15 | **13.43** |
| **Historical Incidents ($H_{\text{count}}$)** | 21 events | $\frac{21}{25} \times 100$ | **84.0** | 0.15 | **12.60** |
| **Citizen Reports ($N$)** | 14 reports (Score 8.2) | $\frac{8.2}{10} \times 100$ | **82.0** | 0.10 | **8.20** |
| **Total Composite Score** | | | | **1.00** | **84.76 $\approx$ 85% (CRITICAL)** |

### Resulting Explainability Payload:
```json
{
  "zone_id": "KAL001",
  "zone_name": "Kalamboli",
  "timestamp": "2026-10-06T11:30:00Z",
  "risk_score": 85,
  "severity": "CRITICAL",
  "breakdown": {
    "rainfall_contribution": 28.70,
    "accumulation_contribution": 21.83,
    "elevation_contribution": 13.43,
    "historical_contribution": 12.60,
    "citizen_contribution": 8.20
  },
  "primary_driver": "Sustained 3-hour accumulation (131mm) combined with high storm intensity (82mm/hr) in a low-elevation basin (7m)."
}
```

---

## 5. 3-Hour Predictive Forecast Horizon

Rather than showing only a static snapshot, the engine projects the flood risk trajectory for $T+1$, $T+2$, and $T+3$ hours using atmospheric trend delta $\Delta R$ and runoff rate $K_{\text{runoff}}$:

$$R(t+\Delta t) = R_{\text{cur}} + \Delta R \cdot \Delta t$$
$$A_{3\text{h}}(t+\Delta t) = \max\left(0, \; A_{3\text{h}}(t) + R(t+\Delta t) \cdot \Delta t - K_{\text{drainage}} \cdot \Delta t\right)$$

This allows the UI to plot a predictive risk trend line:
- **11:00 AM:** 42% (Moderate)
- **12:00 PM:** 58% (High)
- **01:00 PM:** 71% (High)
- **02:00 PM:** **85% (Critical)** $\rightarrow$ *Warning: Critical surge anticipated within 180 minutes.*

---

## 6. Future Machine Learning Augmentation Pathway

Post-hackathon or during Phase 2, this rule-based baseline provides the exact labeled dataset needed to train an **XGBoost / LightGBM** model hosted on **Amazon SageMaker**:
- **Features:** Soil moisture indices, radar reflectivity dBZ, tidal surge tables, culvert drain capacities.
- **Labels:** Binary ground flooding verified by citizen incident confirmations.
- **Dual-Mode Ensemble:** The deterministic algorithm remains the safety fallback if model inference encounters drift or edge-case missing sensor values.
