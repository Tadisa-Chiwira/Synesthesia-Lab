
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

  // Shared, continuously changing values.
  const audioEnergyRef = useRef(0);
  const marketIntensityRef = useRef(0);
  const shockRef = useRef(0);
  const isMusicPlayingRef = useRef(false);

  // The Canvas reports the observation it is displaying.
  const handlePlaybackIndexChange = useCallback(
    (index: number) => {
      setPlaybackIndex(index);
    },
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
          setError(
            err instanceof Error ? err.message : String(err)
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Calculate comparison thresholds only when data changes.
  const bands = useMemo(() => {
    if (data.length < 21) return null;

    return calculateVolatilityBands(data, 'EURUSD');
  }, [data]);

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (data.length < 21 || !bands) {
    return <p>Preparing your market experience...</p>;
  }

  // This row matches the Canvas's current playback position.
  const index = Math.min(
    Math.max(playbackIndex, 20),
    data.length - 1
  );

  const historicalRow = data[index];

  const historicalMetrics = calculateMetrics(
    data.slice(0, index + 1),
    'EURUSD'
  );

  // Simulations are anchored to the final recorded rate.
  const finalRow = data[data.length - 1];
  const baseRate = finalRow.EURUSD;

  const simulatedRate =
    baseRate * (1 + shockPercent / 100);

  const usdChange =
    1000 * (simulatedRate - baseRate);

  const turbulence =
    historicalMetrics.volatility < bands.calmMax
      ? 'calm'
      : historicalMetrics.volatility < bands.turbulentMin
        ? 'moderate'
        : 'turbulent';

  const historicalMovement =
    historicalMetrics.latestReturn > 0
      ? 'risen against the dollar'
      : historicalMetrics.latestReturn < 0
        ? 'fallen against the dollar'
        : 'stayed unchanged against the dollar';

  // Pip interprets the experience in beginner-friendly language.
  const pipCommentary =
  shockPercent !== 0
    ? `Ooooh! You just simulated a
       ${Math.abs(shockPercent).toFixed(1)}% 
       ${shockPercent > 0 ? 'rise' : 'fall'} in EUR/USD!

       If you held €1,000, its value in dollars
       would be $${Math.abs(usdChange).toFixed(2)}
       ${usdChange > 0 ? 'higher' : 'lower'}.

       See how changing the exchange rate
       also changed the lights and music?`
    : `We're watching real historical exchange rates!

       Every time the euro changes value against
       the dollar, our market picture changes too.

       If the market becomes more turbulent,
       you'll notice the lights becoming more
       energetic and the music sounding different.

       Watch the numbers in "Now Showing" to
       discover what's happening!`;
  function changeShock(value: number) {
    shockRef.current = value;
    setShockPercent(value);
  }

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '24px 20px',
      }}
    >
      <h1>SYNESTHESIA LAB</h1>

      <p>The invisible has a rhythm.</p>

      <p style={{ maxWidth: 650, margin: '20px auto' }}>
        Ever wondered why currencies change value?
        Explore real exchange rates through music,
        glowing visuals and interactive experiments.
      </p>

      <p style={{ fontSize: 14, opacity: 0.75 }}>
        EUR/USD tells you how many US dollars one euro buys.
        We have {data.length.toLocaleString()} historical observations
        to explore.
      </p>

      <AudioControls
        audioEnergyRef={audioEnergyRef}
        marketIntensityRef={marketIntensityRef}
        isMusicPlayingRef={isMusicPlayingRef}
      />

      <VisualCanvas
        data={data}
        audioEnergyRef={audioEnergyRef}
        marketIntensityRef={marketIntensityRef}
        shockRef={shockRef}
        isMusicPlayingRef={isMusicPlayingRef}
        shockPercent={shockPercent}
        onPlaybackIndexChange={handlePlaybackIndexChange}
      />

      <StatusPanel
        shockPercent={shockPercent}
        historicalRow={historicalRow}
        historicalReturn={historicalMetrics.latestReturn}
        historicalVolatility={historicalMetrics.volatility}
        bands={bands}
        baseRate={baseRate}
        baseTimestamp={finalRow.timestamp}
      />

      <Pip
        baseRate={baseRate}
        commentary={pipCommentary}
      />

      <section
        style={{
          maxWidth: 650,
          margin: '40px auto',
          padding: 24,
          borderRadius: 20,
          background: '#211b36',
        }}
      >
        <h2>Market Storm Simulator</h2>

        <p>
          Let's imagine the exchange rate changes suddenly.
          How would that affect someone holding €1,000?
        </p>

        <label htmlFor="shock">
          Change the EUR/USD exchange rate
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
          style={{ width: '100%', marginTop: 20 }}
        />

        <h3>
          {shockPercent > 0 ? '+' : ''}
          {shockPercent.toFixed(1)}%
        </h3>

        <p>
          Starting exchange rate: {baseRate.toFixed(6)}
        </p>

        <p>
          Simulated exchange rate: {simulatedRate.toFixed(6)}
        </p>

        <p>
          Change in dollar value of €1,000:{' '}
          {usdChange >= 0 ? '+' : '-'}$
          {Math.abs(usdChange).toFixed(2)}
        </p>

        <button onClick={() => changeShock(0)}>
          Reset to historical replay
        </button>

        <p style={{ fontSize: 13, opacity: 0.75 }}>
          This experiment uses the last historical exchange
          rate as its starting point. It is not a forecast.
          At 0%, the historical market still affects the music.
        </p>
      </section>
    </main>
  );
}

export default App;
