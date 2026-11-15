import type { FxRow } from './data';

function percentile(sorted: number[], fraction: number): number {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * fraction;
  const low = Math.floor(position);
  return sorted[low] + (sorted[Math.ceil(position)] - sorted[low]) * (position - low);
}

/**
 * Audio-only artistic scaling; never used for prices, financial metrics or geometry.
 * A causal five-observation EMA sets direction. Its historical magnitude distribution
 * (20th to 90th percentile) sets audibility, rather than a hypothetical 2% price scale.
 */
export function buildHistoricalAudio(data: FxRow[]): number[] {
  let average = 0;
  const smoothed = data.map((row, index) => {
    const change = index === 0 ? 0 : Math.log(row.EURUSD / data[index - 1].EURUSD);
    average += (change - average) / 3;
    return average;
  });
  // Match the replay's 20-return warm-up, excluding partial startup windows.
  const magnitudes = smoothed.slice(20).map(Math.abs).sort((a, b) => a - b);
  const quiet = percentile(magnitudes, 0.2);
  const switchThreshold = percentile(magnitudes, 0.35);
  const strong = percentile(magnitudes, 0.9);
  const uniform = strong - quiet <= 1e-12;
  let direction = 0;
  return smoothed.map(value => {
    const size = Math.abs(value);
    if (size < 1e-12 || (!uniform && size <= quiet)) return 0;
    const sign = Math.sign(value);
    // Fade through clarity before adopting a weak opposite trend.
    if (sign !== direction) {
      if (size < switchThreshold) return 0;
      direction = sign;
    }
    const relative = !uniform
      ? Math.max(0, Math.min(1, (size - quiet) / (strong - quiet)))
      : 0.4;
    return direction * 0.9 * Math.pow(relative, 0.7);
  });
}
