import { memo, useState } from 'react'
import { Check, Copy } from 'lucide-react'

// Small, dependency-free Markdown renderer for AI replies. Renders React elements only
// (never innerHTML), so model output can't inject markup or scripts.

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="ai-code-block">
      <div className="ai-code-header">
        <span>{lang || 'code'}</span>
        <button
          onClick={() => navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })}
          className="inline-flex items-center gap-1 normal-case tracking-normal font-medium hover:text-ink transition-colors"
          aria-label="Copy code"
        >
          {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  )
}

const SAFE_URL = /^(https?:|mailto:)/i

function inline(text, keyBase = 'i') {
  const out = []
  // order matters: code, bold, italic, links
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/g
  let last = 0, m, k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyBase}-${k++}`
    if (m[1]) out.push(<code key={key} className="ai-inline-code">{tok.slice(1, -1)}</code>)
    else if (m[2] || m[3]) out.push(<strong key={key}>{inline(tok.slice(2, -2), key)}</strong>)
    else if (m[4]) out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>)
    else if (m[5]) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)
      out.push(SAFE_URL.test(href) ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{label}</a> : label)
    }
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function parse(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const fence = /^\s*```(\S*)/.exec(line)
    if (fence) {
      const code = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++])
      i++ // closing fence (or end while streaming)
      blocks.push({ type: 'code', lang: fence[1], code: code.join('\n') })
      continue
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const row = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      const head = row(line)
      i += 2
      const rows = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(row(lines[i++]))
      blocks.push({ type: 'table', head, rows })
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) { blocks.push({ type: 'h', level: h[1].length, text: h[2] }); i++; continue }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line)
      const items = []
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        const indent = /^\s*/.exec(lines[i])[0].length
        items.push({ text: lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''), indent, n: /^\s*(\d+)/.exec(lines[i])?.[1] })
        i++
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }
    if (/^\s*>\s?/.test(line)) {
      const q = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''))
      blocks.push({ type: 'quote', text: q.join(' ') })
      continue
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { blocks.push({ type: 'hr' }); i++; continue }
    if (!line.trim()) { i++; continue }
    const para = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^(\s*```|#{1,4}\s|\s*([-*+]|\d+[.)])\s+|\s*>|\s*\|)/.test(lines[i])) para.push(lines[i++])
    blocks.push({ type: 'p', text: para.join(' ') })
  }
  return blocks
}

function Markdown({ text, streaming }) {
  const blocks = parse(text || '')
  return (
    <div className={`ai-chat-response space-y-2 ${streaming ? 'stream-caret' : ''}`}>
      {blocks.map((b, idx) => {
        const k = `b${idx}`
        switch (b.type) {
          case 'code': return <CodeBlock key={k} lang={b.lang} code={b.code} />
          case 'h': { const Tag = `h${Math.min(b.level + 1, 4)}`; return <Tag key={k}>{inline(b.text, k)}</Tag> }
          case 'list': return (
            <div key={k} role="list">
              {b.items.map((it, j) => (
                <div key={j} role="listitem" className={b.ordered ? 'ai-ordered-item' : 'ai-list-item'} style={{ marginLeft: Math.min(it.indent, 8) * 6 }}>
                  {b.ordered && <span className="text-accent-ink/80 text-xs font-semibold w-5 shrink-0 mt-[3px]">{it.n}.</span>}
                  <span>{inline(it.text, `${k}-${j}`)}</span>
                </div>
              ))}
            </div>
          )
          case 'table': return (
            <div key={k} className="overflow-x-auto thin-scroll"><table className="ai-table">
              <thead><tr>{b.head.map((c, j) => <th key={j}>{inline(c, `${k}h${j}`)}</th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, x) => <td key={x}>{inline(c, `${k}${j}${x}`)}</td>)}</tr>)}</tbody>
            </table></div>
          )
          case 'quote': return <blockquote key={k} className="border-l-2 border-accent/50 pl-3 text-ink-3 italic">{inline(b.text, k)}</blockquote>
          case 'hr': return <hr key={k} className="my-3" />
          default: return <p key={k}>{inline(b.text, k)}</p>
        }
      })}
    </div>
  )
}

export default memo(Markdown)
