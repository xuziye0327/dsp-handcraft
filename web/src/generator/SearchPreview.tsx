import { useSyncExternalStore } from 'react'

import type { createPreview } from './search-preview'
import { tr } from './shared'
export function SearchPreview({ preview }: { preview: ReturnType<typeof createPreview> }) {
  useSyncExternalStore(preview.changed.subscribe, preview.changed.snapshot)
  return (
    <div className="preview" id="preview" hidden={!preview.rounds.size}>
      <span className="preview-note" id="preview-note">
        {tr('搜索中，看第几轮')}
      </span>
      <fieldset className="preview-tabs" id="preview-tabs" aria-label={tr('观摩第几轮退火')}>
        <button
          type="button"
          data-round="auto"
          aria-pressed={preview.watch === 'auto'}
          title={tr('看最好的那一轮')}
          onClick={() => preview.select('auto')}
        >
          {tr('自动')}
        </button>
        {[...preview.rounds.keys()]
          .sort((a, b) => a - b)
          .map((s) => (
            <button
              type="button"
              key={s}
              data-round={s}
              aria-pressed={preview.watch === s}
              title={tr(`看第 ${s + 1} 轮退火`)}
              onClick={() => preview.select(s)}
            >
              {s + 1}
            </button>
          ))}
      </fieldset>
    </div>
  )
}
