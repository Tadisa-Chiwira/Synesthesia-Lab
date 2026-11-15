
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';

type Props = {
  audioEnergyRef: RefObject<number>;
  marketIntensityRef: RefObject<number>;
  isMusicPlayingRef: RefObject<boolean>;
};

export default function AudioControls({ audioEnergyRef, marketIntensityRef, isMusicPlayingRef, }: Props) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;

    // Create an audio processing pipeline.
    const context = new AudioContext();
    const source = context.createMediaElementSource(audioRef.current);
    const analyser = context.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    // The song must still reach the speakers.
    // Filter the song according to market volatility.
    const marketFilter = context.createBiquadFilter();

    marketFilter.type = 'lowpass';
    marketFilter.frequency.value = 14000;
    marketFilter.Q.value = 0.7;

// Mix the original and filtered versions of the song.
    const cleanGain = context.createGain();
    const filteredGain = context.createGain();

    cleanGain.gain.value = 1;
    filteredGain.gain.value = 0;

    // The analyser measures the original song.
    source.connect(analyser);

    // Two audio paths: clean and filtered.
    analyser.connect(cleanGain);
    analyser.connect(marketFilter);

    marketFilter.connect(filteredGain);

    // Both paths lead to the speakers.
    cleanGain.connect(context.destination);
    filteredGain.connect(context.destination);

    contextRef.current = context;

    const frequencies = new Uint8Array(analyser.frequencyBinCount);

    let animationId = 0;
    let smoothedEnergy = 0;
    let recentPeak = 0.08;

    function updateEnergy() {
      analyser.getByteFrequencyData(frequencies);

      const average =
        frequencies.reduce((sum, value) => sum + value, 0) /
        frequencies.length;

      const rawEnergy = average / 255;

    // Track the song's recent energy peaks.
      recentPeak = Math.max(rawEnergy, recentPeak * 0.998);

    // Adjust sensitivity relative to the song's own energy.
      const normalizedEnergy = Math.min(
        1,
        rawEnergy / Math.max(recentPeak, 0.07)
      );

      const energy = Math.pow(normalizedEnergy, 1.5);

      // Smooth changes so the visuals don't flicker harshly.
      smoothedEnergy += (energy - smoothedEnergy) * 0.2;

      audioEnergyRef.current = smoothedEnergy;
      // Read current FX market intensity.
      const market = Math.max(
        0,
        Math.min(1, marketIntensityRef.current)
      );

        // Stronger market movements produce a deeper filter.
      const cutoff = 14000 - market * 12800;

        // Blend more filtered audio during volatile periods.
      const wetAmount = Math.pow(market, 1.4) * 0.8;

        // Smoothly change the sound without sudden jumps.
      marketFilter.frequency.setTargetAtTime(
        cutoff,
        context.currentTime,
        0.08
      );

      cleanGain.gain.setTargetAtTime(
        1 - wetAmount,
        context.currentTime,
        0.08
      );

      filteredGain.gain.setTargetAtTime(
        wetAmount,
        context.currentTime,
        0.08
      );

      animationId = requestAnimationFrame(updateEnergy);
    }

    updateEnergy();

    return () => {
      cancelAnimationFrame(animationId);
      audioEnergyRef.current = 0;

      source.disconnect();
      analyser.disconnect();
      marketFilter.disconnect();
      cleanGain.disconnect();
      filteredGain.disconnect();

      contextRef.current = null;
      void context.close();
    };
  }, [audioUrl, audioEnergyRef, marketIntensityRef]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    isMusicPlayingRef.current = false;
    setFileName(file.name);
    setAudioUrl(URL.createObjectURL(file));
  }

  return (
    <section className="audio-widget">
      <h2>Your Soundtrack</h2>
      <p>Let your music bring the market to life.</p>

      <input
        type="file"
        accept="audio/*"
        onChange={handleUpload}
      />

      {fileName && <p>Selected: {fileName}</p>}

      {audioUrl && (
        <audio
          key={audioUrl}
          ref={audioRef}
          controls
          src={audioUrl}
          onPlay={() => {
            isMusicPlayingRef.current = true;
            void contextRef.current?.resume();
          }}
          onPause={() => {
            isMusicPlayingRef.current = false;
          }}
          onEnded={() => {
            isMusicPlayingRef.current = false;
          }}
          style={{ width: '100%', marginTop: 16 }}
        />
      )}
    </section>
  );
}
