use axum::{
    extract::{State, Multipart},
    response::IntoResponse,
    Json,
};
use crate::handlers::{AppState, AppError};
use crate::models::User;
use std::sync::Arc;

/// Pronunciation scoring result returned to the client.
#[derive(Debug, serde::Serialize)]
pub struct PronunciationScore {
    pub transcript: String,
    pub expected: String,
    pub accuracy_score: f64,   // 0–100
    pub feedback: String,
}

/// POST /progress/voice/score
///
/// Accepts multipart form data with:
///   - `audio`: the recorded audio file (wav/webm)
///   - `expected_text`: the sentence the user was supposed to say
///
/// For now, this uses a simple Levenshtein-based similarity scorer.
/// In production, swap the `transcribe_audio` function for a real
/// Google Speech-to-Text or Whisper API call.
pub async fn score_pronunciation(
    State(_state): State<Arc<AppState>>,
    _user: User,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut _audio_bytes: Option<Vec<u8>> = None;
    let mut expected_text: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::InternalServerError)?
    {
        match field.name() {
            Some("audio") => {
                _audio_bytes = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|_| AppError::InternalServerError)?
                        .to_vec(),
                );
            }
            Some("expected_text") => {
                expected_text = Some(
                    field
                        .text()
                        .await
                        .map_err(|_| AppError::InternalServerError)?,
                );
            }
            _ => {}
        }
    }

    let expected = expected_text
        .ok_or(AppError::InternalServerError)?
        .trim()
        .to_lowercase();

    // ── Transcription stub ──────────────────────────────────────
    // TODO(#voice-star): Replace with a real STT call:
    //   let transcript = google_stt::transcribe(&audio_bytes).await?;
    //
    // For development, we simulate a high-accuracy transcription so
    // the rest of the pipeline (scoring, feedback, XP) can be tested
    // end-to-end without requiring an external API key.
    let transcript = simulate_transcription(&expected);

    // ── Similarity scoring ──────────────────────────────────────
    let accuracy_score = compute_similarity(&expected, &transcript);

    let feedback = match accuracy_score as u32 {
        90..=100 => "Excellent pronunciation! 🌟".to_string(),
        70..=89  => "Good job! A few sounds need polishing.".to_string(),
        50..=69  => "Keep practising — you're getting there!".to_string(),
        _        => "Try again slowly. Focus on each word.".to_string(),
    };

    Ok(Json(PronunciationScore {
        transcript,
        expected,
        accuracy_score,
        feedback,
    }))
}

/// Simulates transcription by introducing minor "errors" into the
/// expected text. This lets the full pipeline work without an API key.
fn simulate_transcription(expected: &str) -> String {
    let words: Vec<&str> = expected.split_whitespace().collect();
    if words.len() <= 2 {
        return expected.to_string();
    }

    // Drop one random-ish word to simulate imperfect recognition
    let skip_idx = words.len() / 2;
    words
        .iter()
        .enumerate()
        .filter(|(i, _)| *i != skip_idx)
        .map(|(_, w)| *w)
        .collect::<Vec<&str>>()
        .join(" ")
}

/// Computes a 0–100 similarity score between two strings using
/// a normalised Levenshtein distance.
fn compute_similarity(a: &str, b: &str) -> f64 {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let len_a = a_chars.len();
    let len_b = b_chars.len();

    if len_a == 0 && len_b == 0 {
        return 100.0;
    }

    let mut matrix = vec![vec![0usize; len_b + 1]; len_a + 1];

    for i in 0..=len_a {
        matrix[i][0] = i;
    }
    for j in 0..=len_b {
        matrix[0][j] = j;
    }

    for i in 1..=len_a {
        for j in 1..=len_b {
            let cost = if a_chars[i - 1] == b_chars[j - 1] { 0 } else { 1 };
            matrix[i][j] = (matrix[i - 1][j] + 1)
                .min(matrix[i][j - 1] + 1)
                .min(matrix[i - 1][j - 1] + cost);
        }
    }

    let max_len = len_a.max(len_b) as f64;
    let distance = matrix[len_a][len_b] as f64;
    ((1.0 - distance / max_len) * 100.0).max(0.0)
}
