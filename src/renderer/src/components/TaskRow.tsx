import React, { useState } from 'react'
import { usePlanner } from '../store'
import { linkify, extractTime, stripTime } from '@shared/taskMeta'
import { useContextMenu } from './ContextMenu'
import { COLORS } from '../tokens'
import type { Task, Goal } from '@shared/types'

/**
 * Click-to-edit task row with a delete button + right-click delete, used in the Today view.
 * `hideTime` suppresses the right-side time chip when the Today agenda already shows
 * the time in its left gutter, so the time isn't printed twice on the same row.
 */
export function TaskRow({
  task, goal, caption, onCaption, hideTime
}: { task: Task; goal: Goal; caption?: string; onCaption?: () => void; hideTime?: boolean }): React.JSX.Element {
  const { toggleTask, deleteTask, openEditor } = usePlanner()
  const menu = useContextMenu()
  const [hover, setHover] = useState(false)
  const [binHover, setBinHover] = useState(false)

  const li = linkify(task.desc || '')
  const time = extractTime(task.desc || '')
  // Show the time chip only when the surrounding view isn't already showing the
  // time itself (the Today agenda prints it in its left gutter).
  const showTimeChip = !hideTime && !!time
  // Always strip the time from the description line so it isn't repeated inline,
  // regardless of where the chip is shown.
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
      // overflow:hidden clips the absolute accent bar to the row's rounded corners.
      // alignItems:flex-start keeps the checkbox, time chip and bin aligned to the
      // top of the row so they sit level with the title on multi-line tasks.
      style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 13, padding: '14px 15px 14px 18px', background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 13, cursor: 'pointer', overflow: 'hidden' }}
    >
      {/* Coloured left accent bar — the goal's colour (slate grey for routines). */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: goal.dotColor }} />

      <div onClick={(e) => { stop(e); toggleTask(task.id) }} style={{ flex: 'none', display: 'flex', marginTop: 1 }}>
        {task.done ? (
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title first, bold — the primary line of each row. */}
        {li.primary ? (
          <a
            href={li.primary.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            style={{ display: 'block', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: task.done ? COLORS.textDisabled : goal.dotColor, textDecoration: task.done ? 'line-through' : 'none' }}
          >
            {task.title}
          </a>
        ) : (
          <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: task.done ? COLORS.textDisabled : COLORS.taskTitle, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</div>
        )}

        {caption && (
          <div
            onClick={onCaption ? (e) => { stop(e); onCaption() } : undefined}
            title={onCaption ? 'Открыть цель' : undefined}
            // Eyebrow label (uppercase, tracked, bold) tinted with the goal's accent
            // colour and sitting under the title. The left accent bar already carries
            // the colour cue, so no leading dot is needed here.
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: goal.dotColor, marginTop: 5, cursor: onCaption ? 'pointer' : 'default', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {caption}
          </div>
        )}

        {short && (
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 5, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{short}</div>
        )}
      </div>

      {/* Right cluster: time chip, optional link chip and the delete button, top-aligned. */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        {showTimeChip && (
          <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 7, background: COLORS.accent14, color: COLORS.accentPartner, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{time}</span>
        )}

        {li.primary && (
          <a
            href={li.primary.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#c9c9cd', fontSize: 12, textDecoration: 'none' }}
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
      </div>

      {menu.element}
    </div>
  )
}
