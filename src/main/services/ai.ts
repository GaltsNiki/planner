// AI service backed by Google Gemini (AI Studio). Keeps the same four functions
// and return types the IPC layer expects. If no API key is configured or a call
// fails, it falls back to the deterministic mock so the app never breaks.

import { GoogleGenAI, Type } from '@google/genai'
import type { Goal, Task, LeisureSuggestion } from '@shared/types'
import {
  chatReply,
  breakDownReply,
  weeklyReview,
  leisureSuggestions
} from '@shared/mockAI'
import { getKey } from './keychain'

const MODEL = 'gemini-2.5-flash'

/** Lazily build a client from the current key; null when no key is set. */
function client(): GoogleGenAI | null {
  const apiKey = getKey()
  if (!apiKey) return null
  return new GoogleGenAI({ apiKey })
}

/** Compact snapshot of the active goal + its tasks, for grounding prompts. */
function goalContext(goal: Goal, tasks: Task[]): string {
  const gt = tasks.filter((t) => t.goalId === goal.id)
  const done = gt.filter((t) => t.done).length
  const milestones = goal.milestones
    .map((m) => `- ${m.title} [${m.status}]`)
    .join('\n')
  const taskLines = gt
    .slice(0, 40)
    .map((t) => `- ${t.done ? '[x]' : '[ ]'} ${t.title}`)
    .join('\n')
  return [
    `Цель: ${goal.title} (категория: ${goal.category})`,
    goal.measurable ? `Измеримость: ${goal.measurable}` : '',
    goal.deadline ? `Срок: ${goal.deadline}` : '',
    `Прогресс: ${done}/${gt.length} задач выполнено.`,
    milestones ? `Этапы:\n${milestones}` : '',
    taskLines ? `Задачи:\n${taskLines}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

const SYSTEM = `Ты — Claude-подобный ассистент-планировщик внутри приложения Planner.
Отвечай по-русски, кратко и по делу (2–4 предложения), дружелюбно и конкретно.
Опирайся на приведённые данные цели. Предлагай конкретные шаги, а не общие советы.`

export async function chat(
  input: string,
  activeGoal: Goal,
  tasks: Task[]
): Promise<string> {
  const ai = client()
  if (!ai) return chatReply(input, activeGoal, tasks)
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `${goalContext(activeGoal, tasks)}\n\nВопрос пользователя: ${input}`,
      config: {
        systemInstruction: SYSTEM,
        temperature: 0.6,
        maxOutputTokens: 1024,
        // 2.5-flash is a thinking model; thinking tokens count against the output
        // budget and can starve/truncate the visible reply. Disable it here.
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
    return res.text?.trim() || chatReply(input, activeGoal, tasks)
  } catch (e) {
    console.error('[ai.chat] falling back to mock:', e)
    return chatReply(input, activeGoal, tasks)
  }
}

export async function breakDown(title: string): Promise<string> {
  const ai = client()
  if (!ai) return breakDownReply(title)
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `Разбей задачу «${title}» на 3–5 небольших конкретных шагов (каждый на 15–30 минут). Верни короткий нумерованный список и предложи добавить их в план.`,
      config: {
        systemInstruction: SYSTEM,
        temperature: 0.5,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
    return res.text?.trim() || breakDownReply(title)
  } catch (e) {
    console.error('[ai.breakDown] falling back to mock:', e)
    return breakDownReply(title)
  }
}

export async function review(goals: Goal[], tasks: Task[]): Promise<string> {
  const ai = client()
  if (!ai) return weeklyReview(goals, tasks)
  try {
    const summary = goals
      .map((g) => {
        const gt = tasks.filter((t) => t.goalId === g.id)
        return `${g.title}: ${gt.filter((t) => t.done).length}/${gt.length} задач`
      })
      .join('; ')
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `Сделай итог недели по целям. Данные: ${summary}. Отметь, что идёт хорошо, где затык, и предложи одну корректировку плана.`,
      config: {
        systemInstruction: SYSTEM,
        temperature: 0.5,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
    return res.text?.trim() || weeklyReview(goals, tasks)
  } catch (e) {
    console.error('[ai.review] falling back to mock:', e)
    return weeklyReview(goals, tasks)
  }
}

/**
 * Weekend leisure ideas via Gemini with Google Search grounding for real-ish
 * nearby events. `seed` nudges variety between refreshes. `location`/`interests`
 * come from settings (passed through IPC).
 */
export async function leisure(
  seed: number,
  location = 'Санкт-Петербург',
  interests: string[] = ['театр', 'природа', 'музыка', 'кофе']
): Promise<LeisureSuggestion[]> {
  const ai = client()
  if (!ai) return leisureSuggestions(seed)
  try {
    // First pass: grounded search for ideas as free text.
    const grounded = await ai.models.generateContent({
      model: MODEL,
      contents: `Найди 4 идеи для отдыха на ближайшие выходные в городе ${location}. Интересы: ${interests.join(', ')}. Нужны реальные места/события: 2 на субботу и 2 на воскресенье. Для каждого укажи категорию, короткое название и адрес/место.`,
      config: { tools: [{ googleSearch: {} }], temperature: 0.8 + (seed % 3) * 0.05 }
    })
    const notes = grounded.text?.trim() || ''

    // Second pass: coerce into the strict LeisureSuggestion[] shape via JSON mode.
    const shaped = await ai.models.generateContent({
      model: MODEL,
      contents: `Преобразуй эти идеи в JSON-массив из ровно 4 объектов. day=5 для субботы, day=6 для воскресенья (по 2 каждого). Идеи:\n${notes}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              cat: { type: Type.STRING },
              title: { type: Type.STRING },
              place: { type: Type.STRING }
            },
            required: ['day', 'cat', 'title', 'place']
          }
        }
      }
    })

    const parsed = JSON.parse(shaped.text || '[]') as Omit<LeisureSuggestion, 'id'>[]
    if (!Array.isArray(parsed) || parsed.length === 0) return leisureSuggestions(seed)
    return parsed.slice(0, 4).map((s, i) => ({
      id: `g${seed}_${i}`,
      day: s.day === 6 ? 6 : 5,
      cat: s.cat || 'Отдых',
      title: s.title || 'Идея на выходные',
      place: s.place || location
    }))
  } catch (e) {
    console.error('[ai.leisure] falling back to mock:', e)
    return leisureSuggestions(seed)
  }
}
