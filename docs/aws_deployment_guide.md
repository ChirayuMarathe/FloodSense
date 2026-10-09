# ⚡ AWS Quick-Deployment & Testing Guide
### Deploy FloodSense Serverless Backend in Under 5 Minutes

Since your **UI is already ready**, follow this exact sequence to deploy the live AWS backend, seed real ward data, and connect your existing frontend.

---

## 🛠️ Step 1: Deploy Cloud Infrastructure via AWS SAM

Navigate to the project root and run:

```bash
# 1. Build serverless functions
sam build -t infrastructure/cloudformation_template.yaml

# 2. Deploy to your AWS account (interactive guided setup)
sam deploy --guided
```

### When prompted by SAM:
- **Stack Name:** `floodsense-stack`
- **AWS Region:** `us-east-1` (or `ap-south-1` for Mumbai)
- **Confirm changes before deploy:** `Y`
- **Allow SAM CLI to create IAM roles:** `Y`
- **Disable authorization for public endpoints:** `Y` (Allows public web client calls)
- **Save arguments to configuration file:** `Y`

Once deployment finishes, SAM prints the outputs:
```
Outputs
---------------------------------------------------------------------------------
Key                 ApiEndpoint
Description         Public API Gateway Invocation Endpoint for Frontend Integration
Value               https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com/prod
---------------------------------------------------------------------------------
```

---

## 🌾 Step 2: Seed Live Data into Amazon DynamoDB

With the DynamoDB tables now created in your AWS account, run the seed script to populate them with real Mumbai wards (*Kurla, Dadar, Andheri East*) and Navi Mumbai hotspots (*Kalamboli, Panvel*):

```bash
# Install boto3 if not already present
pip install boto3

# Run the seeding script
python backend/scripts/seed_dynamodb.py
```

Output:
```
⏳ Seeding FloodsenseZones...
✅ Seeded 5 zones.
⏳ Seeding FloodsenseIncidents...
✅ Seeded 2 incidents.
⏳ Seeding FloodsenseAlerts...
✅ Seeded 1 alerts.

🎉 Seeding complete! All DynamoDB tables populated with real telemetry.
```

---

## 🔌 Step 3: Connect Your Existing V1 UI to AWS

You do **not** need to rebuild your frontend. Simply connect your existing UI to the live AWS API Gateway:

1. Copy [`frontend_adapter/floodsense_api.js`](file:///frontend_adapter/floodsense_api.js) into your existing V1 project's `src/services/` or `lib/` directory.
2. In your `.env.local` or `.env` file, add your deployed API Gateway endpoint:
   ```env
   # If Next.js:
   NEXT_PUBLIC_FLOODSENSE_API_URL=https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com/prod

   # If Vite:
   VITE_FLOODSENSE_API_URL=https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com/prod
   ```
3. In your dashboard and ward cards, replace static array loops with `getMonitoredZones()` and `getDashboardSummary()`.

---

## 🧪 Step 4: Quick Smoke Test Using cURL

Verify each serverless component from your terminal:

```bash
# 1. Test Dashboard Endpoint (API Gateway -> Lambda -> DynamoDB)
curl -X GET "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/api/dashboard"

# 2. Test Granular Risk Breakdown for Kurla (Deterministic Risk Engine)
curl -X GET "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/api/risk/KUR001"

# 3. Test 6-Hour Forecast Curve
curl -X GET "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/api/risk/KUR001/forecast"

# 4. Test S3 Pre-signed Photo Upload URL
curl -X POST "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/api/reports/presigned-url" \
  -H "Content-Type: application/json" \
  -d '{"file_name": "test_underpass.jpg", "content_type": "image/jpeg"}'

# 5. Test Citizen Report Submission (Triggering Spatial Clustering)
curl -X POST "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/api/reports" \
  -H "Content-Type: application/json" \
  -d '{"zone_id": "KUR001", "latitude": 19.0728, "longitude": 72.8797, "water_level": "KNEE", "description": "Water overflowing near LBS Marg"}'

# 6. Test Grounded AI Analyst (Bedrock Claude 3.5)
curl -X POST "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/api/ai/explain-risk" \
  -H "Content-Type: application/json" \
  -d '{"zone_id": "KUR001", "query": "Why is Kurla at critical risk and what should responders do?"}'
```

---

## 🎬 Step 5: Recording AWS Proof for the 3-Minute Video

During your 3-minute hackathon demo video, open these 4 AWS Management Console tabs:

1. **Amazon DynamoDB Console:**
   - Open `FloodsenseZones` $\rightarrow$ Show items (`KUR001`, `DAD002`) with live risk scores.
   - Open `FloodsenseCitizenReports` $\rightarrow$ Show the new citizen report item appearing live!
2. **AWS Lambda Console:**
   - Show `RiskEngineFunction` and `CitizenReportFunction`.
   - Click **Monitor** tab $\rightarrow$ Highlight real CloudWatch invocation charts and low execution latency.
3. **Amazon S3 Console:**
   - Open `floodsense-media-*` $\rightarrow$ Show the `reports/` folder containing uploaded photo evidence.
4. **Amazon EventBridge Console:**
   - Show the active `Floodsense15MinRiskCron` rule running automatically every 15 minutes.

This provides 100% indisputable proof to the hackathon judges that your platform is a genuine, production-grade AWS serverless implementation.
