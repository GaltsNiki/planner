import { create } from 'zustand'
import type {
  Goal, Task, StaleTask, ChatMap, Settings, View, PlannerData, Milestone, MilestoneStatus
} from '@shared/types'
import { todayDayIndex } from '@shared/dates'
import { deriveClosenessLabel } from '@shared/closeness'

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
  category: string
  dotColor: string
  measurable: string   // M
  achievable: string   // A
  relevant: string     // R
  deadline: string     // T (ISO date or free text)
  milestones: Milestone[]
}

/** Accent palette offered in the goal editor. */
export const GOAL_COLORS = [
  '#E8563F',
  'oklch(0.7 0.13 250)',
  'oklch(0.72 0.15 150)',
  'oklch(0.7 0.13 300)',
  'oklch(0.75 0.14 90)',
  'oklch(0.68 0.15 20)'
]

interface PlannerState {
  // Persisted domain data
  goals: Goal[]
  tasks: Task[]
  stale: StaleTask[]
  chats: ChatMap
  settings: Settings

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

  // Tasks
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  deleteGoal: (id: string) => void
  moveTask: (id: string, day: number) => void
  /** Reorder a task to sit just before `beforeId`, adopting that task's day/week. */
  reorderTask: (id: string, beforeId: string) => void
  setDragOverDay: (day: number | null) => void

  // Stages (live goal milestones — edited directly on the goal page)
  addStage: (goalId: string) => void
  updateStage: (goalId: string, mId: string, patch: Partial<Milestone>) => void
  removeStage: (goalId: string, mId: string) => void
  moveStage: (goalId: string, mId: string, dir: -1 | 1) => void

  // Task editor
  openNew: (goalId: string | null, day: number | null, week: number | null, mId?: string) => void
  openEditor: (id: string) => void
  edField: <K extends keyof EditorDraft>(k: K, v: EditorDraft[K]) => void
  edPickGoal: (id: string) => void
  saveEd: () => void
  deleteEd: () => void
  closeEd: () => void

