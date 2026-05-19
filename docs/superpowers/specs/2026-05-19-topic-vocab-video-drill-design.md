# Topic-Based Vocab Selection & Video Drill Phase

**Date:** 2026-05-19  
**Status:** Approved  
**Scope:** Backend (Rust) + Admin Panel (React) + Student Portal

---

## 1. Overview

Two features that enhance EngagePro's content authoring and learning flow:

1. **Topic-Based Vocab Selection** — Admins can select entire VocabGroups (topics) when configuring Flashcard/VocabDrill phases, with drill-down override to exclude individual words.
2. **Video Drill Phase** — A new session phase type (`video_drill`) with an ordered sequence of Watch, Pick Word, Pick Sentence steps. Video-first with TTS audio fallback.

---

## 2. Feature 1: Topic-Based Vocab Selection

### 2.1 Problem

In `SessionConfig > PhaseEditor`, Flashcard and VocabDrill phases only offer a flat list of individual words. Admins cannot select words by topic/group, despite `VocabGroup` infrastructure already existing in the backend.

### 2.2 Solution

Add a third selection mode alongside "ALL LESSON VOCAB" and "SELECT SPECIFIC":

- **SELECT BY TOPIC** — Shows VocabGroups as expandable cards. One-click selects all words in a group. Expand to deselect individual words.

### 2.3 Backend Changes

#### New PhaseSettings fields (`src/session/models.rs`)

```rust
/// Select entire VocabGroups by ID
#[serde(skip_serializing_if = "Option::is_none")]
pub specific_vocab_group_ids: Option<Vec<ObjectId>>,

/// Individual words to exclude from selected groups
#[serde(skip_serializing_if = "Option::is_none")]
pub excluded_vocab_ids: Option<Vec<ObjectId>>,
```

#### New/Enhanced API endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/admin/vocab-groups` | List all VocabGroups (already exists) |
| `GET` | `/admin/vocab-groups/:id/words` | Get all VocabWords belonging to a group |
| `GET` | `/admin/vocabulary?group_id=xxx` | Filter vocabulary by group |
| `GET` | `/admin/vocabulary?topic=xxx` | Filter vocabulary by topic string |

The `GET /admin/vocab-groups/:id/words` endpoint queries the `vocab_words` collection where `set_id` matches any `VocabSet` whose `group_id` equals the requested group.

### 2.4 Admin Panel Changes

#### New component: `TopicVocabSelector.tsx`

Location: `admin-panel/src/components/session/TopicVocabSelector.tsx`

Props:
```typescript
interface TopicVocabSelectorProps {
  vocabGroups: VocabGroup[]
  selectedGroupIds: string[]
  excludedWordIds: string[]
  onChange: (groupIds: string[], excludedIds: string[]) => void
}
```

Behavior:
- Renders VocabGroups as collapsible cards with: icon, title, word count, level badge
- Group checkbox selects/deselects all words in that group
- Expanding a group reveals individual words with checkboxes
- Search/filter bar at top for finding topics quickly
- Emits `selectedGroupIds` and `excludedWordIds` on change

#### Modified: `PhaseEditor.tsx`

The vocab source toggle gains a third button:

```
[ALL LESSON VOCAB] [SELECT BY TOPIC] [SELECT SPECIFIC]
```

When "SELECT BY TOPIC" is active, renders `TopicVocabSelector` instead of the flat word list.

### 2.5 Data Resolution (Runtime)

When the student app or session engine resolves which words to use:

1. If `specific_vocab_group_ids` is set: query all VocabWords in those groups
2. Remove any words in `excluded_vocab_ids`
3. If `specific_vocab_ids` is also set: union with those specific words
4. If nothing is set: use all lesson vocab (existing behavior)

---

## 3. Feature 2: Video Drill Phase

### 3.1 Problem

No mechanism for the pattern: show a video/audio of a word then quiz the student on what they just heard. This is a proven language learning technique (listen, recognize, recall) that does not fit into existing game types.

### 3.2 Solution

New session phase type `video_drill` backed by a `video_drills` MongoDB collection. Follows the same content-linking pattern as games and vocab (standalone content, linked from PhaseSettings via IDs).

