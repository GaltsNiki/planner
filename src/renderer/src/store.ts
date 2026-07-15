import { create } from 'zustand'
import type {
  Goal, Task, StaleTask, ChatMap, Settings, View, PlannerData, Milestone, MilestoneStatus, Habit, Sphere
} from '@shared/types'
import { todayDayIndex, currentWeekIndex } from '@shared/dates'
import { deriveClosenessLabel, patchMilestones } from '@shared/closeness'
import { escapeHtml } from '@shared/taskMeta'
import { findLeisureGoal } from '@shared/leisure'
import { GOAL_COLORS as PALETTE } from '@shared/palette'
import { UNSORTED_SPHERE_ID, UNSORTED_SPHERE_TITLE, UNSORTED_SPHERE_COLOR, resolveSphereId } from '@shared/spheres'

export interface EditorDraft {
  isNew: boolean
  id: string | null
  goalId: string
  mId: string
  title: string
  desc: string
  day: number
  week: number
  done: boolean
}

/** Working copy for the SMART goal editor (create + edit). */
export interface GoalDraft {
  isNew: boolean
  id: string | null
  title: string        // S — Specific
  sphereId: string     // the life-sphere this goal belongs to
  dotColor: string
  measurable: string   // M
  achievable: string   // A
  relevant: string     // R
  deadline: string     // T (ISO date or free text)
  milestones: Milestone[]
}

/** Accent palette offered in the goal editor. Re-exported from @shared so the
 *  editor's existing `import { GOAL_COLORS } from '../store'` keeps working. */
export { GOAL_COLORS } from '@shared/palette'

interface PlannerState {
  // Persisted domain data
  goals: Goal[]
  spheres: Sphere[]
  tasks: Task[]
  stale: StaleTask[]
  chats: ChatMap
  settings: Settings
  habits: Habit[]

  // View / UI state (not persisted)
  view: View
  activeGoalId: string
  dayIndex: number
  weekOffset: number
  chatOpen: boolean
  draft: string
  ed: EditorDraft | null
  goalEd: GoalDraft | null
  dragOverDay: number | null
  leisureSeed: number
  leisureLoading: boolean
  added: Record<string, boolean>
  /** Maps a leisure suggestion id -> the task id it created, for undo. */
  addedTaskIds: Record<string, string>
  sidebarCollapsed: boolean
  ready: boolean
  todayIndex: number
  /** Whether a Gemini API key is configured (real AI vs. demo/mock replies). */
  hasApiKey: boolean
  /** Whether the chat is currently awaiting an AI reply. */
  chatSending: boolean
  settingsOpen: boolean

  // Lifecycle
  hydrate: () => Promise<void>

  // Navigation
  setView: (v: View) => void
  selectGoal: (id: string) => void
  setDay: (i: number) => void
  shiftWeek: (d: number) => void
  thisWeek: () => void
  openDayInToday: (i: number) => void
  toggleChat: () => void
  openChat: () => void
  toggleSidebar: () => void

  // Settings / API key
  openSettings: () => void
  closeSettings: () => void
  setApiKey: (plain: string) => Promise<void>
  clearApiKey: () => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void

  // Tasks
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  deleteGoal: (id: string) => void
  moveTask: (id: string, day: number) => void
  /** Reorder a task to sit just before `beforeId`, adopting that task's day/week. */
  reorderTask: (id: string, beforeId: string) => void
  setDragOverDay: (day: number | null) => void

  // Spheres (life areas that group goals)
  addSphere: (title: string, color?: string) => string
  renameSphere: (id: string, title: string) => void
  recolorSphere: (id: string, color: string) => void
  deleteSphere: (id: string) => void
  /** Reorder spheres on the dashboard: move `id` to sit where `beforeId` currently is. */
  reorderSphere: (id: string, beforeId: string) => void

  // Stages (live goal milestones — edited directly on the goal page)
  addStage: (goalId: string) => void
  updateStage: (goalId: string, mId: string, patch: Partial<Milestone>) => void
  removeStage: (goalId: string, mId: string) => void
  moveStage: (goalId: string, mId: string, dir: -1 | 1) => void

