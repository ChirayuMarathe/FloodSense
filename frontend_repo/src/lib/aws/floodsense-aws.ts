/**
 * floodsense-aws.ts
 * AWS Serverless Integration Client for FloodSense Next.js Frontend
 * Connects the UI directly to Amazon API Gateway, DynamoDB, S3 & Bedrock
 */

export interface WardRiskTelemetry {
  zone_id: string;
  name: string;
  risk_score: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  factors: {
    rainfall_contrib: number;
    accum_contrib: number;
    elevation_contrib: number;
    historical_contrib: number;
    citizen_contrib: number;
    f_rain: number;
    f_accum: number;
    f_elev: number;
    f_hist: number;
    f_cit: number;
  };
  rainfall_rate_mm: number;
  elevation_meters: number;
}

export interface WardForecastItem {
  horizon: string;
  projected_risk: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface EmergencyIncident {
  incident_id: string;
  zone_id: string;
  location_name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  status: 'PREDICTION_CONFIRMED' | 'CLUSTER_DETECTED' | 'ACTIVE' | 'RESOLVED';
  risk_score_at_trigger: number;
  report_count: number;
  latest_report_summary: string;
  affected_roads: string[];
  recommended_actions: string[];
  deployed_units?: string[];
  updated_at: string;
}

export interface CitizenReportInput {
  zone_id: string;
  latitude: number;
  longitude: number;
  water_level: 'ROAD_WET' | 'ANKLE' | 'KNEE' | 'WAIST' | 'SEVERE';
  description: string;
  photo_file?: File | null;
}

const AWS_API_BASE = process.env.NEXT_PUBLIC_FLOODSENSE_API_URL || '';

/**
 * Fetch dashboard overview metrics from AWS
 */
export async function fetchAwsDashboardSummary() {
  if (!AWS_API_BASE) return null;
  try {
    const res = await fetch(`${AWS_API_BASE}/api/dashboard`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[AWS Integration] Could not fetch dashboard from API Gateway:', err);
    return null;
  }
}

/**
 * Fetch live explainable risk details for a specific ward
 */
export async function fetchAwsWardRisk(wardId: string): Promise<WardRiskTelemetry | null> {
  if (!AWS_API_BASE) return null;
  try {
    const res = await fetch(`${AWS_API_BASE}/api/risk/${wardId}`, { next: { revalidate: 15 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[AWS Integration] Failed to fetch risk for ward ${wardId}:`, err);
    return null;
  }
}

/**
 * Fetch 6-hour forecast curve from AWS Lambda Risk Engine
 */
export async function fetchAwsWardForecast(wardId: string): Promise<WardForecastItem[]> {
  if (!AWS_API_BASE) return [];
  try {
    const res = await fetch(`${AWS_API_BASE}/api/risk/${wardId}/forecast`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.forecast || [];
  } catch (err) {
    console.warn(`[AWS Integration] Failed to fetch forecast for ward ${wardId}:`, err);
    return [];
  }
}

/**
 * Upload citizen flood evidence directly to Amazon S3 via pre-signed URL,
 * then record the observation in DynamoDB.
 */
export async function submitAwsCitizenReport(input: CitizenReportInput) {
  let photoKey = '';

  // 1. Direct S3 Upload via Pre-signed URL if image is attached
  if (input.photo_file && AWS_API_BASE) {
    try {
      const presignRes = await fetch(`${AWS_API_BASE}/api/reports/presigned-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: input.photo_file.name,
          content_type: input.photo_file.type || 'image/jpeg'
        })
      });

      if (presignRes.ok) {
        const { upload_url, photo_key } = await presignRes.json();
        await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': input.photo_file.type || 'image/jpeg' },
          body: input.photo_file
        });
        photoKey = photo_key;
      }
    } catch (s3Err) {
      console.warn('[AWS S3 Upload] Direct upload error:', s3Err);
    }
  }

  // 2. Submit report to DynamoDB via API Gateway
  if (AWS_API_BASE) {
    const reportRes = await fetch(`${AWS_API_BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zone_id: input.zone_id,
        latitude: input.latitude,
        longitude: input.longitude,
        water_level: input.water_level,
        description: input.description,
        photo_key: photoKey
      })
    });
    return await reportRes.json();
  }

  return { status: 'MOCK_STORED', report_id: `REP-${Date.now()}` };
}

/**
 * Fetch active emergency incidents from DynamoDB
 */
export async function fetchAwsActiveIncidents(): Promise<EmergencyIncident[]> {
  if (!AWS_API_BASE) return [];
  try {
    const res = await fetch(`${AWS_API_BASE}/api/incidents`, { next: { revalidate: 15 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[AWS Integration] Could not fetch incidents:', err);
    return [];
  }
}

/**
 * Dispatch tactical action (e.g. pump deployment, road closure) on an incident
 */
export async function dispatchAwsIncidentAction(incidentId: string, actionType: string, unitName: string) {
  if (!AWS_API_BASE) return null;
  try {
    const res = await fetch(`${AWS_API_BASE}/api/incidents/${incidentId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: actionType, unit_name: unitName })
    });
    return await res.json();
  } catch (err) {
    console.error('[AWS Integration] Action dispatch failed:', err);
    return null;
  }
}

export interface AwsZoneRecord {
  zone_id: string;
  name: string;
  district: string;
  latitude: number;
  longitude: number;
  current_risk: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  rainfall_rate_mm: number;
  elevation_meters: number;
  active_citizen_reports: number;
  active_pumps: number;
  status: string;
}

/**
 * Fetch all zones telemetry from DynamoDB
 */
export async function fetchAwsZones(): Promise<AwsZoneRecord[]> {
  if (!AWS_API_BASE) return [];
  try {
    const res = await fetch(`${AWS_API_BASE}/api/zones`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[AWS Integration] Could not fetch zones:', err);
    return [];
  }
}

/**
 * Fetch citizen reports from DynamoDB
 */
export async function fetchAwsCitizenReports() {
  if (!AWS_API_BASE) return [];
  try {
    const res = await fetch(`${AWS_API_BASE}/api/reports`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[AWS Integration] Could not fetch citizen reports:', err);
    return [];
  }
}

/**
 * Request AI analysis from AWS Bedrock / Lambda
 */
export async function fetchAwsAiAnalysis(zoneId: string, query?: string) {
  if (!AWS_API_BASE) return null;
  try {
    const res = await fetch(`${AWS_API_BASE}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone_id: zoneId, query: query || 'Analyze current risk and recommend actions.' })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[AWS Integration] AI analyze call failed:', err);
    return null;
  }
}
