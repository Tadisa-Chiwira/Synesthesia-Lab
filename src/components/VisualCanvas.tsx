import { useEffect, useRef, type RefObject } from 'react';
import type { FxRow } from '../lib/data';
import {
  drawLightRibbons,
  type RibbonMotion,
} from '../lib/lightRibbons';
type Props = {
  data: FxRow[];
  audioEnergyRef: RefObject<number>;
  marketIntensityRef: RefObject<number>;
  shockRef: RefObject<number>;
  isMusicPlayingRef: RefObject<boolean>;
  shockPercent: number;
  onPlaybackIndexChange: (index: number) => void;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  colour: number;
};

// Create a reusable glowing texture.
function makeGlowSprite(r: number, g: number, b: number) {
  const sprite = document.createElement('canvas');
  sprite.width = 128;
  sprite.height = 128;

  const ctx = sprite.getContext('2d')!;
  const glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);

  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.08, `rgba(${r},${g},${b},1)`);
  glow.addColorStop(0.25, `rgba(${r},${g},${b},0.65)`);
  glow.addColorStop(0.55, `rgba(${r},${g},${b},0.15)`);
  glow.addColorStop(1, `rgba(${r},${g},${b},0)`);

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);

  return sprite;
}

export default function VisualCanvas({ data, audioEnergyRef, marketIntensityRef, shockRef, isMusicPlayingRef, shockPercent, onPlaybackIndexChange,}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 21) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Log returns from the real EUR/USD observations.
    const returns = data.map((row, i) =>
      i === 0 ? 0 : Math.log(row.EURUSD / data[i - 1].EURUSD)
    );

    // Rolling volatility over 20 returns.
    const volatility = returns.map((_, i) => {
      const window = returns.slice(Math.max(1, i - 19), i + 1);

      if (window.length < 2) return 0;

      const mean =
        window.reduce((sum, value) => sum + value, 0) /
        window.length;

      const variance =
        window.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        (window.length - 1);

      return Math.sqrt(variance);
    });

    // Scale volatility relative to the historical dataset.
    const sorted = volatility.slice(20).sort((a, b) => a - b);
    const low = sorted[Math.floor(sorted.length * 0.1)];
    const high = sorted[Math.floor(sorted.length * 0.9)];

    const sprites = [
      makeGlowSprite(70, 220, 255),   // Cyan
      makeGlowSprite(175, 120, 255),  // Violet
      makeGlowSprite(255, 110, 190),  // Pink
      makeGlowSprite(255, 200, 105),  // Gold
    ];

    let width = 1;
    let height = 1;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);

      canvas!.width = Math.round(width * ratio);
      canvas!.height = Math.round(height * ratio);

      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx!.fillStyle = '#050713';
      ctx!.fillRect(0, 0, width, height);
    }

    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = Array.from(
      { length: 120 },
      () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0.4 + Math.random() * 1.1,
        vy: (Math.random() - 0.5) * 0.9,
        size: 4 + Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
        colour: Math.floor(Math.random() * sprites.length),
      })
    );
    const ribbonMotion: RibbonMotion = {
      heights: [],
      lastTime: null,
    };
    let frameId = 0;
    let marketIndex = 20;
    let lastMarketStep = 0;
    let intensity = 0;
    let reportedIndex = 0;
    let wasSimulating = false;

    function animate(time: number) {
      // Advance through historical observations.
      const shock = shockRef.current;

      if (shock !== 0) {
        // Freeze the current historical observation.
        // The simulated price change is drawn separately.
        wasSimulating = true;
        lastMarketStep = time;

      } else if (wasSimulating) {
        // Return to the same historical moment, not the beginning.
        lastMarketStep = time;
        wasSimulating = false;

      } else if (!isMusicPlayingRef.current) {
        // Music is paused: keep the current observation.
        lastMarketStep = time;

      } else if (time - lastMarketStep >= 2000) {
        // Music is playing: advance once per second.
        marketIndex += 1;

        if (marketIndex >= data.length) {
            marketIndex = 20;
        }

        lastMarketStep = time;
        }

        // Report changes to React.
      if (marketIndex !== reportedIndex) {
        reportedIndex = marketIndex;
        onPlaybackIndexChange(marketIndex);
      }

      const currentVolatility = volatility[marketIndex];
      const historicalIntensity = Math.max(
        0,
        Math.min(
            1,
            (currentVolatility - low) / Math.max(high - low, 1e-12)
        )
      );

      const shockIntensity = Math.min(
        1,
        Math.abs(shock) / 1.5
      );

      const targetIntensity =
        shock === 0
            ? historicalIntensity
            : Math.max(
                historicalIntensity,
                0.25 + shockIntensity * 0.75
            );

      // Smooth transitions in the particle behaviour.
      intensity += (targetIntensity - intensity) * 0.035;
      marketIntensityRef.current = intensity;

      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = 1;

      // Paint a fresh dark background each frame.
      ctx!.fillStyle = '#050713';
      ctx!.fillRect(0, 0, width, height);

// Draw our data-driven ribbons, stars and glitter.
      drawLightRibbons(
        ctx!,
        data,
        marketIndex,
        width,
        height,
        time,
        audioEnergyRef.current,
        intensity,
        shockRef.current,
        ribbonMotion
      );

// Preserve additive blending for our existing particles.
      ctx!.globalCompositeOperation = 'lighter';

      // Overlapping lights become brighter.
      ctx!.globalCompositeOperation = 'lighter';

      const musicEnergy = audioEnergyRef.current;
      const activeCount = Math.min(
        particles.length,
        Math.floor(40 + intensity * 50 + musicEnergy * 30)
      );

      const speed = 0.6 + intensity * 1.8 + musicEnergy * 1.2;
      const direction =
        shock !== 0
            ? Math.sign(shock)
            : Math.sign(returns[marketIndex]);

      for (let i = 0; i < activeCount; i++) {
        const particle = particles[i];

        particle.x += particle.vx * speed;

        particle.y +=
          particle.vy * speed -
          direction * intensity * 0.7 +
          Math.sin(time * 0.0015 + particle.phase) * 0.35;

        if (particle.x > width + 40) {
          particle.x = -40;
          particle.y = Math.random() * height;
        }

        if (particle.y < -40) particle.y = height + 40;
        if (particle.y > height + 40) particle.y = -40;

        const size = particle.size * (
            0.65 + intensity * 0.30 + musicEnergy * 0.55
        );

        ctx!.globalAlpha = Math.min(
            1,
            0.35 + intensity * 0.2 + musicEnergy * 0.35
        );

        ctx!.drawImage(
          sprites[particle.colour],
          particle.x - size,
          particle.y - size,
          size * 2,
          size * 2
        );
      }

      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = 'source-over';

      frameId = requestAnimationFrame(animate);
    }

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, [data, audioEnergyRef, marketIntensityRef, shockRef, isMusicPlayingRef,onPlaybackIndexChange,]);

  return (
    <section className="visual-widget">
      <canvas
        ref={canvasRef}
        className="visual-canvas"
        aria-label="Glowing light ribbons and particles responding to historical currency movements and music"
      />
    </section>
  );
}
