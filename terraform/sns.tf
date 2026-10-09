# -------------------------------------------------------------
# SNS Topic for Flood Emergency Broadcasts
# -------------------------------------------------------------
resource "aws_sns_topic" "alerts" {
  name         = "floodsense-emergency-alerts"
  display_name = "FloodSense Alert System"

  tags = {
    Name = "FloodsenseEmergencyAlerts"
    Role = "DisasterBroadcast"
  }
}

# -------------------------------------------------------------
# (Optional) Email Subscription for Hackathon Demo
# You can subscribe your email to test real-time disaster alerts!
# -------------------------------------------------------------
resource "aws_sns_topic_subscription" "email_alert" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "chirayusmarathe@gmail.com" # AWS will send a confirmation link here
}
