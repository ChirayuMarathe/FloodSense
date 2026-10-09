import json
import os
import boto3
from decimal import Decimal
from datetime import datetime, timezone

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

ZONES_TABLE_NAME = os.environ.get('ZONES_TABLE', 'FloodsenseZones')
TELEMETRY_TABLE_NAME = os.environ.get('TELEMETRY_TABLE', 'FloodsenseRiskTelemetry')
REPORTS_TABLE_NAME = os.environ.get('REPORTS_TABLE', 'FloodsenseCitizenReports')
ALERTS_TABLE_NAME = os.environ.get('ALERTS_TABLE', 'FloodsenseAlerts')
SNS_TOPIC_ARN = os.environ.get('SNS_ALERT_TOPIC_ARN', '')

zones_table = dynamodb.Table(ZONES_TABLE_NAME)
telemetry_table = dynamodb.Table(TELEMETRY_TABLE_NAME)
reports_table = dynamodb.Table(REPORTS_TABLE_NAME)
alerts_table = dynamodb.Table(ALERTS_TABLE_NAME)

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def calculate_flood_risk(rainfall_rate, rain_3h_accum, elevation_m, historical_count, citizen_reports_score):
    """
    Deterministic explainable flood risk engine.
    Risk Score = 0.35(Rainfall) + 0.25(Accumulation) + 0.15(Elevation) + 0.15(History) + 0.10(Citizen)
    """
    # 1. Rainfall score (0-100)
    f_rain = min(100.0, (float(rainfall_rate) / 100.0) * 100.0)
    # 2. Accumulation score (0-100)
    f_accum = min(100.0, (float(rain_3h_accum) / 150.0) * 100.0)
    # 3. Elevation vulnerability (2m = 100 vuln, 50m = 0 vuln)
    elev = float(elevation_m)
    f_elev = max(0.0, min(100.0, (1.0 - (elev - 2.0) / (50.0 - 2.0)) * 100.0))
    # 4. Historical flood frequency
    f_hist = min(100.0, (float(historical_count) / 25.0) * 100.0)
    # 5. Citizen reports score
    f_cit = min(100.0, float(citizen_reports_score))

    # Weighted calculation
    contrib_rain = 0.35 * f_rain
    contrib_accum = 0.25 * f_accum
    contrib_elev = 0.15 * f_elev
    contrib_hist = 0.15 * f_hist
    contrib_cit = 0.10 * f_cit

    total_risk = round(contrib_rain + contrib_accum + contrib_elev + contrib_hist + contrib_cit, 1)
    
    if total_risk >= 76:
        severity = "CRITICAL"
    elif total_risk >= 51:
        severity = "HIGH"
    elif total_risk >= 26:
        severity = "MODERATE"
    else:
        severity = "LOW"

    return {
        "score": total_risk,
        "severity": severity,
        "breakdown": {
            "rainfall_contrib": round(contrib_rain, 2),
            "accum_contrib": round(contrib_accum, 2),
            "elevation_contrib": round(contrib_elev, 2),
            "historical_contrib": round(contrib_hist, 2),
            "citizen_contrib": round(contrib_cit, 2),
            "f_rain": round(f_rain, 1),
            "f_accum": round(f_accum, 1),
            "f_elev": round(f_elev, 1),
            "f_hist": round(f_hist, 1),
            "f_cit": round(f_cit, 1)
        }
    }

def generate_forecast(current_score, rain_trend_delta):
    """Generates 6-hour risk projection curve."""
    hours = ["+1h", "+2h", "+3h", "+4h", "+5h", "+6h"]
    curve = []
    temp_score = current_score
    for idx, hr in enumerate(hours):
        # Model peak at +2h to +3h then gradual recession
        if idx in [0, 1, 2]:
            temp_score = min(98.0, temp_score + (rain_trend_delta * (3 - idx)))
        else:
            temp_score = max(15.0, temp_score - 10.0)
        
        curve.append({
            "horizon": hr,
            "projected_risk": round(temp_score, 1),
            "severity": "CRITICAL" if temp_score >= 76 else ("HIGH" if temp_score >= 51 else "MODERATE")
        })
    return curve

def dispatch_alert_if_needed(zone):
    if zone.get('current_risk', 0) >= 75:
        alert_id = f"ALT-{zone['zone_id']}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
        alert_payload = {
            "alert_id": alert_id,
            "zone_id": zone['zone_id'],
            "location": zone.get('name', 'Hotspot'),
            "severity": "CRITICAL",
            "headline": f"CRITICAL FLOOD ALERT: {zone.get('name')}",
            "risk_score": Decimal(str(zone['current_risk'])),
            "reason": f"Heavy rain ({zone.get('rainfall_rate_mm', 0)}mm/hr) in low-lying topographic basin.",
            "status": "ACTIVE",
            "issued_at": datetime.now(timezone.utc).isoformat()
        }
        alerts_table.put_item(Item=alert_payload)
        
        # Publish to Amazon SNS
        if SNS_TOPIC_ARN:
            try:
                sns.publish(
                    TopicArn=SNS_TOPIC_ARN,
                    Subject=f"FloodSense: CRITICAL ALERT {zone.get('name')}",
                    Message=f"Warning: {zone.get('name')} flood risk has reached {zone['current_risk']}%. Avoid low-lying underpasses."
                )
            except Exception as e:
                print(f"SNS publish error: {e}")

