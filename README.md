# Hospitality English Learning API 🏨✈️🚢

A robust, high-performance REST API built with **Rust** and **Axum** designed to power a modern hospitality English learning platform. This backend supports structured curriculums, AI-driven content generation, interactive game engines, and real-time pronunciation scoring.

---

## 🚀 Tech Stack

- **Language**: [Rust](https://www.rust-lang.org/) (2024 Edition)
- **Web Framework**: [Axum](https://github.com/tokio-rs/axum)
- **Database**: [MongoDB](https://www.mongodb.com/)
- **Documentation**: [Utoipa](https://github.com/juhaku/utoipa) (OpenAPI / Swagger UI)
- **Authentication**: JWT & Firebase Auth
- **Storage**: Supabase Storage (for profile images & assets)
- **AI Integrations**: Anthropic Claude, Google Gemini, and Groq
- **Deployment**: Vercel (Serverless Functions)

---

## ✨ Key Features

### 🔐 Authentication & Profile
- **Multi-Auth**: Support for traditional Email/Password and Firebase Google Sign-In.
- **Onboarding**: Personalized user persona creation (Level, Tone, Goals).
- **Profile Management**: Image uploads via Supabase and FCM token registration for push notifications.

### 🛠 Admin CMS & Content Management
- **Full Hierarchy**: Manage Courses -> Modules -> Lessons.
- **Rich Content**: CRUD for Vocabulary, Dialogues, and Quizzes.
- **Interview Scenarios**: Advanced AI interview session configuration.
- **Version Control**: Built-in content versioning with one-click rollback capabilities.
- **Asset Upload**: Direct asset management for learning materials.

### 🤖 AI Content Generation (VocabForge & CourseGen)
- **Course Generation**: Generate full, multi-module hospitality courses from a single topic.
- **VocabForge**: Thematic vocabulary set generation with Indonesian translations and distractors.
- **Translation**: High-quality English to Indonesian content translation.
- **Credit Tracking**: Token usage logging and estimated USD cost tracking for LLM calls.

### 🎮 Gamification & Learning Engine
- **Game Engine**: Powering 10+ game types (Scene Matcher, Word Scramble, Respect Master, etc.).
- **Speaking Practice**: Real-time voice scoring and pronunciation feedback.
- **SRS-lite**: Student vocabulary tracking with "Mastered", "Learning", and "Unseen" states.
- **XP & Streaks**: Automatic progress tracking, XP rewards, and daily streak management.

### 📢 Notifications & Monitoring
- **FCM Integration**: Real-time push notifications to mobile devices.
- **In-App Inbox**: System-wide and user-specific notification management.
- **Speaking Monitor**: Admin dashboard for monitoring student speaking sessions.

---

## 🛠 Installation & Setup

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [MongoDB](https://www.mongodb.com/try/download/community)
- Vercel CLI (optional, for deployment)

### Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL=mongodb://localhost:27017
JWT_SECRET=your_secret_here
FIREBASE_SERVICE_ACCOUNT_JSON={"your": "firebase_json"}
ANTHROPIC_API_KEY=your_key
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
```

### Running Locally
```bash
cargo run --bin rustapi-local
```
The API will be available at `http://localhost:3001`.

---

## 📖 API Documentation

The API includes built-in Swagger UI for exploration and testing.
- **URL**: `http://localhost:3001/swagger-ui`
- **Spec**: `/api-docs/openapi.json`

---

## 📂 Project Structure

```text
rustapi/
├── src/
│   ├── admin/          # Admin-specific handlers & logic
│   ├── ai/             # AI generation services & LLM prompts
│   ├── content/        # Core CMS models & handlers
│   ├── game/           # Game engine logic & session management
│   ├── vocab/          # SRS and student vocabulary logic
│   ├── auth.rs         # JWT & Auth utilities
│   ├── lib.rs          # Route registration & app state
│   ├── models.rs       # Shared data models
│   ├── swagger.rs      # OpenAPI definitions
│   └── main.rs         # Local entry point
├── api/                # Vercel entry point
├── configs/            # Config files & credentials
└── vercel.json         # Vercel deployment config
```

---

## 🚀 Deployment

This API is optimized for Vercel. To deploy:
```bash
vercel deploy --prod
```

---

## 📄 License
MIT License.
