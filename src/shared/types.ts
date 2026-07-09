// Shared domain types — used by main, preload, and renderer.

export type MilestoneStatus = 'done' | 'active' | 'todo'
export type ChatRole = 'user' | 'assistant'
export type View = 'today' | 'week' | 'goal' | 'review'

export interface Milestone {
  id: string
  title: string
  status: MilestoneStatus
}

export interface Goal {
  id: string
  title: string
  category: string
  /** Per-goal accent colour (hex or oklch), from the design palette. */
  dotColor: string
  milestones: Milestone[]
  closenessLabel: string
  claudeTake: string
  /**
   * SMART goal criteria (optional so pre-existing goals stay valid).
   * S = the title itself (Specific). These cover the rest:
   */
  measurable?: string  // M — how success is measured
  achievable?: string  // A — why it's realistic / resources
  relevant?: string    // R — why it matters
  deadline?: string     // T — target date (ISO yyyy-mm-dd) or free text
}

export interface Task {
  id: string
  goalId: string
  /** Milestone id this task belongs to. */
  mId: string
  title: string
  /** Free-form notes; time (HH:MM) and the first URL are DERIVED from here, not stored. */
  desc: string
  done: boolean
  /** 0 = Monday … 6 = Sunday. */
  day: number
  /** Week offset relative to the current week (0 = current). */
  week: number
}

export interface StaleTask {
  id: string
  goalId: string
  title: string
  /** Days without movement. */
  days: number
}

export interface ChatMessage {
  role: ChatRole
  text: string
}

/** Per-goal chat history, keyed by goal id. */
export type ChatMap = Record<string, ChatMessage[]>

export interface Settings {
  location?: string
  interests?: string[]
}

/** The full persisted document. */
export interface PlannerData {
  goals: Goal[]
  tasks: Task[]
  stale: StaleTask[]
  chats: ChatMap
  settings: Settings
}

/** A leisure suggestion returned by the (mock) web search. */
export interface LeisureSuggestion {
  id: string
  /** 5 = Saturday, 6 = Sunday. */
  day: number
  cat: string
  title: string
  place: string
}
