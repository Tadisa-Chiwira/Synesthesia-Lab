
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import './App.css';

import { loadFxData, type FxRow } from './lib/data';
import {
  calculateMetrics,
  calculateVolatilityBands,
} from './lib/metrics';

import AudioControls from './components/AudioControls';
import VisualCanvas from './components/VisualCanvas';
import StatusPanel from './components/StatusPanel';
import Pip from './components/Pip';

function App() {
  const [data, setData] = useState<FxRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState(20);
  const [shockPercent, setShockPercent] = useState(0);
  const [simulationStartIndex, setSimulationStartIndex] = useState<number | null>(null);

  const audioEnergyRef = useRef(0);
  const marketIntensityRef = useRef(0);
  const shockRef = useRef(0);
  const isMusicPlayingRef = useRef(false);

  const handlePlaybackIndexChange = useCallback(
    (index: number) => setPlaybackIndex(index),
    []
  );

  useEffect(() => {
    let active = true;

    loadFxData()
      .then((rows) => {
        if (active) setData(rows);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const bands = useMemo(() => {
    if (data.length < 21) return null;
    return calculateVolatilityBands(data, 'EURUSD');
  }, [data]);

  if (error) {
    return <p role="alert">Could not load market data: {error}</p>;
  }

  if (data.length < 21 || !bands) {
    return <p>Preparing your market experience...</p>;
  }

  const index = Math.min(
    Math.max(playbackIndex, 20),
    data.length - 1
  );

  const historicalRow = data[index];
  const historicalMetrics = calculateMetrics(
    data.slice(0, index + 1),
    'EURUSD'
  );

  // Use the current replay moment as the experiment's baseline.
  const baselineRow = data[simulationStartIndex ?? index];
  const baseRate = baselineRow.EURUSD;

  const simulatedRate =
    baseRate * (1 + shockPercent / 100);

  const usdChange =
    1000 * (simulatedRate - baseRate);

  const isSimulating = shockPercent !== 0;

  const pipCommentary = isSimulating
    ? `Ooooh! You've imagined the euro ${
      shockPercent > 0 ? 'getting stronger' : 'getting weaker'
      }. Look at how the lights and dollar value change!`
    : `We're turning real currency movements into light and sound.
       Let's see if you can predict what happens next!`;

  function changeShock(value: number) {
  // Remember the market moment when a new experiment begins.
    if (shockRef.current === 0 && value !== 0) {
      setSimulationStartIndex(playbackIndex);
    }

  // Release that starting point when the experiment ends.
    if (value === 0) {
      setSimulationStartIndex(null);
    }

    shockRef.current = value;
    setShockPercent(value);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">
          <span className="wordmark-star">✦</span>
          SYNESTHESIA LAB
        </div>

        <div className="mode-indicator">
          <span
            className={
              isSimulating ? 'mode-dot simulated' : 'mode-dot'
            }
          />
          {isSimulating
            ? 'Hypothetical experiment'
            : 'Real market replay'}
        </div>

        <div className="topbar-note">
          An experiment in light, sound and currency
        </div>
      </header>

      <section className="intro">
        <p className="eyebrow">
          EUR / USD · A study in light and sound
        </p>

        <h1>
          See what the market <em>feels</em> like.
        </h1>

        <p className="intro-description">
          Discover how currencies change value
          through music, shimmering light and play.
        </p>
      </section>

      <main className="experience-grid">
        {/* LEFT: Music and market explanation */}
        <aside className="rail rail-left">
          <div className="glass-panel soundtrack-panel">
            <AudioControls
              audioEnergyRef={audioEnergyRef}
              marketIntensityRef={marketIntensityRef}
              isMusicPlayingRef={isMusicPlayingRef}
            />
          </div>

          <div className="glass-panel status-panel">
            <StatusPanel
              shockPercent={shockPercent}
              historicalRow={historicalRow}
              historicalReturn={historicalMetrics.latestReturn}
              historicalVolatility={historicalMetrics.volatility}
              bands={bands}
              baseRate={baseRate}
              baseTimestamp={baselineRow.timestamp}
            />
          </div>
        </aside>

        {/* CENTRE: The living artwork */}
        <section className="glass-panel stage-panel">
          <div className="stage-heading">
            <div className="stage-kicker">
              Market in Motion
            </div>

            <h2>
              Light follows value.
              Rhythm follows change.
            </h2>
          </div>

          <VisualCanvas
            data={data}
            audioEnergyRef={audioEnergyRef}
            marketIntensityRef={marketIntensityRef}
            shockRef={shockRef}
            isMusicPlayingRef={isMusicPlayingRef}
            shockPercent={shockPercent}
            onPlaybackIndexChange={handlePlaybackIndexChange}
          />

          <div className="stage-footer">
            <span>
              {isSimulating
                ? 'Imagined exchange-rate change'
                : 'Recorded EUR/USD movements'}
            </span>
            <span>
              {isSimulating
                ? 'Simulation'
                : 'Historical data'}
            </span>
          </div>
        </section>

        {/* RIGHT: Pip and the experiment */}
        <aside className="rail rail-right">
          <div className="glass-panel pip-panel">
            <Pip
              baseRate={baseRate}
              commentary={pipCommentary}
              audioEnergyRef={audioEnergyRef}
              marketIntensityRef={marketIntensityRef}
            />
          </div>

          <div className="glass-panel storm-panel">
            <section className="storm-widget">
              <div className="stage-kicker">
                Market Storm
              </div>

              <h2>Conduct the current</h2>

              <p>
                What if the euro suddenly changed value?
                Try it below.
              </p>

              <div
                className="shock-number"
                aria-live="off"
              >
                {shockPercent > 0 ? '+' : ''}
                {shockPercent.toFixed(1)}%
              </div>

              <label htmlFor="shock">
                Change the exchange rate
              </label>

              <input
                id="shock"
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={shockPercent}
                onChange={(event) =>
                  changeShock(Number(event.target.value))
                }
              />

              <div className="slider-labels">
                <span>−2% weaker</span>
                <span>+2% stronger</span>
              </div>

              <div className="storm-results">
                <div className="storm-result">
                  <span>New rate: €1 buys</span>
                  <strong>
                    ${simulatedRate.toFixed(4)}
                  </strong>
                </div>

                <div className="storm-result">
                  <span>Change in value of €1,000</span>
                  <strong>
                    {usdChange >= 0 ? '+' : '-'}$
                    {Math.abs(usdChange).toFixed(2)}
                  </strong>
                </div>
              </div>

              <button
                className="reset-button"
                onClick={() => changeShock(0)}
              >
                Reset experiment
              </button>

              <p className="simulation-note">
                A pretend change based on a recorded
                exchange rate, not a prediction.
              </p>
            </section>
          </div>
        </aside>
      </main>

      <footer className="app-footer">
        FX DATA SONIFICATION EXPERIMENT ·
        HISTORICAL DATA AND HYPOTHETICAL SCENARIOS
      </footer>
    </div>
  );
}

export default App;
