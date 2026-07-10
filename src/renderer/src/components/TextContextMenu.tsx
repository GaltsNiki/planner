import React, { useEffect, useRef, useState } from 'react'
import { COLORS } from '../tokens'

interface Pos { x: number; y: number }

/** Update a React-controlled input/textarea's value so its onChange fires. */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(el, value)
}

/** Read clipboard text: prefer the main-process bridge, fall back to the web API. */
async function readClipboard(): Promise<string> {
  try {
    const t = await window.planner.clipboardRead()
    if (t) return t
  } catch { /* handler not ready — fall through */ }
  try {
    return await navigator.clipboard.readText()
  } catch { /* denied — give up */ }
  return ''
}

/**
 * App-styled right-click menu offering Cut / Copy / Paste / Select-all for text
 * selections and editable fields. Mounted once at the app root.
 *
 * It listens on the document, so element-level menus (task/goal rows) that call
 * `stopPropagation()` on their own onContextMenu keep their custom menus instead.
 */
export function TextContextMenu(): React.JSX.Element | null {
  const [pos, setPos] = useState<Pos | null>(null)
  const target = useRef<HTMLElement | null>(null)
  const inputRange = useRef<{ start: number; end: number } | null>(null)
  const domRange = useRef<Range | null>(null)
  const clip = useRef<string | null>(null)
  const state = useRef({ editable: false, hasSelection: false })

  // Capture the target + selection at right-click time (before focus can move),
  // and pre-fetch the clipboard so Paste can act without an async gap.
  useEffect(() => {
    const onCtx = (e: MouseEvent): void => {
      const el = e.target as HTMLElement
      const editableEl = el.closest(
        'input, textarea, [contenteditable=""], [contenteditable="true"]'
      ) as HTMLElement | null

      const isInput = !!editableEl && (editableEl.tagName === 'INPUT' || editableEl.tagName === 'TEXTAREA')
      let hasSelection = (window.getSelection()?.toString().length ?? 0) > 0

      inputRange.current = null
      domRange.current = null
      if (isInput) {
        const inp = editableEl as HTMLInputElement
        const start = inp.selectionStart ?? 0
        const end = inp.selectionEnd ?? 0
        inputRange.current = { start, end }
        hasSelection = end > start
      } else {
        const sel = window.getSelection()
        if (sel && sel.rangeCount) domRange.current = sel.getRangeAt(0).cloneRange()
      }

      const editable = !!editableEl
      if (!editable && !hasSelection) { setPos(null); return }

      e.preventDefault()
      target.current = editableEl
      state.current = { editable, hasSelection }
      clip.current = null
      void readClipboard().then((t) => { clip.current = t })
      setPos({ x: e.clientX, y: e.clientY })
    }
    document.addEventListener('contextmenu', onCtx)
    return () => document.removeEventListener('contextmenu', onCtx)
  }, [])

  // Dismiss on outside click, Escape, or window blur.
  useEffect(() => {
    if (!pos) return
    const close = (): void => setPos(null)
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close() }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', close)
    }
  }, [pos])

  if (!pos) return null

  const { editable, hasSelection } = state.current

  const paste = async (): Promise<void> => {
    const el = target.current
    if (!el) return
    const text = clip.current ?? (await readClipboard())
    if (!text) return
    el.focus()
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const inp = el as HTMLInputElement
      const { start, end } = inputRange.current ?? { start: inp.value.length, end: inp.value.length }
      setNativeValue(inp, inp.value.slice(0, start) + text + inp.value.slice(end))
      inp.dispatchEvent(new Event('input', { bubbles: true }))
      const caret = start + text.length
      inp.setSelectionRange(caret, caret)
    } else {
      // contentEditable (the task notes area) — insert at the saved range.
      const range = domRange.current
      const sel = window.getSelection()
      if (!range || !sel) return
      range.deleteContents()
      const node = document.createTextNode(text)
      range.insertNode(node)
      range.setStartAfter(node)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  const selectAll = (): void => {
    const el = target.current
    if (!el) return
    el.focus()
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') (el as HTMLInputElement).select()
    else document.execCommand('selectAll')
  }

  // Copy/Cut act on the still-alive selection (kept by the items' onMouseDown preventDefault).
  const items = [
    { label: 'Вырезать', show: editable && hasSelection, run: () => document.execCommand('cut') },
    { label: 'Копировать', show: hasSelection, run: () => document.execCommand('copy') },
    { label: 'Вставить', show: editable, run: () => void paste() },
    { label: 'Выделить всё', show: editable, run: selectAll }
  ].filter((it) => it.show)

  if (!items.length) return null

  const W = 190
  const x = Math.min(pos.x, window.innerWidth - W - 8)
  const y = Math.min(pos.y, window.innerHeight - items.length * 38 - 8)

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top: y, left: x, zIndex: 2000, minWidth: 170,
        background: '#1b1b1f', border: `1px solid ${COLORS.border08}`, borderRadius: 11,
        padding: 5, boxShadow: '0 10px 34px rgba(0,0,0,0.5)'
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="row-hover"
          onMouseDown={(e) => e.preventDefault()} // keep the field focused / selection intact
          onClick={() => { it.run(); setPos(null) }}
          style={{ padding: '9px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, color: COLORS.textPrimary }}
        >
          {it.label}
        </div>
      ))}
    </div>
  )
}
