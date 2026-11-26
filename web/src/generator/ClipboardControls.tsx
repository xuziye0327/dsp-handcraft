import { useSyncExternalStore } from 'react'

import type { createClipboard } from './clipboard'
import { tr } from './shared'
type Controls = ReturnType<typeof createClipboard>
export function CopyButton({ model, top }: { model: Controls; top: boolean }) {
  useSyncExternalStore(model.changed.subscribe, model.changed.snapshot)
  return (
    <button
      type="button"
      className={top ? 'copy-top viewer-only' : 'btn-2'}
      id={top ? 'copy-top' : 'copy'}
      hidden={top && !model.ui.ready}
      disabled={!model.ui.ready}
      onClick={() => void model.copy()}
    >
      {tr(model.ui.label)}
    </button>
  )
}
export function LikeButton({ model }: { model: Controls }) {
  useSyncExternalStore(model.changed.subscribe, model.changed.snapshot)
  const { ui } = model
  return (
    <button
      type="button"
      className="like"
      id="like"
      hidden={!ui.visible}
      disabled={model.busy() || ui.liked}
      onClick={model.like}
    >
      👍{' '}
      <span id="like-count">
        {tr(`${ui.liked ? '已赞' : '点赞'}${ui.count == null ? '' : ` (${ui.count})`}`)}
      </span>
    </button>
  )
}
