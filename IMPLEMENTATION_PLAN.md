# EngagePro — Implementation Plan
**Speaking-First English Learning App for Hospitality Workers**
Version 1.0 | May 2026

---

## Table of Contents

1. [Product Vision & North Star](#1-product-vision--north-star)
2. [Architecture Overview](#2-architecture-overview)
3. [Phase 1 — Private Beta (Weeks 1–8)](#3-phase-1--private-beta-weeks-18)
4. [Phase 2 — Public v1 Launch (Weeks 9–16)](#4-phase-2--public-v1-launch-weeks-916)
5. [Phase 3 — B2B & Expansion (Months 5–9)](#5-phase-3--b2b--expansion-months-59)
6. [Speaking Engine — Technical Spec](#6-speaking-engine--technical-spec)
7. [AI Roleplay — Scenario Design](#7-ai-roleplay--scenario-design)
8. [Session Flow — Mandatory Speaking Design](#8-session-flow--mandatory-speaking-design)
9. [Feature Scope per Phase](#9-feature-scope-per-phase)
10. [Curriculum Structure](#10-curriculum-structure)
11. [Monetisation Model](#11-monetisation-model)
12. [Ship Readiness Gates](#12-ship-readiness-gates)
13. [Team & Ownership](#13-team--ownership)

---

## 1. Product Vision & North Star

### What EngagePro Is

EngagePro is a speaking-first English learning app built specifically for hospitality workers in non-English-speaking countries — hotel, restaurant, and cruise-line staff who must speak English with guests on the job. Every session requires the student to speak out loud. Passive learning (reading, tapping, matching) is a support layer, not the product.

**The core insight:** Duolingo teaches vocabulary through games. Babbel teaches grammar through translation. EngagePro makes you speak out loud, in a real conversation, from day one. **For absolute beginners, the app focus is on Phonics (sounds) and visual-first scaffolding to ensure a low barrier to entry.**

### North Star Metric

> **% of users who complete both a pronunciation drill AND an AI roleplay in the same session, 3 or more times per week.**

This is the one number that matters. It measures actual speaking practice, not app opens, not streak counts, not XP earned. If this number is growing, retention and outcomes follow.

### Target Users

**Primary — Individual learners**
Hospitality staff (hotel, restaurant, cruise) in Bali, Thailand, Vietnam, Philippines, and Mexico. Hired or aspiring to work in English-speaking guest environments. Age 18–35. Smartphone-native. Little or no prior English.

**Secondary — B2B training managers**
Hotel chains and hospitality groups purchasing bulk licences for staff onboarding. Evaluated in Phase 3.

---

## 2. Architecture Overview

### Stack

| Layer | Technology | Role |
|---|---|---|
| Mobile App | Flutter (iOS + Android) | Student-facing learning experience |
| Backend API | Rust / Axum | Business logic, AI orchestration, session assembly |
| Admin Panel | React / Next.js | Content creation, monitoring, configuration |
| Speaking AI | STT + phoneme analysis | Real-time pronunciation scoring |
| Conversation AI | LLM (Claude) | Dynamic AI guest roleplay |
| Auth | JWT | Student and admin authentication |
| Storage | PostgreSQL + S3 | Structured data + audio/media assets |

### Key Services

- **Session Assembly Pipeline** — resolves level templates, applies lesson overrides, assembles the 5-phase session for the mobile client
- **Speaking Engine** — STT transcription → phoneme comparison → band scoring (Clear / Try again / Listen first)
- **Conversation Engine** — LLM-driven roleplay handler with scenario context injection and dynamic guest responses
- **Gamification Engine** — XP calculation, speaking streak tracking, level progression thresholds
- **Subscription Service** — free tier limits, paid tier access control, credit management

---

## 3. Phase 1 — Private Beta (Weeks 1–8)

### Goal

Ship to 50–100 real hospitality workers. Validate the two core hypotheses before adding any features:

1. Does the AI roleplay actually build speaking confidence?
2. Is the pronunciation scoring accurate enough for users to trust?

**Success criterion:** User completes 3 sessions per week (with both drill + roleplay) for 3 consecutive weeks.

### Deliverables

#### Week 1–2: Foundation
- [ ] Flutter app: authentication flow (sign up, login, onboarding)
- [ ] **Beginner-Friendly Onboarding**: Spoken assessment with "Repeat after me" mode for absolute beginners (Pre-A1).
- [ ] Backend: JWT auth, user profile, course/lesson data model
- [ ] Admin Panel: basic course architect (create/edit lessons)

#### Week 3–4: Speaking Engine v1
- [ ] STT integration — real-time speech-to-text on device
- [ ] Phoneme comparison against target phrase
- [ ] 3-band scoring display: Clear (green) / Try again (amber) / Listen first (red)
- [ ] Show which sound failed (e.g. "the 'th' in 'thank' sounded like 'f'")
- [ ] 2 retry attempts before auto-advance
- [ ] Speaking streak counter (separate from lesson streak)

#### Week 5–6: AI Roleplay v1
- [ ] 5 pilot scenarios (hotel check-in, complaint, room service, directions, bill)
- [ ] LLM conversation handler with scenario context
- [ ] Voice input for every student turn (no text option in main flow)
- [ ] 1–3 star scoring per session (fluency + correct vocab + response speed)
- [ ] Post-session review: replay any turn, see clear vs unclear turns

#### Week 7–8: Session Flow Lock
- [ ] 5-phase session: Hook → Vocab → Pronunciation Drill → AI Roleplay → Review
- [ ] Pronunciation drill made mandatory (cannot skip)
- [ ] Speaking streak credit awarded only when drill + roleplay both completed
- [ ] XP, lives, basic gamification animations
- [ ] Push notification: daily speaking reminder

---

## 4. Phase 2 — Public v1 Launch (Weeks 9–16)

### Goal

App Store and Google Play release. Stable, polished, monetised. Fix onboarding before adding features — most users drop in the first 2 sessions.

### Deliverables

#### Week 9–10: Content Expansion
- [ ] 20 launch scenarios minimum (Hotel ×8, Restaurant ×6, Cruise ×6)
- [ ] Scenario difficulty label per roleplay: Easy / Medium / Hard
- [ ] Full A1–B1 curriculum: 4 stages × 4 modules × 10 lessons = 160 lessons
- [ ] Admin Panel: VocabForge (batch vocab creation with auto-translation + TTS)
- [ ] Admin Panel: AIGenerator (lesson + dialogue generation from templates)

#### Week 11–12: Onboarding & Track Selection
- [ ] **Onboarding Questionnaire**: Implement selection for track (General English, Hospitality, IELTS).
- [ ] **Goal Setting**: Set user "Target to Achieve" (e.g., Get a Job, IELTS 7.0, Travel) and "Target Duration".
- [ ] **Adaptive Scaffolding**: Detect absolute beginners and enable "Guided Mode" (visual hints + slower AI speech).
- [ ] Spoken onboarding assessment (3 sentences → placed at correct level).
- [ ] First session tutorial overlay (explains the 5 phases).
- [ ] "Your first roleplay" guided mode (AI guest speaks slower, gives hints).
- [ ] Offline support for pronunciation drills (cache audio + scoring model).

#### Week 13–14: Speaking Replay Feature
- [ ] Record student audio during roleplay turns
- [ ] Post-session: play student recording vs native model side-by-side
- [ ] Visual waveform comparison (simplified — amplitude only, not spectrogram)
- [ ] "Practice this phrase" shortcut from replay screen

#### Week 15–16: Launch Preparation
- [ ] App Store and Play Store assets (screenshots must show AI roleplay as hero)
- [ ] Subscription paywall integration (free: 3 lessons + 1 roleplay/day; paid: unlimited)
- [ ] Speaking Monitor in Admin Panel (live audit of student recordings + scores)
- [ ] Analytics Dashboard (session completions, speaking streak distributions, drop-off by phase)
- [ ] Crash-free session rate target: >99%
- [ ] Cold start load time: <3 seconds

---

## 5. Phase 3 — B2B & Expansion (Months 5–9)

### Goal

Sell to hotel chains and training managers. Expand content. Add advanced speaking features.

### Deliverables

#### B2B Platform
- [ ] Team dashboard in Admin Panel (manager view: staff progress, speaking streaks, completion rates)
- [ ] Bulk licence purchase flow (web landing page + Stripe integration)
- [ ] Manager-assigned learning paths (e.g. "all new front-desk staff complete Hotel Module 1 in 30 days")
- [ ] Certificate of completion per module (downloadable PDF)

#### Content Expansion
- [ ] Additional industries: Healthcare English, Retail English
- [ ] 20 additional scenarios (total 40+)
- [ ] Cultural notes layer (add to lesson Read phase — B2 and above only)

#### Advanced Speaking Features
- [ ] Full SpeakUp expansion drill system (shadowing + expansion sequences)
- [ ] Rhythm and stress pattern scoring (beyond phoneme-level)
- [ ] Accent selection for AI guest (British, American, Australian)
- [ ] Speaking portfolio: exportable record of monthly score progression

#### Platform
- [ ] Web app (desktop) for students who prefer to study at a desk
- [ ] Rating and feedback submission (student rates lesson quality)
- [ ] A/B test framework in Admin Panel

---

## 6. Speaking Engine — Technical Spec

### Pronunciation Scoring Flow

```
Student speaks into mic
        ↓
STT engine → text transcript
        ↓
Phoneme extraction from transcript
        ↓
Compare against target phoneme sequence
        ↓
Score per phoneme (match / close / miss)
        ↓
Aggregate to 3-band result:
  Clear      = ≥85% phonemes matched
  Try again  = 60–84% matched
  Listen first = <60% matched
        ↓
UI shows band colour + specific failed sound
(e.g. "the 'th' in 'thank' sounded like 'f'")
```

### Scoring Display Rules

- **No percentage numbers on screen** — only colour bands. Percentages create anxiety and false precision.
- Show exactly one specific sound that failed (the lowest-scoring phoneme).
- After 2 failed attempts: auto-advance with "Listen first" state, no penalty to XP.
- Speaking streak credit: only awarded if student reaches "Clear" on at least 2 of 3 target phrases.

### STT Performance Requirements

| Metric | Target |
|---|---|
| Response latency (mobile, 4G) | <1.5 seconds |
| Accuracy vs native benchmark | >85% |
| Supported languages for STT input | All (multilingual model) |
| Minimum phrase length | 3 words |
| Maximum phrase length | 25 words |

---

## 7. AI Roleplay — Scenario Design

### The 20 Launch Scenarios

(Detailed scenarios for Hotel, Restaurant, and Cruise as specified in the plan)

### AI Guest Behaviour Rules

- **Beginner-Friendly Pacing**: AI speaks at 60% speed for Stage 1, gradually increasing to 100% at Stage 4.
- **Visual Scaffolding**: Uses emojis and images alongside speech to aid comprehension for Pre-A1 users.
- **Supportive Fallback**: If the student is silent or confused, the AI guest offers a "hint" (e.g., "Are you looking for the lobby?").
- Gets confused if the student's speech is unclear — does not pretend to understand.
- Thanks and responds positively to clear, correct responses.
- Uses natural contractions and hospitality phrasing, not formal textbook English.
- Speaks at 80% of native speed (configurable per difficulty level).
- Never corrects grammar directly — reacts naturally as a real guest would.

### Scenario Design Rules

Each scenario must have:
- A 10-second audio hook
- 3–5 conversation turns
- 5–7 vocabulary words pre-taught
- 3 possible star outcomes
- A fallback path for unrelated responses

---

## 8. Session Flow — Mandatory Speaking Design

Every session follows this exact 5-phase structure:
1. **Hook** (60s)
2. **Vocab** (3m)
3. **Pronunciation Drill** (3m) — **MANDATORY**
4. **AI Roleplay** (5–8m) — **MANDATORY**
5. **Review** (2m)

---

## 9. Feature Scope per Phase

(Scope breakdown as specified in the plan, including what to cut for v1)

---

## 10. Curriculum Structure

### Learning Tracks

The curriculum is split into three primary tracks based on the user's selection in the onboarding questionnaire:

| Track | Focus | Roleplay Type |
|---|---|---|
| **Hospitality** | Work-ready speech (Hotel/Rest/Cruise) | Guest interaction scenarios |
| **General English** | Social fluency & travel | Daily life & social scenarios |
| **IELTS** | Exam performance (Speaking/Listening) | Examiner interview simulations |

### Target-Based Progression

Users set a **Target Goal** (e.g., "Achieve B2 for Interview" or "IELTS 7.0") and a **Duration** (e.g., 3 months). The system adjusts XP requirements and session intensity to meet this goal.

### Overview

4 stages → 16 modules → 160 lessons. Every module = 10 lessons. Every Lesson 10 = review + test.

---

## 11. Monetisation Model

Local affordability pricing, no ads, B2B tier.

---

## 12. Ship Readiness Gates

(Quality, Content, and Legal gates as specified in the plan)

---

## 13. Team & Ownership

(Roles and priorities as specified in the plan)
