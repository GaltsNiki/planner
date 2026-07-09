import type { PlannerApi } from '@shared/ipc'

declare global {
  interface Window {
    planner: PlannerApi
  }
}

export {}
