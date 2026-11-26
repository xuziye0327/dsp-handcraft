import type { ReactNode } from 'react'
export function Workspace({
  toolbar,
  preview,
  copy,
  like,
}: {
  toolbar: ReactNode
  preview: ReactNode
  copy: (top: boolean) => ReactNode
  like: ReactNode
}) {
  return (
    <>
      <div className="stage">
        {toolbar}
        <section className="sheet" id="sheet" aria-label="布局图">
          <div className="sheet-bar">
            <div className="name" id="sheet-name">
              布局图
            </div>
            <div className="sheet-stats viewer-only" id="sheet-stats" hidden></div>
            <div className="layer-controls" id="layer-controls" hidden>
              <fieldset className="overlays" aria-label="图层叠加">
                <label>
                  <input type="checkbox" data-overlay="power" />
                  供电范围
                </label>
              </fieldset>
            </div>
            <fieldset className="zoom" id="sheet-tools" aria-label="看图工具">
              <button type="button" data-zoom="fit" disabled title="恢复全图（0）">
                全图
              </button>
              <button type="button" className="viewer-only" id="zoom-out" disabled aria-label="缩小">
                −
              </button>
              <output className="viewer-only" id="zoom-label" aria-label="缩放比例">
                100%
              </output>
              <button type="button" className="viewer-only" id="zoom-in" disabled aria-label="放大">
                ＋
              </button>
              <button type="button" className="viewer-only" id="expand-view" aria-pressed="false">
                大图
              </button>
            </fieldset>
            {copy(true)}
            {like}
          </div>
          <p className="sheet-alert" id="sheet-alert" role="alert" hidden></p>
          {preview}
          <div className="sheet-workspace">
            <div className="viewer-stage">
              <section
                className="drawing"
                id="drawing"
                // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The SVG camera handles arrow keys, zoom, Home, and Escape here.
                tabIndex={0}
                aria-label="图纸预览，拖动移动、点击线路查看简介，按钮或「大图」里滚轮缩放"
              >
                <div className="empty">
                  <strong>
                    点击<span className="on-side">左侧</span>
                    <span className="on-top">上方</span>「生成蓝图」
                  </strong>
                  <ol className="steps">
                    <li>选目标产物和每分钟产量</li>
                    <li>生成蓝图</li>
                    <li>复制蓝图，贴进游戏</li>
                  </ol>
                </div>
              </section>
              <section
                className="station-info"
                id="station-info"
                aria-labelledby="station-title"
                hidden
              >
                <header>
                  <h2 id="station-title">物流站</h2>
                  <button type="button" id="close-station" aria-label="关闭物流站简介">
                    ×
                  </button>
                </header>
                <div id="station-body"></div>
              </section>
              <section
                className="station-info machine-info"
                id="machine-info"
                aria-labelledby="machine-title"
                hidden
              >
                <header>
                  <h2 id="machine-title">工厂</h2>
                  <button type="button" id="close-machine" aria-label="关闭工厂简介">
                    ×
                  </button>
                </header>
                <div id="machine-body"></div>
              </section>
            </div>
            <aside className="layer-rail" id="layer-rail" aria-label="楼层与用电" hidden>
              <section
                className="route-info viewer-only"
                id="route-info"
                aria-labelledby="route-title"
                hidden
              >
                <header>
                  <span className="sw" aria-hidden="true"></span>
                  <h2 id="route-title">线路</h2>
                  <button type="button" id="close-route" aria-label="关闭线路简介">
                    ×
                  </button>
                </header>
                <div id="route-body" aria-live="polite"></div>
              </section>
              <div className="rail-tabs" id="rail-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  id="tab-floors"
                  aria-selected="true"
                  aria-controls="floor-list"
                >
                  楼层
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-belts"
                  aria-selected="false"
                  aria-controls="belt-key"
                  hidden
                >
                  带子
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-power"
                  aria-selected="false"
                  aria-controls="power-pane"
                >
                  用电
                </button>
              </div>
              <div
                className="floor-list"
                id="floor-list"
                role="tabpanel"
                aria-label="选择预览楼层"
              ></div>
              <div
                className="power-pane"
                id="power-pane"
                role="tabpanel"
                aria-labelledby="tab-power"
                hidden
              ></div>

              <section
                className="belt-key"
                id="belt-key"
                role="tabpanel"
                aria-labelledby="tab-belts"
                hidden
              >
                <h3>传送带运的</h3>
                <ul id="belt-key-list"></ul>
                <p className="howto">
                  <b>怎么用</b>蓝图贴下去建好一遍后，整片拆掉、原地重建一次，分拣器才会全部连上。
                </p>
              </section>
            </aside>
          </div>
          <div className="viewer-status viewer-only">
            <strong id="floor-name">—</strong>
            <span id="floor-description">等待生成</span>
            <span id="floor-meta"></span>
          </div>
        </section>
      </div>

      <section className="output">
        <div className="panel bp">
          <h2>
            <label htmlFor="bp">蓝图字符串</label>
          </h2>
          <textarea id="bp" readOnly placeholder="生成后出现在这里"></textarea>
          <div className="bp-row">
            {copy(false)}
            <span className="meta" id="bp-meta"></span>
          </div>
        </div>
        <div className="panel">
          <h2>接口</h2>
          <ul id="ports">
            <li>生成后列在这里</li>
          </ul>
        </div>
        <div className="panel">
          <h2>检查</h2>
          <ul id="notes">
            <li>生成后列在这里</li>
          </ul>
        </div>
      </section>
      <details className="result-details" id="result-details" open hidden>
        <summary>图纸数据与物品表</summary>
        <div id="result-body">
          {' '}
          <div className="sheet-foot" id="sheet-foot" hidden>
            <div>
              <ul className="legend" id="legend"></ul>
              <div className="factory-legend" id="factory-legend"></div>
            </div>
            <table className="titleblock" id="titleblock" hidden></table>
          </div>
        </div>
      </details>
    </>
  )
}
