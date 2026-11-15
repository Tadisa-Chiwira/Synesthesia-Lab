import AskPip from './AskPip';
import type { PipLearningContext } from '../lib/pipLessons';
import Celestial from './Celestial';
import { useEffect, useRef, useState, type RefObject } from 'react';

type Answer = 'increase' | 'decrease' | 'same';

type Props = {
  baseRate: number;
  commentary: string;
  learningContext: PipLearningContext;
  audioEnergyRef: RefObject<number>;
  marketIntensityRef: RefObject<number>;
};

export default function Pip({
  baseRate,
  commentary,
  learningContext,
  audioEnergyRef,
  marketIntensityRef,
}: Props) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);

  const faceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reducedMotion) return;

    let previousTime: number | null = null;
    let phase = 0;

    function dance(time: number) {
      const delta = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const market = Math.max(0, Math.min(1, marketIntensityRef.current));
      phase += delta * (1 + market * 0.1);
      const face = faceRef.current;

      if (face) {
        const music = Math.min(1, audioEnergyRef.current);

        // Music produces the gentle dancing.
        const bounce =
          Math.sin(phase * 6) * music * 7;

        // Market gently adjusts tempo; music still owns dance amplitude.
        const rotation =
          Math.sin(phase * 4) * music * 6;

        const scale = 1 + music * 0.08;

        const glow = 18 + music * 42 + market * 8;

        face.style.transform =
          `translateY(${bounce}px) ` +
          `rotate(${rotation}deg) ` +
          `scale(${scale})`;

        face.style.boxShadow =
          `0 0 ${glow}px rgba(218,159,255,0.7), ` +
          `0 0 ${glow * 1.6}px rgba(182,104,255,0.2)`;
      }

      frame = requestAnimationFrame(dance);
    }

    frame = requestAnimationFrame(dance);

    return () => cancelAnimationFrame(frame);
  }, [audioEnergyRef, marketIntensityRef]);

  const choices: { value: Answer; label: string }[] = [
    { value: 'increase', label: 'It increases' },
    { value: 'decrease', label: 'It decreases' },
    { value: 'same', label: 'It stays the same' },
  ];

  const gain = (1000 * baseRate * 0.01).toFixed(2);

  return (
    <section className="pip-widget">
      <div className="pip-introduction">
        <div className="pip-portrait">
          <Celestial className="pip-spark pip-spark-one" />
          <Celestial className="pip-spark pip-spark-two" />
          <Celestial className="pip-spark pip-spark-three" />
          <div className="pip-face" ref={faceRef}>
            •ᴗ•
          </div>
        </div>
        <div className="pip-greeting"><span className="pip-signature">Meet Pip!</span><h2>What happens when the euro changes?</h2></div>
      </div>
      <div className="pip-note">
        <p className="pip-commentary">{commentary}</p>
      </div>
      <div className="pip-learning">
        <AskPip context={learningContext} />
        <details className='pip-lesson'>
          <summary>Try a challenge <span aria-hidden="true">+</span></summary>
        
          <div className="pip-question">
            <p>
              If one euro starts buying more dollars,
              what happens to the dollar value of €1,000?
            </p>
          </div>

          <div className="pip-options" role="group" aria-label="Your prediction">
            {choices.map((choice) => (
              <button
                key={choice.value}
                className={
                  answer === choice.value
                    ? 'pip-option selected'
                    : 'pip-option'
                }
                aria-pressed={answer === choice.value}
                onClick={() => {
                  setAnswer(choice.value);
                  setRevealed(false);
                }}
              >
                {choice.label}
              </button>
            ))}
          </div>

          <button
            className="pip-check"
            disabled={!answer}
            onClick={() => setRevealed(true)}
          >
            Check my prediction
          </button>

          {revealed && (
            <div className="pip-feedback" aria-live="polite">
              <strong>{answer === 'increase' ? 'Exactly!' : 'Not quite, but try this:'}</strong>
              <p>
                The same euros buy more dollars. A 1% rise from this starting
                rate makes €1,000 worth ${gain} more.
                Try +1% on the slider.
              </p>
            </div>
          )}
        </details>
      </div>
    </section>
  );
}
