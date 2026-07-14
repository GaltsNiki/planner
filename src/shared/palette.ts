// The accent palette shared across the app. Lives in @shared (not the renderer
// store) so migration and the goal editor draw from the same source — colours
// stay consistent between generated spheres, seeded goals, and the editor.
//
// The palette is a curated set of sphere accents. It's tuned so each colour is
// easy to tell apart from the others and stays readable on the dark app
// background:
//   • hues are spaced ~55–75° apart around the wheel (coral → amber → green →
//     teal → blue → violet → magenta) so no two sit close enough to be confused;
//   • lightness is held in a narrow 0.68–0.75 band and chroma in 0.13–0.16, so
//     colours carry similar visual weight and each clears WCAG-AA (≥4.5:1) contrast
//     against the #141416 card / #0d0d0f app backgrounds they label.
// The first entry stays the app's coral accent so the default sphere matches the
// brand. Colours are assigned to new spheres in order, then cycle.

/** Accent colours offered in the goal editor and used to colour spheres/goals. */
export const GOAL_COLORS = [
  '#E8563F',                // coral (brand accent)
  'oklch(0.75 0.14 90)',    // amber
  'oklch(0.72 0.15 150)',   // green
  'oklch(0.72 0.12 195)',   // teal
  'oklch(0.70 0.13 250)',   // blue
  'oklch(0.70 0.13 300)',   // violet
  'oklch(0.70 0.16 350)'    // magenta
]
