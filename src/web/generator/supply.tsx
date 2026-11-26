import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { byId } from './shared'
import { DependencyGraph } from './supply-graph'
import { FRAC_RECIPE, RecipePicker, type RecipeGroup } from './supply-recipes'
import {
  supplyChain,
  type ChainData,
  type SupplyChain,
  type SupplyContext,
  type Unit,
} from './supply-types'
export type { ChainData, ChainRequest, SupplyContext, SupplyState } from './supply-types'
export const RARE_RAW = 1117

export function createSupply(context: SupplyContext) {
  const { state } = context
  const tiers = byId('tiers'),
    foot = byId('ext-foot'),
    recipes = byId('ext-recipes')
  const dialog = byId<HTMLDialogElement>('ext-dialog')
  const title = byId('ext-title')
  const suggest = byId('ext-suggest')
  const root = createRoot(tiers),
    memory = { value: 1 }
  let chainId = 0,
    session = 0,
    revision = 0,
    autoSuggest = false
  let chainData: SupplyChain | null = null
  const rareParams = () => ({
    rare: state.rare && !context.getHandoff(),
    rareOff: [...state.rareOff],
  })
  const rareOffAdd = (id: number | string) => {
    if (!state.rareOff.includes(Number(id))) state.rareOff.push(Number(id))
  }
  const rareOffDrop = (id: number) => {
    state.rareOff = state.rareOff.filter((x) => x !== id)
  }
  const extOn = (name: string) =>
    state.ext.has(name) ||
    (name === context.getItem(RARE_RAW)?.name &&
      !state.rareOff.includes(RARE_RAW) &&
      !!(chainData?.autoExt ?? context.getForecast()?.autoExt)?.includes(name))
  function setExt(name: string, on: boolean) {
    const rare = name === context.getItem(RARE_RAW)?.name
    if (on) {
      state.ext.add(name)
      if (rare) rareOffDrop(RARE_RAW)
    } else {
      state.ext.delete(name)
      if (rare) rareOffAdd(RARE_RAW)
    }
  }
  function requestChain(useSuggestions = false) {
    if (!state.targets.every((t) => context.getItem(t.id))) return
    if (useSuggestions) autoSuggest = true
    context.send({
      type: 'chain',
      id: ++chainId,
      params: {
        targets: state.targets.map((t) => ({ target: t.id, rate: t.rate > 0 ? t.rate : 60 })),
        raw: [...state.ext],
        recipes: { ...state.recipes },
        ...rareParams(),
        lab: state.lab,
        labStack: state.labstack,
      },
    })
  }
  function changed() {
    context.saveSettings()
    requestChain()
  }
  function toggle(name: string) {
    setExt(name, !extOn(name))
    context.hideSuggestion()
    changed()
  }
  function toggleRaw(u: Unit) {
    const on = u.state === 'external'
    setExt(u.name, !on)
    if (on && u.id === 1121 && Number(state.recipes[1121]) === FRAC_RECIPE)
      delete state.recipes[1121]
    context.hideSuggestion()
    changed()
  }
  function toggleGroup(g: RecipeGroup, on: boolean) {
    for (const u of g.uses) {
      if (on) {
        delete state.recipes[u.item]
        if (g.ore) rareOffAdd(u.item)
      } else {
        state.recipes[u.item] = u.recipe
        if (u.item === RARE_RAW) state.ext.delete(u.name)
        rareOffDrop(u.item)
      }
    }
    changed()
  }
  function showRecipes(visible: boolean) {
    recipes.hidden = !visible
  }
  function renderExt() {
    const data = chainData
    if (!data) return
    title.textContent = `外部供应：${data.title}`
    suggest.hidden = !data.suggested.some((n) => !state.ext.has(n))
    root.render(
      <>
        {createPortal(
          <RecipePicker
            data={data}
            ui={context}
            setVisible={showRecipes}
            toggleRaw={toggleRaw}
            toggleGroup={toggleGroup}
          />,
          recipes,
        )}
        <DependencyGraph
          key={session}
          data={data}
          ui={context}
          tiers={tiers}
          foot={foot}
          memory={memory}
          toggle={toggle}
          revision={++revision}
        />
      </>,
    )
  }
  function openExt(useSuggestions = false) {
    ++session
    root.render(<p className="hint">正在列出中间产物…</p>)
    suggest.hidden = true
    if (!dialog.open) dialog.showModal()
    requestChain(useSuggestions)
  }
  function onChain(id: number, d: ChainData) {
    if (id !== chainId) return
    if (autoSuggest) {
      autoSuggest = false
      const add = d.suggested.filter((n) => !state.ext.has(n))
      if (add.length) {
        for (const n of add) state.ext.add(n)
        changed()
        return
      }
    }
    const handoff = context.getHandoff()
    if (handoff && !handoff.pruned) {
      handoff.pruned = true
      const choices = new Map(d.recipes.map((r) => [r.id, r]))
      for (const id of Object.keys(state.recipes).map(Number))
        if (!choices.has(id) || choices.get(id)!.def.id === state.recipes[id])
          delete state.recipes[id]
      context.saveSettings()
    }
    chainData = supplyChain(d)
    renderExt()
    if (handoff?.auto && !handoff.ran) {
      handoff.ran = true
      byId<HTMLFormElement>('spec').requestSubmit()
    }
  }
  function applySuggestion() {
    if (!chainData) return
    for (const n of chainData.suggested) state.ext.add(n)
    changed()
  }
  function edit() {
    if (!state.targets.every((t) => context.getItem(t.id))) {
      context.setStatus('先选目标产物。', true)
      return
    }
    openExt()
  }
  return {
    openExt,
    requestChain,
    onChain,
    renderExt,
    rareParams,
    rareOffAdd,
    setExt,
    extOn,
    edit,
    applySuggestion,
    dispose() {
      root.unmount()
    },
  }
}
