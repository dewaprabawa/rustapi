use crate::handlers::AppError;
use crate::speakup::models::{SpeakUpAnalysis, WordTiming};
use crate::voice::traits::TranscriptionResult;

pub struct FluencyEngine;

impl FluencyEngine {
    pub async fn analyze(
        transcript_res: TranscriptionResult,
        expected_text: &str,
        target_wpm: i32,
    ) -> Result<SpeakUpAnalysis, AppError> {
        let words = transcript_res.words;
        let transcript = transcript_res.transcript;

        // 1. Calculate Pace (WPM)
        // Duration = last word end - first word start
        let duration_secs = if words.len() > 1 {
            words.last().unwrap().end - words.first().unwrap().start
        } else {
            0.0
        };

        let word_count = words.len() as f64;
        let pace_wpm = if duration_secs > 0.0 {
            (word_count / duration_secs) * 60.0
        } else {
            0.0
        };

        // 2. Detect Hesitations (Pauses > 1.5s between words)
        let mut hesitations = Vec::new();
        for i in 0..words.len().saturating_sub(1) {
            let pause_duration = words[i+1].start - words[i].end;
            if pause_duration > 1.5 {
                hesitations.push(words[i].end);
            }
        }

        // 3. Pronunciation Score (Basic similarity for now, could be phoneme-based later)
        let pronunciation_score = Self::compute_similarity(expected_text, &transcript);

        // 4. Fluency Score (Penalty for hesitations and deviating from target WPM)
        let hesitation_penalty = (hesitations.len() as f64 * 10.0).min(40.0);
        let wpm_ratio = if target_wpm > 0 {
            (pace_wpm / target_wpm as f64).min(1.0).max(0.5)
        } else {
            1.0
        };
        let fluency_score = (100.0 * wpm_ratio - hesitation_penalty).max(0.0);

        // 5. Generate Feedback via Gemini (Simple prompt for now)
        let feedback_text = format!(
            "Your pace was {:.0} WPM (Target: {}). You had {} significant pauses. Pronunciation looks like {:.0}%.",
            pace_wpm, target_wpm, hesitations.len(), pronunciation_score
        );

        // Map word timings
        let word_timings = words.into_iter().map(|w| WordTiming {
            word: w.word,
            start_time: w.start,
            end_time: w.end,
            confidence: w.confidence,
        }).collect();

        Ok(SpeakUpAnalysis {
            pronunciation_score,
            pace_wpm,
            fluency_score,
            hesitations,
            feedback_text,
            word_timings,
        })
    }

    fn compute_similarity(a: &str, b: &str) -> f64 {
        let a = a.to_lowercase();
        let b = b.to_lowercase();
        let a_words: Vec<&str> = a.split_whitespace().collect();
        let b_words: Vec<&str> = b.split_whitespace().collect();
        
        if a_words.is_empty() { return 0.0; }
        
        let mut matches = 0;
        for w in &a_words {
            if b_words.contains(w) {
                matches += 1;
            }
        }
        
        (matches as f64 / a_words.len() as f64) * 100.0
    }
}
