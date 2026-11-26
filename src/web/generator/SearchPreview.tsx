import { useSyncExternalStore } from 'react'

import type { createPreview } from './search-preview'
export function SearchPreview({ preview }: { preview: ReturnType<typeof createPreview> }) {
  useSyncExternalStore(preview.changed.subscribe, preview.changed.snapshot)
  return (
    <div className="preview" id="preview" hidden={!preview.rounds.size}>
      <span className="preview-note" id="preview-note">
        搜索中，看第几轮
      </span>
      <fieldset className="preview-tabs" id="preview-tabs" aria-label="观摩第几轮退火">
        <button
          type="button"
          data-round="auto"
          aria-pressed={preview.watch === 'auto'}
          title="看最好的那一轮"
          onClick={() => preview.select('auto')}
        >
          自动
        </button>
        {[...preview.rounds.keys()]
          .sort((a, b) => a - b)
          .map((s) => (
            <button
              type="button"
              key={s}
              data-round={s}
              aria-pressed={preview.watch === s}
              title={`看第 ${s + 1} 轮退火`}
              onClick={() => preview.select(s)}
            >
              {s + 1}
            </button>
          ))}
      </fieldset>
    </div>
  )
}
