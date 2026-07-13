/**
 * Style-guide showcase for the design system extracted from the legacy
 * Rail Dispatcher prototype into Tailwind (see src/index.css).
 *
 * This is NOT the app — it just renders representative markup so the
 * extracted classes (.card, .btn, .railcar, .plat, .issue, …) can be
 * eyeballed against the original. Replace it when the real UI is built.
 */
function App() {
  return (
    <>
      <header>
        <div className="brand">
          <h1>
            Rail <span className="dim">Dispatcher</span>
          </h1>
          <span className="sub">Satisfactory train network planner</span>
        </div>
        <div className="hazard" />
      </header>

      <div className="worldbar">
        <button className="wtab active">World 1</button>
        <button className="wtab">Dune Desert</button>
        <button className="btn small" title="New world">
          +
        </button>
        <span className="spacer" />
        <span className="wactions">
          <button className="btn small">Rename</button>
          <button className="btn small">Export JSON</button>
          <button className="btn small danger">Delete world</button>
        </span>
      </div>

      <main>
        <nav className="sectionnav">
          <button className="snav active">Trains &amp; routes</button>
          <button className="snav">Stations</button>
          <button className="snav">
            Analysis<span className="badge ok">✓</span>
          </button>
        </nav>

        <h2 className="sec" style={{ marginTop: 0 }}>
          Components
        </h2>

        {/* buttons */}
        <div className="card">
          <div className="cardhead">
            <span className="label">Buttons</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn">Default</button>
            <button className="btn primary">Primary</button>
            <button className="btn small">Small</button>
            <button className="btn danger">Danger</button>
            <button className="btn ghost">Ghost</button>
          </div>
        </div>

        {/* train consist */}
        <div className="card" data-kind="train">
          <div className="cardhead">
            <span className="draghandle" title="Drag to reorder">
              ⠿
            </span>
            <button className="chev" title="Collapse">
              ▼
            </button>
            <input type="text" className="name" defaultValue="Ore Run" />
            <span className="spacer" />
            <button className="btn small">+ Car</button>
            <button className="btn small">− Car</button>
            <button className="btn small ghost">✕</button>
          </div>
          <div className="consist">
            <div className="railcar engine locked">
              <span className="idx">0</span>
              <span className="kind">Engine</span>
              <span className="stripe" />
            </div>
            <div className="railcar freight">
              <span className="idx">1</span>
              <span className="kind">Freight</span>
              <span className="stripe" />
            </div>
            <div className="railcar freight">
              <span className="idx">2</span>
              <span className="kind">Freight</span>
              <span className="stripe" />
            </div>
            <div className="railcar fluidcar">
              <span className="idx">3</span>
              <span className="kind">Fluid</span>
              <span className="stripe" />
            </div>
          </div>
          <div className="hint">
            Car position N docks at platform N. Freight cars use regular platforms, fluid cars
            use fluid platforms.
          </div>

          <div className="routeblock">
            <div className="routehead">
              <span className="label">Route · loop of 2 stops</span>
              <span className="spacer" />
              <button className="btn small primary">+ Add stop</button>
            </div>
            <div className="stop">
              <div className="stoprow">
                <span className="stopnum">1.</span>
                <select defaultValue="mine">
                  <option value="mine">Iron Mine</option>
                  <option value="smelt">Smelter Hub</option>
                </select>
                <span className="spacer" style={{ flex: 1 }} />
                <button className="btn small">↑</button>
                <button className="btn small">↓</button>
                <button className="btn small ghost">✕</button>
              </div>
              <div className="rules">
                <span className="rlabel load">Load</span>
                <div className="rulewrap">
                  <span className="chip load">
                    Iron Ore
                    <button title="Remove">✕</button>
                  </span>
                  <span className="chip load">
                    Copper Ore
                    <button title="Remove">✕</button>
                  </span>
                </div>
                <span className="rlabel unload">Unload</span>
                <div className="rulewrap">
                  <span className="chip unload">
                    Nothing
                    <button title="Remove">✕</button>
                  </span>
                </div>
              </div>
            </div>
            <div className="looparrow">↺ returns to stop 1</div>
          </div>
        </div>

        {/* station platforms */}
        <div className="card" data-kind="station">
          <div className="cardhead">
            <span className="draghandle">⠿</span>
            <button className="chev">▼</button>
            <input type="text" className="name" defaultValue="Smelter Hub" />
            <span className="spacer" />
            <span className="label">3 platforms · 1 load · 1 unload</span>
            <button className="btn small">+ Platform</button>
          </div>
          <div className="plats">
            <div className="plat load">
              <span className="pos">PLAT 1</span>
              <span className="seg">
                <button className="on regular">Regular</button>
                <button>Fluid</button>
                <button>Empty</button>
              </span>
              <span className="seg">
                <button className="on load">Load</button>
                <button>Unload</button>
              </span>
              <div className="platitems">
                <div className="platitem">
                  <select defaultValue="iron">
                    <option value="iron">Iron Ore</option>
                  </select>
                  <input type="number" min={0} defaultValue={120} />
                  <span className="dimtxt mono">/min</span>
                  <button className="btn small ghost">✕</button>
                </div>
                <button className="btn small">+ Item</button>
              </div>
              <button className="btn small ghost">✕</button>
            </div>

            <div className="plat unload">
              <span className="pos">PLAT 2</span>
              <span className="seg">
                <button className="on regular">Regular</button>
                <button>Fluid</button>
                <button>Empty</button>
              </span>
              <span className="seg">
                <button>Load</button>
                <button className="on unload">Unload</button>
              </span>
              <span className="dimtxt">receives solids that docked trains drop here</span>
              <button className="btn small ghost">✕</button>
            </div>

            <div className="plat fluid load">
              <span className="pos">PLAT 3</span>
              <span className="seg">
                <button>Regular</button>
                <button className="on fluid">Fluid</button>
                <button>Empty</button>
              </span>
              <span className="seg">
                <button className="on load">Load</button>
                <button>Unload</button>
              </span>
              <div className="platitems">
                <div className="platitem">
                  <select defaultValue="water">
                    <option value="water">Water</option>
                  </select>
                  <input type="number" min={0} defaultValue={300} />
                  <span className="dimtxt mono">m³/min</span>
                </div>
              </div>
              <button className="btn small ghost">✕</button>
            </div>
          </div>
        </div>

        {/* analysis */}
        <h2 className="sec">Analysis</h2>
        <div className="issue err">
          <span className="tag">Error</span>
          <span>
            <b>Ore Run</b> is set to load <b>Caterium Ore</b> at Iron Mine, but no valid freight
            car can collect it.
          </span>
        </div>
        <div className="issue warn">
          <span className="tag">Warning</span>
          <span>
            <b>Ore Run</b> only visits one station. A loop needs at least two stops to move
            anything.
          </span>
        </div>
        <div className="allclear">✓ &nbsp;No conflicts detected. All flows check out.</div>

        <h2 className="sec">Station platforms · computed throughput</h2>
        <div className="board">
          <h3>Smelter Hub</h3>
          <table className="flow">
            <tbody>
              <tr>
                <th style={{ width: 70 }}>Platform</th>
                <th style={{ width: 90 }}>Mode</th>
                <th>Contents</th>
                <th style={{ width: 220 }}>Trains</th>
              </tr>
              <tr>
                <td className="mono">1</td>
                <td>
                  <span className="modechip load">Load</span>
                </td>
                <td>
                  Iron Ore <span className="rate">120/min</span>
                </td>
                <td className="dimtxt">Ore Run</td>
              </tr>
              <tr>
                <td className="mono">2</td>
                <td>
                  <span className="modechip unload">Unload</span>
                </td>
                <td className="dimtxt">no cargo exchange</td>
                <td className="dimtxt">—</td>
              </tr>
              <tr>
                <td className="mono">3</td>
                <td>
                  <span className="modechip empty">Empty</span>
                </td>
                <td className="dimtxt">no cargo exchange</td>
                <td className="dimtxt">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <footer>
        <span>Data is saved to this browser via localStorage.</span>{' '}
        <span id="storageNote" />
      </footer>
    </>
  )
}

export default App
