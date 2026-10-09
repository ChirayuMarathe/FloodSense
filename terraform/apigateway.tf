# -------------------------------------------------------------
# Amazon API Gateway (HTTP API v2)
# Low-latency, serverless REST API for frontend integration
# -------------------------------------------------------------
resource "aws_apigatewayv2_api" "http_api" {
  name          = "floodsense-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 300
  }

  tags = {
    Name = "FloodsenseHttpApi"
    Role = "PublicGateway"
  }
}

# -------------------------------------------------------------
# $default Auto-deploy Stage
# -------------------------------------------------------------
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name = "FloodsenseDefaultStage"
  }
}

# =============================================================
# INTEGRATIONS & ROUTES
# =============================================================

# --- 1. Risk Engine Integration ---
resource "aws_apigatewayv2_integration" "risk_engine" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.risk_engine.invoke_arn
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "dashboard" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /api/dashboard"
  target    = "integrations/${aws_apigatewayv2_integration.risk_engine.id}"
}

resource "aws_apigatewayv2_route" "risk_proxy" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /api/risk/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.risk_engine.id}"
}

# --- 2. Citizen Reports Integration ---
resource "aws_apigatewayv2_integration" "citizen_reports" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.citizen_reports.invoke_arn
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "reports" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /api/reports"
  target    = "integrations/${aws_apigatewayv2_integration.citizen_reports.id}"
}

resource "aws_apigatewayv2_route" "reports_proxy" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /api/reports/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.citizen_reports.id}"
}

# --- 3. Incidents Integration ---
resource "aws_apigatewayv2_integration" "incidents" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.incidents.invoke_arn
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "incidents" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /api/incidents"
  target    = "integrations/${aws_apigatewayv2_integration.incidents.id}"
}

resource "aws_apigatewayv2_route" "incidents_proxy" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /api/incidents/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.incidents.id}"
}

# --- 4. AI Analyst Integration ---
resource "aws_apigatewayv2_integration" "ai_analyst" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.ai_analyst.invoke_arn
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "ai_analyze" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /api/ai/analyze"
  target    = "integrations/${aws_apigatewayv2_integration.ai_analyst.id}"
}

# =============================================================
# LAMBDA INVOCATION PERMISSIONS
# =============================================================
resource "aws_lambda_permission" "apigw_risk_engine" {
  statement_id  = "AllowAPIGatewayInvokeRiskEngine"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.risk_engine.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_citizen_reports" {
  statement_id  = "AllowAPIGatewayInvokeCitizenReports"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.citizen_reports.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_incidents" {
  statement_id  = "AllowAPIGatewayInvokeIncidents"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.incidents.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_ai_analyst" {
  statement_id  = "AllowAPIGatewayInvokeAIAnalyst"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ai_analyst.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
