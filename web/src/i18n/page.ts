// Translate dynamic worker output and the original SVG/HTML labels. React-owned text
// may change in place, but its nodes must not be removed or reordered by the observer.
import type { Dictionaries, Dictionary } from './core.js'
import { createTranslator, CJK, normKey } from './core.js'

export type ScopedDictionary = readonly [selector: string, translations: Dictionary]
const ATTRS = ['title', 'aria-label', 'placeholder', 'alt', 'data-note', 'data-tag', 'data-short']
const ATTR_SEL = ATTRS.map((a) => `[${a}]`).join(',')
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA'])
const OFF = '[data-i18n="off"]'
const INLINE = new Set(['SPAN', 'B', 'STRONG', 'EM', 'I', 'CODE', 'KBD'])
const MARK_0 = 0xf700
const MARKS = /([\uf700-\uf7ff])/

export function translatePage(dictionaries: Dictionaries, scoped: ScopedDictionary[] = []) {
  const translator = createTranslator(dictionaries)
  const doneText = new WeakMap<Text, string>()
  const doneAttr = new WeakMap<Element, Record<string, string>>()
  const triedLine = new WeakSet<Element>()

  function text(node: Text) {
    const value = node.data
    const parent = node.parentElement
    if (
      !CJK.test(value) ||
      doneText.get(node) === value ||
      !parent ||
      SKIP.has(parent.nodeName) ||
      parent.closest(OFF)
    )
      return
    const key = normKey(value)
    const rule = scoped.find(([selector, dict]) => key in dict && parent.closest(selector))
    const out = rule ? value.replace(value.trim(), rule[1][key]) : translator.translate(value)
    doneText.set(node, out)
    if (out !== value) node.data = out
  }

  function attrs(element: Element) {
    if (element.closest(OFF)) return
    const seen = doneAttr.get(element) ?? {}
    for (const attr of ATTRS) {
      const value = element.getAttribute(attr)
      if (!value || !CJK.test(value) || seen[attr] === value) continue
      const out = translator.translate(value)
      seen[attr] = out
      if (out !== value) element.setAttribute(attr, out)
    }
    doneAttr.set(element, seen)
  }

  function line(parent: Element) {
    triedLine.add(parent)
    const kids = [...parent.childNodes]
    if (
      kids.length < 2 ||
      kids.length > 24 ||
      SKIP.has(parent.nodeName) ||
      parent.closest(`${OFF},[data-react-root]`)
    )
      return
    if (
      !kids.every((k) => k instanceof Text || (k instanceof Element && INLINE.has(k.nodeName))) ||
      !kids.some((k) => k instanceof Element)
    )
      return
    if (
      scoped.some(
        ([sel, dict]) =>
          parent.closest(sel) && kids.some((k) => k instanceof Text && normKey(k.data) in dict),
      )
    )
      return
    const source = kids
      .map((k, i) => (k instanceof Text ? k.data : String.fromCharCode(MARK_0 + i)))
      .join('')
    const out = translator.translate(source, true)
    const parts = out.split(MARKS).filter(Boolean)
    const used = parts.filter((x) => MARKS.test(x))
    if (
      CJK.test(out) ||
      used.length !== kids.filter((k) => k instanceof Element).length ||
      new Set(used).size !== used.length
    )
      return
    parent.replaceChildren(...parts.map((x) => (MARKS.test(x) ? kids[x.charCodeAt(0) - MARK_0] : x)))
  }

  function translateText(node: Text) {
    if (!node.isConnected) return
    const p = node.parentElement
    if (p && !triedLine.has(p)) line(p)
    if (node.isConnected) text(node)
  }

  function tree(root: Node) {
    if (root instanceof Text) {
      if (CJK.test(root.data)) translateText(root)
      return
    }
    if (!(root instanceof Element) || SKIP.has(root.nodeName) || root.closest(OFF)) return
    if (root.matches(ATTR_SEL)) attrs(root)
    root.querySelectorAll(ATTR_SEL).forEach(attrs)
    const nodes: Text[] = []
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode())
      if (n instanceof Text && CJK.test(n.data)) nodes.push(n)
    nodes.forEach(translateText)
  }

  function handle(records: MutationRecord[]) {
    for (const record of records) {
      if (record.type === 'characterData' && record.target instanceof Text) text(record.target)
      else if (record.type === 'attributes' && record.target instanceof Element) attrs(record.target)
      else record.addedNodes.forEach(tree)
    }
  }
  tree(document.body)
  document.title = translator.translate(document.title)
  const observer = new MutationObserver(handle)
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  })
  window.dsphcTr = translator.translate
  window.dsphcMissing = translator.missing
  window.dsphcFlush = () => handle(observer.takeRecords())
  return translator
}
