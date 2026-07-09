// Derived task metadata: time and links are extracted from the description,
// never stored separately. Ported from the prototype's parseTime / linkify.

export interface LinkInfo {
  href: string
  label: string
}

export interface LinkifyResult {
  links: LinkInfo[]
  primary: LinkInfo | null
  /** The description text with URLs and markup stripped. */
  textOnly: string
}

/**
 * Extract the first HH:MM (or H.MM) token from a description, ignoring any
 * times that appear inside URLs. Returns '' when none is present.
 */
export function extractTime(desc: string): string {
  const txt = (desc || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/[^\s]+/g, ' ')
  const m = txt.match(/(?:^|[^\d])([01]?\d|2[0-3])[:.]([0-5]\d)(?![\d])/)
  if (!m) return ''
  const h = m[1].length === 1 ? '0' + m[1] : m[1]
  return h + ':' + m[2]
}

/**
 * Find every URL in a description (from href="" attributes and bare/www links),
 * de-duplicated, plus the leftover plain text.
 */
export function linkify(html: string): LinkifyResult {
  html = html || ''
  const links: LinkInfo[] = []
  const seen: Record<string, boolean> = {}

  const add = (raw: string): void => {
    let href = raw.indexOf('http') === 0 ? raw : 'https://' + raw
    href = href.replace(/&amp;/g, '&').replace(/[.,);!]+$/, '')
    const label = href.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    if (!seen[href]) {
      seen[href] = true
      links.push({ href, label })
    }
  }

  let m: RegExpExecArray | null
  const hrefRe = /href="([^"]+)"/g
  while ((m = hrefRe.exec(html)) !== null) add(m[1])

  const txt = html.replace(/<[^>]+>/g, ' ')
  const urlRe = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g
  while ((m = urlRe.exec(txt)) !== null) add(m[0])

  const textOnly = txt
    .replace(urlRe, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

  return { links, primary: links[0] || null, textOnly }
}

/** Convenience: the first link in a description, or null. */
export function extractLink(desc: string): LinkInfo | null {
  return linkify(desc).primary
}

/**
 * Comparator ordering tasks by their derived time within a group.
 * Tasks with a time come first (earliest first); timeless tasks keep their order.
 */
export function byTime(a: { desc: string }, b: { desc: string }): number {
  const at = extractTime(a.desc || '')
  const bt = extractTime(b.desc || '')
  if (at && bt) return at < bt ? -1 : at > bt ? 1 : 0
  if (at) return -1
  if (bt) return 1
  return 0
}
