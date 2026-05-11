# EngagePro — Implementation Plan
**Speaking-First English Learning App for Hospitality Workers**
Version 1.1 | May 2026 · Revised with launch audit findings

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
14. [Audit Findings & Resolved Gaps](#14-audit-findings--resolved-gaps)

---

## 1. Product Vision & North Star

### What EngagePro Is

EngagePro is a speaking-first English learning app built specifically for hospitality workers in non-English-speaking countries — hotel, restaurant, and cruise-line staff who must speak English with guests on the job. Every session requires the student to speak out loud. Passive learning (reading, tapping, matching) is a support layer, not the product.

**The core insight:** Duolingo teaches vocabulary through games. Babbel teaches grammar through translation. EngagePro makes you speak out loud, in a real conversation, from day one. For absolute beginners, the app focuses on Phonics (sounds) and visual-first scaffolding to ensure a low barrier to entry.

> **Design principle — never add a "skip speaking" button.** The entire competitive moat vs Duolingo depends on speaking being non-negotiable. If speaking becomes skippable, the product becomes a worse Duolingo. This decision must be protected at every roadmap review.

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
- **Conversation Engine** — LLM-driven roleplay handler with scenario context injection and dynamic guest responses; includes offline fallback to pre-scripted dialogue trees when network is unavailable
- **Gamification Engine** — XP calculation, speaking streak tracking, level progression thresholds
- **Subscription Service** — free tier limits, paid tier access control, credit management

---

## 3. Phase 1 — Private Beta (Weeks 1–8)

### Goal

Ship to 50–100 real hospitality workers. Validate the two core hypotheses before adding any features:

1. Does the AI roleplay actually build speaking confidence?
2. Is the pronunciation scoring accurate enough for users to trust?

**Success criterion:** User completes 3 sessions per week (with both drill + roleplay) for 3 consecutive weeks.

> **Content requirement:** Minimum 15 scenarios must be ready before beta opens. At 3 sessions/week, users will exhaust 5 scenarios within 10 days — before the 3-week measurement window closes. 15 scenarios provides adequate runway for the full beta period.

### Deliverables

#### Week 1–2: Foundation
- [ ] Flutter app: authentication flow (sign up, login, onboarding)
- [ ] **Beginner-Friendly Onboarding**: Spoken assessment with "Repeat after me" mode for absolute beginners (Pre-A1)
- [ ] **Pre-A1 Fallback Placement**: users who cannot produce 3 sentences during spoken assessment are routed to a tap-to-listen phonics placement path instead
- [ ] Backend: JWT auth, user profile, course/lesson data model
- [ ] Admin Panel: basic course architect (create/edit lessons)

#### Week 3–4: Speaking Engine v1
- [ ] STT integration — real-time speech-to-text on device
- [ ] Phoneme comparison against target phrase
- [ ] 3-band scoring display: Clear (green) / Try again (amber) / Listen first (red)
- [ ] Show which sound failed (e.g. "the 'th' in 'thank' sounded like 'f'")
- [ ] 2 retry attempts before auto-advance
- [ ] Speaking streak counter (separate from lesson streak)
- [ ] **Session state recovery**: if STT fails or session is interrupted mid-flow, restore session state on relaunch; protect XP from being lost on interrupted sessions

#### Week 5–6: AI Roleplay v1 + Offline Fallback
- [ ] 15 pilot scenarios minimum (see Section 7 for scenario list)
- [ ] LLM conversation handler with scenario context
- [ ] Voice input for every student turn (no text option in main flow)
- [ ] 1–3 star scoring per session (fluency + correct vocab + response speed)
- [ ] Post-session review: replay any turn, see clear vs unclear turns
- [ ] **Offline / degraded network fallback**: when LLM is unreachable, automatically switch to pre-scripted branching dialogue for the active scenario. Notifies the user with a single non-blocking banner ("You're offline — using practice mode"). Speaking drill and scoring remain fully functional offline.
- [ ] **Student audio replay (minimal)**: after each roleplay session, user can replay their own recorded turns. Full side-by-side native comparison is Phase 2, but self-replay builds trust in the scoring engine earlier.

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
- [ ] Admin Panel: AIGenerator (lesson + dialogue generation from templates) — accelerated from original schedule to support beta content target

#### Week 11–12: Onboarding, Track Selection & Pre-A1 Path
- [ ] **Onboarding Questionnaire**: selection for track (General English, Hospitality, IELTS)
- [ ] **Goal Setting**: set user "Target to Achieve" (e.g., Get a Job, IELTS 7.0, Travel) and "Target Duration"
- [ ] **Pre-A1 Phonics Curriculum** (fully specified — see Section 10): letter-sound correspondences, minimal pairs, 3-sound blends; 10 phonics-only micro-sessions before first full roleplay
- [ ] **Adaptive Scaffolding**: detect absolute beginners and enable "Guided Mode" (visual hints, emoji + image support, slower AI speech at 50% native speed for Pre-A1)
- [ ] Spoken onboarding assessment (3 sentences → placed at correct level) with Pre-A1 tap-to-listen fallback from Week 1
- [ ] First session tutorial overlay (explains the 5 phases)
- [ ] "Your first roleplay" guided mode (AI guest speaks slower, gives hints)
- [ ] Offline support for pronunciation drills (cache audio + scoring model)

#### Week 13–14: Speaking Replay Feature
- [ ] Record student audio during roleplay turns
- [ ] Post-session: play student recording vs native model side-by-side
- [ ] Visual waveform comparison (simplified — amplitude only, not spectrogram)
- [ ] "Practice this phrase" shortcut from replay screen

#### Week 15–16: Launch Preparation
- [ ] App Store and Play Store assets (screenshots must show AI roleplay as hero)
- [ ] **Subscription paywall UX** — gate triggers only at session boundaries (between phases), never mid-roleplay turn or mid-pronunciation drill; free tier: 3 lessons + 1 roleplay/day; paid: unlimited; paywall screen specifies exactly what unlocks
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
  Clear        = ≥85% phonemes matched
  Try again    = 60–84% matched
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

### Error & Recovery Rules

- STT timeout (>3 seconds, no audio detected): prompt user to retry once, then offer "Listen first" with no streak penalty.
- Network drop mid-STT: complete scoring locally if audio is cached; fall back to "Try again" if not.
- Session interrupted (app backgrounded, call received): restore session to last completed phase on relaunch; XP earned up to interruption point is preserved.

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

### Scenario Count by Phase

| Phase | Milestone | Scenario Count |
|---|---|---|
| Phase 1 beta opens | Minimum to sustain 3-week measurement | 15 |
| Phase 2 v1 launch | Full launch library | 20 |
| Phase 3 expansion | Extended library | 40+ |

### The 20 Launch Scenarios

**Hotel (×8)**
1. Guest check-in (Easy)
2. Room upgrade request (Medium)
3. Handling a complaint — noise (Medium)
4. Handling a complaint — room issue (Hard)
5. Giving directions within the hotel (Easy)
6. Room service order (Easy)
7. Wake-up call and breakfast request (Easy)
8. Bill explanation and checkout (Medium)

**Restaurant (×6)**
9. Greeting and seating a guest (Easy)
10. Taking a food order (Medium)
11. Explaining a dish or ingredient (Medium)
12. Handling a dietary request (Hard)
13. Dealing with a wrong order (Hard)
14. Presenting the bill (Easy)

**Cruise (×6)**
15. Welcome aboard greeting (Easy)
16. Shore excursion information (Medium)
17. Cabin service request (Easy)
18. Emergency safety briefing (Hard)
19. Activity scheduling (Medium)
20. Guest complaint — service delay (Hard)

### AI Guest Behaviour Rules

- **Beginner-Friendly Pacing**: AI speaks at 50% speed for Pre-A1, 60% for Stage 1, gradually increasing to 100% at Stage 4.
- **Visual Scaffolding**: uses emojis and images alongside speech to aid comprehension for Pre-A1 users.
- **Supportive Fallback**: if the student is silent or confused, the AI guest offers a hint (e.g., "Are you looking for the lobby?").
- Gets confused if the student's speech is unclear — does not pretend to understand.
- Thanks and responds positively to clear, correct responses.
- Uses natural contractions and hospitality phrasing, not formal textbook English.
- Speaks at 80% of native speed by default (configurable per difficulty level).
- Never corrects grammar directly — reacts naturally as a real guest would.
- **Offline mode**: when LLM is unavailable, switches to pre-scripted branching dialogue without interrupting the session flow.

### Scenario Design Rules

Each scenario must have:
- A 10-second audio hook
- 3–5 conversation turns
- 5–7 vocabulary words pre-taught
- 3 possible star outcomes
- A fallback path for unrelated responses
- A pre-scripted offline branching tree (minimum 2 branches per turn)

---

## 8. Session Flow — Mandatory Speaking Design

Every session follows this exact 5-phase structure:

| Phase | Duration | Skippable |
|---|---|---|
| 1. Hook | 60 seconds | No |
| 2. Vocab | 3 minutes | No |
| 3. Pronunciation Drill | 3 minutes | **No — mandatory** |
| 4. AI Roleplay | 5–8 minutes | **No — mandatory** |
| 5. Review | 2 minutes | No |

**Paywall gate placement**: the subscription prompt, if triggered, appears only after Phase 5 (Review) completes or before Phase 1 (Hook) begins. It must never interrupt Phase 3 or Phase 4.

---

## 9. Feature Scope per Phase

### In scope for v1

- Core 5-phase session flow with mandatory speaking
- Pronunciation drill with phoneme-level feedback
- AI roleplay with LLM + offline fallback
- 20 scenarios across Hotel, Restaurant, Cruise
- A1–B1 curriculum (160 lessons)
- Spoken placement assessment with Pre-A1 fallback path
- Guided Mode for absolute beginners
- Speaking streak + XP gamification
- Student audio self-replay (post-session)
- Subscription paywall (free: 3 lessons + 1 roleplay/day)
- Push notifications

### Deferred to Phase 2 / Phase 3

- Side-by-side native vs student audio comparison (Week 13–14)
- Waveform visualisation
- B2B team dashboard
- Rhythm and stress scoring
- Accent selection
- Web app
- A/B test framework

### Permanently out of scope (v1)

- Text-only roleplay mode in the main learning flow
- Skip button for speaking phases
- Passive-only lesson tracks

---

## 10. Curriculum Structure

### Learning Tracks

| Track | Focus | Roleplay Type |
|---|---|---|
| **Hospitality** | Work-ready speech (Hotel/Rest/Cruise) | Guest interaction scenarios |
| **General English** | Social fluency & travel | Daily life & social scenarios |
| **IELTS** | Exam performance (Speaking/Listening) | Examiner interview simulations |

### General English — 160-Lesson Matrix

A complete English curriculum from zero to advanced, designed for steady progression over 2–4 years.

| Metric | Total | Breakdown |
|---|---|---|
| **Stages** | 4 | Zero to Advanced (Pre-A1 to C1) |
| **Modules** | 16 | 4 modules per stage |
| **Lessons** | 160 | 10 lessons per module |

---

### Stage 1 — Absolute Beginner (Pre-A1)
**Duration:** 1–3 months · **Study:** 30–60 min/day

#### Course 1: Sounds & Letters (Phonics)
*Focus: Phonemic awareness and the English alphabet.*
- **L1**: The English alphabet — names & sounds
- **L2**: Vowel sounds (short)
- **L3**: Vowel sounds (long)
- **L4**: Consonant sounds B, P, M, N
- **L5**: Consonant sounds T, D, S, Z
- **L6**: Consonant sounds F, V, H, W
- **L7**: Difficult sounds: TH, SH, CH
- **L8**: Syllables — clapping words
- **L9**: Word stress basics
- **L10**: Mini review + pronunciation test (Phase 1 Gate)

#### Remaining Stage 1 Courses
- **Course 2**: Survival vocabulary (10 lessons)
- **Course 3**: First sentences (10 lessons)
- **Course 4**: Listening & sounds (10 lessons)

---

### Stage 2 — Elementary (A1–A2)
**Duration:** 3–9 months · **Study:** 45–60 min/day

- **Course 5**: Everyday grammar (10 lessons)
- **Course 6**: Daily life topics (10 lessons)
- **Course 7**: Past tense (10 lessons)
- **Course 8**: Basic reading & writing (10 lessons)

---

### Stage 3 — Pre-intermediate (B1)
**Duration:** 9–18 months · **Study:** 60 min/day

- **Course 9**: Expanded grammar (10 lessons)
- **Course 10**: Conversation skills (10 lessons)
- **Course 11**: Reading for meaning (10 lessons)
- **Course 12**: Writing paragraphs (10 lessons)

---

### Stage 4 — Intermediate → Advanced (B2–C1)
**Duration:** 18 months–4 yrs · **Study:** 60–90 min/day

- **Course 13**: Advanced grammar (10 lessons)
- **Course 14**: Fluency & pronunciation (10 lessons)
- **Course 15**: Academic & professional English (10 lessons)
- **Course 16**: Immersion & fluency (10 lessons)

---

### Target-Based Progression

Users set a **Target Goal** (e.g., "Achieve B2 for Interview" or "IELTS 7.0") and a **Duration** (e.g., 3 months). The system adjusts XP requirements and session intensity to meet this goal. Stage 1 progression requires "Clear" on at least 6 of 10 phonics sessions in Course 1.

---

## 11. Monetisation Model

**Free tier:** 3 lessons + 1 roleplay per day. Paywall gate appears only at session boundaries — never mid-session.

**Paid tier (individual):** Unlimited lessons and roleplays. Local affordability pricing per market (Bali, Bangkok, Manila, Ho Chi Minh City, Mexico City).

**B2B tier (Phase 3):** Bulk licence per staff member per month. Includes team dashboard, manager-assigned paths, and completion certificates.

**No ads.** Ad-supported models introduce an incentive to maximise session time rather than speaking quality.

---

## 12. Ship Readiness Gates

### Beta Gate (Phase 1 open)

- [ ] 15+ scenarios live and QA'd
- [ ] STT accuracy >85% on 20-sample native benchmark
- [ ] Offline fallback tested on airplane mode (iOS + Android)
- [ ] Session state recovery tested: kill app mid-roleplay, relaunch, verify state restored
- [ ] Pre-A1 fallback placement path live and tested
- [ ] Crash-free rate >99% in internal testing

### v1 Launch Gate (Phase 2 complete)

- [ ] 20+ scenarios live
- [ ] 160-lesson curriculum complete
- [ ] Paywall UX reviewed: confirm gate never appears mid-session
- [ ] Cold start <3 seconds on mid-range Android (target device: Samsung Galaxy A-series)
- [ ] App Store and Play Store assets approved
- [ ] Speaking Monitor live in Admin Panel
- [ ] Legal: Privacy policy, terms of service, GDPR + PDPA compliance reviewed

---

## 13. Team & Ownership

| Area | Owner |
|---|---|
| Mobile (Flutter) | Mobile lead |
| Backend / API (Rust) | Backend lead |
| Speaking Engine (STT + scoring) | ML engineer |
| Conversation Engine (LLM + offline fallback) | Backend lead + ML engineer |
| Curriculum & scenarios | Content lead |
| Admin Panel (React) | Frontend engineer |
| Pre-A1 phonics curriculum design | Curriculum lead + ELT advisor |
| QA — offline / network degradation | QA engineer |
| Analytics & North Star tracking | Product lead |

---

## 14. Audit Findings & Resolved Gaps

This section records the changes made in v1.1 following the pre-launch audit (May 2026).

### Critical issues resolved

**Offline roleplay fallback (was: missing)**
Pre-scripted branching dialogue trees added to scenario design spec (Section 7). Offline mode delivery added to Phase 1 Week 5–6 deliverables. Offline testing added to Beta Ship Gate (Section 12).

**Content volume at beta (was: 5 scenarios)**
Minimum scenario count for beta raised from 5 to 15 (Section 3 and Section 7). Rationale: at 3 sessions/week, 5 scenarios are exhausted within 10 days — before the 3-week North Star measurement window closes. AIGenerator tool accelerated from Week 9–10 to support this.

**Pre-A1 onboarding path (was: deferred to Phase 2)**
Placement fallback (tap-to-listen path for users who cannot produce 3 spoken sentences) moved to Phase 1 Week 1–2. Full phonics curriculum specified and added to Section 10. Guided Mode AI speed floor lowered to 50% for Pre-A1 (was 60%). Pre-A1 phonics curriculum design ownership added to Section 13.

### High-risk issues resolved

**Paywall UX unspecified (was: undefined)**
Paywall gate placement rule added: triggers only at session boundaries, never mid-roleplay or mid-drill. Added to Section 8 and Section 12 ship gate checklist.

**Speaking replay moved earlier (was: Week 13–14 only)**
Minimal student audio self-replay (own recordings only, no native comparison) added to Phase 1 Week 5–6. Full side-by-side comparison with native audio remains in Phase 2 Week 13–14.

**Session state recovery unspecified (was: missing)**
STT failure and session interruption recovery rules added to Speaking Engine spec (Section 6). Recovery testing added to Beta Ship Gate.

---

## 15. UI/UX & Motion Design Flow

To ensure the app feels "good and friendly" for beginners, the interface follows a **Cinematic & Supportive** design language.

### Visual Identity
- **Palette**: Warm Amber (Energy/Warning), Deep Emerald (Success), and Soft Charcoal (Readability).
- **Typography**: *Outfit* for headings (approachable/modern) and *Inter* for body (legibility).
- **Shapes**: Consistent 24pt "Squircle" corners for all cards and buttons to feel soft and non-threatening.

### Key UI Flows

#### 1. The "Spark" Onboarding
- **Goal**: Immediate success.
- **Flow**: Splash → Track Selection → "Can you say 'Hi'?" (Mic) → **CLEAR!** + Confetti → "You're ready to learn."
- **UX Rule**: No text-heavy instructions. Use animated hands and mic icons to guide the user.

#### 2. The "Ascent" (Session Map)
- **Goal**: Clear sense of progress.
- **Flow**: A vertical scrolling path of "Bento Grid" cards. 
- **Interaction**: Completed lessons have a soft glow. Locked lessons are grayscale with a subtle "shimmer" effect on the lock icon.

#### 3. "The Stage" (Speaking Interface)
- **Goal**: Zero-distraction focus on audio.
- **Flow**: 
    - **Listen**: AI Guest avatar (large, friendly) speaks with an animated speech bubble.
    - **Record**: Large floating Mic button. A gentle **Gaussian Blur** pulses in the background while recording to indicate activity.
    - **Feedback**: Instant color-coded bands. "Try again" displays a friendly "Tap for Hint" bubble showing the target phoneme as an emoji.

### Motion & Animation Principles
- **Micro-interactions**: 
    - **Mic Pulse**: A `CustomPainter` wave animation that reacts to the student's voice volume.
    - **Success Pop**: A quick `ScaleTransition` (1.0 → 1.1 → 1.0) when a phoneme is cleared.
- **Transitions**:
    - **Hero Animations**: The lesson card on the map "grows" to become the background of the active session.
    - **Staggered Entrance**: Phonics options (L1-L10) slide in one-by-one to avoid overwhelming the user.

---

## 16. Feature Stability & Rollout Policy

To ensure EngagePro remains production-ready and professional, no "premature" or non-functional features shall be visible to the user.

### 1. Strict Visibility Rules
- **Hide, Don't Disable**: If a feature (e.g., "IELTS Track" or "Stage 4") is not 100% verified, its entry point (button, menu item, or map card) must be **removed from the UI**, not just grayed out or marked "Coming Soon."
- **Data-Driven Visibility**: The mobile app will only render tracks and modules explicitly marked as `status: "production"` in the API response.

### 2. Feature Gating (Flutter)
- **Local Flags**: Use a `FeatureConfig` utility in Flutter to gate high-risk UI elements. 
- **Rollout Schedule**:
    - **Beta**: Only Stage 1 & 2 + Hospitality Track visible.
    - **v1.0 Launch**: Stage 1-3 + Hospitality & General English visible.
    - **v1.1+**: IELTS and Stage 4 enabled only after content volume reaches 100%.

### 3. Graceful Degradation
- **Assembly Fallback**: If the `Session Assembly Pipeline` fails to generate a valid AI Roleplay scenario due to a backend timeout or STT error, the app must automatically swap the phase for a high-stability "Expansion Drill" to prevent session abandonment.
- **Asset Verification**: Images and audio assets must be pre-cached. If an asset is missing, a generic "Learning Icon" must be used as a fallback to prevent "broken image" placeholders.

### 4. Readiness Gates
A feature is only "visible" once it passes:
- **Functional Audit**: 100% pass on core user flow.
- **Pedagogical Audit**: Curriculum lead approval of all prompts/scripts.
- **UX Audit**: No layout shifts or "Coming Soon" text.

---

*EngagePro Implementation Plan v1.1 — revised May 2026*
