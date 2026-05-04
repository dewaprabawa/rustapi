use crate::handlers::AppError;

pub trait SpeechToText: Send + Sync {
    fn transcribe(&self, audio_data: Vec<u8>, mime_type: &str) -> impl std::future::Future<Output = Result<String, AppError>> + Send;
}

pub trait TextToSpeech: Send + Sync {
    fn synthesize(&self, text: &str, voice_id: &str) -> impl std::future::Future<Output = Result<Vec<u8>, AppError>> + Send;
}
