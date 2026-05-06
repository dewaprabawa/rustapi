use crate::auth::hash_password;
use crate::content::models::{
    ContentCategory, ContentLevel, Course, CourseStatus, Dialogue, DialogueLine, LlmApiKey, Lesson, Module,
    Quiz, QuizQuestion, SkillType, TargetAge, Visibility, Vocabulary,
};
use crate::game::models::{GameContent, GameType};
use crate::models::{Admin, Role};
use crate::speaking::models::SpeakingScenario;
use crate::vocab::models::{VocabSet, VocabWord, VocabDialogueLine};
use crate::speakup::models::{SpeakUpContent, SpeakUpType};
use chrono::Utc;
use mongodb::{Client, Collection, bson::doc};

/// Seeds the default admin account if none exists.
/// Credentials: admin@app.com / admin123
pub async fn seed_admin(client: &Client) {
    let collection: Collection<Admin> = client.database("rustapi").collection("admins");

    // Removed: let _ = collection.delete_many(doc! {}).await; to prevent invalidating JWTs on restart.

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
                profile_image_url: None,
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

    let count = course_col.count_documents(doc! {}).await.unwrap_or(0);

    let mut module_id_for_games = None;
    let mut lesson_id_for_games = None;

    if count == 0 {
        println!("🌱 Seeding default learning content...");

        // 1. Create Course
        let course = Course {
            id: None,
            title: "English for Receptionists".to_string(),
            title_id: Some("Bahasa Inggris untuk Resepsionis".to_string()),
            description: "Master the essentials of welcoming guests and handling check-ins.".to_string(),
            description_id: Some("Kuasai dasar-dasar menyambut tamu dan proses check-in.".to_string()),
            category: ContentCategory::Hotel,
            level: ContentLevel::A1,
            status: CourseStatus::Published,
            skill_focus: vec![SkillType::Speaking, SkillType::Listening],
            target_age: TargetAge::Adults,
            estimated_duration: "4 weeks".to_string(),
            is_paid: false,
            enrollment_cap: None,
            visibility: Visibility::Public,
            cover_image_url: Some("https://images.unsplash.com/photo-1562790351-d273a961e0e9?q=80&w=200&auto=format&fit=crop".to_string()),
            source: None,
            is_published: true,
            order: 1,
            tags: None,
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
            prerequisite_id: None,
            passing_score_threshold: None,
            skill_tags: vec![SkillType::Speaking],
            order: 1,
            is_published: true,
            is_optional: false,
            tags: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let m_res = module_col
            .insert_one(module)
            .await
            .expect("Failed to seed module");
        let module_id = m_res.inserted_id.as_object_id().unwrap();
        module_id_for_games = Some(module_id);

        // 3. Create Lesson (Node)
        let lesson_col: Collection<Lesson> = db.collection("lessons");
        let lesson = Lesson {
            id: None,
            module_id,
            title: "Greeting & Welcoming".to_string(),
            title_id: Some("Menyapa & Menyambut".to_string()),
            content: "When a guest arrives, always smile and maintain eye contact. Use formal greetings like 'Good morning' or 'Good evening' followed by 'Welcome to [Hotel Name]'.".to_string(),
            content_id: Some("Saat tamu tiba, selalu tersenyum dan jaga kontak mata...".to_string()),
            instruction: None,
            instruction_id: None,
            culture_notes: None,
            audio_url: None,
            level: ContentLevel::A1,
            category: ContentCategory::Hotel,
            xp_reward: 20,
            order: 1,
            is_published: true,
            tags: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let l_res = lesson_col
            .insert_one(lesson)
            .await
            .expect("Failed to seed lesson");
        let lesson_id_1 = l_res.inserted_id.as_object_id().unwrap();

        // 3b. Create Lesson 2
        let lesson2 = Lesson {
            id: None,
            module_id,
            title: "Room Registration".to_string(),
            title_id: Some("Pendaftaran Kamar".to_string()),
            content: "Ask for the guest's name and reservation details. Verify the room type and length of stay.".to_string(),
            content_id: Some("Minta nama tamu dan detail pemesanan...".to_string()),
            instruction: None,
            instruction_id: None,
            culture_notes: None,
            audio_url: None,
            level: ContentLevel::A1,
            category: ContentCategory::Hotel,
            xp_reward: 20,
            order: 2,
            is_published: true,
            tags: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let l_res2 = lesson_col
            .insert_one(lesson2)
            .await
            .expect("Failed to seed lesson 2");
        let lesson_id_2 = l_res2.inserted_id.as_object_id().unwrap();

        // 2b. Create Module 2
        let module2 = Module {
            id: None,
            course_id,
            title: "Unit 2: Handling Complaints".to_string(),
            title_id: Some("Unit 2: Menangani Keluhan".to_string()),
            description: "Learn how to professionally handle guest complaints.".to_string(),
            description_id: Some(
                "Pelajari cara menangani keluhan tamu secara profesional.".to_string(),
            ),
            prerequisite_id: Some(module_id),
            passing_score_threshold: Some(70),
            skill_tags: vec![SkillType::Speaking, SkillType::Listening],
            order: 2,
            is_published: true,
            is_optional: false,
            tags: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let m_res2 = module_col.insert_one(module2).await.unwrap();
        let module_id_2 = m_res2.inserted_id.as_object_id().unwrap();

        // 3c. Create Lesson 3
        let lesson3 = Lesson {
            id: None,
            module_id: module_id_2,
            title: "Apologizing".to_string(),
            title_id: Some("Meminta Maaf".to_string()),
            content: "Always listen actively and say 'I apologize for the inconvenience'.".to_string(),
            content_id: Some("Selalu dengarkan dan ucapkan 'Saya mohon maaf'...".to_string()),
            instruction: None,
            instruction_id: None,
            culture_notes: Some("In Indonesian culture, saying 'maaf' carries deep respect. Unlike casual English apologies, it signals genuine acknowledgment.".to_string()),
            audio_url: None,
            level: ContentLevel::A1,
            category: ContentCategory::Hotel,
            xp_reward: 20,
            order: 1,
            is_published: true,
            tags: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        lesson_col.insert_one(lesson3).await.unwrap();

        // 3d. Create Lesson 4
        let lesson4 = Lesson {
            id: None,
            module_id: module_id_2,
            title: "Offering Solutions".to_string(),
            title_id: Some("Menawarkan Solusi".to_string()),
            content: "Provide immediate alternatives to resolve the guest's issue.".to_string(),
            content_id: Some("Berikan alternatif untuk menyelesaikan masalah...".to_string()),
            instruction: None,
            instruction_id: None,
            culture_notes: None,
            audio_url: None,
            level: ContentLevel::A1,
            category: ContentCategory::Hotel,
            xp_reward: 20,
            order: 2,
            is_published: true,
            tags: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        lesson_col.insert_one(lesson4).await.unwrap();

        lesson_id_for_games = Some(lesson_id_1);
        let _lesson_id_for_games_2 = Some(lesson_id_2);

        // 4. Create Vocabulary
        let vocab_col: Collection<Vocabulary> = db.collection("vocabulary");
        vocab_col
            .insert_many(vec![
                Vocabulary {
                    id: None,
                    lesson_id: lesson_id_1,
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
                    lesson_id: lesson_id_1,
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
            lesson_id: lesson_id_1,
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
            lesson_id: lesson_id_1,
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

        println!(
            "✅ Successfully seeded example course, module, lesson, vocab, dialogue, and quiz!"
        );
    } else {
        // If courses exist, just grab the first one to attach the games to
        if let Ok(Some(module)) = db.collection::<Module>("modules").find_one(doc! {}).await {
            module_id_for_games = module.id;
        }
        if let Ok(Some(lesson)) = db.collection::<Lesson>("lessons").find_one(doc! {}).await {
            lesson_id_for_games = lesson.id;
        }
    }

    // 7. Create Gamification Content
    let game_col: Collection<GameContent> = db.collection("games");
    let count_games = game_col.count_documents(doc! {}).await.unwrap_or(0);

    if count_games == 0 {
        if let (Some(module_id), Some(lesson_id)) = (module_id_for_games, lesson_id_for_games) {
            use serde_json::json;

            let games = vec![
                GameContent {
                    id: None,
                    module_id: Some(module_id),
                    lesson_id,
                    game_type: GameType::SceneMatcher,
                    title: "Greet the Guest".to_string(),
                    instructions: "Select the correct greeting for 2:00 PM.".to_string(),
                    difficulty: "easy".to_string(),
                    asset_url: None,
                    data_json: json!({
                        "emoji": "🏨",
                        "question": "A guest walks up to the desk at 2:00 PM. What do you say?",
                        "options": [
                            "Good morning!",
                            "Good afternoon!",
                            "Good evening!",
                            "Hey there!"
                        ],
                        "correct": "Good afternoon!"
                    }),
                    ai_scenario_id: None,
                    xp_reward: 10,
                    is_active: true,
                    order: 1,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                GameContent {
                    id: None,
                    module_id: Some(module_id),
                    lesson_id,
                    game_type: GameType::RespectMaster,
                    title: "Polite Refusal".to_string(),
                    instructions: "Choose the most respectful way to decline a request."
                        .to_string(),
                    difficulty: "medium".to_string(),
                    asset_url: None,
                    data_json: json!({
                        "avatar": "👨‍💼",
                        "scenario": "A guest asks for a late checkout, but the hotel is fully booked.",
                        "options": [
                            "We can't do that. We are full.",
                            "No late checkout today.",
                            "I apologize, but we are fully booked tonight, so we cannot accommodate a late checkout.",
                            "You have to leave by 12."
                        ],
                        "correct": "I apologize, but we are fully booked tonight, so we cannot accommodate a late checkout."
                    }),
                    ai_scenario_id: None,
                    xp_reward: 15,
                    is_active: true,
                    order: 2,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                GameContent {
                    id: None,
                    module_id: Some(module_id),
                    lesson_id,
                    game_type: GameType::VoiceStar,
                    title: "Welcome Phrase".to_string(),
                    instructions: "Read the phrase aloud clearly.".to_string(),
                    difficulty: "easy".to_string(),
                    asset_url: None,
                    data_json: json!({
                        "script": "Welcome to the Grand Hotel. How can I assist you today?"
                    }),
                    ai_scenario_id: None,
                    xp_reward: 20,
                    is_active: true,
                    order: 3,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                GameContent {
                    id: None,
                    module_id: Some(module_id),
                    lesson_id,
                    game_type: GameType::WordScramble,
                    title: "Vocabulary Jumble".to_string(),
                    instructions: "Unscramble the letters to form a hotel-related word."
                        .to_string(),
                    difficulty: "easy".to_string(),
                    asset_url: None,
                    data_json: json!({
                        "word": "RESERVATION",
                        "hint": "Something you make before arriving at the hotel."
                    }),
                    ai_scenario_id: None,
                    xp_reward: 10,
                    is_active: true,
                    order: 4,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                GameContent {
                    id: None,
                    module_id: Some(module_id),
                    lesson_id,
                    game_type: GameType::Matching,
                    title: "Service Terms".to_string(),
                    instructions:
                        "Match the English service terms with their Indonesian translations."
                            .to_string(),
                    difficulty: "medium".to_string(),
                    asset_url: None,
                    data_json: json!({
                        "pairs": [
                            {"left": "Housekeeping", "right": "Layanan Kamar"},
                            {"left": "Front Desk", "right": "Resepsionis"},
                            {"left": "Bellboy", "right": "Pembawa Bagasi"},
                            {"left": "Check-in", "right": "Pendaftaran Masuk"}
                        ]
                    }),
                    ai_scenario_id: None,
                    xp_reward: 15,
                    is_active: true,
                    order: 5,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                GameContent {
                    id: None,
                    module_id: Some(module_id),
                    lesson_id,
                    game_type: GameType::FillInTheBlank,
                    title: "Polite Greetings".to_string(),
                    instructions: "Complete the sentence with the most appropriate polite word."
                        .to_string(),
                    difficulty: "easy".to_string(),
                    asset_url: None,
                    data_json: json!({
                        "sentence": "Good afternoon, ____ to the Grand Hotel.",
                        "blank_index": 16,
                        "options": ["welcome", "hello", "stay", "visit"],
                        "correct": "welcome"
                    }),
                    ai_scenario_id: None,
                    xp_reward: 10,
                    is_active: true,
                    order: 6,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
            ];

            game_col
                .insert_many(games)
                .await
                .expect("Failed to seed games");
            println!("🎮 Successfully seeded Gamification Engine games!");
        }
    }
}

pub async fn seed_speaking_scenarios(client: &Client) {
    let db = client.database("rustapi");
    let scenario_col: Collection<SpeakingScenario> = db.collection("speaking_scenarios");

    let count = scenario_col.count_documents(doc! {}).await.unwrap_or(0);

    if count == 0 {
        println!("🗣️ Seeding Speaking Practice Scenarios...");

        let lesson_col: Collection<Lesson> = db.collection("lessons");
        let lesson = lesson_col.find_one(doc! { "title": "Greeting & Welcoming" }).await.unwrap();
        let lesson_id = lesson.map(|l| l.id.unwrap());

        let scenarios = vec![
            SpeakingScenario {
                id: None,
                lesson_id,
                title: "Front Desk Check-in".to_string(),
                description: "Practice welcoming a guest and handling their reservation.".to_string(),
                role_ai: "Guest".to_string(),
                role_user: "Receptionist".to_string(),
                context: "A tired guest arrives at the Grand Hotel after a long flight. They have a reservation but are a bit impatient.".to_string(),
                initial_message: "Hello, I'm here to check in. My name is Mark Thompson. It was a very long flight and I'd really like to get to my room as soon as possible.".to_string(),
                target_vocabulary: vec![
                    "reservation".to_string(),
                    "welcome".to_string(),
                    "registration".to_string(),
                    "key card".to_string(),
                    "amenities".to_string(),
                ],
                level: ContentLevel::A1,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            SpeakingScenario {
                id: None,
                lesson_id,
                title: "Restaurant Reservation".to_string(),
                description: "Handle a walk-in guest at the hotel restaurant.".to_string(),
                role_ai: "Guest".to_string(),
                role_user: "Host/Hostess".to_string(),
                context: "A couple wants a table for two for dinner, but they don't have a reservation on a busy Friday night.".to_string(),
                initial_message: "Good evening. We don't have a reservation, but do you happen to have a table for two available right now?".to_string(),
                target_vocabulary: vec![
                    "availability".to_string(),
                    "waiting list".to_string(),
                    "table".to_string(),
                    "pleasure".to_string(),
                ],
                level: ContentLevel::A1,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            }
        ];

        scenario_col.insert_many(scenarios).await.expect("Failed to seed scenarios");
        println!("✅ Successfully seeded Speaking Practice Scenarios!");
    }
}

pub async fn seed_api_keys(client: &Client) {
    let db = client.database("rustapi");
    let key_col: Collection<LlmApiKey> = db.collection("llm_api_keys");

    let existing = key_col.find_one(doc! { "provider": "gemini" }).await.unwrap_or(None);

    if let Some(mut key) = existing {
        if !key.is_active {
            println!("🔑 Activating existing Gemini API key...");
            key.is_active = true;
            key_col.replace_one(doc! { "_id": key.id.unwrap() }, key).await.expect("Failed to activate key");
        } else {
            println!("✅ Gemini API key is already active.");
        }
    } else {
        if let Ok(api_key) = std::env::var("GEMINI_API_KEY") {
            println!("🔑 Seeding Gemini API key from environment...");
            let key = LlmApiKey {
                id: None,
                provider: "gemini".to_string(),
                name: "Primary Gemini Key".to_string(),
                api_key,
                is_active: true,
                created_at: Utc::now(),
            };
            key_col.insert_one(key).await.expect("Failed to seed API key");
        } else {
            println!("⚠️ GEMINI_API_KEY not found in environment. AI features will require manual configuration.");
        }
    }
}

pub async fn seed_phrasal_verbs(client: &Client) {
    let db = client.database("rustapi");
    let set_col: Collection<VocabSet> = db.collection("vocab_sets");
    let word_col: Collection<VocabWord> = db.collection("vocab_words");

    let count = set_col.count_documents(doc! { "set_type": "phrasal_verbs" }).await.unwrap_or(0);

    if count == 0 {
        println!("📚 Seeding Phrasal Verbs & Collocations library...");

        let now = mongodb::bson::DateTime::now();

        // 1. Phrasal Verb Set
        let set = VocabSet {
            id: None,
            title: "Essential Workplace Phrasal Verbs".to_string(),
            topic: "Workplace".to_string(),
            level: "B1".to_string(),
            language: "Indonesian".to_string(),
            word_count: 2,
            game_types: vec!["flashcard".to_string(), "mcq".to_string(), "matching".to_string(), "fill".to_string()],
            related_topics: vec!["Office Life".to_string(), "Professionalism".to_string()],
            status: "published".to_string(),
            created_by: "admin".to_string(),
            set_type: "phrasal_verbs".to_string(),
            published_at: Some(now),
            created_at: Some(now),
            updated_at: Some(now),
            example_dialogue: Some(vec![
                VocabDialogueLine {
                    speaker: "Manager".to_string(),
                    text_en: "Can we team up to finish this report?".to_string(),
                    text_id: "Bisakah kita bekerja sama untuk menyelesaikan laporan ini?".to_string(),
                },
                VocabDialogueLine {
                    speaker: "Employee".to_string(),
                    text_en: "Sure, let's pick up where we left off yesterday.".to_string(),
                    text_id: "Tentu, mari kita lanjutkan dari bagian terakhir kemarin.".to_string(),
                },
            ]),
        };

        let s_res = set_col.insert_one(set).await.expect("Failed to seed vocab set");
        let set_id = s_res.inserted_id.as_object_id().unwrap();

        // 2. Phrasal Words
        let words = vec![
            VocabWord {
                id: None,
                set_id,
                word: "team up".to_string(),
                translation: "bekerja sama".to_string(),
                part_of_speech: "phrasal verb".to_string(),
                definition: "to join with someone to work together".to_string(),
                pronunciation_guide: "/tiːm ʌp/".to_string(),
                colloquial_usage: "Common in business and projects".to_string(),
                example_sentence: "We should team up on this presentation.".to_string(),
                distractors: vec!["fight".to_string(), "leave".to_string(), "ignore".to_string()],
                item_dialogue: Some(vec![
                    VocabDialogueLine {
                        speaker: "A".to_string(),
                        text_en: "I think we should team up for the marketing pitch.".to_string(),
                        text_id: "Saya rasa kita harus bekerja sama untuk presentasi pemasaran.".to_string(),
                    },
                    VocabDialogueLine {
                        speaker: "B".to_string(),
                        text_en: "Great idea, we'll be stronger together.".to_string(),
                        text_id: "Ide bagus, kita akan lebih kuat bersama.".to_string(),
                    },
                ]),
                audio_url: None,
                position: 0,
            },
            VocabWord {
                id: None,
                set_id,
                word: "pick up".to_string(),
                translation: "melanjutkan / menjemput".to_string(),
                part_of_speech: "phrasal verb".to_string(),
                definition: "to continue from a previous point".to_string(),
                pronunciation_guide: "/pɪk ʌp/".to_string(),
                colloquial_usage: "Used when returning to a task".to_string(),
                example_sentence: "Let's pick up the discussion tomorrow.".to_string(),
                distractors: vec!["drop off".to_string(), "cancel".to_string(), "stop".to_string()],
                item_dialogue: Some(vec![
                    VocabDialogueLine {
                        speaker: "A".to_string(),
                        text_en: "Shall we pick up where we left off?".to_string(),
                        text_id: "Haruskah kita melanjutkan dari bagian terakhir?".to_string(),
                    },
                    VocabDialogueLine {
                        speaker: "B".to_string(),
                        text_en: "Yes, let's start from page five.".to_string(),
                        text_id: "Ya, mari kita mulai dari halaman lima.".to_string(),
                    },
                ]),
                audio_url: None,
                position: 1,
            },
        ];

        word_col.insert_many(words).await.expect("Failed to seed vocab words");
        println!("✅ Successfully seeded Phrasal Verbs example set!");
    }
}

pub async fn seed_speakup_content(client: &Client) {
    let db = client.database("rustapi");
    let content_col: Collection<SpeakUpContent> = db.collection("speakup_content");

    let count = content_col.count_documents(doc! {}).await.unwrap_or(0);

    if count == 0 {
        println!("🎙️ Seeding SpeakUp content library...");

        let now = Utc::now();

        let content = vec![
            SpeakUpContent {
                id: None,
                content_type: SpeakUpType::Shadowing,
                difficulty: "A1".to_string(),
                title: "Checking In".to_string(),
                title_id: Some("Check-in".to_string()),
                transcript: "I would like to check in, please.".to_string(),
                transcript_id: Some("Saya ingin check-in, tolong.".to_string()),
                audio_url: Some("https://storage.googleapis.com/audio-samples/check-in.mp3".to_string()),
                steps: None,
                target_wpm: 120,
                created_at: now,
                updated_at: now,
            },
            SpeakUpContent {
                id: None,
                content_type: SpeakUpType::Expansion,
                difficulty: "A1".to_string(),
                title: "Coffee Order".to_string(),
                title_id: Some("Pesanan Kopi".to_string()),
                transcript: "I would like a large latte with extra sugar, please.".to_string(),
                transcript_id: Some("Saya ingin latte besar dengan gula ekstra, tolong.".to_string()),
                audio_url: None,
                steps: Some(vec![
                    "I would like".to_string(),
                    "I would like a large latte".to_string(),
                    "I would like a large latte with extra sugar, please.".to_string(),
                ]),
                target_wpm: 140,
                created_at: now,
                updated_at: now,
            },
        ];

        content_col.insert_many(content).await.expect("Failed to seed SpeakUp content");
        println!("✅ Successfully seeded SpeakUp content examples!");
    }
}
