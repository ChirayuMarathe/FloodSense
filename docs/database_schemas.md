# 🗄️ Database Schemas & Storage Design
### Amazon DynamoDB, Amazon S3 & Amazon OpenSearch Service

---

## 1. Amazon DynamoDB Design

FloodSense uses DynamoDB for ultra-low latency, serverless key-value persistence. Tables are configured with **On-Demand Capacity** (`PAY_PER_REQUEST`) to scale effortlessly without pre-warming.

---

### Table 1: `FloodsenseZones`
Stores spatial metadata and live operational risk indicators for each geographic ward/zone.

- **Partition Key (`PK`):** `zone_id` (String, e.g., `"KAL001"`)
- **Sort Key (`SK`):** None (Unique per zone)

#### Attribute Schema & Types:
```json
{
  "zone_id": { "S": "KAL001" },
  "name": { "S": "Kalamboli" },
  "ward_number": { "N": "14" },
  "district": { "S": "Navi Mumbai" },
  "latitude": { "N": "19.0222" },
  "longitude": { "N": "73.1042" },
  "elevation_meters": { "N": "7.0" },
  "drainage_capacity_index": { "N": "42" },
  "historical_flood_count": { "N": "21" },
  "current_risk": { "N": "87" },
  "severity": { "S": "CRITICAL" },
  "rainfall_rate_mm": { "N": "82.0" },
  "accumulated_rain_3h_mm": { "N": "131.0" },
  "active_citizen_reports": { "N": "14" },
  "status": { "S": "INCIDENT_ACTIVE" },
  "last_calculated_at": { "S": "2026-10-06T11:30:00Z" }
}
```

---

### Table 2: `FloodsenseRiskTelemetry`
Stores chronological time-series observations and risk scores to power forecast trends and historical analysis.

- **Partition Key (`PK`):** `zone_id` (String)
- **Sort Key (`SK`):** `timestamp` (String, ISO 8601, e.g., `"2026-10-06T11:30:00Z"`)
- **TTL Attribute:** `ttl_timestamp` (Number, Epoch timestamp set to 30 days retention)

#### Attribute Schema:
```json
{
  "zone_id": { "S": "KAL001" },
  "timestamp": { "S": "2026-10-06T11:30:00Z" },
  "risk_score": { "N": "87" },
  "severity": { "S": "CRITICAL" },
  "factor_breakdown": {
    "M": {
      "rainfall_score": { "N": "82.0" },
      "accumulation_score": { "N": "87.3" },
      "elevation_score": { "N": "89.5" },
      "historical_score": { "N": "84.0" },
      "citizen_score": { "N": "82.0" }
    }
  },
  "raw_rainfall_mm": { "N": "82.0" },
  "ttl_timestamp": { "N": "1793794200" }
}
```

---

### Table 3: `FloodsenseCitizenReports`
Stores verified and unverified citizen flood observations submitted from the mobile interface.

- **Partition Key (`PK`):** `report_id` (String, e.g., `"REP-20261006-0901"`)
- **Sort Key (`SK`):** None
- **Global Secondary Index (GSI):** `ZoneTimestampIndex`
  - **GSI PK:** `zone_id`
  - **GSI SK:** `timestamp`

#### Attribute Schema:
```json
{
  "report_id": { "S": "REP-20261006-0901" },
  "zone_id": { "S": "KAL001" },
  "timestamp": { "S": "2026-10-06T11:32:00Z" },
  "latitude": { "N": "19.0234" },
  "longitude": { "N": "73.1051" },
  "water_level": { "S": "KNEE" },
  "description": { "S": "Water reached knee level near Kalamboli circle underpass. Sedans stranded." },
  "photo_s3_key": { "S": "reports/REP901_flood_img.jpg" },
  "verification_status": { "S": "CONFIRMED" },
  "linked_incident_id": { "S": "INC1024" },
  "reporter_device_id": { "S": "anon-device-9842" },
  "upvotes": { "N": "4" }
}
```

---

### Table 4: `FloodsenseIncidents`
Stores clustered, actionable emergency incidents managed by municipal response teams.

