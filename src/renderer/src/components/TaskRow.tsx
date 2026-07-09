import React from 'react'
import { usePlanner } from '../store'
import { linkify, extractTime, stripTime } from '@shared/taskMeta'
import { useContextMenu } from './ContextMenu'
import { COLORS } from '../tokens'
import type { Task, Goal } from '@shared/types'

/** Click-to-edit task row with right-click delete, used in the Today view. */
export function TaskRow({ task, goal }: { task: Task; goal: Goal }): React.JSX.Element {
  const { toggleTask, deleteTask, openEditor } = usePlanner()
  const menu = useContextMenu()

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
        { label: 'Изменить', onClick: () => openEditor(task.id) },
        { label: 'Удалить задачу', danger: true, onClick: () => deleteTask(task.id) }
      ])}
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

      {menu.element}
    </div>
  )
}
