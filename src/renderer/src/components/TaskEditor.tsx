import React, { useRef, useEffect, useState } from 'react'
import { usePlanner } from '../store'
import { GoalDot } from './primitives'
import { linkify } from '@shared/taskMeta'
import { DAY_SHORT } from '@shared/dates'
import { COLORS } from '../tokens'

function ToolButton({
  onClick, title, children, style
}: { onClick: () => void; title: string; children: React.ReactNode; style?: React.CSSProperties }): React.JSX.Element {
  const [hover, setHover] = useState(false)
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ flex: 1, height: 36, borderRadius: 10, background: hover ? 'rgba(255,255,255,0.09)' : 'transparent', border: 'none', color: '#dcdce0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      {children}
    </button>
  )
}

export function TaskEditor(): React.JSX.Element | null {
  const { ed, goals, edField, edPickGoal, saveEd, deleteEd, closeEd } = usePlanner()
  const notesRef = useRef<HTMLDivElement>(null)
  const initKey = useRef<string | null>(null)

  // Seed the contentEditable once per opened task (uncontrolled thereafter).
  const key = ed ? (ed.isNew ? 'new' : ed.id || 'new') : null
  useEffect(() => {
    if (ed && notesRef.current && initKey.current !== key) {
      initKey.current = key
      notesRef.current.innerHTML = ed.desc || ''
    }
  }, [ed, key])

  if (!ed) return null

  const li = linkify(ed.desc || '')

  const readNotes = (): void => {
    if (notesRef.current) edField('desc', notesRef.current.innerHTML)
  }
  const exec = (name: string, val?: string): void => {
    document.execCommand(name, false, val)
    readNotes()
  }
  const insertCheck = (): void => {
    document.execCommand('insertHTML', false, '<div class="chk" data-chk="0"><span class="chk-box" contenteditable="false"></span><span>&nbsp;</span></div>')
    readNotes()
  }
  const makeLink = (): void => {
    const url = window.prompt('Вставьте ссылку', 'https://')
    if (url) exec('createLink', url)
  }
  const onNotesClick = (e: React.MouseEvent): void => {
    const box = (e.target as HTMLElement).closest?.('.chk-box')
    if (box) {
      const row = box.closest('.chk')
      if (row) { row.setAttribute('data-chk', row.getAttribute('data-chk') === '1' ? '0' : '1'); readNotes() }
    }
  }

  return (
    <div onClick={closeEd} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', background: COLORS.cardBg, border: `1px solid ${COLORS.border08}`, borderRadius: 18, padding: '22px 22px 18px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{ed.isNew ? 'Новая задача' : 'Задача'}</div>
          <button onClick={closeEd} style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: 'none', color: COLORS.textFaint, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div onClick={() => edField('done', !ed.done)} style={{ cursor: 'pointer', flex: 'none', display: 'flex' }}>
            {ed.done ? (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              </div>
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)' }} />
            )}
          </div>
          <input
            value={ed.title}
            onChange={(e) => edField('title', e.target.value)}
            placeholder="Название задачи"
            style={{ flex: 1, background: COLORS.appBg, border: `1px solid ${COLORS.border08}`, borderRadius: 10, padding: '11px 13px', color: COLORS.textPrimary, fontSize: 15, fontWeight: 500, outline: 'none' }}
          />
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textMuted, margin: '6px 0 8px' }}>ОПИСАНИЕ</div>
        <div
          ref={notesRef}
          contentEditable
          suppressContentEditableWarning
          className="notes-body"
          data-ph="Заметки, детали, ссылки…"
          onInput={readNotes}
          onClick={onNotesClick}
          style={{ height: 200, overflowY: 'auto', padding: '4px 6px 4px 2px', color: '#c9c9cd', fontSize: 15, lineHeight: 1.62, outline: 'none' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 10, padding: '7px 6px', borderRadius: 14, background: '#1b1b1e' }}>
          <ToolButton onClick={() => exec('formatBlock', 'H3')} title="Заголовок" style={{ fontSize: 15, fontWeight: 700 }}>Aa</ToolButton>
          <ToolButton onClick={() => exec('bold')} title="Жирный" style={{ fontSize: 16, fontWeight: 800 }}>B</ToolButton>
          <ToolButton onClick={() => exec('italic')} title="Курсив" style={{ fontSize: 16, fontStyle: 'italic', fontFamily: 'Georgia,serif' }}>I</ToolButton>
          <ToolButton onClick={() => exec('underline')} title="Подчёркнутый" style={{ fontSize: 15, textDecoration: 'underline' }}>U</ToolButton>
          <ToolButton onClick={() => exec('strikeThrough')} title="Зачёркнутый" style={{ fontSize: 15, textDecoration: 'line-through' }}>S</ToolButton>
          <ToolButton onClick={insertCheck} title="Чек-лист">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l2 2 3-3" /><path d="M4 15l2 2 3-3" /><line x1="12" y1="6" x2="20" y2="6" /><line x1="12" y1="16" x2="20" y2="16" /></svg>
          </ToolButton>
          <ToolButton onClick={() => exec('insertUnorderedList')} title="Список">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="7" r="1.4" fill="currentColor" /><circle cx="5" cy="17" r="1.4" fill="currentColor" /><line x1="10" y1="7" x2="20" y2="7" /><line x1="10" y1="17" x2="20" y2="17" /></svg>
          </ToolButton>
          <ToolButton onClick={() => exec('insertOrderedList')} title="Нумерация" style={{ fontSize: 13, fontWeight: 700 }}>1.</ToolButton>
          <ToolButton onClick={makeLink} title="Ссылка">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
          </ToolButton>
        </div>

        {li.links.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textMuted, marginBottom: 8 }}>ССЫЛКИ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {li.links.map((l) => (
                <a key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: 'rgba(232,86,63,0.09)', border: '1px solid rgba(232,86,63,0.22)', borderRadius: 10, color: COLORS.accent, fontSize: 13, textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Открыть {l.label}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textMuted, margin: '16px 0 8px' }}>ЦЕЛЬ</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {goals.map((g) => {
            const sel = ed.goalId === g.id
            return (
              <div key={g.id} onClick={() => edPickGoal(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 9, cursor: 'pointer', fontSize: 13, background: sel ? COLORS.accent13 : 'rgba(255,255,255,0.04)', border: sel ? '1px solid rgba(232,86,63,0.35)' : `1px solid ${COLORS.border08}`, color: sel ? COLORS.textPrimary : COLORS.textSecondary }}>
                <GoalDot color={g.dotColor} size={8} />
                <span>{g.title}</span>
              </div>
            )
          })}
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textMuted, margin: '16px 0 8px' }}>ДЕНЬ</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {DAY_SHORT.map((nm, i) => {
            const sel = ed.day === i
            return (
              <div key={nm} onClick={() => edField('day', i)} style={{ minWidth: 40, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: sel ? COLORS.accent : 'rgba(255,255,255,0.04)', border: sel ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.border08}`, color: sel ? '#fff' : COLORS.textSecondary }}>{nm}</div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
          {!ed.isNew && (
            <button onClick={deleteEd} style={{ padding: '10px 15px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(232,86,63,0.4)', color: COLORS.accent, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Удалить</button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
            <button onClick={closeEd} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#c9c9cd', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
            <button onClick={saveEd} style={{ padding: '10px 18px', borderRadius: 10, background: COLORS.accent, border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  )
}