  // Habits
  addHabit: () => void
  renameHabit: (id: string, title: string) => void
  deleteHabit: (id: string) => void
  toggleHabitDay: (id: string, key: string) => void

  // Task editor
  openNew: (goalId: string | null, day: number | null, week: number | null, mId?: string) => void
  openEditor: (id: string) => void
  edField: <K extends keyof EditorDraft>(k: K, v: EditorDraft[K]) => void
  edPickGoal: (id: string) => void
  saveEd: () => void
  deleteEd: () => void
  closeEd: () => void

  // Goal editor (SMART)
  openNewGoal: (sphereId?: string) => void
  openEditGoal: (id: string) => void
  goalEdField: <K extends keyof GoalDraft>(k: K, v: GoalDraft[K]) => void
  /** Pick the goal's sphere; keeps the goal colour matching the sphere unless it was customised. */
  goalEdPickSphere: (id: string) => void
  goalEdAddMilestone: () => void
  goalEdUpdateMilestone: (mId: string, patch: Partial<Milestone>) => void
  goalEdRemoveMilestone: (mId: string) => void
  goalEdMoveMilestone: (mId: string, dir: -1 | 1) => void
  saveGoalEd: () => void
  deleteGoalEd: () => void
  closeGoalEd: () => void

  // Chat / AI
  setDraft: (v: string) => void
  send: (text?: string) => Promise<void>
  breakDown: (title: string, goalId: string) => Promise<void>

