
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import './App.css';
import './celestial.css';
import Celestial from './components/Celestial';

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

  const playbackIndexRef = useRef(20);

  const handlePlaybackIndexChange = useCallback(
    (index: number) => { playbackIndexRef.current = index; setPlaybackIndex(index); },
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
    ? `One euro would buy ${shockPercent > 0 ? 'more' : 'fewer'} dollars. Your €1,000 would be worth $${Math.abs(usdChange).toFixed(2)} ${shockPercent > 0 ? 'more' : 'less'} in dollars. This is an experiment, not a prediction.`
    : `At this recorded moment, one euro buys $${historicalRow.EURUSD.toFixed(4)}. Play a song to move through the data, or try the slider.`;

  function changeShock(value: number) {
  // Remember the market moment when a new experiment begins.
    if (shockRef.current === 0 && value !== 0) {
      setSimulationStartIndex(playbackIndexRef.current);
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
          <Celestial className="wordmark-star" />
          <span>Synesthesia <i>Lab</i></span>
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
          Euros / US dollars
        </div>
      </header>

      <section className="intro">

        <h1>
          See what the market <em>feels</em> like.
        </h1>

        <p className="intro-description">
          Explore how currencies move through music, light and a few experiments.
        </p>
      </section>

      <main className="experience-grid">
        {/* LEFT: Music and market explanation */}
        <aside className="rail rail-left">
          <div className="soundtrack-panel">
            <AudioControls
              audioEnergyRef={audioEnergyRef}
              marketIntensityRef={marketIntensityRef}
              isMusicPlayingRef={isMusicPlayingRef}
            />
          </div>

          <div className="status-panel">
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
        <section className="stage-panel">
          <div className="stage-heading">
            <h2>Market in Motion</h2>
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
                ? 'Historical path / imagined intensity'
                : 'Recorded EUR/USD movements'}
            </span>
            <span>
              {isSimulating
                ? 'Simulation'
                : 'Historical data'}
            </span>
          </div>
          <p className="artwork-caption">The ribbon follows currency movements. The sparkles respond to your music.</p>
        </section>

        {/* RIGHT: Pip and the experiment */}
        <aside className="rail rail-right">
          <div className="pip-panel">
            <Pip
              baseRate={baseRate}
              commentary={pipCommentary}
              learningContext={{
                baseRate,
                displayedRate: isSimulating ? simulatedRate : historicalRow.EURUSD,
                shockPercent,
                dollarChange: usdChange,
                timestamp: baselineRow.timestamp,
              }}
              audioEnergyRef={audioEnergyRef}
              marketIntensityRef={marketIntensityRef}
            />
          </div>

          <div className="storm-panel">
            <section className="storm-widget">
              <h2>Market Storm</h2>

              <p>
                Try changing the exchange rate and see what happens to €1,000.
              </p>

              <div className="storm-dial">
                <div className="shock-number" aria-live="off">
                  {shockPercent > 0 ? '+' : ''}
                  {shockPercent.toFixed(1)}%
                </div>
                <button className="reset-button" onClick={() => changeShock(0)}>
                  Reset
                </button>
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
                  <span>€1,000 changes by</span>
                  <strong>
                    {usdChange >= 0 ? '+' : '-'}$
                    {Math.abs(usdChange).toFixed(2)}
                  </strong>
                </div>
              </div>

              <p className="simulation-note">
                An imagined change from a recorded rate, never a prediction.
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