  // Goal editor (SMART)
  openNewGoal: () => void
  openEditGoal: (id: string) => void
  goalEdField: <K extends keyof GoalDraft>(k: K, v: GoalDraft[K]) => void
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
  /** Debounced persist of the domain slice. */
  const persist = (): void => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const s = get()
      const data: PlannerData = {
        goals: s.goals, tasks: s.tasks, stale: s.stale, chats: s.chats, settings: s.settings
      }
      void window.planner.saveData(data)
    }, 250)
  }

  const activeGoal = (): Goal => {
    const s = get()
    return s.goals.find((g) => g.id === s.activeGoalId) || s.goals[0]
  }

  return {
    goals: [], tasks: [], stale: [], chats: {}, settings: {},
    view: 'today', activeGoalId: 'g1', dayIndex: todayDayIndex(), weekOffset: 0,
    chatOpen: true, draft: '', ed: null, goalEd: null, dragOverDay: null,
    leisureSeed: 0, leisureLoading: false, added: {}, addedTaskIds: {},
    sidebarCollapsed: false, ready: false, todayIndex: todayDayIndex(),

    hydrate: async () => {
      const data = await window.planner.loadData()
      set({
        goals: data.goals, tasks: data.tasks, stale: data.stale,
        chats: data.chats, settings: data.settings, ready: true
      })
    },

    setView: (v) =>
      // Opening the Today tab always lands on the current day.
      set((s) => (v === 'today' ? { view: v, dayIndex: s.todayIndex, weekOffset: 0 } : { view: v })),
    selectGoal: (id) => set({ view: 'goal', activeGoalId: id }),
    setDay: (i) => { if (i >= 0 && i <= 6) set({ dayIndex: i }) },
    shiftWeek: (d) => set((s) => ({ weekOffset: s.weekOffset + d })),
    thisWeek: () => set({ weekOffset: 0 }),
    openDayInToday: (i) => set({ view: 'today', dayIndex: i, weekOffset: 0 }),
    toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
    openChat: () => set({ chatOpen: true }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    toggleTask: (id) => {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))
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
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, day } : t)) }))
      persist()
    },
    reorderTask: (id, beforeId) => {
      if (id === beforeId) return
      set((s) => {
        const arr = s.tasks.slice()
        const from = arr.findIndex((t) => t.id === id)
        const target = arr.find((t) => t.id === beforeId)
        if (from < 0 || !target) return {}
        const [moved] = arr.splice(from, 1)
        // Adopt the drop target's day/week so cross-day drops land correctly.
        moved.day = target.day
        moved.week = target.week || 0
        // Recompute the index after removal, then insert just before the target.
        const to = arr.findIndex((t) => t.id === beforeId)
        arr.splice(to, 0, moved)
        return { tasks: arr }
      })
      persist()
    },
    setDragOverDay: (day) => set({ dragOverDay: day }),

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
          const milestones = g.milestones.map((m) => (m.id === mId ? { ...m, ...patch } : m))
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

    openNew: (goalId, day, week, mId) => {
      const s = get()
      const g = s.goals.find((x) => x.id === goalId) || s.goals[0]
      // A goal may have no milestones yet — mId is then empty, which is valid.
      const am = g?.milestones.find((m) => m.status === 'active') || g?.milestones[0]
      set({
        ed: {
          isNew: true, id: null, goalId: g?.id ?? '', mId: mId ?? am?.id ?? '', title: '', desc: '',
          day: day == null ? s.todayIndex : day, week: week == null ? 0 : week, done: false
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
          desc: ed.desc || '', done: !!ed.done, day: ed.day, week: ed.week || 0
        }
        set((s) => ({ tasks: [...s.tasks, nt], ed: null }))
      } else {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === ed.id
              ? { ...t, title, desc: ed.desc || '', done: !!ed.done, day: ed.day, week: ed.week || 0, goalId: ed.goalId, mId: ed.mId }
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

    openNewGoal: () =>
      set({
        goalEd: {
          isNew: true, id: null, title: '', category: '', dotColor: GOAL_COLORS[0],
          measurable: '', achievable: '', relevant: '', deadline: '',
          milestones: []
        }
      }),
    openEditGoal: (id) => {
      const g = get().goals.find((x) => x.id === id)
      if (!g) return
      set({
        goalEd: {
          isNew: false, id: g.id, title: g.title, category: g.category, dotColor: g.dotColor,
          measurable: g.measurable || '', achievable: g.achievable || '',
          relevant: g.relevant || '', deadline: g.deadline || '',
          // Clone milestones so edits stay in the draft until saved.
          milestones: g.milestones.map((m) => ({ ...m }))
        }
      })
    },
    goalEdField: (k, v) => set((s) => (s.goalEd ? { goalEd: { ...s.goalEd, [k]: v } } : {})),
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
          ? { goalEd: { ...s.goalEd, milestones: s.goalEd.milestones.map((m) => (m.id === mId ? { ...m, ...patch } : m)) } }
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
      const common = {
        title,
        category: gd.category.trim() || 'Цель',
        dotColor: gd.dotColor,
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
        set((s) => ({ goals: [...s.goals, goal], goalEd: null, view: 'goal', activeGoalId: id }))
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
      if (!val) return
      const gid = s.activeGoalId
      set((st) => ({
        draft: '', chatOpen: true,
        chats: { ...st.chats, [gid]: [...(st.chats[gid] || []), { role: 'user', text: val }] }
      }))
      const rep = await window.planner.chat(val, activeGoal(), get().tasks)
      set((st) => ({
        chats: { ...st.chats, [gid]: [...(st.chats[gid] || []), { role: 'assistant', text: rep }] }
      }))
      persist()
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
      const g = s.goals.find((x) => x.id === 'g4') || s.goals[0]
      const m = g.milestones[0]
      const taskId = 'ls' + Date.now()
      const nt: Task = {
        id: taskId, goalId: g.id, mId: m.id, title: sug.title,
        desc: sug.place ? 'Место: ' + sug.place : '', done: false, day: sug.day, week: s.weekOffset
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
