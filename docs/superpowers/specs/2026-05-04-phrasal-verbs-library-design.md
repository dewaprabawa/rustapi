# Design Spec: English Phrasal Verbs & Collocations Library

## 1. Overview
This feature extends the existing vocabulary management system (`VocabForge`) to support English Phrasal Verbs and Collocations. It focuses on modern American usage and provides integrated 2-person mini-dialogues for every item to enhance contextual learning.

## 2. Goals
- Integrated Phrasal Verb/Collocation management within the existing VocabForge UI.
- AI-powered generation of phrasal verb sets with Indonesian translations and example dialogues.
- Consistent user experience with the current "Sidebar + Detail" library layout.

## 3. Data Model Changes

### 3.1. `VocabSet` (Updated)
Add a discriminator field to distinguish between content types.
- `set_type`: `String` (values: `"vocabulary"`, `"phrasal_verbs"`) - Defaults to `"vocabulary"`.

### 3.2. `VocabWord` (Updated)
Add an optional dialogue field to provide contextual examples for complex items like phrasal verbs.
- `item_dialogue`: `Option<Vec<VocabDialogueLine>>`
  - `speaker`: `String` (e.g., "A", "B")
  - `text_en`: `String`
  - `text_id`: `String`

## 4. AI Generation Logic

### 4.1. Specialized Prompt
The AI prompt for `phrasal_verbs` will be updated to:
- Specifically request modern American phrasal verbs and collocations.
- Require a 2-line "Person A / Person B" exchange for EVERY word.
- Return a JSON structure that maps directly to the updated `VocabWord` model.

## 5. UI/UX (Frontend)

### 5.1. Tabbed Navigation in VocabForge
A new tab switcher at the top of the Library Sidebar:
- **[ Vocabulary ]** - Existing functionality.
- **[ Phrasal & Collocations ]** - Filters the library to only show `set_type == 'phrasal_verbs'`.

### 5.2. Item Detail View
- The word list in the detail panel will render a "Dialogue" section for any word that has `item_dialogue` data.
- The AI Generation builder will have a "Content Type" toggle to switch between generating standard words vs phrasal verbs.

## 6. Implementation Phases
1. **Phase 1: Backend Migration** - Update Rust models and MongoDB queries.
2. **Phase 2: AI Service Upgrade** - Implement the specialized generation logic.
3. **Phase 3: Frontend Refactor** - Add tabs and conditional rendering to `VocabForge.tsx`.
4. **Phase 4: Testing & Polish** - Ensure games still work with the new data structure.
