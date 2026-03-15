import katex from 'katex'

export function renderMarkup(text: string): React.ReactNode[] {
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$|\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const html = katex.renderToString(part.slice(2, -2), { displayMode: false, throwOnError: false })
      return (
        <span
          key={i}
          style={{ display: 'block', textAlign: 'center', margin: '4px 0' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      const html = katex.renderToString(part.slice(1, -1), { displayMode: false, throwOnError: false })
      return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}
