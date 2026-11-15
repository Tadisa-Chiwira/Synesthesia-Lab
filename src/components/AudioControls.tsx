import Celestial from './Celestial';
import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { createMusicGraph } from '../lib/musicGraph';

type Props = {
  audioEnergyRef: RefObject<number>;
  marketIntensityRef: RefObject<number>;
  shockRef: RefObject<number>;
  historicalAudioRef: RefObject<number>;
  isMusicPlayingRef: RefObject<boolean>;
};

type Graph = { context: AudioContext; sound: ReturnType<typeof createMusicGraph> };

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function AudioControls({ audioEnergyRef, marketIntensityRef, shockRef, historicalAudioRef, isMusicPlayingRef }: Props) {
  const [audioUrl, setAudioUrl] = useState<string>();
  const [fileName, setFileName] = useState('');
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const ornamentRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const playRequestRef = useRef(0);

  // One persistent element and one lazily-created graph for every uploaded song.
  // In particular, changing src must never recreate a MediaElementAudioSourceNode.
  function ensureGraph(): Graph {
    if (graphRef.current) return graphRef.current;
    const context = new AudioContext();
    try {
      const source = context.createMediaElementSource(audioRef.current!);
      const sound = createMusicGraph(context, source);
      sound.update(marketIntensityRef.current, shockRef.current, historicalAudioRef.current);
      graphRef.current = { context, sound };
      return graphRef.current;
    } catch (cause) {
      void context.close();
      throw cause;
    }
  }

  useEffect(() => {
    const requests = playRequestRef;
    let frame = 0;
    let energy = 0;
    let recentPeak = 0.08;
    const frequencies = new Uint8Array(128);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    function tick() {
      const graph = graphRef.current;
      let raw = 0;
      if (graph) {
        graph.sound.update(marketIntensityRef.current, shockRef.current, historicalAudioRef.current);
        graph.sound.analyser.getByteFrequencyData(frequencies);
        if (isMusicPlayingRef.current) raw = frequencies.reduce((sum, value) => sum + value, 0) / frequencies.length / 255;
      }
      recentPeak = Math.max(raw, recentPeak * 0.998);
      const target = Math.pow(Math.min(1, raw / Math.max(recentPeak, 0.07)), 1.5);
      energy += (target - energy) * 0.2;
      audioEnergyRef.current = energy;
      ornamentRef.current?.style.setProperty('--music-energy', String(reduced.matches ? 0 : energy));
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      ++requests.current;
      isMusicPlayingRef.current = false;
      audioEnergyRef.current = 0;
      const graph = graphRef.current;
      graphRef.current = null;
      if (graph) { graph.sound.dispose(); void graph.context.close(); }
    };
  }, [audioEnergyRef, marketIntensityRef, shockRef, historicalAudioRef, isMusicPlayingRef]);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    ++playRequestRef.current;
    audioRef.current?.pause();
    isMusicPlayingRef.current = false;
    audioEnergyRef.current = 0;
    setPlaying(false);
    setError('');
    setPosition(0);
    setDuration(0);
    setFileName(file.name);
    setAudioUrl(URL.createObjectURL(file));
    event.target.value = '';
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (!audio.paused) {
      ++playRequestRef.current;
      audio.pause();
      return;
    }
    const request = ++playRequestRef.current;
    setError('');
    try {
      const graph = ensureGraph();
      await graph.context.resume();
      if (request !== playRequestRef.current) return;
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
    } catch (cause) {
      if (request !== playRequestRef.current) return;
      audio.pause();
      setPlaying(false);
      isMusicPlayingRef.current = false;
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError'
        ? 'Playback was blocked. Press play to try again.'
        : 'This song could not play. Try another audio file.');
    }
  }

  function syncDuration() {
    const value = audioRef.current?.duration ?? 0;
    setDuration(Number.isFinite(value) ? value : 0);
  }

  const seekable = duration > 0;
  return (
    <section className="audio-widget">
      <div className="soundtrack-heading">
        <div className="music-charm"><Celestial kind="music" /></div>
        <div><span className="stage-kicker">The music box</span><h2>Your soundtrack</h2></div>
      </div>
      <p className="soundtrack-invitation">Choose a song and see how the lights respond.</p>
      <label className="soundtrack-upload">
        <span className="upload-mark" aria-hidden="true">+</span>
        <span>{fileName ? 'Change soundtrack' : 'Choose your soundtrack'}</span>
        <input type="file" accept="audio/*" aria-label="Upload your soundtrack" onChange={handleUpload} />
      </label>
      <p className="audio-filename" title={fileName || undefined}>{fileName || 'Audio stays on your device.'}</p>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
        onTimeUpdate={() => setPosition(audioRef.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)}
        onPlaying={() => { isMusicPlayingRef.current = true; }}
        onWaiting={() => { isMusicPlayingRef.current = false; }}
        onSeeking={() => { isMusicPlayingRef.current = false; }}
        onSeeked={() => { isMusicPlayingRef.current = !audioRef.current!.paused && audioRef.current!.readyState >= 3; }}
        onPause={() => { setPlaying(false); isMusicPlayingRef.current = false; }}
        onEnded={() => { setPlaying(false); isMusicPlayingRef.current = false; }}
        onVolumeChange={() => { setVolume(audioRef.current?.volume ?? 1); setMuted(audioRef.current?.muted ?? false); }}
        onError={() => {
          isMusicPlayingRef.current = false;
          audioEnergyRef.current = 0;
          setPlaying(false);
          setError('This file could not be read. Please choose another audio file.');
        }}
      />
      {audioUrl && (
        <div className="music-box-player custom-player">
          <div className="player-transport">
            <button type="button" className="pearl-play" aria-label={playing ? 'Pause soundtrack' : 'Play soundtrack'} onClick={() => void togglePlayback()}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                {playing ? <path d="M7 5h4v14H7zM14 5h4v14h-4z" /> : <path d="m8 5 11 7-11 7z" />}
              </svg>
            </button>
            <div ref={ornamentRef} className="music-wave" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <span className="player-time">{formatTime(position)} <span>/ {formatTime(duration)}</span></span>
          </div>
          <input
            className="song-progress" type="range" aria-label="Seek in soundtrack"
            min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} disabled={!seekable}
            aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
            onChange={event => { const time = Number(event.target.value); if (audioRef.current && seekable) { audioRef.current.currentTime = time; setPosition(time); } }}
          />
          <div className="player-volume">
            <button type="button" aria-label={muted ? 'Unmute soundtrack' : 'Mute soundtrack'} aria-pressed={muted} onClick={() => { if (audioRef.current) audioRef.current.muted = !audioRef.current.muted; }}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 9h4l5-4v14l-5-4H4z" />
                {muted ? <path d="m17 9 5 6m0-6-5 6" fill="none" stroke="currentColor" strokeWidth="1.5" /> : <path d="M17 8q5 4 0 8" fill="none" stroke="currentColor" strokeWidth="1.5" />}
              </svg>
            </button>
            <input type="range" aria-label="Soundtrack volume" aria-valuetext={`${Math.round(volume * 100)} percent${muted ? ', muted' : ''}`} min="0" max="1" step="0.01" value={volume} onChange={event => { if (audioRef.current) { audioRef.current.volume = Number(event.target.value); audioRef.current.muted = false; } }} />
          </div>
          <p className="storm-audio-note">Storm sound: +2% submerged; -2% dark &amp; gritty. Pitch and speed stay unchanged.</p>
        </div>
      )}
      {error && <p className="audio-error" role="alert">{error}</p>}
    </section>
  );
}
