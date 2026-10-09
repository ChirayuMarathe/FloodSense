# 📡 REST API Specification
### FloodSense API Gateway & AWS Lambda Endpoints

---

## 1. Global API Standards

- **Base URL:** `https://api.floodsense.org/v1` (or API Gateway Invoke URL `https://{restapi-id}.execute-api.{region}.amazonaws.com/prod`)
- **Format:** JSON (`application/json; charset=utf-8`)
- **Authentication:** 
  - Public citizen endpoints (`GET /zones`, `POST /reports`, `GET /alerts`): Anonymous with API Gateway throttling.
  - Responder endpoints (`GET /incidents`, triage actions): AWS Cognito JWT Authorization (`Authorization: Bearer <token>`).
- **CORS:** Enabled for all standard methods (`GET`, `POST`, `OPTIONS`).

---

## 2. Endpoint Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard` | High-level summary metrics for the main command center. |
| `GET` | `/api/zones` | List all geographic monitoring zones with current risk scores. |
| `GET` | `/api/risk/{zone_id}` | Detailed risk factors and telemetry for a specific zone. |
| `GET` | `/api/risk/{zone_id}/forecast` | 6-hour hourly risk forecast trajectory for a zone. |
| `POST` | `/api/reports` | Submit a new citizen flood observation report. |
| `GET` | `/api/reports` | List recent citizen reports (supports filtering by `zone_id`). |
| `POST` | `/api/reports/presigned-url` | Generate S3 pre-signed URL for direct photo uploads. |
| `GET` | `/api/incidents` | List active emergency flood incidents. |
| `GET` | `/api/alerts` | List active broadcasted alerts sorted by severity. |
| `POST` | `/api/ai/explain-risk` | Query Grounded AI Analyst for plain-language risk breakdown. |

---

## 3. Endpoint Specifications

### 3.1 `GET /api/dashboard`
Retrieves top-level KPIs for the municipal command center.

#### Response `200 OK`
```json
{
  "timestamp": "2026-10-06T11:30:00Z",
  "active_risks_count": 12,
  "critical_zones_count": 2,
  "high_zones_count": 3,
  "moderate_zones_count": 4,
  "low_zones_count": 3,
  "active_alerts_count": 8,
  "citizen_reports_last_24h": 47,
  "unverified_reports_count": 5,
  "top_critical_zones": [
    { "zone_id": "KAL001", "name": "Kalamboli", "risk": 87, "severity": "CRITICAL" },
    { "zone_id": "TAL002", "name": "Taloja MIDC", "risk": 81, "severity": "CRITICAL" }
  ]
}
```

---

### 3.2 `GET /api/zones`
Retrieves all monitored wards/zones with polygon metadata and live status.

#### Response `200 OK`
```json
[
  {
    "zone_id": "KAL001",
    "name": "Kalamboli",
    "district": "Navi Mumbai",
    "coordinates": { "latitude": 19.0222, "longitude": 73.1042 },
    "elevation_m": 7.0,
    "current_risk": 87,
    "severity": "CRITICAL",
    "current_rainfall_mm": 82.0,
    "accumulated_rain_3h_mm": 131.0,
    "active_citizen_reports": 14,
    "status": "INCIDENT_ACTIVE"
  },
  {
    "zone_id": "PAN002",
    "name": "Panvel Old City",
    "district": "Navi Mumbai",
    "coordinates": { "latitude": 18.9894, "longitude": 73.1175 },
    "elevation_m": 12.0,
    "current_risk": 68,
    "severity": "HIGH",
    "current_rainfall_mm": 54.0,
    "accumulated_rain_3h_mm": 92.0,
    "active_citizen_reports": 7,
    "status": "MONITORING"
  }
]
```

---

### 3.3 `GET /api/risk/{zone_id}`
Returns granular telemetry and explainability breakdown for a specific zone.

#### Response `200 OK`
```json
{
  "zone_id": "KAL001",
  "name": "Kalamboli",
  "timestamp": "2026-10-06T11:30:00Z",
  "risk_score": 87,
  "severity": "CRITICAL",
  "factors": {
    "rainfall": { "raw": "82 mm/hr", "score": 82, "weight": 0.35, "contribution": 28.7 },
    "accumulation": { "raw": "131 mm / 3h", "score": 87.3, "weight": 0.25, "contribution": 21.83 },
    "elevation": { "raw": "7.0 m MSL", "score": 89.5, "weight": 0.15, "contribution": 13.43 },
    "historical_floods": { "raw": "21 events", "score": 84.0, "weight": 0.15, "contribution": 12.6 },
    "citizen_reports": { "raw": "14 reports", "score": 82.0, "weight": 0.10, "contribution": 8.2 }
  },
  "explanation": "Severe risk driven by heavy rain (82mm) and 3h accumulation (131mm) meeting low elevation basin conditions.",
  "recommended_actions": [
    "Inspect culvert 4A on Sion-Panvel Highway",
    "Deploy mobile de-watering pump units to Sector 1E",
    "Issue traffic advisory rerouting vehicles via NH48 bypass"
  ]
}
```

---

### 3.4 `GET /api/risk/{zone_id}/forecast`
Returns a forward-looking hourly projection for the next 6 hours.

