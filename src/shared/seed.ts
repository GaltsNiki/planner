// Initial planner document, ported verbatim from the prototype's seed state.
// Authored with relative week offsets (week 0 = "current"); `migrate()` converts
// them to absolute current-week indices and stamps the schema version, so a fresh
// install lands on the current week just like migrated user data.

import type { PlannerData } from './types'
import { migrate } from './migrate'

export function seedData(): PlannerData {
  return migrate({
    goals: [
      {
        id: 'g1', title: 'Прийти в форму', category: 'Здоровье', dotColor: '#E8563F',
        milestones: [
          { id: 'm1', title: 'Наладить режим сна', status: 'done' },
          { id: 'm2', title: 'Тренировки 3 раза в неделю', status: 'active' },
          { id: 'm3', title: 'Питание под контролем', status: 'todo' },
          { id: 'm4', title: 'Пробежать 5 км без остановки', status: 'todo' }
        ],
        closenessLabel: 'Примерно на полпути',
        claudeTake: 'Ты закрыл первый этап и стабильно тренируешься. Если добавишь контроль питания — до цели останется один рывок.'
      },
      {
        id: 'g2', title: 'Выучить английский', category: 'Развитие', dotColor: 'oklch(0.7 0.13 250)',
        milestones: [
          { id: 'm1', title: 'Разговорный уровень B1', status: 'active' },
          { id: 'm2', title: 'Сериалы без субтитров', status: 'todo' },
          { id: 'm3', title: 'Сдать IELTS 7.0', status: 'todo' }
        ],
        closenessLabel: 'В начале пути, но с хорошим темпом',
        claudeTake: 'Словарь растёт быстро, а разговорной практики пока мало. Стоит добавить регулярные созвоны с тьютором.'
      },
      {
        id: 'g3', title: 'Перейти в продуктовый дизайн', category: 'Карьера', dotColor: 'oklch(0.72 0.15 150)',
        milestones: [
          { id: 'm1', title: 'Портфолио из 3 кейсов', status: 'active' },
          { id: 'm2', title: 'Пройти 10 собеседований', status: 'todo' },
          { id: 'm3', title: 'Получить оффер', status: 'todo' }
        ],
        closenessLabel: 'Фундамент почти готов',
        claudeTake: 'Два кейса почти готовы. «Behance» завис — как разберёшься с ним, можно начинать откликаться на вакансии.'
      },
      {
        id: 'g4', title: 'Отдых и баланс', category: 'Досуг', dotColor: 'oklch(0.7 0.13 300)',
        milestones: [
          { id: 'm1', title: 'Регулярные выходные для себя', status: 'active' }
        ],
        closenessLabel: 'Хороший баланс',
        claudeTake: 'Отдых — часть плана. Запланируй хотя бы одно событие в выходные, чтобы восстановиться.'
      }
    ],
    tasks: [
      { id: 't20', goalId: 'g1', mId: 'm1', title: 'Ложиться до 23:00', done: true, day: 0, week: 0, desc: 'Ложиться до 23:00' },
      { id: 't2', goalId: 'g1', mId: 'm2', title: 'Силовая: верх тела', done: true, day: 0, week: 0, desc: 'Зал в 08:00. Программа A: жим лёжа, тяга, брусья. https://www.strong.app/workout/A' },
      { id: 't1', goalId: 'g1', mId: 'm2', title: 'Утренняя пробежка 20 мин', done: false, day: 1, week: 0, desc: 'Старт в 07:00. Лёгкий темп, дыхание носом, ~4 км по набережной. https://www.strava.com/routes/3218764' },
      { id: 't3', goalId: 'g1', mId: 'm3', title: 'Составить меню на неделю', done: false, day: 1, week: 0, desc: 'Белок 1.6 г/кг, овощи в каждый приём. https://notion.so/menu-week' },
      { id: 't4', goalId: 'g1', mId: 'm2', title: 'Растяжка вечером', done: false, day: 1, week: 0, desc: 'В 21:00, 10 минут: бёдра и грудной отдел.' },
      { id: 't6', goalId: 'g1', mId: 'm3', title: 'Купить продукты по списку', done: false, day: 2, week: 0, desc: '' },
      { id: 't5', goalId: 'g1', mId: 'm2', title: 'Тренировка ног', done: false, day: 3, week: 0, desc: '' },
      { id: 't9', goalId: 'g2', mId: 'm1', title: '20 новых слов в Anki', done: true, day: 0, week: 0, desc: 'Колода B1 — 20 карточек. https://apps.ankiweb.net' },
      { id: 't7', goalId: 'g2', mId: 'm1', title: 'Урок на Duolingo', done: true, day: 1, week: 0, desc: '' },
      { id: 't8', goalId: 'g2', mId: 'm1', title: 'TED-talk без субтитров', done: false, day: 1, week: 0, desc: '«How to learn anything», 12 минут. https://www.ted.com/talks/learn' },
      { id: 't11', goalId: 'g2', mId: 'm1', title: 'Созвон с тьютором', done: false, day: 2, week: 0, desc: 'Созвон в 19:00. Тема — small talk и телефонные разговоры. https://meet.google.com/abc-defg-hij' },
      { id: 't10', goalId: 'g2', mId: 'm2', title: 'Серия сериала с субтитрами', done: false, day: 3, week: 0, desc: '' },
      { id: 't21', goalId: 'g3', mId: 'm1', title: 'Выбрать проекты для портфолио', done: true, day: 0, week: 0, desc: '' },
      { id: 't12', goalId: 'g3', mId: 'm1', title: 'Кейс: редизайн онбординга', done: false, day: 1, week: 0, desc: 'Бриф и исходники в Figma. https://figma.com/file/onboarding-case' },
      { id: 't14', goalId: 'g3', mId: 'm1', title: 'Обновить Behance', done: false, day: 1, week: 0, desc: 'Залить 2 новых кейса, обновить обложку. https://behance.net/username' },
      { id: 't15', goalId: 'g3', mId: 'm2', title: 'Откликнуться на 3 вакансии', done: false, day: 2, week: 0, desc: '' },
      { id: 't13', goalId: 'g3', mId: 'm1', title: 'Собрать фидбэк по кейсу', done: false, day: 4, week: 0, desc: '' }
    ],
    stale: [
      { id: 's1', goalId: 'g1', title: 'Настроить домашний спортзал', days: 12 },
      { id: 's2', goalId: 'g2', title: 'Найти языкового партнёра', days: 8 },
      { id: 's3', goalId: 'g3', title: 'Обновить Behance', days: 9 }
    ],
    chats: {
      g1: [{ role: 'assistant', text: 'Ты прошёл 2 из 4 этапов цели «Прийти в форму» — примерно половина пути. Что скорректируем?' }],
      g2: [{ role: 'assistant', text: 'По «Выучить английский» словарный запас растёт хорошо. Хочешь добавить разговорную практику в план?' }],
      g3: [{ role: 'assistant', text: 'Кейсы почти готовы, но «Обновить Behance» висит уже 9 дней. Разбить эту задачу на шаги?' }]
    },
    settings: {
      location: 'Санкт-Петербург',
      interests: ['театр', 'природа', 'музыка', 'кофе']
    },
    habits: [
      { id: 'h1', title: 'Зарядка утром', done: ['0:0', '0:1', '0:3'] },
      { id: 'h2', title: 'Читать 20 минут', done: ['0:0', '0:2', '0:3', '0:4'] },
      { id: 'h3', title: 'Без сахара', done: ['0:1'] },
      { id: 'h4', title: 'Медитация', done: [] }
    ]
  })
}
