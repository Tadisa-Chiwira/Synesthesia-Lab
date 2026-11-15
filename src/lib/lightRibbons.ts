import { drawAdditionalMoons } from './decorativeMoons';
import type { FxRow } from './data';

type Point = {
  x: number;
  y: number;
};

export type RibbonMotion = {
  heights: number[];
  lastTime: number | null;
  shock?: number;
  flowTime?: number;
  priceBounds?: { data: FxRow[]; min: number; max: number };
};

const TAU = Math.PI * 2;
const SAMPLES = 160;

function taper(progress: number): number {
  const edge = clamp(Math.min(progress, 1 - progress) / 0.14);
  return edge * edge * (3 - 2 * edge);
}

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

  return values[i] + (values[i + 1] - values[i]) * t;
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
  motion: RibbonMotion,
  reducedMotion = false
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
  const historicalTurbulence = clamp(marketIntensity);
  const seconds = reducedMotion ? 0 : time * 0.001;

  // -------------------------------------------------
  // 1. SMOOTH THE HISTORICAL PRICE SHAPE
  // -------------------------------------------------

  // Fixed dataset bounds prevent the viewport from rescaling at each observation.
  // Fabric smoothing is artistic; displayed prices always use exact observations.
  if (motion.priceBounds?.data !== data) {
    let min = Infinity;
    let max = -Infinity;
    for (const row of data) { min = Math.min(min, row.EURUSD); max = Math.max(max, row.EURUSD); }
    motion.priceBounds = { data, min, max };
  }
  const smoothedPrices = prices;
  const middle = (motion.priceBounds.min + motion.priceBounds.max) / 2;
  const range = Math.max(motion.priceBounds.max - motion.priceBounds.min, 0.0005);

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

  if (reducedMotion || motion.heights.length !== SAMPLES) {
    motion.heights = [...targetHeights];
  } else {
    const transitionTime =
      0.65;

    const easing =
      1 - Math.exp(-deltaSeconds / transitionTime);

    for (let i = 0; i < SAMPLES; i++) {
      motion.heights[i] +=
        (targetHeights[i] - motion.heights[i]) *
        easing;
    }
  }

  motion.heights[SAMPLES - 1] = targetHeights[SAMPLES - 1];

  // Smooth slider changes and integrate phase so changing intensity never jumps the wave.
  const shockTarget = clamp(shockPercent / 2, -1, 1);
  motion.shock = reducedMotion ? shockTarget :
    (motion.shock ?? 0) + (shockTarget - (motion.shock ?? 0)) * (1 - Math.exp(-deltaSeconds / 0.65));
  const signedShock = motion.shock;
  const shockPower = Math.abs(signedShock);
  const turbulence = clamp(historicalTurbulence + shockPower * 0.22);
  const amplitude = 1 + shockPower * 2.1;
  motion.flowTime = (motion.flowTime ?? 0) +
    (reducedMotion ? 0 : deltaSeconds * (1 + turbulence * 0.18 + shockPower * 0.18));
  const flowTime = motion.flowTime;

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

    // A shared broad wave keeps translucent fabric layers reading as one ribbon.
    // This is an artistic simulation response, not a hypothetical historical price.
    const envelope = taper(progress);
    const slowWave = Math.sin(progress * 7 - flowTime * 0.28) *
      height * (0.012 + historicalTurbulence * 0.017) * amplitude;
    const fineWave = Math.sin(progress * 15 + flowTime * 0.38 + layer * 0.65) *
      height * (0.003 + turbulence * 0.005);
    const buoyancy = -signedShock * height * 0.045;
    return {
      x: base.x,
      y: base.y + envelope * (slowWave + fineWave + buoyancy),
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

  // Original decorative crescents, deliberately outside the data band.
  for (const [u, v, radius, rotation] of [[0.17, 0.14, 10, -0.4], [0.76, 0.86, 14, 0.5]]) {
    ctx.save();
    ctx.translate(width * u, height * v);
    ctx.rotate(rotation);
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#e5dcf5';
    ctx.shadowColor = '#cbb3ef';
    ctx.shadowBlur = 9;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2);
    // The inner limb curves inside the disk, leaving a slender filled crescent.
    ctx.bezierCurveTo(radius * 0.78, radius * 0.62, radius * 0.78, -radius * 0.62, 0, -radius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    drawSparkle(ctx, width * u + radius * 1.9, height * v - radius, 2, 0.35);
  }

  drawAdditionalMoons(ctx, width, height);

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

  const baseline = [[105, 230, 255], [168, 178, 255], [228, 181, 255], [255, 158, 220], [131, 234, 255]];
  const positive = [[139, 244, 255], [172, 225, 255], [222, 204, 255], [185, 192, 255], [166, 248, 255]];
  const negative = [[172, 135, 239], [197, 142, 241], [231, 153, 221], [245, 147, 204], [165, 143, 232]];
  const palette = baseline.map((rgb, i) => rgb.map((channel, j) =>
    Math.round(channel + ((signedShock >= 0 ? positive : negative)[i][j] - channel) * shockPower)
  ));
  colour.addColorStop(0, `rgba(${palette[0].join(',')},0)`);
  [0.12, 0.25, 0.5, 0.75, 0.88].forEach((stop, i) =>
    colour.addColorStop(stop, `rgb(${palette[i].join(',')})`)
  );
  colour.addColorStop(1, `rgba(${palette[4].join(',')},0)`);

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
        flowTime * 0.38 +
        layer * 1.7
      );

      const halfWidth =
        taper(progress) * (18 + turbulence * 19) *
        (0.32 + 0.68 * Math.abs(twist));

      const layerShift = taper(progress) * (layer === 0 ? -7 - 9 * twist : 7 + 9 * twist);

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
      (layer === 0 ? 0.23 : 0.16) * (1 + Math.max(0, signedShock) * 0.12);

    ctx.fillStyle = colour;
    ctx.shadowColor =
      signedShock < 0 ? '#c68ce9' : '#a5e6ff';

    ctx.shadowBlur = 18 + energy * (0.5 + 0.5 * Math.sin(seconds * 1.8)) * 6;
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
          flowTime * 0.85 +
          strand * 0.8
        );

        const offset =
          taper(progress) * (strand * 4 +
          ripple * (1.2 + turbulence * 2.8));

        const x = base.x + normal.x * offset;
        const y = base.y + normal.y * offset;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle =
        colour;

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
        seconds * (0.002 + turbulence * 0.004)
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
      taper(progress) * across * (12 + turbulence * 14);

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
      taper(progress) * (0.12 + shimmer * (0.25 + energy * 0.35))
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
      taper(progress) * (0.25 + energy * 0.45)
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
  ctx.strokeStyle = colour;
  ctx.lineWidth = 0.7;
  ctx.shadowBlur = 0;
  ctx.stroke();

  ctx.restore();
}
