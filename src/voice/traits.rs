use crate::handlers::AppError;

pub struct WordTiming {
    pub word: String,
    pub start: f64,
    pub end: f64,
    pub confidence: f64,
}

pub struct TranscriptionResult {
    pub transcript: String,
    pub words: Vec<WordTiming>,
}

pub trait SpeechToText: Send + Sync {
    fn transcribe(&self, audio_data: Vec<u8>, mime_type: &str) -> impl std::future::Future<Output = Result<String, AppError>> + Send;
    fn transcribe_with_timing(&self, audio_data: Vec<u8>, mime_type: &str) -> impl std::future::Future<Output = Result<TranscriptionResult, AppError>> + Send;
}

pub trait TextToSpeech: Send + Sync {
    fn synthesize(&self, text: &str, voice_id: &str) -> impl std::future::Future<Output = Result<Vec<u8>, AppError>> + Send;
}
