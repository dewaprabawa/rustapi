use mongodb::{Client, Collection, bson::doc};
use crate::models::{Admin, Role};
use crate::auth::hash_password;
use chrono::Utc;

/// Seeds the default admin account if none exists.
/// Credentials: admin@app.com / admin123
pub async fn seed_admin(client: &Client) {
    let collection: Collection<Admin> = client.database("rustapi").collection("admins");

    // Check if any admin already exists
    let existing = collection.find_one(doc! { "role": "admin" }).await;

    match existing {
        Ok(Some(_)) => {
            println!("✅ Admin account already exists, skipping seed.");
        }
        Ok(None) => {
            let admin = Admin {
                id: None,
                email: "admin@app.com".to_string(),
                password: hash_password("admin123"),
                name: "Super Admin".to_string(),
                role: Role::Admin,
                is_active: true,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };

            match collection.insert_one(admin).await {
                Ok(_) => {
                    println!("🔐 Default admin account created:");
                    println!("   Email:    admin@app.com");
                    println!("   Password: admin123");
                    println!("   ⚠️  Change the password after first login!");
                }
                Err(e) => {
                    eprintln!("❌ Failed to seed admin: {}", e);
                }
            }
        }
        Err(e) => {
            eprintln!("❌ Failed to check for existing admin: {}", e);
        }
    }
}
