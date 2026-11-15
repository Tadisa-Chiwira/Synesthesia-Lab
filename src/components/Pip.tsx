import { useEffect, useRef, useState, type RefObject } from 'react';

type Answer = 'increase' | 'decrease' | 'same';

type Props = {
  baseRate: number;
  commentary: string;
  audioEnergyRef: RefObject<number>;
  marketIntensityRef: RefObject<number>;
};

export default function Pip({
  baseRate,
  commentary,
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

    function dance(time: number) {
      const face = faceRef.current;

      if (face) {
        const music = Math.min(1, audioEnergyRef.current);
        const market = Math.min(1, marketIntensityRef.current);

        // Music produces the gentle dancing.
        const bounce =
          Math.sin(time * 0.006) * music * 7;

        // Market intensity adds a little wobble.
        const rotation =
          Math.sin(time * 0.004) * music * 6 +
          Math.sin(time * 0.012) * market * 2;

        const scale = 1 + music * 0.08;

        const glow = 18 + music * 42 + market * 12;

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
      <div className="pip-mini-header">
        <div className="pip-face" ref={faceRef}>
          •ᴗ•
        </div>

        <div>
          <span className="stage-kicker">Pip notices...</span>
          <h2>Can you read the current?</h2>
        </div>
      </div>

      <p className="pip-commentary">{commentary}</p>

      <div className="pip-question">
        <strong>Let's make a prediction!</strong>

        <p>
          If one euro starts buying more dollars,
          what happens to the dollar value of €1,000?
        </p>
      </div>

      <div className="pip-options">
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
          <strong>
            {answer === 'increase'
              ? '✨ Exactly!'
              : '✨ Let’s explore that!'}
          </strong>

          <p>
            When one euro buys more dollars,
            €1,000 becomes worth more in dollars too.
          </p>

          <p>
            For a 1% rise from our starting rate,
            that's about ${gain} more.
          </p>

          <p>
            Try moving the Market Storm slider
            to +1% and watch the result!
          </p>
        </div>
      )}
    </section>
  );
}
