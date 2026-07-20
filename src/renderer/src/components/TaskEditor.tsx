import React, { useRef, useEffect, useState } from 'react'
import { usePlanner } from '../store'
import { GoalDot } from './primitives'
import { linkify } from '@shared/taskMeta'
import { DAY_SHORT, weekModel, weekBadge, currentWeekIndex } from '@shared/dates'
import { ROUTINE_COLOR } from '@shared/routine'
import { sanitizeHtml } from '../sanitize'
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

/**
 * A fresh, unticked checklist row. The label is deliberately EMPTY: a placeholder
 * character (&nbsp;) would sit beside the caret and typed text would land on the
 * wrong side of it. The empty label keeps its height via CSS (.chk-label:empty),
 * not via filler text.
 */
function makeCheckRow(): HTMLElement {
  const row = document.createElement('div')
  row.className = 'chk'
  row.setAttribute('data-chk', '0')
  const box = document.createElement('span')
  box.className = 'chk-box'
  box.contentEditable = 'false'
  const label = document.createElement('span')
  label.className = 'chk-label'
  row.append(box, label)
  return row
}

/** Put the caret inside `el`, after any existing text, so typing continues there. */
function placeCaretIn(el: HTMLElement | null): void {
  const selection = window.getSelection()
  if (!el || !selection) return
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * Wrap any loose text sitting directly in the editor into a <div> block.
 *
 * Typing into an empty contentEditable produces a BARE TEXT NODE, while every
 * line after an Enter becomes a <div>. That inconsistency is the root of the
 * "Enter behaves wrong" reports: the first line can't be targeted by the
 * `.notes-body > * + *` spacing rule (CSS cannot match a text node), Enter at its
 * start pushes the blank line *above* the text instead of moving the text down,
 * and Enter mid-line splits it into a bare half plus a wrapped half.
 *
 * Normalising to "every line is a block" makes Enter behave the same everywhere,
 * which is what Word does. Returns true if the DOM changed.
 */
function normalizeBlocks(notes: HTMLElement): boolean {
  let changed = false
  for (const node of Array.from(notes.childNodes)) {
    const isLooseText = node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    // <b>/<i>/<a> written straight into the root are inline and have the same problem.
    const isLooseInline =
      node.nodeType === Node.ELEMENT_NODE &&
      !['DIV', 'P', 'H3', 'UL', 'OL', 'LI', 'BR'].includes((node as HTMLElement).tagName)
    if (!isLooseText && !isLooseInline) continue
    const block = document.createElement('div')
    node.replaceWith(block)
    block.appendChild(node)
    changed = true
  }
  return changed
}

export function TaskEditor(): React.JSX.Element | null {
  const { ed, goals, edField, edPickGoal, saveEd, deleteEd, closeEd } = usePlanner()
  const notesRef = useRef<HTMLDivElement>(null)
  const initKey = useRef<string | null>(null)
  // Only treat a backdrop click as "close" when the press STARTED on the backdrop —
  // otherwise selecting text and releasing outside the modal would discard edits.
  const downOnBackdrop = useRef(false)

  // Seed the contentEditable once per opened task (uncontrolled thereafter).
  // Re-seeding on later renders would overwrite the live DOM — wiping the caret
  // position and any list/checkbox structure the user just made — so it is keyed
  // strictly to the task being opened, never to `ed.desc` changing as they type.
  const key = ed ? (ed.isNew ? 'new' : ed.id || 'new') : null
  useEffect(() => {
    if (ed && notesRef.current && initKey.current !== key) {
      initKey.current = key
      // Sanitize before injecting: desc is stored HTML and may include web-sourced text.
      notesRef.current.innerHTML = sanitizeHtml(ed.desc || '')
      // Older notes were saved with loose top-level text; give them blocks too.
      normalizeBlocks(notesRef.current)
      // Emit <div> rather than <p> on Enter, matching the blocks we create by hand
      // and the `.notes-body > * + *` spacing rule. Chrome/Safari default to <div>
      // already; this pins it so the markup can't vary by engine.
      document.execCommand('defaultParagraphSeparator', false, 'div')
    }
    // Let the next open re-seed, even if it's the same task id.
    if (!ed) initKey.current = null
  }, [ed, key])

  // Esc closes the modal (matches the calendar / context menus).
  useEffect(() => {
    if (!ed) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') closeEd() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ed, closeEd])

  if (!ed) return null

  const li = linkify(ed.desc || '')

  const readNotes = (): void => {
    if (notesRef.current) edField('desc', notesRef.current.innerHTML)
  }
  /**
   * execCommand applies to the document's current selection, so the notes area must
   * hold focus with a live caret before any command runs. When the toolbar is used
   * before the notes were ever clicked there is no selection inside them, and the
   * command would silently do nothing (or format the wrong element).
   */
  const focusNotes = (): void => {
    const notes = notesRef.current
    if (!notes) return
    const selection = window.getSelection()
    if (!selection) return
    const caretIsInNotes = selection.rangeCount > 0 && notes.contains(selection.getRangeAt(0).commonAncestorContainer)
    if (caretIsInNotes) { notes.focus(); return }
    // Place the caret at the very end of the existing notes.
    notes.focus()
    const range = document.createRange()
    range.selectNodeContents(notes)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }
  const exec = (name: string, val?: string): void => {
    focusNotes()
    document.execCommand(name, false, val)
    readNotes()
  }
  /** Insert a checklist row at the caret and put the caret in its label. */
  const insertCheck = (): void => {
    focusNotes()
    const selection = window.getSelection()
    const notes = notesRef.current
    if (!selection || selection.rangeCount === 0 || !notes) return
    const row = makeCheckRow()
    const existingRow = checkRowAtCaret()
    const block = blockAtCaret()
    if (existingRow) {
      existingRow.after(row)
    } else if (block && isBlank(block)) {
      // Replace an empty paragraph rather than leaving a blank line above the row.
      block.replaceWith(row)
    } else if (block) {
      block.after(row)
    } else {
      notes.appendChild(row)
    }
    placeCaretIn(row.querySelector('.chk-label'))
    readNotes()
  }
  const makeLink = (): void => {
    const url = window.prompt('Вставьте ссылку', 'https://')
    if (url) exec('createLink', url)
  }
  /**
   * The element the caret sits in. Uses the *focus* node (where the caret actually
   * is) rather than startContainer, which for a collapsed range after a click can
   * resolve to a container element and match a neighbouring row.
   */
  const elementAtCaret = (): HTMLElement | null => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const node = selection.focusNode
    if (!node) return null
    const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement
    return el && notesRef.current?.contains(el) ? el : null
  }

  const closestInNotes = (sel: string): HTMLElement | null => {
    const found = elementAtCaret()?.closest?.(sel) as HTMLElement | null
    return found && notesRef.current?.contains(found) ? found : null
  }

  /** The checklist row the caret currently sits in, or null. */
  const checkRowAtCaret = (): HTMLElement | null => closestInNotes('.chk')

  /** The list item the caret currently sits in, or null. */
  const listItemAtCaret = (): HTMLLIElement | null => closestInNotes('li') as HTMLLIElement | null

  /** The top-level block (direct child of the notes) the caret sits in, or null. */
  const blockAtCaret = (): HTMLElement | null => {
    const notes = notesRef.current
    let el = elementAtCaret()
    while (el && el.parentElement && el.parentElement !== notes) el = el.parentElement
    return el && el !== notes && notes?.contains(el) ? el : null
  }

  const isBlank = (el: HTMLElement): boolean => !el.textContent?.replace(/ /g, ' ').trim()

  /**
   * Re-wrap loose text into blocks without disturbing the caret. normalizeBlocks
   * moves the caret's own text node into a new parent, which would drop the caret
   * to the start of the editor, so the offset is captured and re-applied.
   */
  const normalizeKeepingCaret = (): void => {
    const notes = notesRef.current
    const selection = window.getSelection()
    if (!notes || !selection || selection.rangeCount === 0) return
    const { focusNode, focusOffset } = selection
    if (!normalizeBlocks(notes)) return
    // The node itself survives the wrap (it is re-parented, not recreated).
    if (focusNode && notes.contains(focusNode)) {
      const range = document.createRange()
      range.setStart(focusNode, Math.min(focusOffset, focusNode.textContent?.length ?? 0))
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }

  /**
   * Word-like Enter handling. The browser's native contentEditable behaviour is
   * wrong for our structures:
   *  - the FIRST typed line is a bare text node, not a block, so Enter splits it
   *    inconsistently (blank line lands above the text, halves space differently);
   *  - inside a checklist row it clones the row *including* data-chk, so a new
   *    line after a ticked item is born ticked and struck through;
   *  - inside a list it never lets an empty item exit the list.
   * Shift+Enter stays a soft break everywhere, as in Word.
   */
  const onNotesKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key !== 'Enter' || e.shiftKey) return

    // Make sure the caret sits in a real block before the split happens.
    normalizeKeepingCaret()

    const checkRow = checkRowAtCaret()
    if (checkRow) {
      e.preventDefault()
      // Enter on an empty checklist row leaves the checklist (Word's behaviour).
      if (isBlank(checkRow)) {
        const paragraph = document.createElement('div')
        paragraph.appendChild(document.createElement('br'))
        checkRow.replaceWith(paragraph)
        placeCaretIn(paragraph)
        readNotes()
        return
      }
      // Build the row directly rather than via insertHTML: execCommand leaves the
      // caret in the *old* row, so the next keystrokes would land on the previous
      // item instead of the new one.
      const newRow = makeCheckRow()
      checkRow.after(newRow)
      placeCaretIn(newRow.querySelector('.chk-label'))
      readNotes()
      return
    }

    const listItem = listItemAtCaret()
    if (listItem && isBlank(listItem)) {
      // Enter on an empty bullet/number breaks out to a plain paragraph.
      e.preventDefault()
      const list = listItem.parentElement
      const isOrdered = list?.tagName === 'OL'
      exec(isOrdered ? 'insertOrderedList' : 'insertUnorderedList')
      exec('formatBlock', 'div')
      return
    }
    // Non-empty list items and plain text use the native Enter, which is correct.
  }

  /**
   * Toggle a checklist row. The whole row is the target (not just the 14px box),
   * so clicking the label text ticks it too — but only when the click isn't a
   * genuine text edit, i.e. the caret isn't being placed in the label.
   */
  const onNotesClick = (e: React.MouseEvent): void => {
    const target = e.target as HTMLElement
    const row = target.closest?.('.chk')
    if (!row) return
    const clickedBox = !!target.closest?.('.chk-box')
    // Clicking the label should still let the user type there; only the box toggles.
    if (!clickedBox) return
    row.setAttribute('data-chk', row.getAttribute('data-chk') === '1' ? '0' : '1')
    readNotes()
  }

  return (
    <div
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && downOnBackdrop.current) closeEd() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
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
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEd() } }}
            placeholder="Название задачи"
            autoFocus
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
          onKeyDown={onNotesKeyDown}
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
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: 'rgba(232,86,63,0.09)', border: '1px solid rgba(232,86,63,0.22)', borderRadius: 10, color: COLORS.accent, fontSize: 13, textDecoration: 'none' }}>
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
          {/* Routine = no goal (cleaning, shopping, errands…). */}
          {(() => {
            const sel = !ed.goalId
            return (
              <div onClick={() => { edField('goalId', ''); edField('mId', '') }} title="Задача без цели" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 9, cursor: 'pointer', fontSize: 13, background: sel ? COLORS.accent13 : 'rgba(255,255,255,0.04)', border: sel ? '1px solid rgba(232,86,63,0.35)' : `1px solid ${COLORS.border08}`, color: sel ? COLORS.textPrimary : COLORS.textSecondary }}>
                <GoalDot color={ROUTINE_COLOR} size={8} />
                <span>Рутина</span>
              </div>
            )
          })()}
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

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textMuted, margin: '16px 0 8px' }}>НЕДЕЛЯ</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => edField('week', ed.week - 1)} title="Предыдущая неделя" style={{ width: 34, height: 34, flex: 'none', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{weekModel(ed.week).range}</div>
            {(() => {
              const isCurrent = ed.week === currentWeekIndex()
              return (
                <div style={{ fontSize: 11.5, marginTop: 1, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? COLORS.accent : COLORS.textFaint }}>{weekBadge(ed.week)}</div>
              )
            })()}
          </div>
          <button onClick={() => edField('week', ed.week + 1)} title="Следующая неделя" style={{ width: 34, height: 34, flex: 'none', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
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
