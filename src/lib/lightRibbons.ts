import type { FxRow } from './data';

type Point = {
  x: number;
  y: number;
};

export type RibbonMotion = {
  heights: number[];
  lastTime: number | null;
};

const TAU = Math.PI * 2;
const SAMPLES = 160;

// Keep values within a specified range.
function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

// Repeatable randomness prevents stars from jumping
// to new locations every animation frame.
function random(seed: number): number {
  const value =
    Math.sin(seed * 127.1 + 78.233) * 43758.5453;

  return value - Math.floor(value);
}

// Smoothly sample between recorded exchange rates.
function sampleCurve(
  values: number[],
  progress: number
): number {
  const position = clamp(progress) * (values.length - 1);

  const i = Math.min(
    Math.floor(position),
    values.length - 2
  );

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

// Draw a shiny four-pointed star.
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opacity: number
): void {
  ctx.save();

  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(opacity);

  ctx.fillStyle = '#fffaff';
  ctx.shadowColor = '#e6c0ff';
  ctx.shadowBlur = size * 3;

  ctx.beginPath();

  ctx.moveTo(x, y - size);

  ctx.quadraticCurveTo(
    x + size * 0.15,
    y - size * 0.15,
    x + size,
    y
  );

  ctx.quadraticCurveTo(
    x + size * 0.15,
    y + size * 0.15,
    x,
    y + size
  );

  ctx.quadraticCurveTo(
    x - size * 0.15,
    y + size * 0.15,
    x - size,
    y
  );

  ctx.quadraticCurveTo(
    x - size * 0.15,
    y - size * 0.15,
    x,
    y - size
  );

  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// The main ribbon-rendering function.
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
): void {
  if (data.length < 2 || width <= 0 || height <= 0) {
    return;
  }

  const start = Math.max(0, marketIndex - 79);

  const prices = data
    .slice(start, marketIndex + 1)
    .map(row => row.EURUSD);

  if (prices.length < 2) return;

  

  const energy = clamp(musicEnergy);
  const turbulence = clamp(marketIntensity);
  const seconds = time * 0.001;

  // -------------------------------------------------
  // 1. SMOOTH THE HISTORICAL PRICE SHAPE
  // -------------------------------------------------

  const smoothedPrices = prices.map((price, i) => {
    let sum = 0;
    let weightSum = 0;

    for (
        let j = Math.max(0, i - 3);
        j <= Math.min(prices.length - 1, i + 3);
        j++
    ) {
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

  const targetHeights = Array.from(
    { length: SAMPLES },
    (_, i) => {
      const progress = i / (SAMPLES - 1);

      const price = sampleCurve(
        smoothedPrices,
        progress
      );

      return (
        height * 0.5 -
        ((price - middle) / range) * height * 0.38
      );
    }
  );

  // -------------------------------------------------
  // 2. SMOOTH MOVEMENT BETWEEN ANIMATION FRAMES
  // -------------------------------------------------

  const deltaSeconds =
    motion.lastTime === null
      ? 1 / 60
      : clamp(
          (time - motion.lastTime) / 1000,
          0,
          0.05
        );

  motion.lastTime = time;

  if (motion.heights.length !== SAMPLES) {
    motion.heights = [...targetHeights];
  } else {
    const transitionTime =
      shockPercent !== 0 ? 0.9 : 1.7;

    const easing =
      1 - Math.exp(-deltaSeconds / transitionTime);

    for (let i = 0; i < SAMPLES; i++) {
      motion.heights[i] +=
        (targetHeights[i] - motion.heights[i]) *
        easing;
    }
  }

  // The underlying data curve.
  function pricePoint(progress: number): Point {
    const bounded = clamp(progress);

    const position = bounded * (SAMPLES - 1);

    const index = Math.min(
      Math.floor(position),
      SAMPLES - 2
    );

    const fraction = position - index;

    const y =
      motion.heights[index] +
      (
        motion.heights[index + 1] -
        motion.heights[index]
      ) * fraction;

    return {
      x: width * (0.05 + bounded * 0.9),
      y,
    };
  }

  // The gentle decorative motion around the data.
  function ribbonPoint(
    progress: number,
    layer: number
  ): Point {
    const base = pricePoint(progress);

    const slowWave =
      Math.sin(
        progress * 8 -
        seconds * 0.24 +
        layer * 1.4
      ) * (8 + energy * 4);

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

  // -------------------------------------------------
  // 3. SOFT GALACTIC BACKGROUND
  // -------------------------------------------------

  ctx.globalCompositeOperation = 'lighter';

  const haze = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    0,
    width * 0.5,
    height * 0.5,
    width * 0.65
  );

  haze.addColorStop(0, 'rgba(130,85,220,0.09)');
  haze.addColorStop(0.5, 'rgba(70,105,185,0.035)');
  haze.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.globalAlpha = 1;
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  // -------------------------------------------------
  // 4. TWINKLING STARFIELD
  // -------------------------------------------------

  for (let i = 0; i < 170; i++) {
    const x = random(i + 1) * width;
    const y = random(i + 500) * height;

    const twinkle =
      0.25 +
      0.45 * (
        0.5 +
        0.5 * Math.sin(
          seconds * (0.5 + random(i + 50)) + i
        )
      );

    if (i % 27 === 0) {
      drawSparkle(ctx, x, y, 2.6, twinkle);
    } else {
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#d5dbff';

      ctx.beginPath();
      ctx.arc(
        x,
        y,
        0.35 + random(i + 900) * 0.7,
        0,
        TAU
      );
      ctx.fill();
    }
  }

  // -------------------------------------------------
  // 5. IRIDESCENT COLOUR GRADIENT
  // -------------------------------------------------

  const colour = ctx.createLinearGradient(
    width * 0.05,
    0,
    width * 0.95,
    0
  );

  colour.addColorStop(0, '#69e6ff');
  colour.addColorStop(0.25, '#a8b2ff');
  colour.addColorStop(0.5, '#e4b5ff');
  colour.addColorStop(0.75, '#ff9edc');
  colour.addColorStop(1, '#83eaff');

  // Save the positions of the finished ribbons
  // so glitter can follow their surfaces.
  const ribbonLayers: {
    centres: Point[];
    normals: Point[];
  }[] = [];

  // -------------------------------------------------
  // 6. BUILD TWO FLOWING RIBBON SURFACES
  // -------------------------------------------------

  for (let layer = 0; layer < 2; layer++) {
    const upper: Point[] = [];
    const lower: Point[] = [];
    const centre: Point[] = [];
    const normals: Point[] = [];

    // Calculate the geometry.
    for (let i = 0; i < SAMPLES; i++) {
      const progress = i / (SAMPLES - 1);

      const point = ribbonPoint(
        progress,
        layer
      );

      const step = 1 / (SAMPLES - 1);

      const before = ribbonPoint(
        Math.max(0, progress - step),
        layer
      );

      const after = ribbonPoint(
        Math.min(1, progress + step),
        layer
      );

      const dx = after.x - before.x;
      const dy = after.y - before.y;

      const length = Math.hypot(dx, dy) || 1;

      // Normal = direction perpendicular to the curve.
      const nx = -dy / length;
      const ny = dx / length;

      normals.push({
        x: nx,
        y: ny,
      });

      const twist = Math.sin(
        progress * 9 -
        seconds * 0.45 +
        layer * 1.7
      );

      const halfWidth =
        (23 + turbulence * 13) *
        (0.32 + 0.68 * Math.abs(twist));

      const layerShift =
        layer === 0
          ? -7 - 9 * twist
          : 7 + 9 * twist;

      const centerX = point.x + nx * layerShift;
      const centerY = point.y + ny * layerShift;

      // Store centre points.
      centre.push({
        x: centerX,
        y: centerY,
      });

      // Store both edges of the fabric.
      upper.push({
        x: centerX + nx * halfWidth,
        y: centerY + ny * halfWidth,
      });

      lower.push({
        x: centerX - nx * halfWidth,
        y: centerY - ny * halfWidth,
      });
    }

    // All four arrays now contain SAMPLES points.
    ribbonLayers.push({
      centres: centre,
      normals,
    });

    // Construct the filled ribbon surface.
    ctx.beginPath();

    upper.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    for (let i = lower.length - 1; i >= 0; i--) {
      ctx.lineTo(lower[i].x, lower[i].y);
    }

    ctx.closePath();

    // Translucent fabric body.
    ctx.globalAlpha =
      layer === 0 ? 0.23 : 0.16;

    ctx.fillStyle = colour;
    ctx.shadowColor =
      layer === 0 ? '#91dfff' : '#efabef';

    ctx.shadowBlur = 20;
    ctx.fill();

    // -----------------------------------------------
    // 7. SHINY FILAMENTS THROUGH THE FABRIC
    // -----------------------------------------------

    for (let strand = -2; strand <= 2; strand++) {
      ctx.beginPath();

      for (let i = 0; i < SAMPLES; i++) {
        const progress = i / (SAMPLES - 1);

        const base = centre[i];
        const normal = normals[i];

        const ripple = Math.sin(
          progress * 18 -
          seconds * 1.2 +
          strand * 0.8
        );

        const offset =
          strand * 4 +
          ripple * (1.2 + energy * 2.8);

        const x = base.x + normal.x * offset;
        const y = base.y + normal.y * offset;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle =
        strand === 0 ? '#fff0ff' : colour;

      ctx.globalAlpha =
        strand === 0
          ? 0.36 + energy * 0.2
          : 0.13 + energy * 0.12;

      ctx.lineWidth =
        strand === 0 ? 1.2 : 0.65;

      ctx.shadowColor = '#e9c8ff';
      ctx.shadowBlur =
        strand === 0 ? 12 : 5;

      ctx.stroke();
    }
  }

  // -------------------------------------------------
  // 8. MOVING GLITTER ON THE RIBBON SURFACES
  // -------------------------------------------------

  ctx.shadowBlur = 0;

  for (let i = 0; i < 370; i++) {
    const progress =
      (
        random(i + 250) +
        seconds * (0.002 + energy * 0.004)
      ) % 1;

    const layer = i % 2;
    const ribbon = ribbonLayers[layer];

    const position = progress * (SAMPLES - 1);

    const index = Math.min(
      Math.floor(position),
      SAMPLES - 2
    );

    const fraction = position - index;

    const a = ribbon.centres[index];
    const b = ribbon.centres[index + 1];

    const normal = ribbon.normals[index];

    // Interpolate between nearby points.
    const centerX =
      a.x + (b.x - a.x) * fraction;

    const centerY =
      a.y + (b.y - a.y) * fraction;

    const across =
      random(i + 720) * 2 - 1;

    const offset =
      across * (16 + turbulence * 10);

    const x =
      centerX + normal.x * offset;

    const y =
      centerY + normal.y * offset;

    const shimmer =
      0.5 +
      0.5 * Math.sin(
        seconds * (2 + energy * 5) +
        i * 1.7
      );

    const alpha = clamp(
      0.22 +
      shimmer * (0.35 + energy * 0.35)
    );

    const radius =
      0.3 +
      random(i + 1100) *
      (0.9 + energy);

    if (i % 23 === 0) {
      drawSparkle(
        ctx,
        x,
        y,
        2.5 + shimmer * 3.5,
        alpha
      );
    } else {
      ctx.globalAlpha = alpha;

      ctx.fillStyle =
        i % 3 === 0
          ? '#ffe1f6'
          : i % 3 === 1
            ? '#bdf5ff'
            : '#ffffff';

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }
  }

  // -------------------------------------------------
  // 9. A FEW BRILLIANT TRAVELLING HIGHLIGHTS
  // -------------------------------------------------

  for (let i = 0; i < 7; i++) {
    const progress =
      (
        random(i + 2000) +
        seconds * 0.013
      ) % 1;

    const layer = i % 2;
    const ribbon = ribbonLayers[layer];

    const index = Math.min(
      Math.floor(progress * (SAMPLES - 1)),
      SAMPLES - 1
    );

    const point = ribbon.centres[index];

    drawSparkle(
      ctx,
      point.x,
      point.y,
      3 + energy * 3,
      0.45 + energy * 0.45
    );
  }

  // -------------------------------------------------
  // 10. SUBTLE HISTORICAL PRICE SPINE
  // -------------------------------------------------

  ctx.beginPath();

  for (let i = 0; i < SAMPLES; i++) {
    const point = pricePoint(
      i / (SAMPLES - 1)
    );

    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }

  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#f8f3ff';
  ctx.lineWidth = 0.7;
  ctx.shadowBlur = 0;
  ctx.stroke();

  // -------------------------------------------------
  // 11. SIMULATED MARKET SHOCK SPARKLE
  // -------------------------------------------------

  
if (shockPercent !== 0) {
  const endpoint = pricePoint(1);

  const power = clamp(Math.abs(shockPercent) / 2);
  const direction = Math.sign(shockPercent);

  const burstRadius = 24 + power * 45;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // A soft glow around the historical endpoint.
  const glow = ctx.createRadialGradient(
    endpoint.x,
    endpoint.y,
    0,
    endpoint.x,
    endpoint.y,
    burstRadius
  );

  const colour =
    direction > 0
      ? '135,235,255'
      : '255,155,218';

  glow.addColorStop(
    0,
    `rgba(${colour},0.38)`
  );

  glow.addColorStop(
    0.4,
    `rgba(${colour},0.15)`
  );

  glow.addColorStop(
    1,
    `rgba(${colour},0)`
  );

  ctx.globalAlpha = 1;
  ctx.fillStyle = glow;

  ctx.beginPath();
  ctx.arc(
    endpoint.x,
    endpoint.y,
    burstRadius,
    0,
    TAU
  );
  ctx.fill();

  // Directional glitter:
  // upward for a positive change,
  // downward for a negative change.
  for (let i = 0; i < 24; i++) {
    const spread = random(i + 3000) * 50 - 25;
    const distance = random(i + 4000) * burstRadius;

    const x = endpoint.x + spread;
    const y = endpoint.y - direction * distance;

    const shimmer =
      0.45 +
      0.35 * Math.sin(seconds * 3 + i);

    drawSparkle(
      ctx,
      x,
      y,
      1.5 + random(i + 5000) * 3,
      shimmer
    );
  }

  // The main brilliant endpoint.
  drawSparkle(
    ctx,
    endpoint.x,
    endpoint.y,
    6 + power * 7,
    0.95
  );

  ctx.restore();
}


  ctx.restore();
}
