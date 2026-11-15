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

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC';
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

  const displayedRate = isSimulating
    ? baseRate * (1 + shockPercent / 100)
    : historicalRow.EURUSD;

  const dollarChange = 1000 * (displayedRate - baseRate);

  const turbulence =
    historicalVolatility < bands.calmMax
      ? 'Calm'
      : historicalVolatility < bands.turbulentMin
        ? 'A little restless'
        : 'Turbulent';

  const movement =
    historicalReturn > 0
      ? 'The euro moved up against the dollar.'
      : historicalReturn < 0
        ? 'The euro moved down against the dollar.'
        : 'The exchange rate stayed unchanged.';

  return (
    <section className="status-widget">
      <div className="status-header">
        <span className="stage-kicker">Now Showing</span>
        <span className="status-mode">
          {isSimulating ? 'Imagined' : 'Recorded'}
        </span>
      </div>

      <p className="status-rate-caption">
        One euro is worth
      </p>

      <div className="status-big-rate">
        ${displayedRate.toFixed(4)}
      </div>

      <p className="status-timestamp">
        {formatTime(
          isSimulating
            ? baseTimestamp
            : historicalRow.timestamp
        )}
      </p>

      <div className="status-divider" />

      {isSimulating ? (
        <>
          <p className="status-description">
            You imagined the euro{' '}
            {shockPercent > 0
              ? 'getting stronger'
              : 'getting weaker'}.
          </p>

          <div className="status-highlight">
            €1,000 is worth{' '}
            <strong>
              ${Math.abs(dollarChange).toFixed(2)}
            </strong>{' '}
            {dollarChange >= 0 ? 'more' : 'less'} in dollars.
          </div>

          <p className="status-small-note">
            This is a pretend change, not a prediction.
          </p>
        </>
      ) : (
        <>
          <div className="status-energy">
            <span>Market movement</span>
            <strong>{turbulence}</strong>
          </div>

          <div className="energy-track">
            <div
              className="energy-fill"
              style={{
                width:
                  turbulence === 'Calm'
                    ? '25%'
                    : turbulence === 'A little restless'
                      ? '55%'
                      : '90%',
              }}
            />
          </div>

          <p className="status-description">
            {movement}
          </p>
        </>
      )}

      <details className="status-details">
        <summary>What does this mean?</summary>

        <p>
          An exchange rate tells us how much one
          currency is worth in another currency.
          EUR/USD compares euros with US dollars.
        </p>

        {isSimulating ? (
          <p>
            We started at ${baseRate.toFixed(4)} per euro
            and imagined a {Math.abs(shockPercent).toFixed(1)}%
            {' '}change. Your euros stayed the same,
            but their dollar value changed.
          </p>
        ) : (
          <p>
            Market turbulence means how much the rate
            has been jumping around recently. We compare
            the last 20 recorded changes with the rest
            of this historical dataset.
            The measured volatility is{' '}
            {(historicalVolatility * 100).toFixed(4)}%.
          </p>
        )}
      </details>
    </section>
  );
}
