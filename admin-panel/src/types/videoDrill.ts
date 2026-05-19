export interface VideoDrillStep {
  order: number
  step_type: "watch" | "pick_word" | "pick_sentence" | "fill_blank" | "play_game"
  target_text: string
  target_translation?: string
  video_url?: string
  image_url?: string
  audio_url?: string
  distractors: string[]
  auto_distractors: boolean
  vocab_word_id?: string
  blank_sentence?: string
  game_id?: string
}

export interface VideoDrill {
  _id: { $oid: string } | string
  title: string
  topic: string
  level: string
  lesson_id?: string
  steps: VideoDrillStep[]
  created_at: string
  updated_at: string
}

export interface VideoDrillPayload {
  title: string
  topic: string
  level: string
  lesson_id?: string
  steps: VideoDrillStep[]
}
