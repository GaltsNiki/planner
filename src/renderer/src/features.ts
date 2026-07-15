/**
 * Feature flags for the renderer UI.
 *
 * `AI_FEATURES_ENABLED` gates the Claude / Gemini AI surfaces in the GUI: the
 * "Ask Claude" chat panel, the weekly summary, the per-goal "take", the
 * stuck-task breakdown, and the API-key settings. It is currently off because
 * the AI integration is unused — flip it back to `true` to restore them.
 *
 * `WEEKEND_IDEAS_ENABLED` gates only the "Идеи для отдыха на выходные" leisure
 * suggestions. It is separate so the weekend ideas can be shown on their own
 * while the rest of the AI features stay hidden.
 *
 * Both are typed as `boolean` (not their inferred literal type) so the disabled
 * branches are still type-checked and there is no "unreachable code" noise.
 */
export const AI_FEATURES_ENABLED: boolean = false

export const WEEKEND_IDEAS_ENABLED: boolean = true