#### Response `200 OK`
```json
{
  "zone_id": "KAL001",
  "name": "Kalamboli",
  "forecast": [
    { "time": "12:00", "risk": 72, "severity": "HIGH", "projected_rainfall_mm": 65 },
    { "time": "13:00", "risk": 79, "severity": "CRITICAL", "projected_rainfall_mm": 80 },
    { "time": "14:00", "risk": 87, "severity": "CRITICAL", "projected_rainfall_mm": 85 },
    { "time": "15:00", "risk": 88, "severity": "CRITICAL", "projected_rainfall_mm": 70 },
    { "time": "16:00", "risk": 74, "severity": "HIGH", "projected_rainfall_mm": 40 },
    { "time": "17:00", "risk": 58, "severity": "HIGH", "projected_rainfall_mm": 20 }
  ]
}
```

---

### 3.5 `POST /api/reports/presigned-url`
Requests a secure pre-signed Amazon S3 URL to upload evidence imagery.

#### Request Body
```json
{
  "file_name": "flood_img_kalamboli.jpg",
  "content_type": "image/jpeg"
}
```

#### Response `200 OK`
```json
{
  "upload_url": "https://floodsense-citizen-photos.s3.amazonaws.com/reports/REP901_flood_img.jpg?AWSAccessKeyId=AKIA...&Signature=...",
  "photo_key": "reports/REP901_flood_img.jpg",
  "expires_in_seconds": 900
}
```

---

### 3.6 `POST /api/reports`
Submits a citizen ground observation report into the verification pipeline.

#### Request Body
```json
{
  "zone_id": "KAL001",
  "latitude": 19.0234,
  "longitude": 73.1051,
  "water_level": "KNEE",
  "description": "Water reached knee level near Kalamboli circle underpass. Sedans stranded.",
  "photo_key": "reports/REP901_flood_img.jpg",
  "reporter_device_id": "anon-device-9842"
}
```

#### Response `201 Created`
```json
{
  "report_id": "REP901",
  "status": "PROCESSED",
  "zone_id": "KAL001",
  "cluster_id": "INC1024",
  "verification_status": "CONFIRMED",
  "timestamp": "2026-10-06T11:32:00Z",
  "message": "Report successfully logged and correlated with active incident INC1024."
}
```

---

### 3.7 `GET /api/incidents`
Returns actively triaged incidents for emergency municipal deployment.

#### Response `200 OK`
```json
[
  {
    "incident_id": "INC1024",
    "zone_id": "KAL001",
    "location_name": "Kalamboli Underpass & Sector 1E",
    "risk_score": 87,
    "severity": "CRITICAL",
    "citizen_reports_count": 14,
    "latest_report_summary": "Water reached knee level; 3 stranded vehicles reported.",
    "affected_roads": ["Sion-Panvel Expressway Service Road", "Steel Market Road"],
    "response_team_status": "DEPLOYED",
    "recommended_actions": [
      "Barricade Underpass entrance",
      "Dispatch Pump Unit 3 to Sector 1E drain basin",
      "Broadcast SMS alert to Ward 14 residents"
    ],
    "first_reported_at": "2026-10-06T10:15:00Z",
    "last_updated_at": "2026-10-06T11:30:00Z"
  }
]
```

---

### 3.8 `GET /api/alerts`
Retrieves live broadcasted emergency alerts.

#### Response `200 OK`
```json
[
  {
    "alert_id": "ALT1024",
    "zone_id": "KAL001",
    "location": "Kalamboli",
    "severity": "CRITICAL",
    "headline": "CRITICAL FLOOD ALERT: Kalamboli Basin",
    "risk_score": 87,
    "expected_window": "14:00 - 17:00",
    "cause": "Heavy precipitation (82mm) + low elevation basin + chronic drainage choke",
    "recommended_actions": [
      "Avoid low-lying underpasses and service roads",
      "Move vehicles out of underground parking garages",
      "Follow local municipal evacuation advisories"
    ],
    "issued_at": "2026-10-06T11:15:00Z",
    "status": "ACTIVE"
  }
]
```

---

### 3.9 `POST /api/ai/explain-risk`
Fetches a grounded, natural-language tactical explanation from Amazon Bedrock.

#### Request Body
```json
{
  "zone_id": "KAL001",
  "query": "Why is Kalamboli at 87% risk and what should responders do?"
}
```

#### Response `200 OK`
```json
{
  "zone_id": "KAL001",
  "grounded_risk": 87,
  "explanation": "Kalamboli is currently experiencing critical flood risk (87%) driven by intense rainfall (82 mm/hr) and high 3-hour precipitation accumulation (131 mm). Because the area sits in a low-lying topographic basin (7m elevation) with 21 historical flood records, stormwater drainage capacity is overwhelmed. 14 live citizen reports confirm water has reached knee level near the highway underpass.",
  "recommended_actions": [
    "Immediate traffic diversion away from Kalamboli Circle underpass",
    "Deploy high-capacity mobile dewatering pumps to Sector 1E",
    "Issue emergency warning for ground-floor commercial structures"
  ],
  "source_data_snapshot": {
    "rainfall": 82,
    "accumulation_3h": 131,
    "elevation": 7,
    "historical_incidents": 21,
    "citizen_reports": 14
  }
}
```
