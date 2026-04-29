use crate::auth::hash_password;
use crate::content::models::{
    ContentCategory, ContentLevel, Course, Dialogue, DialogueLine, Lesson, Module, Quiz,
    QuizQuestion, Vocabulary,
};
use crate::models::{Admin, Role};
use chrono::Utc;
use mongodb::{Client, Collection, bson::doc};

/// Seeds the default admin account if none exists.
/// Credentials: admin@app.com / admin123
pub async fn seed_admin(client: &Client) {
    let collection: Collection<Admin> = client.database("rustapi").collection("admins");

    // Temporarily clear admins to fix schema issue
    let _ = collection.delete_many(doc! {}).await;

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

/// Seeds default content (Course, Module, Lesson, etc.) if no courses exist.
pub async fn seed_content(client: &Client) {
    let db = client.database("rustapi");
    let course_col: Collection<Course> = db.collection("courses");

    // Only seed if no courses exist
    let count = course_col.count_documents(doc! {}).await.unwrap_or(0);
    if count > 0 {
        return;
    }

    println!("🌱 Seeding default learning content...");

    // 1. Create Course
    let course = Course {
        id: None,
        title: "English for Receptionists".to_string(),
        title_id: Some("Bahasa Inggris untuk Resepsionis".to_string()),
        description: "Master the essentials of welcoming guests and handling check-ins.".to_string(),
        description_id: Some("Kuasai dasar-dasar menyambut tamu dan proses check-in.".to_string()),
        category: ContentCategory::Hotel,
        level: ContentLevel::Beginner,
        cover_image_url: Some("https://images.unsplash.com/photo-1562790351-d273a961e0e9?q=80&w=200&auto=format&fit=crop".to_string()),
        is_published: true,
        order: 1,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    let c_res = course_col
        .insert_one(course)
        .await
        .expect("Failed to seed course");
    let course_id = c_res.inserted_id.as_object_id().unwrap();

    // 2. Create Module (Unit)
    let module_col: Collection<Module> = db.collection("modules");
    let module = Module {
        id: None,
        course_id,
        title: "Unit 1: The Front Desk".to_string(),
        title_id: Some("Unit 1: Resepsionis".to_string()),
        description: "Learn how to greet guests properly when they arrive.".to_string(),
        description_id: Some(
            "Pelajari cara menyapa tamu dengan benar saat mereka tiba.".to_string(),
        ),
        order: 1,
        is_published: true,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    let m_res = module_col
        .insert_one(module)
        .await
        .expect("Failed to seed module");
    let module_id = m_res.inserted_id.as_object_id().unwrap();

    // 3. Create Lesson (Node)
    let lesson_col: Collection<Lesson> = db.collection("lessons");
    let lesson = Lesson {
        id: None,
        module_id,
        title: "Greeting & Welcoming".to_string(),
        title_id: Some("Menyapa & Menyambut".to_string()),
        content: "When a guest arrives, always smile and maintain eye contact. Use formal greetings like 'Good morning' or 'Good evening' followed by 'Welcome to [Hotel Name]'.".to_string(),
        content_id: Some("Saat tamu tiba, selalu tersenyum dan jaga kontak mata...".to_string()),
        audio_url: None,
        level: ContentLevel::Beginner,
        category: ContentCategory::Hotel,
        xp_reward: 20,
        order: 1,
        is_published: true,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    let l_res = lesson_col
        .insert_one(lesson)
        .await
        .expect("Failed to seed lesson");
    let lesson_id = l_res.inserted_id.as_object_id().unwrap();

    // 4. Create Vocabulary
    let vocab_col: Collection<Vocabulary> = db.collection("vocabulary");
    vocab_col
        .insert_many(vec![
            Vocabulary {
                id: None,
                lesson_id,
                word: "Welcome".to_string(),
                translation: "Selamat datang".to_string(),
                pronunciation: Some("/ˈwɛlkəm/".to_string()),
                audio_url: None,
                example_en: "Welcome to the Grand Hotel.".to_string(),
                example_id: Some("Selamat datang di Grand Hotel.".to_string()),
                created_at: Utc::now(),
            },
            Vocabulary {
                id: None,
                lesson_id,
                word: "Reservation".to_string(),
                translation: "Pemesanan".to_string(),
                pronunciation: Some("/ˌrɛzərˈveɪʃən/".to_string()),
                audio_url: None,
                example_en: "Do you have a reservation?".to_string(),
                example_id: Some("Apakah Anda memiliki pemesanan?".to_string()),
                created_at: Utc::now(),
            },
        ])
        .await
        .expect("Failed to seed vocabulary");

    // 5. Create Dialogue
    let dialogue_col: Collection<Dialogue> = db.collection("dialogues");
    let dialogue = Dialogue {
        id: None,
        lesson_id,
        title: "Checking in a Guest".to_string(),
        context: Some("A guest approaches the front desk.".to_string()),
        lines: vec![
            DialogueLine {
                speaker: "Receptionist".to_string(),
                text_en: "Good afternoon, welcome to the Grand Hotel. How can I help you?"
                    .to_string(),
                text_id: Some(
                    "Selamat siang, selamat datang di Grand Hotel. Ada yang bisa saya bantu?"
                        .to_string(),
                ),
                audio_url: None,
            },
            DialogueLine {
                speaker: "Guest".to_string(),
                text_en: "Hi, I have a reservation under the name John Smith.".to_string(),
                text_id: Some("Hai, saya ada pemesanan atas nama John Smith.".to_string()),
                audio_url: None,
            },
        ],
        created_at: Utc::now(),
    };
    dialogue_col
        .insert_one(dialogue)
        .await
        .expect("Failed to seed dialogue");

    // 6. Create Quiz
    let quiz_col: Collection<Quiz> = db.collection("quizzes");
    let quiz = Quiz {
        id: None,
        lesson_id,
        title: "Greeting Basics Quiz".to_string(),
        passing_score: 70,
        xp_reward: 30,
        questions: vec![QuizQuestion {
            question: "What is the best way to greet a guest arriving at 2 PM?".to_string(),
            question_id: None,
            options: vec![
                "Good morning".to_string(),
                "Good afternoon".to_string(),
                "Good evening".to_string(),
                "Good night".to_string(),
            ],
            correct_answer: 1,
        }],
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    quiz_col
        .insert_one(quiz)
        .await
        .expect("Failed to seed quiz");

    println!("✅ Successfully seeded example course, module, lesson, vocab, dialogue, and quiz!");
}
