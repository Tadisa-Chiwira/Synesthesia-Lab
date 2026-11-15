import { useState } from 'react';
import { getPipAnswer, pipQuestions, type PipLearningContext, type PipQuestionId } from '../lib/pipLessons';

export default function AskPip({ context }: { context: PipLearningContext }) {
  const [question, setQuestion] = useState<PipQuestionId>('rate');

  return (
    <details className="ask-pip">
      <summary>Ask Pip <span aria-hidden="true">+</span></summary>
      <p className="ask-pip-caption">Little explanations for big money questions.</p>
      <div className="pip-question-book" role="group" aria-label="Choose a question for Pip">
        {pipQuestions.map(item => (
          <button
            key={item.id} type="button" aria-pressed={question === item.id}
            aria-controls="pip-answer" onClick={() => setQuestion(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p id="pip-answer" className="pip-answer" aria-live="polite" aria-atomic="true">{getPipAnswer(question, context)}</p>
    </details>
  );
}
