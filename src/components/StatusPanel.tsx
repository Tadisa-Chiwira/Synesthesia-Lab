import type { FxRow } from '../lib/data';
import type { VolatilityBands } from '../lib/metrics';

type Props = {
  shockPercent: number;
  historicalRow: FxRow;
  historicalReturn: number;
  historicalVolatility: number;
  bands: VolatilityBands;
  baseRate: number;
  baseTimestamp: string;
};

function formatUtc(timestamp: string) {
  return (
    new Date(timestamp).toLocaleString('en-GB', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    }) + ' UTC'
  );
}

export default function StatusPanel({
  shockPercent,
  historicalRow,
  historicalReturn,
  historicalVolatility,
  bands,
  baseRate,
  baseTimestamp,
}: Props) {
  const isSimulating = shockPercent !== 0;

  const turbulence =
    historicalVolatility < bands.calmMax
      ? 'Calm'
      : historicalVolatility < bands.turbulentMin
        ? 'Moderate'
        : 'Turbulent';

  const direction =
    historicalReturn > 0
      ? 'The euro strengthened against the dollar'
      : historicalReturn < 0
        ? 'The euro weakened against the dollar'
        : 'The exchange rate stayed unchanged';

  const simulatedRate = baseRate * (1 + shockPercent / 100);
  const dollarChange = 1000 * (simulatedRate - baseRate);

  return (
    <section
      style={{
        maxWidth: 720,
        margin: '28px auto',
        padding: 24,
        borderRadius: 20,
        background: '#171327',
        border: '1px solid rgba(220,180,255,0.2)',
        textAlign: 'left',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Now Showing</h2>

      {isSimulating ? (
        <>
          <p>
            <strong>Mode:</strong> Hypothetical experiment
          </p>

          <p>
            We're imagining that the exchange rate suddenly
            changes. This is not a prediction.
          </p>

          <p>
            <strong>Starting point:</strong>{' '}
            {formatUtc(baseTimestamp)}
          </p>

          <p>
            <strong>Before the shock:</strong> €1 buys $
            {baseRate.toFixed(6)}
          </p>

          <p>
            <strong>Your simulated change:</strong>{' '}
            {shockPercent > 0 ? '+' : ''}
            {shockPercent.toFixed(1)}%
          </p>

          <p>
            <strong>After the shock:</strong> €1 buys $
            {simulatedRate.toFixed(6)}
          </p>

          <p>
            <strong>Effect on €1,000:</strong>{' '}
            {dollarChange >= 0 ? '+' : '-'}$
            {Math.abs(dollarChange).toFixed(2)}
          </p>

          <p style={{ opacity: 0.8, fontSize: 14 }}>
            We are changing the exchange rate in a pretend
            scenario. The amount of euros stays the same,
            but their value in US dollars changes.
          </p>
        </>
      ) : (
        <>
          <p>
            <strong>Mode:</strong> Replay of real market data
          </p>

          <p>
            <strong>When:</strong>{' '}
            {formatUtc(historicalRow.timestamp)}
          </p>

          <p>
            <strong>Exchange rate:</strong> €1 buys $
            {historicalRow.EURUSD.toFixed(6)}
          </p>

          <p>
            <strong>Recent price move:</strong>{' '}
            {historicalReturn > 0 ? '+' : ''}
            {(historicalReturn * 100).toFixed(4)}%
          </p>

          <p>
            <strong>What changed:</strong> {direction}.
          </p>

          <p>
            <strong>Market turbulence:</strong> {turbulence}
          </p>

          <p>
            <strong>Measured volatility:</strong>{' '}
            {(historicalVolatility * 100).toFixed(4)}%
          </p>

          <p style={{ opacity: 0.8, fontSize: 14 }}>
            Turbulence describes how much the exchange rate
            has been jumping around recently. Our categories
            compare the last 20 recorded price changes with
            the rest of this dataset.
          </p>

          <p style={{ opacity: 0.8, fontSize: 14 }}>
            At 0% simulated shock, the historical market
            still affects the particles and the music.
          </p>
        </>
      )}
    </section>
  );
}