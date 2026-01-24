use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Coffee {
    pub name: String,
    pub roaster: String,
    pub origin: Option<String>,
    pub region: Option<String>,
    pub tasting_notes: Vec<String>,
    pub price: Option<String>,
    pub weight: Option<String>,  // e.g., "250g", "1kg"
    pub url: String,
    pub in_stock: bool,
    pub scraped_at: String,
}
