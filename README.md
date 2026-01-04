This is a project to track specialty coffee offerings across websites in the UK

The backend infrastructure is cloud based, ideally using Google Cloud free tier, and will be mostly written in Rust. The frontend will use Next js and served as a static website.

The infrastructure should be setup using terraform, and the config should be as simple as possible.

The data is scraped from popular websites and stored in some database eg firebase or even GCP. This will be scheduled daily to collect and aggregate information about what coffees are available and their tasting notes, origins etc and where people can buy them.

All code backing this should be simple. I want this to be a simple quick project.