  // Leisure
  refreshLeisure: () => Promise<void>
  addSuggestion: (s: { id: string; day: number; title: string; place: string }) => void
  removeSuggestion: (id: string) => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const usePlanner = create<PlannerState>((set, get) => {
  const snapshot = (): PlannerData => {
    const s = get()
    return { goals: s.goals, spheres: s.spheres, tasks: s.tasks, stale: s.stale, chats: s.chats, settings: s.settings, habits: s.habits }
  }

  /** Debounced persist of the domain slice. */
  const persist = (): void => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void window.planner.saveData(snapshot())
    }, 250)
  }

  /** Write any pending edit immediately — used on quit so a debounced save isn't lost. */
  const flush = (): void => {
    if (!saveTimer) return
    clearTimeout(saveTimer)
    saveTimer = null
    void window.planner.saveData(snapshot())
  }

  // Flush the debounce when the window is closing (covers "closed right after an edit").
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
  }

  const activeGoal = (): Goal | undefined => {
    const s = get()
    return s.goals.find((g) => g.id === s.activeGoalId) || s.goals[0]
  }

  return {
    goals: [], spheres: [], tasks: [], stale: [], chats: {}, settings: {}, habits: [],
    view: 'today', activeGoalId: 'g1', dayIndex: todayDayIndex(), weekOffset: currentWeekIndex(),
    chatOpen: true, draft: '', ed: null, goalEd: null, dragOverDay: null,
    leisureSeed: 0, leisureLoading: false, added: {}, addedTaskIds: {},
    sidebarCollapsed: false, ready: false, todayIndex: todayDayIndex(),
    hasApiKey: false, chatSending: false, settingsOpen: false,

    hydrate: async () => {
      const [data, hasApiKey] = await Promise.all([
        window.planner.loadData(),
        window.planner.hasKey().catch(() => false)
      ])
      const spheres = data.spheres ?? []
      // A goal's dot always shows its sphere's colour — snap any that drifted.
      const goals = data.goals.map((g) => {
        const sphere = spheres.find((sp) => sp.id === resolveSphereId(g, spheres))
        return sphere && g.dotColor !== sphere.color ? { ...g, dotColor: sphere.color } : g
      })
      set({
        goals, spheres, tasks: data.tasks, stale: data.stale,
        chats: data.chats, settings: data.settings, habits: data.habits ?? [],
        hasApiKey, ready: true
      })
    },

    setView: (v) =>
      // Opening the Today tab always lands on the current day. The 7-column Week
      // board is cramped beside the chat panel, so collapse the chat when entering it.
      set((s) =>
        v === 'today'
          ? { view: v, dayIndex: s.todayIndex, weekOffset: currentWeekIndex() }
          : v === 'week'
            ? { view: v, chatOpen: false }
            : { view: v }
      ),
    selectGoal: (id) => set({ view: 'goal', activeGoalId: id }),
    setDay: (i) => { if (i >= 0 && i <= 6) set({ dayIndex: i }) },
    shiftWeek: (d) => set((s) => ({ weekOffset: s.weekOffset + d })),
    thisWeek: () => set({ weekOffset: currentWeekIndex() }),
    openDayInToday: (i) => set({ view: 'today', dayIndex: i, weekOffset: currentWeekIndex() }),
    toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
    openChat: () => set({ chatOpen: true }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),
    setApiKey: async (plain) => {
      await window.planner.setKey(plain.trim())
      const hasApiKey = await window.planner.hasKey().catch(() => false)
      set({ hasApiKey })
    },
    clearApiKey: async () => {
      await window.planner.clearKey()
      const hasApiKey = await window.planner.hasKey().catch(() => false)
      set({ hasApiKey })
    },
    updateSettings: (patch) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }))
      persist()
    },

    toggleTask: (id) => {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, updatedAt: Date.now() } : t)) }))
      persist()
    },
    deleteTask: (id) => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      persist()
    },
    deleteGoal: (id) => {
      set((s) => {
        const goals = s.goals.filter((g) => g.id !== id)
        const rest = { ...s.chats }
        delete rest[id]
        return {
          goals,
          // Drop the goal's tasks and stale entries; leave the goal view if it was active.
          tasks: s.tasks.filter((t) => t.goalId !== id),
          stale: s.stale.filter((st) => st.goalId !== id),
          chats: rest,
          view: s.view === 'goal' && s.activeGoalId === id ? 'today' : s.view,
          activeGoalId: s.activeGoalId === id ? (goals[0]?.id ?? '') : s.activeGoalId
        }
      })
      persist()
    },
    moveTask: (id, day) => {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, day, updatedAt: Date.now() } : t)) }))
      persist()
    },
    reorderTask: (id, beforeId) => {
      if (id === beforeId) return
      set((s) => {
        const arr = s.tasks.slice()
        const from = arr.findIndex((t) => t.id === id)
        const target = arr.find((t) => t.id === beforeId)
        if (from < 0 || !target) return {}
        const [orig] = arr.splice(from, 1)
        // Adopt the drop target's day/week so cross-day drops land correctly.
        // Build a new object rather than mutating the one shared with prior state.
        const moved: Task = { ...orig, day: target.day, week: target.week || 0, updatedAt: Date.now() }
        // Recompute the index after removal, then insert just before the target.
        const to = arr.findIndex((t) => t.id === beforeId)
        arr.splice(to, 0, moved)
        return { tasks: arr }
      })
      persist()
    },
    setDragOverDay: (day) => set({ dragOverDay: day }),

    addSphere: (title, color) => {
      const s = get()
      const id = 'sphere' + Date.now()
      const sphere: Sphere = {
        id,
        title: title.trim() || 'Новая сфера',
        color: color ?? PALETTE[s.spheres.length % PALETTE.length]
      }
      set((st) => ({ spheres: [...st.spheres, sphere] }))
      persist()
      return id
    },
    renameSphere: (id, title) => {
      const name = title.trim()
      set((s) => ({
        spheres: s.spheres.map((sp) => (sp.id === id ? { ...sp, title: name || sp.title } : sp)),
        // Keep the denormalised category on this sphere's goals in sync (back-compat).
        goals: name ? s.goals.map((g) => (g.sphereId === id ? { ...g, category: name } : g)) : s.goals
      }))
      persist()
    },
    recolorSphere: (id, color) => {
      set((s) => ({
        spheres: s.spheres.map((sp) => (sp.id === id ? { ...sp, color } : sp)),
        // Goals share their sphere's colour — recolour the whole group with it.
        goals: s.goals.map((g) => (g.sphereId === id ? { ...g, dotColor: color } : g))
      }))
      persist()
    },
    deleteSphere: (id) => {
      // The uncategorised fallback sphere is permanent — it's where orphan goals live.
      if (id === UNSORTED_SPHERE_ID) return
      set((s) => {
        // Ensure the fallback sphere exists, then move this sphere's goals into it.
        const hasUnsorted = s.spheres.some((sp) => sp.id === UNSORTED_SPHERE_ID)
        const base = hasUnsorted
          ? s.spheres
          : [{ id: UNSORTED_SPHERE_ID, title: UNSORTED_SPHERE_TITLE, color: UNSORTED_SPHERE_COLOR }, ...s.spheres]
        return {
          spheres: base.filter((sp) => sp.id !== id),
          // Reparented goals adopt the "Разное" sphere's colour to stay matched.
          goals: s.goals.map((g) =>
            g.sphereId === id
              ? { ...g, sphereId: UNSORTED_SPHERE_ID, category: UNSORTED_SPHERE_TITLE, dotColor: UNSORTED_SPHERE_COLOR }
              : g
          )
        }
      })
      persist()
    },
    reorderSphere: (id, beforeId) => {
      if (id === beforeId) return
      set((s) => {
        const arr = s.spheres.slice()
        const from = arr.findIndex((sp) => sp.id === id)
        const hasTarget = arr.some((sp) => sp.id === beforeId)
        if (from < 0 || !hasTarget) return {}
        const [moved] = arr.splice(from, 1)
        // Recompute the target index after removal, then insert just before it.
        const to = arr.findIndex((sp) => sp.id === beforeId)
        arr.splice(to, 0, moved)
        return { spheres: arr }
      })
      persist()
    },

    // Update a goal's milestones in place and keep the closeness label in sync.
    addStage: (goalId) => {
      set((s) => ({
        goals: s.goals.map((g) => {
          if (g.id !== goalId) return g
          const milestones: Milestone[] = [
            ...g.milestones,
            { id: 'm' + Date.now() + Math.floor(Math.random() * 1000), title: '', status: 'todo' }
          ]
          return { ...g, milestones, closenessLabel: deriveClosenessLabel(milestones) }
        })
      }))
      persist()
    },
    updateStage: (goalId, mId, patch) => {
      set((s) => ({
        goals: s.goals.map((g) => {
          if (g.id !== goalId) return g
          const milestones = patchMilestones(g.milestones, mId, patch)
          return { ...g, milestones, closenessLabel: deriveClosenessLabel(milestones) }
        })
      }))
      persist()
    },
    removeStage: (goalId, mId) => {
      // Leaves any tasks pointing at this stage — they surface under "Прочие задачи".
      set((s) => ({
        goals: s.goals.map((g) => {
          if (g.id !== goalId) return g
          const milestones = g.milestones.filter((m) => m.id !== mId)
          return { ...g, milestones, closenessLabel: deriveClosenessLabel(milestones) }
        })
      }))
      persist()
    },
    moveStage: (goalId, mId, dir) => {
      set((s) => ({
        goals: s.goals.map((g) => {
          if (g.id !== goalId) return g
          const ms = g.milestones.slice()
          const i = ms.findIndex((m) => m.id === mId)
          const j = i + dir
          if (i < 0 || j < 0 || j >= ms.length) return g
          ;[ms[i], ms[j]] = [ms[j], ms[i]]
          return { ...g, milestones: ms }
        })
      }))
      persist()
    },

    addHabit: () => {
      set((s) => ({ habits: [...s.habits, { id: 'h' + Date.now(), title: '', done: [] }] }))
      persist()
    },
    renameHabit: (id, title) => {
      set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, title } : h)) }))
      persist()
    },
    deleteHabit: (id) => {
      set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }))
      persist()
    },
    toggleHabitDay: (id, key) => {
      set((s) => ({
        habits: s.habits.map((h) =>
          h.id === id
            ? { ...h, done: h.done.includes(key) ? h.done.filter((k) => k !== key) : [...h.done, key] }
            : h
        )
      }))
      persist()
    },

    openNew: (goalId, day, week, mId) => {
      const s = get()
      // goalId === '' → a routine task (no goal / stage).
      const routine = goalId === ''
      const g = routine ? undefined : s.goals.find((x) => x.id === goalId) || s.goals[0]
      // A goal may have no milestones yet — mId is then empty, which is valid.
      const am = g?.milestones.find((m) => m.status === 'active') || g?.milestones[0]
      set({
        ed: {
          isNew: true, id: null, goalId: g?.id ?? '', mId: routine ? '' : mId ?? am?.id ?? '', title: '', desc: '',
          day: day == null ? s.todayIndex : day, week: week == null ? currentWeekIndex() : week, done: false
        }
      })
    },
    openEditor: (id) => {
      const t = get().tasks.find((x) => x.id === id)
      if (!t) return
      set({
        ed: {
          isNew: false, id: t.id, goalId: t.goalId, mId: t.mId, title: t.title,
          desc: t.desc || '', day: t.day, week: t.week || 0, done: t.done
        }
      })
    },
    edField: (k, v) => set((s) => (s.ed ? { ed: { ...s.ed, [k]: v } } : {})),
    edPickGoal: (id) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g) return
      // Empty milestone id is fine for a goal without milestones.
      const am = g.milestones.find((m) => m.status === 'active') || g.milestones[0]
      set((s) => (s.ed ? { ed: { ...s.ed, goalId: id, mId: am?.id ?? '' } } : {}))
    },
    saveEd: () => {
      const ed = get().ed
      if (!ed) return
      const title = ed.title.trim()
      if (!title) return
      if (ed.isNew) {
        const nt: Task = {
          id: 'n' + Date.now(), goalId: ed.goalId, mId: ed.mId, title,
          desc: ed.desc || '', done: !!ed.done, day: ed.day, week: ed.week || 0, updatedAt: Date.now()
        }
        set((s) => ({ tasks: [...s.tasks, nt], ed: null }))
      } else {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === ed.id
              ? { ...t, title, desc: ed.desc || '', done: !!ed.done, day: ed.day, week: ed.week || 0, goalId: ed.goalId, mId: ed.mId, updatedAt: Date.now() }
              : t
          ),
          ed: null
        }))
      }
      persist()
    },
    deleteEd: () => {
      const ed = get().ed
      if (!ed || ed.isNew) { set({ ed: null }); return }
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== ed.id), ed: null }))
      persist()
    },
    closeEd: () => set({ ed: null }),

    openNewGoal: (sphereId) => {
      const s = get()
      const targetSphereId = sphereId ?? s.spheres[0]?.id ?? UNSORTED_SPHERE_ID
      const sphere = s.spheres.find((sp) => sp.id === targetSphereId)
      set({
        goalEd: {
          isNew: true, id: null, title: '',
          sphereId: targetSphereId,
          // Default the goal's colour to its sphere's, so the goal and sphere dots
          // match by default (the user can still pick a different colour).
          dotColor: sphere?.color ?? PALETTE[0],
          measurable: '', achievable: '', relevant: '', deadline: '',
          milestones: []
        }
      })
    },
    openEditGoal: (id) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g) return
      set({
        goalEd: {
          isNew: false, id: g.id, title: g.title,
          sphereId: resolveSphereId(g, get().spheres), dotColor: g.dotColor,
          measurable: g.measurable || '', achievable: g.achievable || '',
          relevant: g.relevant || '', deadline: g.deadline || '',
          // Clone milestones so edits stay in the draft until saved.
          milestones: g.milestones.map((m) => ({ ...m }))
        }
      })
    },
    goalEdField: (k, v) => set((s) => (s.goalEd ? { goalEd: { ...s.goalEd, [k]: v } } : {})),
    goalEdPickSphere: (id) =>
      set((s) => {
        if (!s.goalEd) return {}
        const next = s.spheres.find((sp) => sp.id === id)
        // The goal's dot always matches its sphere — adopt the picked sphere's colour.
        return { goalEd: { ...s.goalEd, sphereId: id, dotColor: next?.color ?? s.goalEd.dotColor } }
      }),
    goalEdAddMilestone: () =>
      set((s) =>
        s.goalEd
          ? {
              goalEd: {
                ...s.goalEd,
                milestones: [
                  ...s.goalEd.milestones,
                  { id: 'm' + Date.now() + Math.floor(Math.random() * 1000), title: '', status: 'todo' as MilestoneStatus }
                ]
              }
            }
          : {}
      ),
    goalEdUpdateMilestone: (mId, patch) =>
      set((s) =>
        s.goalEd
          ? { goalEd: { ...s.goalEd, milestones: patchMilestones(s.goalEd.milestones, mId, patch) } }
          : {}
      ),
    goalEdRemoveMilestone: (mId) =>
      set((s) =>
        s.goalEd
          ? { goalEd: { ...s.goalEd, milestones: s.goalEd.milestones.filter((m) => m.id !== mId) } }
          : {}
      ),
    goalEdMoveMilestone: (mId, dir) =>
      set((s) => {
        if (!s.goalEd) return {}
        const ms = s.goalEd.milestones.slice()
        const i = ms.findIndex((m) => m.id === mId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= ms.length) return {}
        ;[ms[i], ms[j]] = [ms[j], ms[i]]
        return { goalEd: { ...s.goalEd, milestones: ms } }
      }),
    saveGoalEd: () => {
      const gd = get().goalEd
      if (!gd) return
      const title = gd.title.trim()
      if (!title) return
      // Keep only milestones with a title; ensure at least one is active.
      const milestones = gd.milestones
        .map((m) => ({ ...m, title: m.title.trim() }))
        .filter((m) => m.title)
      if (milestones.length && !milestones.some((m) => m.status === 'active') && !milestones.every((m) => m.status === 'done')) {
        const firstTodo = milestones.find((m) => m.status === 'todo')
        if (firstTodo) firstTodo.status = 'active'
      }
      const sphere = get().spheres.find((s) => s.id === gd.sphereId)
      const common = {
        title,
        sphereId: gd.sphereId,
        // Denormalised label kept in sync with the sphere for back-compat readers.
        category: sphere?.title ?? 'Цель',
        // The goal's dot always matches its sphere's colour.
        dotColor: sphere?.color ?? gd.dotColor,
        milestones,
        measurable: gd.measurable.trim() || undefined,
        achievable: gd.achievable.trim() || undefined,
        relevant: gd.relevant.trim() || undefined,
        deadline: gd.deadline.trim() || undefined,
        closenessLabel: deriveClosenessLabel(milestones)
      }
      if (gd.isNew) {
        const id = 'g' + Date.now()
        const goal: Goal = {
          id,
          ...common,
          claudeTake: gd.relevant.trim()
            ? `Почему это важно: ${gd.relevant.trim()} Разбей цель на первые конкретные шаги — и начнём двигаться.`
            : 'Новая цель поставлена. Разбей её на первые конкретные шаги, чтобы начать двигаться.'
        }
        // Stay on the current view after creating (don't jump into the goal).
        // activeGoalId still points at the new goal so the empty "Создать цель"
        // flow on the goal page shows it once one exists.
        set((s) => ({ goals: [...s.goals, goal], goalEd: null, activeGoalId: id }))
      } else {
        set((s) => ({
          goals: s.goals.map((g) => (g.id === gd.id ? { ...g, ...common } : g)),
          goalEd: null
        }))
      }
      persist()
    },
    deleteGoalEd: () => {
      const gd = get().goalEd
      if (!gd || gd.isNew || !gd.id) { set({ goalEd: null }); return }
      get().deleteGoal(gd.id)
      set({ goalEd: null })
    },
    closeGoalEd: () => set({ goalEd: null }),

    setDraft: (v) => set({ draft: v }),
    send: async (text) => {
      const s = get()
      const val = (text != null ? text : s.draft).trim()
      // Ignore empty input, or a re-send while a reply is already in flight.
      if (!val || s.chatSending) return
      const goal = activeGoal()
      const gid = s.activeGoalId
      // No goal yet → don't call the AI (it needs a goal to ground the reply);
      // answer inline so the message doesn't silently hang.
      if (!goal) {
        set((st) => ({
          draft: '', chatOpen: true,
          chats: {
            ...st.chats,
            [gid]: [
              ...(st.chats[gid] || []),
              { role: 'user', text: val },
              { role: 'assistant', text: 'Сначала создайте цель — тогда я смогу опираться на её данные и помочь с планом.' }
            ]
          }
        }))
        return
      }
      set((st) => ({
        draft: '', chatOpen: true, chatSending: true,
        chats: { ...st.chats, [gid]: [...(st.chats[gid] || []), { role: 'user', text: val }] }
      }))
      try {
        const rep = await window.planner.chat(val, goal, get().tasks)
        set((st) => ({
          chats: { ...st.chats, [gid]: [...(st.chats[gid] || []), { role: 'assistant', text: rep }] }
        }))
      } catch {
        set((st) => ({
          chats: { ...st.chats, [gid]: [...(st.chats[gid] || []), { role: 'assistant', text: 'Не удалось получить ответ. Попробуйте ещё раз.' }] }
        }))
      } finally {
        set({ chatSending: false })
        persist()
      }
    },
    breakDown: async (title, gid) => {
      set((st) => ({
        view: 'goal', activeGoalId: gid, chatOpen: true,
        chats: {
          ...st.chats,
          [gid]: [...(st.chats[gid] || []), { role: 'user', text: `Разбей задачу «${title}» на шаги` }]
        }
      }))
      const rep = await window.planner.breakDown(title)
      set((st) => ({
        chats: { ...st.chats, [gid]: [...(st.chats[gid] || []), { role: 'assistant', text: rep }] }
      }))
      persist()
    },

    refreshLeisure: async () => {
      // Bump the seed; WeekendIdeas re-fetches (with its own loading state) on change.
      set((s) => ({ leisureSeed: s.leisureSeed + 1, added: {}, addedTaskIds: {} }))
    },
    addSuggestion: (sug) => {
      const s = get()
      // Prefer the leisure goal; fall back to the first goal; if there are no
      // goals at all, add it as a routine task (empty goal/stage) — never crash.
      const g = findLeisureGoal(s.goals) ?? s.goals[0]
      const taskId = 'ls' + Date.now()
      const nt: Task = {
        id: taskId, goalId: g?.id ?? '', mId: g?.milestones[0]?.id ?? '', title: sug.title,
        // Place comes from web-sourced AI output — escape before it enters the
        // HTML description so markup can't execute when the task is opened.
        desc: sug.place ? 'Место: ' + escapeHtml(sug.place) : '',
        done: false, day: sug.day, week: s.weekOffset, updatedAt: Date.now()
      }
      set((st) => ({
        tasks: [...st.tasks, nt],
        added: { ...st.added, [sug.id]: true },
        addedTaskIds: { ...st.addedTaskIds, [sug.id]: taskId }
      }))
      persist()
    },
    removeSuggestion: (id) => {
      set((st) => {
        const taskId = st.addedTaskIds[id]
        const added = { ...st.added }; delete added[id]
        const addedTaskIds = { ...st.addedTaskIds }; delete addedTaskIds[id]
        return {
          tasks: taskId ? st.tasks.filter((t) => t.id !== taskId) : st.tasks,
          added,
          addedTaskIds
        }
      })
      persist()
    }
  }
})
