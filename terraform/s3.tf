# -------------------------------------------------------------
# Random suffix to guarantee globally unique bucket name
# S3 bucket names must be globally unique across all AWS accounts
# -------------------------------------------------------------
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# -------------------------------------------------------------
# S3 Bucket for Citizen Flood Report Photos
# -------------------------------------------------------------
resource "aws_s3_bucket" "citizen_photos" {
  bucket        = "floodsense-citizen-photos-${random_id.bucket_suffix.hex}"
  force_destroy = true # Allows easy clean-up during hackathon teardown

  tags = {
    Name = "FloodsenseCitizenPhotos"
    Role = "CitizenReportEvidenceStorage"
  }
}

# -------------------------------------------------------------
# CORS Configuration
# Allows your Next.js browser frontend to upload photos directly
# -------------------------------------------------------------
resource "aws_s3_bucket_cors_configuration" "citizen_photos_cors" {
  bucket = aws_s3_bucket.citizen_photos.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"] # In production, restrict to your domain
    max_age_seconds = 3000
  }
}
