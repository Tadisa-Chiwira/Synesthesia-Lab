import type { FxRow } from './data';

type Point = { x: number; y: number };
export type RibbonMotion = {
  heights: number[];
  lastTime: number | null;
};

const TAU = Math.PI * 2;

function random(seed: number) {
  const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

// Smoothly interpolate between historical price observations.
function sampleCurve(values: number[], progress: number) {
  const position = progress * (values.length - 1);
  const i = Math.min(Math.floor(position), values.length - 2);
  const t = position - i;

  const p0 = values[Math.max(0, i - 1)];
  const p1 = values[i];
  const p2 = values[i + 1];
  const p3 = values[Math.min(values.length - 1, i + 2)];

  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  );
}

function sparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = clamp(opacity);
  ctx.fillStyle = '#fffaff';
  ctx.shadowColor = '#e6bfff';
  ctx.shadowBlur = size * 3;

  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.13, y - size * 0.13, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.13, y + size * 0.13, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.13, y + size * 0.13, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.13, y - size * 0.13, x, y - size);
  ctx.fill();

  ctx.restore();
}

export function drawLightRibbons(
  ctx: CanvasRenderingContext2D,
  data: FxRow[],
  marketIndex: number,
  width: number,
  height: number,
  time: number,
  musicEnergy: number,
  marketIntensity: number,
  shockPercent: number,
  motion: RibbonMotion
) {
  const start = Math.max(0, marketIndex - 79);

  const prices = data
    .slice(start, marketIndex + 1)
    .map(row => row.EURUSD);

  if (prices.length < 2) return;

  if (shockPercent !== 0) {
    const last = prices[prices.length - 1];
    prices.push(last * (1 + shockPercent / 100));
  }

  
  // Soften small price fluctuations without changing
  // the actual data or financial calculations.
  const smoothedPrices = prices.map((price, i) => {
    if (shockPercent !== 0 && i === prices.length - 1) {
      return price;
    }

    let sum = 0;
    let weightSum = 0;

    for (
      let j = Math.max(0, i - 3);
      j <= Math.min(prices.length - 1, i + 3);
      j++
    ) {
      // Keep the hypothetical final point separate
      // from the historical smoothing calculation.
      if (shockPercent !== 0 && j === prices.length - 1) {
        continue;
      }

      const weight = 4 - Math.abs(j - i);

      sum += prices[j] * weight;
      weightSum += weight;
    }

    return sum / weightSum;
  });

  const minPrice = Math.min(...smoothedPrices);
  const maxPrice = Math.max(...smoothedPrices);
  const middle = (minPrice + maxPrice) / 2;
  const range = Math.max(maxPrice - minPrice, 0.0005);

  const energy = clamp(musicEnergy);
  const turbulence = clamp(marketIntensity);
  const seconds = time * 0.001;

  const samples = 160;

  // Calculate where the current data wants the ribbon to be.
  const targetHeights = Array.from(
    { length: samples },
    (_, i) => {
      const progress = i / (samples - 1);
      const price = sampleCurve(smoothedPrices, progress);

      return (
        height * 0.5 -
        ((price - middle) / range) * height * 0.38
      );
    }
  );

  // Calculate elapsed time so animation speed is
  // consistent on different monitors.
  const deltaSeconds =
    motion.lastTime === null
      ? 1 / 60
      : Math.max(
          0,
          Math.min((time - motion.lastTime) / 1000, 0.05)
        );

  motion.lastTime = time;

  if (motion.heights.length !== samples) {
    motion.heights = [...targetHeights];
  } else {
    // Gently approach the new shape instead of snapping.
    const transitionTime = shockPercent !== 0 ? 0.9 : 1.7;

    const easing =
      1 - Math.exp(-deltaSeconds / transitionTime);

    for (let i = 0; i < samples; i++) {
      motion.heights[i] +=
        (targetHeights[i] - motion.heights[i]) * easing;
    }
  }

  // Draw from the smoothly transitioning shape.
  function pricePoint(progress: number): Point {
    const boundedProgress = clamp(progress);
    const position = boundedProgress * (samples - 1);

    const index = Math.min(
      Math.floor(position),
      samples - 2
    );

    const fraction = position - index;

    const y =
      motion.heights[index] +
      (motion.heights[index + 1] - motion.heights[index]) *
      fraction;

    return {
      x: width * (0.05 + boundedProgress * 0.9),
      y,
    };
  }


  // Decorative motion sits around the price-driven curve.
  function ribbonPoint(
    progress: number,
    layer: number
    ): Point {
    const base = pricePoint(progress);

    // Broad, slow movement like flowing fabric.
    const slowWave =
        Math.sin(
        progress * 8 -
        seconds * 0.24 +
        layer * 1.4
        ) * (8 + energy * 4);

    // Very subtle ripples driven by market turbulence.
    const fineWave =
        Math.sin(
        progress * 15 +
        seconds * 0.38 +
        layer * 2.2
        ) * (2 + turbulence * 2);

    return {
        x: base.x,
        y: base.y + slowWave + fineWave,
    };
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // A faint, atmospheric nebula.
  const haze = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    0,
    width * 0.5,
    height * 0.5,
    width * 0.6
  );

  haze.addColorStop(0, 'rgba(125,80,220,0.11)');
  haze.addColorStop(0.5, 'rgba(60,95,180,0.045)');
  haze.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  // A dense, delicate starfield.
  for (let i = 0; i < 170; i++) {
    const x = random(i + 1) * width;
    const y = random(i + 500) * height;

    const twinkle =
      0.25 + 0.45 * (
        0.5 + 0.5 *
        Math.sin(seconds * (0.5 + random(i + 50)) + i)
      );

    if (i % 27 === 0) {
      sparkle(ctx, x, y, 2.6, twinkle);
    } else {
      ctx.fillStyle = `rgba(207,215,255,${twinkle})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.35 + random(i + 900) * 0.7, 0, TAU);
      ctx.fill();
    }
  }

  // Gradient shared by all ribbon layers.
  const colour = ctx.createLinearGradient(
    width * 0.05, 0, width * 0.95, 0
  );

  colour.addColorStop(0, '#58dfff');
  colour.addColorStop(0.28, '#a7a1ff');
  colour.addColorStop(0.58, '#f4a3ef');
  colour.addColorStop(0.82, '#a68dff');
  colour.addColorStop(1, '#79eaff');


  // Two overlapping translucent bands rather than
  // three rigid, parallel lines.
  for (let layer = 0; layer < 2; layer++) {
    const upper: Point[] = [];
    const lower: Point[] = [];
    const centre: Point[] = [];

    for (let i = 0; i < samples; i++) {
      const progress = i / (samples - 1);
      const point = ribbonPoint(progress, layer);

      // Varying width gives the ribbon a twisting effect.
      const twist = Math.sin(
        progress * 12 -
        seconds * 0.75 +
        layer * 1.7
      );

      const halfWidth =
        (12 + turbulence * 11) *
        (0.3 + 0.7 * Math.abs(twist));

      const layerShift =
        layer === 0
          ? -5 - 7 * twist
          : 5 + 9 * twist;

      centre.push({
        x: point.x,
        y: point.y + layerShift,
      });

      upper.push({
        x: point.x,
        y: point.y + layerShift - halfWidth,
      });

      lower.push({
        x: point.x,
        y: point.y + layerShift + halfWidth,
      });
    }

    // Construct the translucent ribbon surface.
    ctx.beginPath();

    upper.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });

    lower.slice().reverse().forEach(point => {
      ctx.lineTo(point.x, point.y);
    });

    ctx.closePath();

    ctx.globalAlpha = layer === 0 ? 0.18 : 0.11;
    ctx.fillStyle = colour;
    ctx.shadowColor =
      layer === 0 ? '#90dfff' : '#ef9fe5';
    ctx.shadowBlur = 22;
    ctx.fill();

    // Fine, glossy filaments running through the fabric.
    for (let strand = -2; strand <= 2; strand++) {
      ctx.beginPath();

      for (let i = 0; i < samples; i++) {
        const fraction = i / (samples - 1);

        const base = centre[i];
        const ripple = Math.sin(
          fraction * 18 -
          seconds * 1.2 +
          strand * 0.8
        );

        const y =
          base.y +
          strand * 4 +
          ripple * (1.2 + energy * 2.8);

        if (i === 0) ctx.moveTo(base.x, y);
        else ctx.lineTo(base.x, y);
      }

      ctx.strokeStyle =
        strand === 0 ? '#f7eaff' : colour;

      ctx.globalAlpha =
        strand === 0
          ? 0.34 + energy * 0.2
          : 0.12 + energy * 0.12;

      ctx.lineWidth = strand === 0 ? 1.2 : 0.55;
      ctx.shadowBlur = strand === 0 ? 12 : 5;
      ctx.stroke();
    }
  }

  // Hundreds of tiny travelling glitter points.
  // These make the ribbon feel like a stream of stardust.
  ctx.shadowBlur = 0;

  for (let i = 0; i < 290; i++) {
    const progress =
      (random(i + 250) +
        seconds * (0.002 + energy * 0.004)) % 1;

    const layer = i % 2;
    const base = ribbonPoint(progress, layer);

    const across = random(i + 720) * 2 - 1;

    const y =
      base.y +
      across * (17 + turbulence * 12);

    const shimmer =
      0.5 + 0.5 *
      Math.sin(seconds * (2 + energy * 5) + i * 1.7);

    const alpha =
      0.22 + shimmer * (0.35 + energy * 0.35);

    const radius =
      0.3 + random(i + 1100) * (0.9 + energy);

    if (i % 29 === 0) {
      sparkle(
        ctx,
        base.x,
        y,
        2.5 + shimmer * 3.5,
        alpha
      );
    } else {
      ctx.fillStyle =
        i % 3 === 0 ? '#ffe1f6' :
        i % 3 === 1 ? '#bdf5ff' : '#ffffff';

      ctx.globalAlpha = clamp(alpha);
      ctx.beginPath();
      ctx.arc(base.x, y, radius, 0, TAU);
      ctx.fill();
    }
  }

  // Very bright highlights drifting along the ribbon.
  for (let i = 0; i < 7; i++) {
    const progress =
      (random(i + 2000) + seconds * 0.013) % 1;

    const point = ribbonPoint(progress, i % 2);

    sparkle(
      ctx,
      point.x,
      point.y,
      3 + energy * 3,
      0.45 + energy * 0.45
    );
  }

  // Retain the data-driven spine as a subtle reference.
  ctx.beginPath();

  for (let i = 0; i < samples; i++) {
    const point = pricePoint(i / (samples - 1));

    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }

  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#f8f3ff';
  ctx.lineWidth = 0.7;
  ctx.shadowBlur = 0;
  ctx.stroke();

  // Distinctive burst at the simulated endpoint.
  if (shockPercent !== 0) {
    const endpoint = pricePoint(1);

    sparkle(
      ctx,
      endpoint.x,
      endpoint.y,
      6 + Math.abs(shockPercent) * 5,
      0.85
    );
  }

  ctx.restore();
}
