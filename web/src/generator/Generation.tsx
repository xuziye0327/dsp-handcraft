import { useSyncExternalStore } from 'react'

import type { createGeneration } from './job-state'
import { tr } from './shared'
export function Generation({
  job,
  cancel,
  suggest,
}: {
  job: ReturnType<typeof createGeneration>
  cancel: () => void
  suggest: (item: string) => void
}) {
  useSyncExternalStore(job.changed.subscribe, job.changed.snapshot)
  const { ui } = job
  return (
    <div className="actions">
      <button className="go" type="submit" id="go" disabled={ui.busy}>
        {tr(ui.busy ? '正在排布…' : '生成蓝图')}
      </button>
      <p className="forecast" id="forecast">
        {tr(ui.forecast)}
      </p>
      <div className={`progress${ui.slow ? ' slow' : ''}`} id="progress" hidden={!ui.busy}>
        <div
          className="progress-bar"
          id="progress-bar"
          style={{ width: `${ui.percent.toFixed(1)}%` }}
        />
      </div>
      <button type="button" className="cancel" id="cancel" hidden={!ui.busy} onClick={cancel}>
        {tr('取消本轮生成')}
      </button>
      <output className={`status${ui.error ? ' err' : ''}`} id="status" aria-live="polite">
        {tr(ui.text)}
      </output>
      <button
        className="suggest"
        type="button"
        id="suggest"
        hidden={!ui.suggest}
        data-item={ui.suggest}
        onClick={() => suggest(ui.suggest)}
      >
        {ui.suggest && tr(`把「${ui.suggest}」改为外部供应，再生成一次`)}
      </button>
    </div>
  )
}
export function SupplyDialog({ suggest }: { suggest: () => void }) {
  const close = () => document.querySelector<HTMLDialogElement>('#ext-dialog')?.close()
  return (
    <dialog id="ext-dialog" aria-labelledby="ext-title">
      <div className="dlg">
        <div className="dlg-head">
          <h2 id="ext-title">{tr('外部供应')}</h2>
          <button
            type="button"
            className="close"
            data-close=""
            aria-label={tr('关闭')}
            title={tr('关闭')}
            onClick={close}
          >
            ×
          </button>
          <p>
            {tr(
              '点中间产物设为外部供应（不在这条产线里做，由外部供给），再点一下取消。上面是原料、下面是用它的产物，最终产物在最下面；画布可以按住拖动。',
            )}
          </p>
        </div>
        <div className="ext-body">
          <div className="tiers" id="tiers" data-react-root="" />
          <div className="recipes" id="ext-recipes" data-react-root="" hidden />
        </div>
        <div className="dlg-foot">
          <span className="grow" id="ext-foot" />
          <button type="button" className="linkish" id="ext-suggest" onClick={suggest}>
            {tr('按建议设置')}
          </button>
          <button type="button" className="go" id="ext-done" onClick={close}>
            {tr('完成')}
          </button>
        </div>
      </div>
    </dialog>
  )
}
