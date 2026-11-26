import { Fragment } from 'react'

import { ABOUT, TIPS } from './faq.js'

export type PageKind = keyof typeof ABOUT

// Only the link syntax in the authored FAQ copy is interpreted. React escapes its text.
function RichText({ text }: { text: string }) {
  let start = 0
  const parts = []
  for (const match of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    const [token, label, href] = match
    const external = /^https?:/.test(href)
    parts.push(
      <Fragment key={match.index}>
        {text.slice(start, match.index)}
        <a
          href={external ? href : href.replace(/\/(?=$|#)/, '/index.html')}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener' : undefined}
        >
          {label}
        </a>
      </Fragment>,
    )
    start = match.index + token.length
  }
  return (
    <>
      {parts}
      {text.slice(start)}
    </>
  )
}
function Paragraphs({ lines, className }: { lines: string[]; className?: string }) {
  return lines.map((p) => (
    <p className={className} key={p}>
      <RichText text={p} />
    </p>
  ))
}
function Topics({ base = '' }: { base?: string }) {
  return TIPS.groups.map((g) => (
    <a key={g.id} href={`${base}#${g.id}`}>
      {g.title}
      <small>{g.items.length}</small>
    </a>
  ))
}
export function AboutSection({ kind }: { kind: PageKind }) {
  const copy = ABOUT[kind]
  const Title = kind === 'gen' ? 'h1' : 'h2'
  const Heading = kind === 'gen' ? 'h2' : 'h3'
  const count = String(TIPS.groups.reduce((n, g) => n + g.items.length, 0))
  return (
    <section className="about" aria-labelledby="about-title">
      <Title id="about-title">{copy.title}</Title>
      <Paragraphs lines={copy.lead} />
      <Heading>{copy.faqTitle}</Heading>
      <div className="faq">
        {copy.faq.map(({ q, a }) => (
          <details key={q}>
            <summary>{q}</summary>
            <Paragraphs lines={a} />
          </details>
        ))}
      </div>
      {'tipsTitle' in copy && (
        <>
          <Heading>{copy.tipsTitle}</Heading>
          <div className="tips-card">
            <p>{copy.tipsLead.replace('{n}', count)}</p>
            <nav className="tips-topics" aria-label={copy.tipsTitle}>
              <Topics base="tips/index.html" />
            </nav>
            <a className="tips-all" href="tips/index.html">
              {copy.tipsAll.replace('{n}', count)}
            </a>
          </div>
        </>
      )}
    </section>
  )
}
function TipsLinks() {
  return (
    <nav className="links">
      <a href="../index.html">{TIPS.nav.gen}</a>
      <a href="../calc/index.html">{TIPS.nav.calc}</a>
    </nav>
  )
}
export function TipsBody({ generatorName }: { generatorName: string }) {
  const t = TIPS
  const cta = (
    <a className="cta" href="../index.html">
      {t.cta.label}
    </a>
  )
  return (
    <>
      <div className="band">
        <header className="top shell">
          <a className="brand" href="../index.html">
            <img src="../favicon.ico" alt="" width={20} height={20} />
            <span>{generatorName}</span>
          </a>
          <TipsLinks />
        </header>
        <div className="head shell">
          <h1>{t.name}</h1>
          <Paragraphs lines={t.lead} className="lead" />
          <p className="go">
            {cta}
            <span>{t.cta.note}</span>
          </p>
          <nav className="chips" aria-label={t.topicsTitle}>
            <Topics />
          </nav>
        </div>
      </div>
      <div className="shell body">
        <nav className="toc" aria-labelledby="toc-title">
          <h2 id="toc-title">{t.tocTitle}</h2>
          {t.groups.map((g) => (
            <div className="toc-g" key={g.id}>
              <a className="toc-h" href={`#${g.id}`}>
                {g.title}
              </a>
              <ul>
                {g.items.map((x) => (
                  <li key={x.id}>
                    <a href={`#${x.id}`}>{x.q}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <main>
          {t.groups.map((g) => (
            <section key={g.id} id={g.id}>
              <h2>{g.title}</h2>
              {g.items.map((x) => (
                <article key={x.id}>
                  <div className="q">
                    <h3 id={x.id}>{x.q}</h3>
                    {'key' in x && <span className="dim">{x.key}</span>}
                  </div>
                  <Paragraphs lines={x.a} />
                </article>
              ))}
            </section>
          ))}
          <aside className="end">
            <p>{t.cta.note}</p>
            {cta}
          </aside>
        </main>
      </div>
      <footer className="shell">
        <TipsLinks />
      </footer>
    </>
  )
}