### 3.3 Backend Models (`src/video_drill/models.rs`)

```rust
use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};

// --- Step Type ---

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum VideoDrillStepType {
    /// Student watches/listens - no interaction required
    Watch,
    /// Student picks the correct word from multiple choices
    PickWord,
    /// Student picks the correct sentence from multiple choices
    PickSentence,
}

// --- Step ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoDrillStep {
    pub order: i32,
    pub step_type: VideoDrillStepType,
    /// The word or sentence being taught/tested
    pub target_text: String,
    /// Bahasa Indonesia translation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_translation: Option<String>,
    /// Admin-uploaded video URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,
    /// Fallback audio URL (or TTS if both absent)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,
    /// Wrong answer choices for Pick steps
    #[serde(default)]
    pub distractors: Vec<String>,
    /// If true, system auto-generates distractors from the topic pool
    #[serde(default)]
    pub auto_distractors: bool,
    /// Optional link to an existing VocabWord
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vocab_word_id: Option<ObjectId>,
}

// --- Drill ---

/// Collection: "video_drills"
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoDrill {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub topic: String,
    pub level: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lesson_id: Option<ObjectId>,
    pub steps: Vec<VideoDrillStep>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

// --- Request/Response DTOs ---

#[derive(Debug, Deserialize)]
pub struct CreateVideoDrillRequest {
    pub title: String,
    pub topic: String,
    pub level: String,
    pub lesson_id: Option<String>,
    pub steps: Vec<VideoDrillStep>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVideoDrillRequest {
    pub title: Option<String>,
    pub topic: Option<String>,
    pub level: Option<String>,
    pub lesson_id: Option<String>,
    pub steps: Option<Vec<VideoDrillStep>>,
}

// --- Student Submission ---

#[derive(Debug, Deserialize)]
pub struct VideoDrillStepAnswer {
    pub step_index: i32,
    pub selected: String,
    pub is_correct: bool,
}

#[derive(Debug, Deserialize)]
pub struct SubmitVideoDrillRequest {
    pub steps_completed: i32,
    pub correct_answers: i32,
    pub time_spent_seconds: i32,
    pub answers: Vec<VideoDrillStepAnswer>,
}

#[derive(Debug, Serialize)]
pub struct VideoDrillResultResponse {
    pub xp_earned: i64,
    pub accuracy_percent: f64,
    pub words_learned: i32,
    pub words_to_review: Vec<String>,
}

// --- Result Record ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoDrillResult {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub drill_id: ObjectId,
    pub score: f64,
    pub steps_completed: i32,
    pub correct_answers: i32,
    pub time_spent_seconds: i32,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}
```

### 3.4 Session Phase Integration

#### `src/session/models.rs` changes

Add to `SessionPhaseType` enum:
```rust
/// Video-based watch and pick drill
VideoDrill,
```

Add to `PhaseSettings` struct:
```rust
/// Manually selected video drill IDs
#[serde(skip_serializing_if = "Option::is_none")]
pub specific_video_drill_ids: Option<Vec<ObjectId>>,
```

### 3.5 API Endpoints

#### Admin CRUD

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/admin/video-drills` | List all drills (query: `?topic=X&level=X&lesson_id=X`) |
| `GET` | `/admin/video-drills/:id` | Get single drill with all steps |
| `POST` | `/admin/video-drills` | Create new drill |
| `PUT` | `/admin/video-drills/:id` | Update drill |
| `DELETE` | `/admin/video-drills/:id` | Delete drill |

#### Student Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/student/video-drills/:id` | Fetch drill for playback (with auto-distractors resolved) |
| `POST` | `/student/video-drills/:id/submit` | Submit answers, receive XP and results |

### 3.6 Auto-Distractor Generation (Backend Logic)

When serving a drill to a student (`GET /student/video-drills/:id`):

1. For each step where `auto_distractors == true` and `distractors` is empty:
2. Query VocabWords sharing the same `topic` or `group_id`
3. Exclude the target word
4. Randomly sample 3 words as distractors
5. If fewer than 3 available from the topic, fall back to same-level words from other topics
6. Admin-specified distractors always take priority and are never overwritten

