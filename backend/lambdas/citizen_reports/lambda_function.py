import json
import os
import boto3
import uuid
import math
from decimal import Decimal
from datetime import datetime, timezone

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

MEDIA_BUCKET = os.environ.get('MEDIA_BUCKET', 'floodsense-media')
REPORTS_TABLE_NAME = os.environ.get('REPORTS_TABLE', 'FloodsenseCitizenReports')
INCIDENTS_TABLE_NAME = os.environ.get('INCIDENTS_TABLE', 'FloodsenseIncidents')
ZONES_TABLE_NAME = os.environ.get('ZONES_TABLE', 'FloodsenseZones')

reports_table = dynamodb.Table(REPORTS_TABLE_NAME)
incidents_table = dynamodb.Table(INCIDENTS_TABLE_NAME)
zones_table = dynamodb.Table(ZONES_TABLE_NAME)

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def haversine_distance_m(lat1, lon1, lat2, lon2):
    R = 6371000 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def cluster_and_verify_incident(zone_id, lat, lon, water_level, report_id):
    """
    Correlates ground report with existing incidents and model prediction.
    If zone risk is high or report cluster >= 3, sets status to PREDICTION_CONFIRMED.
    """
    zone_item = zones_table.get_item(Key={'zone_id': zone_id}).get('Item')
    zone_risk = float(zone_item.get('current_risk', 50)) if zone_item else 50.0
    zone_name = zone_item.get('name', 'Hotspot') if zone_item else 'Unknown'

    incident_id = f"INC-{zone_id}"
    existing_incident = incidents_table.get_item(Key={'incident_id': incident_id}).get('Item')

    now_iso = datetime.now(timezone.utc).isoformat()

    if existing_incident:
        current_reports = int(existing_incident.get('report_count', 1)) + 1
        status = "PREDICTION_CONFIRMED" if (zone_risk >= 65 or current_reports >= 3) else "CLUSTER_DETECTED"
        incidents_table.update_item(
            Key={'incident_id': incident_id},
            UpdateExpression="SET report_count = :rc, #st = :s, updated_at = :u, latest_report_summary = :l",
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={
                ':rc': current_reports,
                ':s': status,
                ':u': now_iso,
                ':l': f"Water level: {water_level}. Corroborated by {current_reports} ground reports."
            }
        )
    else:
        status = "PREDICTION_CONFIRMED" if zone_risk >= 65 else "ACTIVE"
        incidents_table.put_item(Item={
            'incident_id': incident_id,
            'zone_id': zone_id,
            'location_name': f"{zone_name} Sector & Underpass",
            'severity': "CRITICAL" if zone_risk >= 76 else "HIGH",
            'status': status,
            'risk_score_at_trigger': Decimal(str(zone_risk)),
            'report_count': 1,
            'latest_report_summary': f"First observation: water level is {water_level}.",
            'affected_roads': ["Main Arterial Road", "Underpass Access Corridor"],
            'recommended_actions': [
                "Inspect stormwater drainage culverts",
                "Deploy mobile de-watering pump unit",
                "Broadcast transit diversion notice"
            ],
            'created_at': now_iso,
            'updated_at': now_iso
        })

    return incident_id, status

def lambda_handler(event, context):
    path = event.get('rawPath') or event.get('path', '')
    method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if method == 'OPTIONS':
        return {"statusCode": 200, "headers": headers, "body": json.dumps({})}

    # 1. POST /api/reports/presigned-url
    if path == '/api/reports/presigned-url' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        file_name = body.get('file_name', f"flood_img_{uuid.uuid4().hex[:6]}.jpg")
        content_type = body.get('content_type', 'image/jpeg')
        object_key = f"reports/{datetime.now(timezone.utc).strftime('%Y-%m-%d')}/{file_name}"

        try:
            presigned_url = s3.generate_presigned_url(
                ClientMethod='put_object',
                Params={
                    'Bucket': MEDIA_BUCKET,
                    'Key': object_key,
                    'ContentType': content_type
                },
                ExpiresIn=900
            )
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({
                    "upload_url": presigned_url,
                    "photo_key": object_key,
                    "expires_in_seconds": 900
                })
            }
        except Exception as e:
            return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}

    # 2. POST /api/reports
    if path == '/api/reports' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        zone_id = body.get('zone_id', 'KUR001')
        lat = float(body.get('latitude', 19.0728))
        lon = float(body.get('longitude', 72.8797))
        water_level = body.get('water_level', 'KNEE')
        description = body.get('description', 'Waterlogged street.')
        photo_key = body.get('photo_key', '')
        report_id = f"REP-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:4]}"

        # Cluster and verify
        incident_id, verification_status = cluster_and_verify_incident(zone_id, lat, lon, water_level, report_id)

        report_item = {
            'report_id': report_id,
            'zone_id': zone_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'latitude': Decimal(str(lat)),
            'longitude': Decimal(str(lon)),
            'water_level': water_level,
            'description': description,
            'photo_s3_key': photo_key,
            'verification_status': verification_status,
            'linked_incident_id': incident_id
        }
        reports_table.put_item(Item=report_item)

        return {
            "statusCode": 201,
            "headers": headers,
            "body": json.dumps({
                "report_id": report_id,
                "status": "PROCESSED",
                "verification_status": verification_status,
                "linked_incident_id": incident_id,
                "message": "Report ingested and correlated with incident triage."
            })
        }

    # 3. GET /api/reports
    if path == '/api/reports' and method == 'GET':
        resp = reports_table.scan(Limit=50)
        items = resp.get('Items', [])
        return {"statusCode": 200, "headers": headers, "body": json.dumps(items, cls=DecimalEncoder)}

    return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Route not found"})}
