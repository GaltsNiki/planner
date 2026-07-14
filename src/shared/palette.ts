// The accent palette shared across the app. Lives in @shared (not the renderer
// store) so migration and the goal editor draw from the same source — colours
// stay consistent between generated spheres, seeded goals, and the editor.

/** Accent colours offered in the goal editor and used to colour derived spheres. */
export const GOAL_COLORS = [
  '#E8563F',
  'oklch(0.7 0.13 250)',
  'oklch(0.72 0.15 150)',
  'oklch(0.7 0.13 300)',
  'oklch(0.75 0.14 90)',
  'oklch(0.68 0.15 20)'
]
