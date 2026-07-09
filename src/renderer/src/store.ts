import { create } from 'zustand'
import type {
  Goal, Task, StaleTask, ChatMap, Settings, View, PlannerData
} from '@shared/types'

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
  setDragOverDay: (day: number | null) => void

  // Editor
  openNew: (goalId: string | null, day: number | null, week: number | null) => void
  openEditor: (id: string) => void
  edField: <K extends keyof EditorDraft>(k: K, v: EditorDraft[K]) => void
  edPickGoal: (id: string) => void
  saveEd: () => void
  deleteEd: () => void
  closeEd: () => void

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
    view: 'today', activeGoalId: 'g1', dayIndex: 1, weekOffset: 0,
    chatOpen: true, draft: '', ed: null, dragOverDay: null,
    leisureSeed: 0, leisureLoading: false, added: {}, addedTaskIds: {},
    sidebarCollapsed: false, ready: false, todayIndex: 1,

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
    setDragOverDay: (day) => set({ dragOverDay: day }),

    openNew: (goalId, day, week) => {
      const s = get()
      const g = s.goals.find((x) => x.id === goalId) || s.goals[0]
      const am = g.milestones.find((m) => m.status === 'active') || g.milestones[0]
      set({
        ed: {
          isNew: true, id: null, goalId: g.id, mId: am.id, title: '', desc: '',
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
      const am = g.milestones.find((m) => m.status === 'active') || g.milestones[0]
      set((s) => (s.ed ? { ed: { ...s.ed, goalId: id, mId: am.id } } : {}))
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
      set({ leisureLoading: true })
      // The seed drives which set the mock returns; bump after the "search".
      await window.planner.leisure(get().leisureSeed + 1)
      set((s) => ({ leisureLoading: false, leisureSeed: s.leisureSeed + 1, added: {}, addedTaskIds: {} }))
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
