# 🤖 Grounded AI Flood Analyst Specification
### Amazon Bedrock Powered Intelligence Without Hallucination

---

## 1. Safety Architecture: The Grounding Principle

In life-safety emergency systems, an LLM must **NEVER** calculate mathematical risk scores, invent road closures, or hallucinate rainfall numbers.

### Core Architectural Guardrail
```
Telemetry & Sensors
       │
       ▼
Deterministic Risk Engine (Lambda)  ──>  Outputs: 87% Risk, 82mm rain, 7m elev
       │
       ▼
Grounding Context Assembler         ──>  Injects JSON facts into Strict Prompt
       │
       ▼
Amazon Bedrock (Claude 3.5)         ──>  Produces Plain-English Explanation & Action Guide
```

The AI's role is strictly confined to **synthesizing verified facts**, **generating human-readable explanations**, and **formulating actionable municipal response recommendations**.

---

## 2. Bedrock System Prompt & Instructions

When a user or dispatcher queries the AI Analyst via `POST /api/ai/explain-risk`, the backend Lambda injects the active zone telemetry and applies the following system prompt:

```text
You are the FloodSense AI Flood Analyst, a mission-critical emergency assistant for municipal authorities and citizens.
You are evaluating flood hazards during severe monsoon conditions.

CRITICAL SAFETY RULES:
1. NEVER fabricate, calculate, or alter numerical risk percentages, rainfall amounts, or elevation values.
2. Rely EXCLUSIVELY on the verified ground-truth JSON data provided in the <telemetry_context> block.
3. If a specific factor is not present in the context, explicitly state that data is unavailable rather than assuming.
4. Always prioritize human life safety, clear transit avoidance advisories, and municipal pump/drainage interventions.
5. Structure your output clearly into:
   - Summary Statement (1 sentence with risk score & primary cause)
   - Core Contributing Drivers (plain-language breakdown of the numbers)
   - Actionable Citizen Safety Directives
   - Municipal Responder Recommended Interventions
```

---

## 3. Dynamic Prompt Assembly & Example

### Input Context Injected by Lambda:
```xml
<telemetry_context>
{
  "zone_id": "KAL001",
  "zone_name": "Kalamboli",
  "current_time": "2026-10-06T11:30:00Z",
  "risk_score": 87,
  "severity": "CRITICAL",
  "metrics": {
    "rainfall_rate_mm_hr": 82,
    "precipitation_3h_accumulated_mm": 131,
    "elevation_meters_msl": 7.0,
    "historical_floods_5yr": 21,
    "drainage_choke_index": 78
  },
  "citizen_reports_summary": {
    "total_recent_reports": 14,
    "peak_water_level": "KNEE",
    "verified_locations": ["Kalamboli Circle underpass", "Sector 1E service road"]
  },
  "active_incidents": [
    { "id": "INC1024", "status": "ACTIVE", "stranded_vehicles": 3 }
  ]
}
</telemetry_context>

User Query: "Why is Kalamboli marked Critical and what routes should commuters avoid right now?"
```

### Bedrock Output Response:
```markdown
### 🔴 Tactical Flood Assessment: Kalamboli (Risk: 87% - CRITICAL)

**Primary Assessment:**  
Kalamboli is currently experiencing a critical flood emergency driven by severe storm rainfall (82 mm/hr) and heavy 3-hour precipitation accumulation (131 mm) pooling in a low-elevation topographical basin (7 meters above sea level).

---

#### 🔍 Why This Area Is Flooding:
- **Intense Runoff:** 131 mm of accumulated rainfall over the past 3 hours has completely saturated the local soil and overwhelmed stormwater culverts.
- **Topographic Depression:** At just 7 meters elevation, drainage gravity outflow is constrained, causing rapid water accumulation.
- **Ground Truth Confirmation:** 14 verified citizen reports confirm standing water has reached **knee-deep levels**, with 3 vehicles currently immobilized near the main underpass.

---

#### 🚗 Citizen Transit Advisories:
1. **AVOID:** Do not attempt to cross the **Kalamboli Circle underpass** or the **Sector 1E service road**.
2. **PARKING:** Immediately move vehicles from basement or underground parking structures to elevated terrain.
3. **EVACUATION:** Ground-floor commercial tenants should elevate sensitive inventory.

---

#### 🚒 Municipal & Response Actions:
1. **Barricade Deployment:** Close entry ramps to the Kalamboli Circle underpass immediately.
2. **Dewatering Units:** Deploy high-capacity mobile dewatering pump units to Sector 1E culvert discharge points.
3. **Public Advisory:** Issue localized SMS broadcast to Ward 14 mobile subscribers via Amazon SNS.
```

---

## 4. Multi-Report Incident Summarization

When multiple citizen reports arrive for the same cluster, the AI Analyst consolidates them into an executive municipal incident briefing:

```python
# Backend AI Service Ingestion Function
def generate_incident_summary(incident_id, reports_list, telemetry):
    prompt = f"""
    Consolidate the following {len(reports_list)} citizen reports into a concise 3-bullet incident situation report:
    Reports: {json.dumps(reports_list)}
    Zone Telemetry: {json.dumps(telemetry)}
    """
    response = bedrock_runtime.invoke_model(
        modelId="anthropic.claude-3-5-haiku-20241022-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 300,
            "messages": [{"role": "user", "content": prompt}]
        })
    )
    return parse_response(response)
```

---

## 5. Cost & Latency Optimization with Model Routing

To maintain rapid responses and optimal cost efficiency:
1. **Claude 3.5 Haiku:** Used for high-volume automated incident summarization and multi-report deduplication (latency $< 600\text{ms}$, minimal token cost).
2. **Claude 3.5 Sonnet:** Used for interactive dispatcher tactical briefings and municipal response recommendation synthesis.
3. **Client-side Caching:** Common zone explanations are cached in DynamoDB/API Gateway for 5 minutes if telemetry values remain within a $\pm 3\%$ threshold.