def lambda_handler(event, context):
    """
    Handles API Gateway routing or EventBridge scheduled execution.
    """
    # 1. Check if invoked by Amazon EventBridge (Scheduled Cron)
    if event.get('source') == 'aws.events' or event.get('detail-type') == 'Scheduled Event':
        print("Invoked by EventBridge 15-minute cron. Recalculating all zones...")
        response = zones_table.scan()
        zones = response.get('Items', [])
        for z in zones:
            calc = calculate_flood_risk(
                z.get('rainfall_rate_mm', 0),
                z.get('accumulated_rain_3h_mm', 0),
                z.get('elevation_meters', 10),
                z.get('historical_flood_count', 5),
                z.get('citizen_score', 20)
            )
            now_iso = datetime.now(timezone.utc).isoformat()
            # Update live zone
            zones_table.update_item(
                Key={'zone_id': z['zone_id']},
                UpdateExpression="SET current_risk = :r, severity = :s, last_calculated_at = :t",
                ExpressionAttributeValues={
                    ':r': Decimal(str(calc['score'])),
                    ':s': calc['severity'],
                    ':t': now_iso
                }
            )
            # Log to telemetry time series
            telemetry_table.put_item(Item={
                'zone_id': z['zone_id'],
                'timestamp': now_iso,
                'risk_score': Decimal(str(calc['score'])),
                'severity': calc['severity'],
                'breakdown': {k: Decimal(str(v)) for k, v in calc['breakdown'].items()}
            })
            z['current_risk'] = calc['score']
            dispatch_alert_if_needed(z)
        return {"statusCode": 200, "body": json.dumps({"status": "Batch recalculation completed"})}

    # 2. API Gateway HTTP Request Handling
    path = event.get('path', '')
    method = event.get('httpMethod', 'GET')
    path_params = event.get('pathParameters') or {}

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if method == 'OPTIONS':
        return {"statusCode": 200, "headers": headers, "body": json.dumps({})}

    # GET /api/dashboard
    if path == '/api/dashboard':
        zones_resp = zones_table.scan()
        zones = zones_resp.get('Items', [])
        critical = [z for z in zones if float(z.get('current_risk', 0)) >= 76]
        high = [z for z in zones if 51 <= float(z.get('current_risk', 0)) < 76]
        alerts_resp = alerts_table.scan(Limit=10)

        dashboard_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_monitored_zones": len(zones),
            "critical_zones_count": len(critical),
            "high_zones_count": len(high),
            "active_alerts_count": len(alerts_resp.get('Items', [])),
            "top_critical_zones": [
                {"zone_id": z['zone_id'], "name": z.get('name'), "risk": float(z.get('current_risk', 0))}
                for z in sorted(critical, key=lambda x: float(x.get('current_risk', 0)), reverse=True)
            ]
        }
        return {"statusCode": 200, "headers": headers, "body": json.dumps(dashboard_data, cls=DecimalEncoder)}

    # GET /api/zones
    if path == '/api/zones':
        zones_resp = zones_table.scan()
        return {"statusCode": 200, "headers": headers, "body": json.dumps(zones_resp.get('Items', []), cls=DecimalEncoder)}

    # GET /api/risk/{zone_id}
    if path.startswith('/api/risk/') and not path.endswith('/forecast'):
        zone_id = path_params.get('zone_id', path.split('/')[-1])
        item = zones_table.get_item(Key={'zone_id': zone_id}).get('Item')
        if not item:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Zone not found"})}
        
        calc = calculate_flood_risk(
            item.get('rainfall_rate_mm', 0),
            item.get('accumulated_rain_3h_mm', 0),
            item.get('elevation_meters', 10),
            item.get('historical_flood_count', 5),
            item.get('citizen_score', 20)
        )
        response_body = {
            "zone_id": zone_id,
            "name": item.get('name'),
            "risk_score": calc['score'],
            "severity": calc['severity'],
            "factors": calc['breakdown'],
            "rainfall_rate_mm": float(item.get('rainfall_rate_mm', 0)),
            "elevation_meters": float(item.get('elevation_meters', 0))
        }
        return {"statusCode": 200, "headers": headers, "body": json.dumps(response_body, cls=DecimalEncoder)}

    # GET /api/risk/{zone_id}/forecast
    if path.endswith('/forecast'):
        zone_id = path.split('/')[-2]
        item = zones_table.get_item(Key={'zone_id': zone_id}).get('Item')
        current_risk = float(item.get('current_risk', 50)) if item else 50.0
        forecast = generate_forecast(current_risk, rain_trend_delta=4.5)
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"zone_id": zone_id, "forecast": forecast})}

    # GET /api/alerts
    if path == '/api/alerts':
        alerts_resp = alerts_table.scan(Limit=20)
        return {"statusCode": 200, "headers": headers, "body": json.dumps(alerts_resp.get('Items', []), cls=DecimalEncoder)}

    return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Route not found"})}
