import type { FxRow } from './data';

export type CurrencyPair = 'EURUSD' | 'USDJPY' | 'USDSGD';

export function calculateMetrics(
  data: FxRow[],
  pair: CurrencyPair,
  windowSize = 20
) {
  if (data.length < windowSize + 1) {
    throw new Error('Not enough data to calculate metrics');
  }

  const prices = data
    .slice(-(windowSize + 1))
    .map(row => row[pair]);

  const returns = prices.slice(1).map((price, i) =>
    Math.log(price / prices[i])
  );

  const mean =
    returns.reduce((sum, r) => sum + r, 0) / returns.length;

  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) /
    (returns.length - 1);

  return {
    latestReturn: returns[returns.length - 1],
    volatility: Math.sqrt(variance),
  };
}

export type VolatilityBands = {
  calmMax: number;
  turbulentMin: number;
};

export function calculateVolatilityBands(
  data: FxRow[],
  pair: CurrencyPair,
  windowSize = 20
): VolatilityBands {
  if (data.length < windowSize + 1) {
    throw new Error('Not enough observations');
  }

  const returns = data.slice(1).map((row, i) =>
    Math.log(row[pair] / data[i][pair])
  );

  const volatilities: number[] = [];

  for (let end = windowSize - 1; end < returns.length; end++) {
    const window = returns.slice(
      end - windowSize + 1,
      end + 1
    );

    const mean =
      window.reduce((sum, value) => sum + value, 0) /
      window.length;

    const variance =
      window.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      (window.length - 1);

    volatilities.push(Math.sqrt(variance));
  }

  volatilities.sort((a, b) => a - b);

  return {
    calmMax: volatilities[Math.floor(volatilities.length / 3)],
    turbulentMin:
      volatilities[Math.floor((volatilities.length * 2) / 3)],
  };
}