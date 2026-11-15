export type PipLearningContext = {
  baseRate: number;
  displayedRate: number;
  shockPercent: number;
  dollarChange: number;
  timestamp: string;
};

export type PipQuestionId = 'forex' | 'rate' | 'causes' | 'turbulence' | 'slider' | 'music' | 'weaker';

// A local, deterministic teaching catalogue. A future explanation provider can
// consume the same question IDs and context without changing the financial model.
export const pipQuestions: { id: PipQuestionId; label: string }[] = [
  { id: 'forex', label: 'What is forex?' },
  { id: 'rate', label: 'What does EUR/USD mean?' },
  { id: 'causes', label: 'Why do currencies change value?' },
  { id: 'turbulence', label: 'What does market turbulence mean?' },
  { id: 'slider', label: 'What happens when I move the slider?' },
  { id: 'music', label: 'How does the music change the artwork?' },
  { id: 'weaker', label: 'Is a weaker euro bad?' },
];

export function getPipAnswer(question: PipQuestionId, context: PipLearningContext): string {
  const { displayedRate, baseRate, shockPercent, dollarChange } = context;
  switch (question) {
    case 'forex':
      return "It's swapping one country's money for another. If you've changed pounds into euros for a holiday, you've used foreign exchange!";
    case 'rate':
      return `EUR/USD tells you how many US dollars one euro ${shockPercent === 0 ? 'buys' : 'would buy'}: here, $${displayedRate.toFixed(4)}. If the number rises, your euro buys more dollars.`;
    case 'causes':
      return "People buy and sell currencies for lots of reasons, including news, trade and interest rates. Those decisions can push exchange rates up or down.";
    case 'turbulence':
      return "It means exchange rates have been jumping around more than usual in our data. They might be going up, down or both!";
    case 'slider':
      return shockPercent === 0
        ? `Try an imagined change from $${baseRate.toFixed(4)} per euro. It changes the dollar value of your €1,000, not your euros, and isn't a prediction.`
        : `With your ${Math.abs(shockPercent).toFixed(1)}% ${shockPercent > 0 ? 'rise' : 'fall'}, one euro would buy $${displayedRate.toFixed(4)} and €1,000 would be worth $${Math.abs(dollarChange).toFixed(2)} ${dollarChange >= 0 ? 'more' : 'less'} in dollars. That's an imagined change, not a prediction.`;
    case 'music':
      return "Recorded rates guide the ribbon and the sound: rises sound more submerged, falls darker. Your song adds sparkles and makes me dance.";
    case 'weaker':
      return "Not always! Exchanging euros for dollars gets you fewer dollars, but swapping dollars for euros could help you.";
  }
}
