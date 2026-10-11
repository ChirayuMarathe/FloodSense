# -------------------------------------------------------------
# Amazon EventBridge Scheduled Rule
# Autonomous 15-minute cron for municipal flood risk recalculation
# -------------------------------------------------------------

resource "aws_cloudwatch_event_rule" "risk_recalc_schedule" {
  name                = "floodsense-15min-risk-recalculation"
  description         = "Triggers FloodSense Risk Engine Lambda every 15 minutes for autonomous sensor recalculation"
  schedule_expression = "rate(15 minutes)"

  tags = {
    Name = "FloodsenseRiskRecalculationCron"
    Role = "EventDrivenAutomation"
  }
}

resource "aws_cloudwatch_event_target" "risk_recalc_target" {
  rule      = aws_cloudwatch_event_rule.risk_recalc_schedule.name
  target_id = "FloodSenseRiskEngineTarget"
  arn       = aws_lambda_function.risk_engine.arn
}

resource "aws_lambda_permission" "allow_eventbridge_risk_engine" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.risk_engine.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.risk_recalc_schedule.arn
}
