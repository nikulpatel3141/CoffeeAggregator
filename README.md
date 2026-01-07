This is a project to track specialty coffee offerings across UK specialty roasters' websites, visualized on an interactive map.

## Features

- **Interactive Map View**: Coffees are grouped by their origin region and displayed on an interactive world map
- **Advanced Filtering**: Filter by roaster, region, price, tasting notes, and more
- **UK Roasters**: Scrapes from multiple UK specialty coffee roasters including:
  - Pact Coffee
  - Origin Coffee
  - Rave Coffee
  - Square Mile Coffee
  - Has Bean Coffee
  - Assembly Coffee
  - Dark Arts Coffee
  - Round Hill Roastery

## Tech Stack

- **Backend**: Rust-based scraper and API server running on Google Cloud Run
- **Frontend**: Next.js static website with Leaflet for map visualization
- **Database**: Google Firestore for storing coffee data
- **Infrastructure**: Terraform for GCP infrastructure as code
- **Scheduling**: Cloud Scheduler for daily automated scraping

The data is scraped daily and stored in Firestore, providing up-to-date information about available coffees, tasting notes, origins, and prices.

