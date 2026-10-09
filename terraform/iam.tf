# -------------------------------------------------------------
# IAM Role for FloodSense Lambda Functions
# Grants execution permissions with least-privilege security
# -------------------------------------------------------------
resource "aws_iam_role" "lambda_exec" {
  name = "floodsense-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "FloodsenseLambdaExecutionRole"
    Role = "SecurityIdentity"
  }
}

# -------------------------------------------------------------
# CloudWatch Logs Policy (Standard Lambda Logging)
# -------------------------------------------------------------
resource "aws_iam_policy" "lambda_logging" {
  name        = "floodsense-lambda-logging-policy"
  description = "Allows FloodSense Lambdas to write logs to Amazon CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

# -------------------------------------------------------------
# DynamoDB, S3, SNS, & Bedrock Access Policy
# -------------------------------------------------------------
resource "aws_iam_policy" "lambda_services" {
  name        = "floodsense-lambda-services-policy"
  description = "Grants FloodSense Lambdas access to DynamoDB, S3, SNS, and Bedrock"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # DynamoDB Access
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Effect = "Allow"
        Resource = [
          aws_dynamodb_table.zones.arn,
          "${aws_dynamodb_table.zones.arn}/index/*",
          aws_dynamodb_table.telemetry.arn,
          "${aws_dynamodb_table.telemetry.arn}/index/*",
          aws_dynamodb_table.citizen_reports.arn,
          "${aws_dynamodb_table.citizen_reports.arn}/index/*",
          aws_dynamodb_table.incidents.arn,
          "${aws_dynamodb_table.incidents.arn}/index/*",
          aws_dynamodb_table.alerts.arn,
          "${aws_dynamodb_table.alerts.arn}/index/*"
        ]
      },
      # S3 Bucket Access for citizen photos
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.citizen_photos.arn,
          "${aws_s3_bucket.citizen_photos.arn}/*"
        ]
      },
      # SNS Broadcast Alerts
      {
        Action = [
          "sns:Publish"
        ]
        Effect = "Allow"
        Resource = [
          aws_sns_topic.alerts.arn
        ]
      },
      # Amazon Bedrock Foundation Models (Claude 3)
      {
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_services" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_services.arn
}
