// Minimal allow-list HTML sanitizer for the task-notes rich text. The notes area
// is a contentEditable that we re-inject via innerHTML, and descriptions can also
// originate from web-sourced (AI) content, so we strip anything that could execute
// — scripts, event handlers, javascript: URLs — while keeping the formatting the
// editor produces (bold/italic/lists/links/checkbox rows).

const ALLOWED_TAGS = new Set([
  'DIV', 'SPAN', 'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'H3', 'UL', 'OL', 'LI', 'A'
])
const ALLOWED_ATTRS = new Set(['href', 'class', 'data-chk', 'contenteditable'])

/** Sanitize an HTML string to the small set of tags/attributes the notes use. */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')

  const walk = (node: Element): void => {
    // Snapshot children first — we mutate the tree as we go.
    for (const child of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        // Replace a disallowed element with its text content (drop the markup).
        child.replaceWith(document.createTextNode(child.textContent || ''))
        continue
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase()
        const value = attr.value.trim()
        const isAllowed = ALLOWED_ATTRS.has(name)
        const isJsUrl = name === 'href' && /^\s*javascript:/i.test(value)
        if (!isAllowed || name.startsWith('on') || isJsUrl) {
          child.removeAttribute(attr.name)
        }
      }
      walk(child)
    }
  }

  walk(doc.body)
  return doc.body.innerHTML
}