- **Partition Key (`PK`):** `incident_id` (String, e.g., `"INC1024"`)
- **Sort Key (`SK`):** None
- **Global Secondary Index (GSI):** `StatusSeverityIndex`
  - **GSI PK:** `status` (`ACTIVE`, `CONTAINED`, `RESOLVED`)
  - **GSI SK:** `severity` (`CRITICAL`, `HIGH`, `MODERATE`)

#### Attribute Schema:
```json
{
  "incident_id": { "S": "INC1024" },
  "zone_id": { "S": "KAL001" },
  "location_name": { "S": "Kalamboli Highway Underpass" },
  "severity": { "S": "CRITICAL" },
  "status": { "S": "ACTIVE" },
  "risk_score_at_trigger": { "N": "87" },
  "report_count": { "N": "14" },
  "affected_roads": {
    "L": [
      { "S": "Sion-Panvel Expressway Service Road" },
      { "S": "Steel Market Road Sector 1E" }
    ]
  },
  "recommended_actions": {
    "L": [
      { "S": "Barricade underpass entrance" },
      { "S": "Dispatch Pump Unit 3" },
      { "S": "Alert Ward 14 control room" }
    ]
  },
  "deployed_units": { "L": [{ "S": "Pump Unit 3" }] },
  "created_at": { "S": "2026-10-06T10:15:00Z" },
  "updated_at": { "S": "2026-10-06T11:30:00Z" }
}
```

---

### Table 5: `FloodsenseAlerts`
Chronological registry of broadcasted emergency advisories dispatched via Amazon SNS.

- **Partition Key (`PK`):** `alert_id` (String, e.g., `"ALT1024"`)
- **Sort Key (`SK`):** None

#### Attribute Schema:
```json
{
  "alert_id": { "S": "ALT1024" },
  "zone_id": { "S": "KAL001" },
  "location": { "S": "Kalamboli" },
  "severity": { "S": "CRITICAL" },
  "headline": { "S": "CRITICAL FLOOD ALERT: Kalamboli Basin" },
  "risk_score": { "N": "87" },
  "expected_window": { "S": "14:00 - 17:00" },
  "reason": { "S": "Heavy precipitation (82mm) + low elevation basin + chronic drainage choke" },
  "status": { "S": "ACTIVE" },
  "issued_at": { "S": "2026-10-06T11:15:00Z" }
}
```

---

## 2. Amazon S3 Bucket Architecture

Two dedicated S3 buckets organize static datasets and dynamic user-uploaded assets:

### Bucket 1: `floodsense-datasets-<account-id>`
Hosts geographic reference data and weather ingest caches:
```
s3://floodsense-datasets/
├── geojson/
│   ├── navi_mumbai_wards.geojson
│   └── drainage_networks.geojson
├── elevation/
│   └── elevation_contours_10m.json
├── historical/
│   ├── monsoon_floods_2022_2025.json
│   └── vulnerability_baselines.json
└── telemetry_cache/
    └── latest_weather_snapshot.json
```

### Bucket 2: `floodsense-media-<account-id>`
Stores user evidence photos submitted through pre-signed S3 links:
```
s3://floodsense-media/
├── reports/
│   ├── 2026-10-06/
│   │   ├── REP901_underpass_water.jpg
│   │   └── REP902_street_view.jpg
└── reports_thumbnails/
    └── 2026-10-06/
        └── REP901_thumb.jpg
```
- **Lifecycle Rule:** Move raw photos to `S3 Glacier Flexible Retrieval` after 60 days; expire thumbnails after 90 days.

---

## 3. Amazon OpenSearch Service Mapping

Used by municipal authorities to execute multi-condition historical search queries (e.g. *"Find past incidents in Panvel where rainfall exceeded 80mm and water level was knee-deep"*).

### Index: `floodsense-incident-archive`
```json
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "incident_id": { "type": "keyword" },
      "zone_id": { "type": "keyword" },
      "zone_name": { "type": "text" },
      "timestamp": { "type": "date" },
      "risk_score": { "type": "integer" },
      "severity": { "type": "keyword" },
      "rainfall_mm": { "type": "float" },
      "water_level": { "type": "keyword" },
      "description": { "type": "text" },
      "affected_roads": { "type": "text" },
      "pin_location": { "type": "geo_point" }
    }
  }
}
```
