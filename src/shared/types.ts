// Shared domain types — used by main, preload, and renderer.

export type MilestoneStatus = 'done' | 'active' | 'todo'
export type ChatRole = 'user' | 'assistant'
export type View = 'today' | 'week' | 'goal' | 'review' | 'habits'

export interface Milestone {
  id: string
  title: string
  status: MilestoneStatus
}

export interface Goal {
  id: string
  title: string
  /**
   * Denormalised sphere label, kept in sync with the goal's sphere (see sphereId).
   * Retained for back-compat: the AI context and headers read it directly.
   */
  category: string
  /**
   * The life-sphere this goal belongs to. Optional so pre-existing goals stay
   * valid; a missing/dangling id resolves to the UNSORTED sphere (see spheres.ts).
   */
  sphereId?: string
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
  /** Absolute week index counted from the epoch (see EPOCH_MONDAY in dates.ts). */
  week: number
  /**
   * Epoch ms of the last time the task was created/edited/toggled/moved.
   * Optional so pre-existing tasks stay valid; missing ⇒ treated as "fresh"
   * (never stale) by computeStale(). Drives the real staleness detection.
   */
  updatedAt?: number
}

export interface Habit {
  id: string
  title: string
  /** Completion keys `"<weekOffset>:<dayIndex>"` that are marked done. */
  done: string[]
}

/** A sphere of life (career, health, sport, …) that groups goals. */
export interface Sphere {
  id: string
  title: string
  /** Accent colour (hex or oklch), from the design palette. Goals in the sphere share it. */
  color: string
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
  /** Life-spheres that group goals. Derived from goal categories in migration v2. */
  spheres: Sphere[]
  tasks: Task[]
  stale: StaleTask[]
  chats: ChatMap
  settings: Settings
  habits: Habit[]
  /** Schema/migration version. Absent ⇒ pre-migration (relative week offsets). */
  version?: number
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
