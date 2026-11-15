import { useState } from 'react';
import { getPipAnswer, pipQuestions, type PipLearningContext, type PipQuestionId } from '../lib/pipLessons';

export default function AskPip({ context }: { context: PipLearningContext }) {
  const [question, setQuestion] = useState<PipQuestionId>('rate');

  return (
    <details className="ask-pip">
      <summary>Ask Pip <span aria-hidden="true">+</span></summary>
      <label htmlFor="pip-question">What would you like to know?</label>
      <select
        id="pip-question"
        value={question}
        onChange={event => setQuestion(event.target.value as PipQuestionId)}
      >
        {pipQuestions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <p className="pip-answer" aria-live="polite" aria-atomic="true">{getPipAnswer(question, context)}</p>
    </details>
  );
}
