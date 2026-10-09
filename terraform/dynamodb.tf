# =========================================================================
# 1. FLOODSENSE ZONES TABLE
# Stores live risk scores and metadata for all monitored wards
# =========================================================================
resource "aws_dynamodb_table" "zones" {
  name         = "FloodsenseZones"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "zone_id"

  attribute {
    name = "zone_id"
    type = "S"  # S = String, N = Number, B = Binary
  }

  tags = {
    Name = "FloodsenseZones"
    Role = "ZoneRiskState"
  }
}

# -------------------------------------------------------------
# Table 2: FloodsenseRiskTelemetry
# Stores time-series water levels, rainfall, and risk scores.
# -------------------------------------------------------------
resource "aws_dynamodb_table" "telemetry" {
  name         = "FloodsenseRiskTelemetry"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "zone_id"
  range_key    = "timestamp"

  attribute {
    name = "zone_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S" # ISO 8601 string (e.g., 2026-10-09T08:30:00Z)
  }

  # Automatic data cleanup after expiry
  ttl {
    attribute_name = "ttl_timestamp"
    enabled        = true
  }

  tags = {
    Name = "FloodsenseRiskTelemetry"
    Role = "TimeSeriesTelemetry"
  }
}

# -------------------------------------------------------------
# Table 3: FloodsenseCitizenReports
# Stores crowd-sourced citizen reports with AI validation.
# -------------------------------------------------------------
resource "aws_dynamodb_table" "citizen_reports" {
  name         = "FloodsenseCitizenReports"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "report_id"

  # Primary Key attribute
  attribute {
    name = "report_id"
    type = "S"
  }

  # Index attributes used for querying by zone and time
  attribute {
    name = "zone_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  # Global Secondary Index: allows querying "All reports in Zone X sorted by time"
  global_secondary_index {
    name            = "ZoneTimestampIndex"
    hash_key        = "zone_id"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  tags = {
    Name = "FloodsenseCitizenReports"
    Role = "CitizenVerification"
  }
}

# -------------------------------------------------------------
# Table 4: FloodsenseIncidents
# Tracks verified flood incidents and dispatch operations.
# -------------------------------------------------------------
resource "aws_dynamodb_table" "incidents" {
  name         = "FloodsenseIncidents"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "incident_id"

  attribute {
    name = "incident_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S" # OPEN, IN_PROGRESS, RESOLVED
  }

  attribute {
    name = "severity"
    type = "S" # CRITICAL, HIGH, MEDIUM, LOW
  }

  # Query all OPEN incidents prioritized by severity
  global_secondary_index {
    name            = "StatusSeverityIndex"
    hash_key        = "status"
    range_key       = "severity"
    projection_type = "ALL"
  }

  tags = {
    Name = "FloodsenseIncidents"
    Role = "IncidentManagement"
  }
}

# -------------------------------------------------------------
# Table 5: FloodsenseAlerts
# Logs issued alerts, target zones, and delivery channels.
# -------------------------------------------------------------
resource "aws_dynamodb_table" "alerts" {
  name         = "FloodsenseAlerts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "alert_id"
  range_key    = "timestamp"

  attribute {
    name = "alert_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  tags = {
    Name = "FloodsenseAlerts"
    Role = "AlertAuditLog"
  }
}
