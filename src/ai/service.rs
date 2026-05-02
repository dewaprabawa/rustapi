use crate::ai::models::*;
use crate::content::models::LlmApiKey;
use crate::handlers::AppError;

/// Build the full course-generation prompt from the admin's request parameters.
pub fn build_course_prompt(req: &GenerateCourseRequest) -> String {
    let num_modules = req.num_modules.unwrap_or(2);
    let lessons_per_module = req.lessons_per_module.unwrap_or(2);
    let vocab_per_lesson = req.vocab_per_lesson.unwrap_or(4);
    let skill_focus = req.skill_focus.as_deref()
        .map(|s| s.join(", "))
        .unwrap_or_else(|| "speaking, listening".to_string());
    let target_age = req.target_age.as_deref().unwrap_or("adults");

    let mut prompt = String::new();
    prompt.push_str("You are an expert English language curriculum designer specializing in hospitality industry training for Indonesian learners.\n\n");
    prompt.push_str("Generate a COMPLETE course in JSON format. Follow this structure EXACTLY.\n\n");

    prompt.push_str(&format!("## Parameters\n"));
    prompt.push_str(&format!("- Topic: {}\n", req.topic));
    prompt.push_str(&format!("- Level: {} (CEFR scale)\n", req.level));
    prompt.push_str(&format!("- Category: {}\n", req.category));
    prompt.push_str(&format!("- Skill Focus: {}\n", skill_focus));
    prompt.push_str(&format!("- Target Age: {}\n", target_age));
    prompt.push_str(&format!("- Modules: {}\n", num_modules));
    prompt.push_str(&format!("- Lessons per Module: {}\n", lessons_per_module));
    prompt.push_str(&format!("- Vocabulary per Lesson: {}\n\n", vocab_per_lesson));

    prompt.push_str("## Required JSON Structure\n\n");
    prompt.push_str("Return a single JSON object with this exact schema:\n\n");

    // Use serde_json to build a clean schema example
    let schema = serde_json::json!({
        "course": {
            "title": "English course title",
            "title_id": "Bahasa Indonesia translation",
            "description": "2-3 sentence course description",
            "description_id": "Bahasa Indonesia translation",
            "category": &req.category,
            "level": &req.level,
            "skill_focus": skill_focus.split(", ").collect::<Vec<_>>(),
            "target_age": target_age,
            "estimated_duration": "X weeks",
            "tags": ["tag1", "tag2"]
        },
        "modules": [
            {
                "title": "Module title",
                "title_id": "Bahasa Indonesia",
                "description": "Module description",
                "description_id": "Bahasa Indonesia",
                "order": 1,
                "skill_tags": ["speaking"],
                "lessons": [
                    {
                        "title": "Lesson title",
                        "title_id": "Bahasa Indonesia",
                        "content": "Markdown formatted lesson content with ## headers and bullet points",
                        "content_id": "Konten pelajaran dalam Bahasa Indonesia",
                        "instruction": "Read the dialogue and practice",
                        "instruction_id": "Baca dialog dan praktikkan",
                        "culture_notes": "Cultural tip for Indonesian learners",
                        "xp_reward": 20,
                        "order": 1,
                        "vocabulary": [
                            {
                                "word": "English word",
                                "translation": "Terjemahan Bahasa Indonesia",
                                "pronunciation": "/phonetic/",
                                "example_en": "Example sentence in English.",
                                "example_id": "Contoh kalimat dalam Bahasa Indonesia."
                            }
                        ],
                        "dialogue": {
                            "title": "Dialogue title",
                            "context": "Scene description",
                            "lines": [
                                { "speaker": "Role", "text_en": "English line", "text_id": "Bahasa Indonesia" }
                            ]
                        },
                        "quiz": {
                            "title": "Quiz title",
                            "passing_score": 70,
                            "xp_reward": 30,
                            "questions": [
                                {
                                    "question": "Question text?",
                                    "question_id": "Pertanyaan dalam Bahasa Indonesia?",
                                    "options": ["A", "B", "C", "D"],
                                    "correct_answer": 0
                                }
                            ]
                        },
                        "games": [
                            {
                                "game_type": "SCENE_MATCHER",
                                "title": "Game title",
                                "instructions": "Game instructions",
                                "difficulty": "easy",
                                "xp_reward": 10,
                                "data_json": {}
                            }
                        ]
                    }
                ]
            }
        ]
    });
    prompt.push_str(&serde_json::to_string_pretty(&schema).unwrap());
    prompt.push_str("\n\n");

    // Game type rules
    prompt.push_str("## Game Type Rules\n");
    prompt.push_str("Each lesson MUST have exactly 3 games from these 6 types. Rotate them across lessons:\n\n");

    let game_rules = vec![
        ("SCENE_MATCHER", r#"data_json = { "emoji": "hotel_emoji", "question": "Scenario?", "options": ["A","B","C","D"], "correct": "B" }"#),
        ("WORD_SCRAMBLE", r#"data_json = { "word": "RESERVATION", "hint": "Something you make before arriving" }"#),
        ("MATCHING", r#"data_json = { "pairs": [{"left": "English", "right": "Indonesian"}] } (4-6 pairs)"#),
        ("FILL_IN_THE_BLANK", r#"data_json = { "sentence": "Good afternoon, ____ to the Grand Hotel.", "blank_index": 16, "options": ["welcome","hello","stay","visit"], "correct": "welcome" }"#),
        ("RESPECT_MASTER", r#"data_json = { "avatar": "business_person", "scenario": "Situation description", "options": ["rude","casual","polite","very polite"], "correct": "very polite response" }"#),
        ("VOICE_STAR", r#"data_json = { "script": "Full sentence to read aloud" }"#),
    ];
    for (i, (name, desc)) in game_rules.iter().enumerate() {
        prompt.push_str(&format!("{}. **{}**: {}\n", i + 1, name, desc));
    }

    // Content guidelines
    prompt.push_str(&format!("\n## Content Guidelines\n"));
    prompt.push_str(&format!("- All content must be relevant to the {} hospitality category\n", req.category));
    prompt.push_str(&format!("- Level {}: use appropriate vocabulary complexity\n", req.level));
    prompt.push_str(&format!("- Every lesson needs exactly {} vocabulary words, 1 dialogue (4+ lines), 1 quiz (3+ questions), 3 games\n", vocab_per_lesson));
    prompt.push_str("- Dialogues should have realistic hospitality scenarios\n");
    prompt.push_str("- Quiz questions should test lesson comprehension\n");
    prompt.push_str("- Include Bahasa Indonesia translations for ALL text fields marked with _id suffix\n");
    prompt.push_str("- Culture notes should reference Indonesian customs, politeness norms, or communication style\n\n");

    // Critical rules
    prompt.push_str("## CRITICAL\n");
    prompt.push_str("- Return ONLY valid JSON. No markdown fences, no explanations outside the JSON.\n");
    prompt.push_str("- The content and content_id fields must be PLAIN TEXT strings with markdown formatting, NOT nested JSON objects.\n");
    prompt.push_str("- skill_focus values must be lowercase: speaking, listening, reading, writing, grammar, vocabulary, pronunciation\n");
    prompt.push_str("- Game XP values should be 10-20. Lesson XP should be 15-25. Quiz XP should be 25-35.\n");

    prompt
}

/// Response from LLM call — includes text and token usage for credit tracking.
pub struct LlmResponse {
    pub text: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub total_tokens: i64,
}

/// Call the Anthropic (Claude) API.
pub async fn call_anthropic(api_key: &str, prompt: &str) -> Result<LlmResponse, AppError> {
    let client = reqwest::Client::new();
    let res = client.post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 8192,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7
        }))
        .send()
        .await
        .map_err(|e| {
            eprintln!("Anthropic API request error: {:?}", e);
            AppError::InternalServerError
        })?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        eprintln!("Anthropic API error {}: {}", status, body);
        return Err(AppError::InternalServerError);
    }

    let data: serde_json::Value = res.json().await.map_err(|e| {
        eprintln!("Anthropic API parse error: {:?}", e);
        AppError::InternalServerError
    })?;

    // Anthropic returns { content: [{ type: "text", text: "..." }], usage: { input_tokens, output_tokens } }
    let text = data["content"][0]["text"]
        .as_str()
        .unwrap_or("{}")
        .to_string();

    let input_tokens = data["usage"]["input_tokens"].as_i64().unwrap_or(0);
    let output_tokens = data["usage"]["output_tokens"].as_i64().unwrap_or(0);

    Ok(LlmResponse {
        text,
        input_tokens,
        output_tokens,
        total_tokens: input_tokens + output_tokens,
    })
}

/// Parse raw LLM JSON output into a structured GeneratedCoursePreview.
/// Strips markdown code fences if present and validates structure.
pub fn parse_course_preview(raw: &str) -> Result<GeneratedCoursePreview, AppError> {
    // Strip markdown code fences if the LLM wrapped the response
    let cleaned = raw.trim();
    let cleaned = if cleaned.starts_with("```") {
        let start = cleaned.find('\n').map(|i| i + 1).unwrap_or(0);
        let end = cleaned.rfind("```").unwrap_or(cleaned.len());
        &cleaned[start..end]
    } else {
        cleaned
    };

    let preview: GeneratedCoursePreview = serde_json::from_str(cleaned.trim())
        .map_err(|e| {
            eprintln!("Failed to parse AI course preview: {:?}", e);
            eprintln!("Raw response (first 500 chars): {}", &cleaned[..cleaned.len().min(500)]);
            AppError::BadRequest(format!("AI returned invalid JSON: {}", e))
        })?;

    // Basic validation
    if preview.course.title.is_empty() {
        return Err(AppError::BadRequest("AI generated an empty course title".to_string()));
    }
    if preview.modules.is_empty() {
        return Err(AppError::BadRequest("AI generated zero modules".to_string()));
    }
    for module in &preview.modules {
        if module.lessons.is_empty() {
            return Err(AppError::BadRequest(
                format!("Module '{}' has zero lessons", module.title)
            ));
        }
    }

    Ok(preview)
}

/// Call the appropriate LLM provider based on the stored key config.
pub async fn call_llm_for_course(key: &LlmApiKey, prompt: &str) -> Result<LlmResponse, AppError> {
    match key.provider.as_str() {
        "anthropic" => call_anthropic(&key.api_key, prompt).await,
        "gemini" => {
            let text = crate::content::handlers::call_gemini_pub(&key.api_key, prompt).await?;
            // Gemini doesn't return token counts in the same way — estimate from text length
            let est_input = (prompt.len() / 4) as i64;
            let est_output = (text.len() / 4) as i64;
            Ok(LlmResponse { text, input_tokens: est_input, output_tokens: est_output, total_tokens: est_input + est_output })
        },
        "groq" => {
            let text = crate::content::handlers::call_groq_pub(&key.api_key, prompt).await?;
            let est_input = (prompt.len() / 4) as i64;
            let est_output = (text.len() / 4) as i64;
            Ok(LlmResponse { text, input_tokens: est_input, output_tokens: est_output, total_tokens: est_input + est_output })
        },
        _ => {
            eprintln!("Unsupported provider for course generation: {}", key.provider);
            Err(AppError::InternalServerError)
        }
    }
}

/// Estimate cost in USD based on provider and token counts.
pub fn estimate_cost(provider: &str, input_tokens: i64, output_tokens: i64) -> f64 {
    match provider {
        // Claude Sonnet 4 pricing (per 1M tokens)
        "anthropic" => {
            let input_cost = (input_tokens as f64 / 1_000_000.0) * 3.0;
            let output_cost = (output_tokens as f64 / 1_000_000.0) * 15.0;
            input_cost + output_cost
        },
        // Gemini 2.0 Flash — free tier / very low cost
        "gemini" => {
            let input_cost = (input_tokens as f64 / 1_000_000.0) * 0.10;
            let output_cost = (output_tokens as f64 / 1_000_000.0) * 0.40;
            input_cost + output_cost
        },
        // Groq Llama — very cheap
        "groq" => {
            let input_cost = (input_tokens as f64 / 1_000_000.0) * 0.59;
            let output_cost = (output_tokens as f64 / 1_000_000.0) * 0.79;
            input_cost + output_cost
        },
        _ => 0.0,
    }
}

