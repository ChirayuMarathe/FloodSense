# -------------------------------------------------------------
# FloodSense Infrastructure Outputs
# -------------------------------------------------------------

output "api_gateway_url" {
  description = "Public HTTP API Gateway Endpoint for Frontend and Mobile clients"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "s3_citizen_photos_bucket" {
  description = "S3 Bucket Name for Citizen Flood Photos"
  value       = aws_s3_bucket.citizen_photos.bucket
}

output "sns_alerts_topic_arn" {
  description = "SNS Topic ARN for Multi-channel Emergency Broadcasts"
  value       = aws_sns_topic.alerts.arn
}

output "dynamodb_tables" {
  description = "DynamoDB Table Names"
  value = {
    zones           = aws_dynamodb_table.zones.name
    telemetry       = aws_dynamodb_table.telemetry.name
    citizen_reports = aws_dynamodb_table.citizen_reports.name
    incidents       = aws_dynamodb_table.incidents.name
    alerts          = aws_dynamodb_table.alerts.name
  }
}