### 3.7 Admin Panel: Video Drills Manager Page

Location: `admin-panel/src/pages/VideoDrillManager.tsx`

#### Drill List View
- Card grid of all video drills, filterable by topic and level
- Each card shows: title, topic badge, level, step count
- Actions: Edit, Delete, Duplicate, Preview

#### Drill Editor Modal
- Header: Title, Topic (dropdown from MasterData), Level (A1-C2), Lesson linkage (optional)
- Step Builder: Drag-and-drop ordered list
- Per step: type selector, target text, translation, video URL, audio URL, distractors list, auto-distractor toggle, VocabWord link
- Quick-fill from topic button: auto-populates Watch+PickWord pairs for each word in a selected VocabGroup
- Preview simulator: inline step-by-step preview of student experience

#### SessionConfig PhaseEditor Integration
- New phase option in the ADD NEW PHASE dropdown: video_drill
- Content tab for video_drill phase: same pattern as games with ALL LESSON DRILLS / SELECT SPECIFIC toggle and library picker modal

### 3.8 Student Portal Experience

When a student reaches the `video_drill` phase during a lesson session:

1. Progress bar at top: current step / total steps
2. Media player area: plays video if available, falls back to audio, falls back to browser TTS
3. Watch steps: Play button (or auto-play), student watches/listens, taps Next
4. Pick steps: After media plays, 4 answer buttons appear (1 correct + 3 distractors shuffled). Correct = green confirmation + XP. Wrong = red flash + lose a life
5. Results screen: total score, accuracy %, words learned, words to review

### 3.9 Scoring and Progress Integration

- Correct picks earn XP based on session xp_multiplier
- Wrong picks deduct a life (existing lives system from GameSession)
- Results update UserVocabProgress:
  - Correct words: increment correct_count, move toward mastered
  - Incorrect words: reset spaced repetition interval, flagged for review
- A VideoDrillResult record is created (parallels GameResult)

---

## 4. File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/video_drill/mod.rs` | Module declaration |
| `src/video_drill/models.rs` | VideoDrill, VideoDrillStep, DTOs |
| `src/video_drill/handlers.rs` | Admin CRUD + student endpoints |
| `admin-panel/src/pages/VideoDrillManager.tsx` | Admin drill list and editor page |
| `admin-panel/src/components/video-drill/DrillEditor.tsx` | Step builder modal |
| `admin-panel/src/components/video-drill/DrillPreview.tsx` | Inline preview simulator |
| `admin-panel/src/components/video-drill/DrillList.tsx` | Card grid of drills |
| `admin-panel/src/components/session/TopicVocabSelector.tsx` | Topic-grouped vocab picker |

### Modified Files

| File | Change |
|------|--------|
| `src/session/models.rs` | Add VideoDrill to SessionPhaseType, add specific_video_drill_ids, specific_vocab_group_ids, excluded_vocab_ids to PhaseSettings |
| `src/lib.rs` | Register video_drill module, add routes |
| `src/vocab/handlers.rs` | Add group_id and topic query filters to vocab list endpoint |
| `admin-panel/src/services/api.ts` | Add video drill API functions |
| `admin-panel/src/App.tsx` | Add Video Drill Manager route |
| `admin-panel/src/components/session/PhaseEditor.tsx` | Add SELECT BY TOPIC mode, add video_drill phase content tab |
| `admin-panel/src/components/session/ConfigModal.tsx` | Add video_drill to phase dropdown |
| `admin-panel/src/pages/SessionConfig.tsx` | Load video drills data |

---

## 5. Dependencies

No new crate dependencies required. All functionality uses existing:
- `mongodb` for database operations
- `serde` / `serde_json` for serialization
- `chrono` for timestamps
- `rand` for distractor shuffling (already in scope)

Admin panel: no new npm packages. Uses existing React, React Query, Lucide icons, Framer Motion.

---

## 6. Out of Scope

- Flutter mobile app implementation (separate spec)
- Video recording/generation tools
- AI-powered auto-generation of entire video drills
- Analytics dashboards for video drill performance
