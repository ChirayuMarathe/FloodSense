# -------------------------------------------------------------
# Amazon SQS - Resilient Citizen Report Ingestion Buffer
# Decouples API ingestion from database writes during cloudburst surges
# -------------------------------------------------------------

# Dead-Letter Queue (DLQ) for unprocessable report payloads
resource "aws_sqs_queue" "citizen_reports_dlq" {
  name                      = "floodsense-citizen-reports-dlq"
  message_retention_seconds = 1209600 # 14 days retention

  tags = {
    Name = "FloodsenseCitizenReportsDLQ"
    Role = "DeadLetterQueue"
  }
}

# Primary Citizen Reports Queue
resource "aws_sqs_queue" "citizen_reports_queue" {
  name                       = "floodsense-citizen-reports-queue"
  visibility_timeout_seconds = 90
  message_retention_seconds  = 86400  # 1 day retention
  receive_wait_time_seconds  = 10     # Long polling enabled for cost & latency optimization

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.citizen_reports_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "FloodsenseCitizenReportsQueue"
    Role = "IngestionBuffer"
  }
}
