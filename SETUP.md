# Setup Instructions

## Prerequisites

- Google Cloud Platform account
- Terraform installed
- Docker installed
- Node.js 18+ and npm installed
- Rust toolchain installed
- gcloud CLI installed and authenticated

## 1. GCP Setup

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Create a new GCP project (if needed)
gcloud projects create $PROJECT_ID

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  cloudscheduler.googleapis.com \
  storage-api.googleapis.com \
  cloudbuild.googleapis.com

# Authenticate Docker with GCR
gcloud auth configure-docker
```

## 2. Terraform Infrastructure

```bash
cd terraform

# Copy the example tfvars and edit with your project ID
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and set your project_id

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply (will create the infrastructure)
terraform apply
```

## 3. Build and Deploy Scraper

```bash
cd ../scraper

# Build and push Docker image
./build.sh $PROJECT_ID

# The Cloud Run service will automatically deploy the latest image
# Cloud Scheduler is configured to run daily at 6 AM UK time
```

## 4. Build and Deploy Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add the API URL from terraform output api_url

# Build the frontend
npm run build
npm run export

# Deploy to Cloud Storage
./deploy.sh $PROJECT_ID
```

## 5. Access Your Application

After deployment:
- Frontend: Check Terraform outputs for the frontend URL
- Scraper: Will run automatically daily via Cloud Scheduler
- Manual trigger: `gcloud run services invoke coffee-scraper --region europe-west2`

## Project Structure

```
.
├── README.md              # Project overview
├── SETUP.md              # This file
├── terraform/            # Infrastructure as code
│   ├── main.tf          # Main Terraform config
│   ├── variables.tf     # Variable definitions
│   └── outputs.tf       # Output values
├── scraper/             # Rust scraper service
│   ├── src/
│   │   └── main.rs     # Main scraper code
│   ├── Cargo.toml      # Rust dependencies
│   ├── Dockerfile      # Container config
│   └── build.sh        # Build and deploy script
└── frontend/            # Next.js static site
    ├── app/
    │   ├── page.tsx    # Main page
    │   ├── layout.tsx  # Layout
    │   └── globals.css # Global styles
    ├── package.json
    ├── next.config.js  # Static export config
    └── deploy.sh       # Deploy script
```

## Development

### Local Scraper Development

```bash
cd scraper
cargo run
```

### Local Frontend Development

```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:3000
```

## API Endpoints

The scraper service also provides a REST API:

- `GET /api/coffees` - Fetch all coffees (supports query params: roaster, region, min_price, max_price)
- `GET /api/health` - Health check endpoint
- `POST /` - Trigger manual scrape (authenticated via Cloud Scheduler)

Example:
```bash
curl "https://your-service-url/api/coffees?roaster=Pact%20Coffee&min_price=10&max_price=20"
```

## Frontend Features

- **Map View**: Interactive world map showing coffee origins with clusters
- **List View**: Traditional card-based layout
- **Filters**: Search, roaster, region, price range, and tasting notes
- **Responsive Design**: Works on mobile and desktop

## Notes

- The scraper includes implementations for 8 UK specialty coffee roasters
- CSS selectors may need updates if roaster websites change their structure
- The Firestore database is in native mode for better querying
- All infrastructure uses GCP free tier where possible
- The API is publicly accessible to allow the static frontend to fetch data
- CORS is enabled on the Cloud Run service for cross-origin requests
