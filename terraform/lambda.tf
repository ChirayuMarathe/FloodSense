# -------------------------------------------------------------
# Archive Python Functions into ZIP files
# -------------------------------------------------------------
data "archive_file" "risk_engine_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambdas/risk_engine"
  output_path = "${path.module}/builds/risk_engine.zip"
}

data "archive_file" "citizen_reports_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambdas/citizen_reports"
  output_path = "${path.module}/builds/citizen_reports.zip"
}

data "archive_file" "incidents_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambdas/incidents"
  output_path = "${path.module}/builds/incidents.zip"
}

data "archive_file" "ai_analyst_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambdas/ai_analyst"
  output_path = "${path.module}/builds/ai_analyst.zip"
}

# -------------------------------------------------------------
# 1. Risk Engine Lambda
# Deterministic flood risk calculation
# -------------------------------------------------------------
resource "aws_lambda_function" "risk_engine" {
  function_name    = "floodsense-risk-engine"
  filename         = data.archive_file.risk_engine_zip.output_path
  source_code_hash = data.archive_file.risk_engine_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      ZONES_TABLE        = aws_dynamodb_table.zones.name
      TELEMETRY_TABLE    = aws_dynamodb_table.telemetry.name
      REPORTS_TABLE      = aws_dynamodb_table.citizen_reports.name
      ALERTS_TABLE       = aws_dynamodb_table.alerts.name
      SNS_ALERT_TOPIC_ARN = aws_sns_topic.alerts.arn
    }
  }

  tags = {
    Name = "FloodsenseRiskEngine"
    Role = "AlgorithmCompute"
  }
}

# -------------------------------------------------------------
# 2. Citizen Reports Lambda
# Handles crowd-sourced reports & photo uploads
# -------------------------------------------------------------
resource "aws_lambda_function" "citizen_reports" {
  function_name    = "floodsense-citizen-reports"
  filename         = data.archive_file.citizen_reports_zip.output_path
  source_code_hash = data.archive_file.citizen_reports_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      ZONES_TABLE     = aws_dynamodb_table.zones.name
      REPORTS_TABLE   = aws_dynamodb_table.citizen_reports.name
      INCIDENTS_TABLE = aws_dynamodb_table.incidents.name
      MEDIA_BUCKET    = aws_s3_bucket.citizen_photos.id
    }
  }

  tags = {
    Name = "FloodsenseCitizenReports"
    Role = "CitizenVerificationCompute"
  }
}

# -------------------------------------------------------------
# 3. Incidents Lambda
# Manages active flood incidents and dispatch
# -------------------------------------------------------------
resource "aws_lambda_function" "incidents" {
  function_name    = "floodsense-incidents"
  filename         = data.archive_file.incidents_zip.output_path
  source_code_hash = data.archive_file.incidents_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      INCIDENTS_TABLE = aws_dynamodb_table.incidents.name
    }
  }

  tags = {
    Name = "FloodsenseIncidents"
    Role = "IncidentManagementCompute"
  }
}

# -------------------------------------------------------------
# 4. AI Flood Analyst Lambda (Bedrock Claude 3)
# Tactical assistant and evacuation advisory
# -------------------------------------------------------------
resource "aws_lambda_function" "ai_analyst" {
  function_name    = "floodsense-ai-analyst"
  filename         = data.archive_file.ai_analyst_zip.output_path
  source_code_hash = data.archive_file.ai_analyst_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      ZONES_TABLE     = aws_dynamodb_table.zones.name
      INCIDENTS_TABLE = aws_dynamodb_table.incidents.name
      AWS_REGION_BEDROCK = "us-east-1"
    }
  }

  tags = {
    Name = "FloodsenseAIAnalyst"
    Role = "GenerativeAICompute"
  }
}
