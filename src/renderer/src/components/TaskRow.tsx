import React, { useState } from 'react'
import { usePlanner } from '../store'
import { linkify, extractTime, stripTime } from '@shared/taskMeta'
import { useContextMenu } from './ContextMenu'
import { COLORS } from '../tokens'
import type { Task, Goal } from '@shared/types'

/** Click-to-edit task row with a delete button + right-click delete, used in the Today view. */
export function TaskRow({
  task, goal, caption, onCaption
}: { task: Task; goal: Goal; caption?: string; onCaption?: () => void }): React.JSX.Element {
  const { toggleTask, deleteTask, openEditor } = usePlanner()
  const menu = useContextMenu()
  const [hover, setHover] = useState(false)
  const [binHover, setBinHover] = useState(false)

  const li = linkify(task.desc || '')
  const time = extractTime(task.desc || '')
  // Don't repeat the time in the description line — it's already shown as a chip.
  const textNoTime = stripTime(li.textOnly, time)
  const short = textNoTime || (li.primary ? 'Ссылка: ' + li.primary.label : '')

  const stop = (e: React.SyntheticEvent): void => e.stopPropagation()

  return (
    <div
      onClick={() => openEditor(task.id)}
      onContextMenu={menu.open([
        { label: 'Изменить задачу', onClick: () => openEditor(task.id) },
        { label: 'Удалить задачу', danger: true, onClick: () => deleteTask(task.id) }
      ])}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="row-hover"
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 13, cursor: 'pointer' }}
    >
      <div onClick={(e) => { stop(e); toggleTask(task.id) }} style={{ flex: 'none', display: 'flex' }}>
        {task.done ? (
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {caption && (
          <div
            onClick={onCaption ? (e) => { stop(e); onCaption() } : undefined}
            title={onCaption ? 'Открыть цель' : undefined}
            // Styled as an eyebrow label (uppercase, tracked, bold) and tinted with the
            // goal's own accent colour so it reads as the task's goal/stage tag — not as
            // another line of muted description text (which shares textMuted grey).
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: goal.dotColor, marginBottom: 5, cursor: onCaption ? 'pointer' : 'default', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: goal.dotColor }} />
            {caption}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {time && (
            <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 7, background: COLORS.accent14, color: COLORS.accentPartner, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{time}</span>
          )}
          {li.primary ? (
            <a
              href={li.primary.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              style={{ fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: task.done ? COLORS.textDisabled : goal.dotColor, textDecoration: task.done ? 'line-through' : 'none' }}
            >
              {task.title}
            </a>
          ) : (
            <span style={{ fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: task.done ? COLORS.textDisabled : COLORS.taskTitle, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</span>
          )}
        </div>
        {short && (
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{short}</div>
        )}
      </div>

      {li.primary && (
        <a
          href={li.primary.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#c9c9cd', fontSize: 12, textDecoration: 'none' }}
        >
          <span>{li.primary.label}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>
        </a>
      )}

      <button
        onClick={(e) => { stop(e); deleteTask(task.id) }}
        onMouseEnter={() => setBinHover(true)}
        onMouseLeave={() => setBinHover(false)}
        title="Удалить задачу"
        style={{ flex: 'none', width: 30, height: 30, borderRadius: 8, background: binHover ? 'rgba(240,113,92,0.12)' : 'transparent', border: 'none', color: binHover ? '#f0715c' : COLORS.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hover ? 1 : 0.3, transition: 'opacity .12s, color .12s, background .12s' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
      </button>

      {menu.element}
    </div>
  )
}
