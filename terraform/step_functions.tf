# -------------------------------------------------------------
# AWS Step Functions - Crisis Incident Triage State Machine
# Orchestrates end-to-end disaster verification, alerting & AI analysis
# -------------------------------------------------------------

resource "aws_iam_role" "step_functions_role" {
  name = "floodsense-step-functions-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "FloodsenseStepFunctionsRole"
    Role = "OrchestrationIdentity"
  }
}

resource "aws_iam_policy" "step_functions_policy" {
  name        = "floodsense-step-functions-policy"
  description = "Allows Step Functions to invoke Lambdas and publish alerts via SNS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "lambda:InvokeFunction"
        ]
        Effect = "Allow"
        Resource = [
          aws_lambda_function.risk_engine.arn,
          aws_lambda_function.citizen_reports.arn,
          aws_lambda_function.incidents.arn,
          aws_lambda_function.ai_analyst.arn
        ]
      },
      {
        Action = [
          "sns:Publish"
        ]
        Effect = "Allow"
        Resource = [
          aws_sns_topic.alerts.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "step_functions_attachment" {
  role       = aws_iam_role.step_functions_role.name
  policy_arn = aws_iam_policy.step_functions_policy.arn
}

resource "aws_sfn_state_machine" "incident_triage" {
  name     = "floodsense-incident-triage-workflow"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = jsonencode({
    Comment = "FloodSense Emergency Incident Triage & Rapid Response Orchestrator"
    StartAt = "EvaluateZoneRisk"
    States = {
      EvaluateZoneRisk = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.risk_engine.arn
          Payload = {
            "source" : "step_functions.triage"
          }
        }
        ResultPath = "$.riskEvaluation"
        Next       = "CheckRiskThreshold"
      }
      CheckRiskThreshold = {
        Type = "Choice"
        Choices = [
          {
            Variable      = "$.severity"
            StringEquals  = "CRITICAL"
            Next          = "BroadcastEmergencyAlert"
          }
        ]
        Default = "NormalTriageLogging"
      }
      BroadcastEmergencyAlert = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish"
        Parameters = {
          TopicArn = aws_sns_topic.alerts.arn
          Subject  = "CRITICAL FLOOD EMERGENCY: Rapid Evacuation Notice"
          "Message.$" : "$.message"
        }
        ResultPath = "$.snsResult"
        Next       = "GenerateAIAnalystBriefing"
      }
      GenerateAIAnalystBriefing = {
        Type       = "Task"
        Resource   = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.ai_analyst.arn
          Payload = {
            "zone_id.$" : "$.zone_id"
            "query"     : "Generate immediate municipal evacuation and de-watering action plan."
          }
        }
        ResultPath = "$.aiBriefing"
        Next       = "TriageCompleted"
      }
      NormalTriageLogging = {
        Type = "Pass"
        Result = {
          "status" : "NOMINAL_MONITORING_ACTIVE"
        }
        Next = "TriageCompleted"
      }
      TriageCompleted = {
        Type = "Succeed"
      }
    }
  })

  tags = {
    Name = "FloodsenseIncidentTriageStateMachine"
    Role = "DisasterResponseOrchestrator"
  }
}
