const bound = (value: number) => Math.max(0, Math.min(1, value));

function saturation(drive: number, level: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(4096);
  for (let i = 0; i < curve.length; i++) {
    const x = i * 2 / (curve.length - 1) - 1;
    curve[i] = level * Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
}

/** Artistic sound interpretations. Neither effect changes media speed or market data. */
export function createMusicGraph(context: BaseAudioContext, source: AudioNode) {
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;

  // Preserve the original market filter and its clean/filtered balance.
  const marketFilter = context.createBiquadFilter();
  marketFilter.type = 'lowpass';
  marketFilter.frequency.value = 14000;
  marketFilter.Q.value = 0.7;
  const clean = context.createGain();
  const filtered = context.createGain();
  filtered.gain.value = 0;
  const marketBus = context.createGain();
  source.connect(analyser);
  analyser.connect(clean).connect(marketBus);
  analyser.connect(marketFilter).connect(filtered).connect(marketBus);

  const dry = context.createGain();
  const submerged = context.createGain();
  const dark = context.createGain();
  submerged.gain.value = 0;
  dark.gain.value = 0;
  const mix = context.createGain();
  marketBus.connect(dry).connect(mix);

  // +2%: two low-pass stages, warm haze and a slow, shallow filter wobble.
  const waterFilter = context.createBiquadFilter();
  waterFilter.type = 'lowpass';
  waterFilter.frequency.value = 650;
  waterFilter.Q.value = 0.8;
  const waterSoftener = context.createBiquadFilter();
  waterSoftener.type = 'lowpass';
  waterSoftener.frequency.value = 1400;
  waterSoftener.Q.value = 0.6;
  const haze = context.createWaveShaper();
  haze.curve = saturation(1.6, 0.7);
  haze.oversample = '2x';
  const wobble = context.createOscillator();
  wobble.frequency.value = 0.65;
  const wobbleDepth = context.createGain();
  wobbleDepth.gain.value = 0;
  wobble.connect(wobbleDepth).connect(waterFilter.frequency);
  wobble.start();
  marketBus.connect(waterFilter).connect(waterSoftener).connect(haze).connect(submerged).connect(mix);

  // -2%: bass emphasis, bounded saturation and a darkened upper register.
  // This is a darker timbre, not independent pitch shifting.
  const bass = context.createBiquadFilter();
  bass.type = 'lowshelf';
  bass.frequency.value = 200;
  bass.gain.value = 7;
  const grit = context.createWaveShaper();
  grit.curve = saturation(7, 0.3);
  grit.oversample = '4x';
  const darkFilter = context.createBiquadFilter();
  darkFilter.type = 'lowpass';
  darkFilter.frequency.value = 2600;
  darkFilter.Q.value = 0.65;
  marketBus.connect(bass).connect(grit).connect(darkFilter).connect(dark).connect(mix);

  // A shared safety stage keeps both interpretations controlled, without feedback.
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -6;
  compressor.knee.value = 6;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.16;
  const headroom = context.createGain();
  headroom.gain.value = 0.9;
  const ceiling = context.createWaveShaper();
  const ceilingCurve = new Float32Array(4096);
  for (let i = 0; i < ceilingCurve.length; i++) {
    ceilingCurve[i] = Math.max(-0.98, Math.min(0.98, i * 2 / (ceilingCurve.length - 1) - 1));
  }
  ceiling.curve = ceilingCurve;
  mix.connect(compressor).connect(headroom).connect(ceiling).connect(context.destination);

  const nodes = [source, analyser, marketFilter, clean, filtered, marketBus, dry,
    waterFilter, waterSoftener, haze, wobble, wobbleDepth, submerged,
    bass, grit, darkFilter, dark, mix, compressor, headroom, ceiling];
  let lastMarket = NaN;
  let lastEffect = NaN;
  let wasSimulating = false;

  function update(marketValue: number, shockPercent: number, historicalEffect = 0) {
    const market = bound(marketValue);
    const shock = Math.max(-1, Math.min(1, shockPercent / 2));
    const simulating = shockPercent !== 0;
    // Direction comes from smoothed returns; volatility only nudges strength.
    // A nonzero hypothetical slider replaces this mapping, preserving its full extremes.
    const effect = simulating ? shock :
      Math.max(-0.9, Math.min(0.9, historicalEffect)) * (0.85 + market * 0.15);
    const now = context.currentTime;
    // Only schedule changed targets; repeated identical automation would create needless events.
    if (!Number.isFinite(lastMarket) || Math.abs(market - lastMarket) > 0.001) {
      const wet = Math.pow(market, 1.4) * 0.8;
      marketFilter.frequency.setTargetAtTime(14000 - market * 12800, now, 0.08);
      clean.gain.setTargetAtTime(1 - wet, now, 0.08);
      filtered.gain.setTargetAtTime(wet, now, 0.08);
      lastMarket = market;
    }
    if (!Number.isFinite(lastEffect) || Math.abs(effect - lastEffect) > 0.001 || simulating !== wasSimulating) {
      const power = Math.pow(Math.abs(effect), 1.2);
      const transition = simulating ? 0.12 : 0.7;
      // Complementary weights and identical time constants keep the mix gain stable
      // even when jumping directly between positive and negative experiments.
      dry.gain.setTargetAtTime(1 - power, now, transition);
      submerged.gain.setTargetAtTime(effect > 0 ? power : 0, now, transition);
      dark.gain.setTargetAtTime(effect < 0 ? power : 0, now, transition);
      wobbleDepth.gain.setTargetAtTime(effect > 0 ? power * 100 : 0, now, Math.max(0.18, transition));
      lastEffect = effect;
      wasSimulating = simulating;
    }
  }

  let disposed = false;
  return {
    analyser,
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      wobble.stop();
      nodes.forEach(node => node.disconnect());
    },
  };
}
