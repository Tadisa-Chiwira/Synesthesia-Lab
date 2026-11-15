
import { useState } from 'react';

type Answer = 'increase' | 'decrease' | 'same';

type Props = {
  baseRate: number;
  commentary: String;
};

export default function Pip({ baseRate, commentary, }: Props) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);

  const choices: { value: Answer; label: string }[] = [
    { value: 'increase', label: 'It increases' },
    { value: 'decrease', label: 'It decreases' },
    { value: 'same', label: 'It stays the same' },
  ];

  const gain = (1000 * baseRate * 0.01).toFixed(2);

  return (
    <section
      style={{
        maxWidth: 600,
        margin: '40px auto',
        padding: 24,
        borderRadius: 20,
        background: '#211b36',
      }}
    >
      <div
        role="img"
        aria-label="Pip, your curious market companion"
        style={{
          width: 76,
          height: 76,
          margin: '0 auto 12px',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          fontSize: 30,
          color: '#35204a',
          background:
            'radial-gradient(circle at 35% 25%, #fff, #e4b5ff 55%, #aa71ed)',
          boxShadow: '0 0 24px rgba(190,125,255,0.45)',
        }}
      >
        •ᴗ•
      </div>

      <h2>Meet Pip!</h2>

      <p>
        Hiiii! I'm Pip! Apparently currencies can get
        stronger and weaker. That's a lot of responsibility
        for something you can't even hold.
      </p>
      <div
        style={{
            padding: '14px 18px',
            margin: '20px 0',
            borderRadius: 14,
            background: 'rgba(190,125,255,0.12)',
            border: '1px solid rgba(190,125,255,0.3)',
            textAlign: 'left',
        }}
>
        <strong>✨ Pip notices...</strong>
        <p style={{ marginBottom: 0 }}>{commentary}</p>
      </div>

      <h3>Let's make a prediction!</h3>

      <p>
        Suppose you have €1,000 and the EUR/USD
        exchange rate increases by 1%.
      </p>

      <p>
        What happens to the value of your euros
        when measured in US dollars?
      </p>

      <div style={{ display: 'grid', gap: 10 }}>
        {choices.map((choice) => (
          <button
            key={choice.value}
            aria-pressed={answer === choice.value}
            onClick={() => {
              setAnswer(choice.value);
              setRevealed(false);
            }}
            style={{
              padding: 12,
              borderRadius: 12,
              border:
                answer === choice.value
                  ? '2px solid #dcb4ff'
                  : '2px solid #514367',
              background:
                answer === choice.value
                  ? '#493264'
                  : '#2a2341',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {choice.label}
          </button>
        ))}
      </div>

      <button
        disabled={!answer}
        onClick={() => setRevealed(true)}
        style={{ marginTop: 18 }}
      >
        Check my prediction
      </button>

      {revealed && (
        <div style={{ marginTop: 20 }}>
          <h3>
            {answer === 'increase'
              ? '✨ You got it!'
              : '✨ Let’s investigate!'}
          </h3>

          <p>
            EUR/USD tells us how many US dollars
            one euro is worth.
          </p>

          <p>
            When EUR/USD increases, each euro buys
            more dollars. So your €1,000 becomes worth
            approximately ${gain} more.
          </p>

          <p>
            Now try setting the simulator below to +1%
            and watch the numbers change!
          </p>
        </div>
      )}
    </section>
  );
}
