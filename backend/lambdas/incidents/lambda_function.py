import json
import os
import boto3
from decimal import Decimal
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')
INCIDENTS_TABLE_NAME = os.environ.get('INCIDENTS_TABLE', 'FloodsenseIncidents')
incidents_table = dynamodb.Table(INCIDENTS_TABLE_NAME)

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
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

    # GET /api/incidents
    if path == '/api/incidents' and method == 'GET':
        resp = incidents_table.scan(Limit=50)
        items = resp.get('Items', [])
        sorted_incidents = sorted(
            items, 
            key=lambda x: (x.get('status') == 'PREDICTION_CONFIRMED', float(x.get('risk_score_at_trigger', 0))),
            reverse=True
        )
        return {"statusCode": 200, "headers": headers, "body": json.dumps(sorted_incidents, cls=DecimalEncoder)}

    # POST /api/incidents/{incident_id}/action
    if '/action' in path and method == 'POST':
        incident_id = path_params.get('incident_id', path.split('/')[-2])
        body = json.loads(event.get('body') or '{}')
        action_type = body.get('action_type', 'DEPLOY_PUMP') # DEPLOY_PUMP, BARRICADE_ROAD, RESOLVE
        unit_name = body.get('unit_name', 'Mobile Dewatering Unit 4')

        incident = incidents_table.get_item(Key={'incident_id': incident_id}).get('Item')
        if not incident:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Incident not found"})}

        now_iso = datetime.now(timezone.utc).isoformat()
        current_deployed = incident.get('deployed_units', [])
        if unit_name not in current_deployed:
            current_deployed.append(unit_name)

        new_status = 'RESOLVED' if action_type == 'RESOLVE' else incident.get('status')

        incidents_table.update_item(
            Key={'incident_id': incident_id},
            UpdateExpression="SET deployed_units = :du, #st = :s, updated_at = :u",
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={
                ':du': current_deployed,
                ':s': new_status,
                ':u': now_iso
            }
        )

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "incident_id": incident_id,
                "status": new_status,
                "deployed_units": current_deployed,
                "message": f"Action {action_type} recorded successfully."
            })
        }

    return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Route not found"})}
