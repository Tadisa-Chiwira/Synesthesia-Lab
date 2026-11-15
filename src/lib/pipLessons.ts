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
  { id: 'causes', label: 'Why do exchange rates change?' },
  { id: 'turbulence', label: 'What is market turbulence?' },
  { id: 'slider', label: 'What happens when I move the slider?' },
  { id: 'music', label: 'How does music affect the artwork?' },
  { id: 'weaker', label: 'Is a weaker euro bad?' },
];

export function getPipAnswer(question: PipQuestionId, context: PipLearningContext): string {
  const { displayedRate, baseRate, shockPercent, dollarChange, timestamp } = context;
  const date = new Date(timestamp).toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });
  switch (question) {
    case 'forex':
      return "Forex is short for foreign exchange: swapping one currency for another. If you've changed pounds into euros for a holiday, you've already done it!";
    case 'rate':
      return `EUR means euros and USD means US dollars. Here, one euro ${shockPercent === 0 ? 'buys' : 'would buy'} $${displayedRate.toFixed(4)}; that number is the exchange rate. When it rises, the same euro buys more dollars.`;
    case 'causes':
      return "Prices can change as people buy and sell currencies, reacting to things like interest rates, trade or news. These recorded rates tell us what changed, but not the exact reason for each move.";
    case 'turbulence':
      return "Sometimes rates barely move; sometimes they jump around more. We compare the last 20 recorded changes with the rest of this dataset. Turbulence describes how much movement there is, not its direction or whether you make money.";
    case 'slider':
      return shockPercent === 0
        ? `The slider freezes a recorded rate and imagines a change to it. Our starting rate is $${baseRate.toFixed(4)} per euro at ${date} UTC; your euros stay the same, but their dollar value changes. This is an experiment, not a forecast.`
        : `From $${baseRate.toFixed(4)} per euro at ${date} UTC, you imagined a ${Math.abs(shockPercent).toFixed(1)}% ${shockPercent > 0 ? 'rise' : 'fall'} to $${displayedRate.toFixed(4)}. The same €1,000 would be worth $${Math.abs(dollarChange).toFixed(2)} ${dollarChange >= 0 ? 'more' : 'less'} in dollars. The extra ribbon movement is artistic, not another historical observation.`;
    case 'music':
      return "Recorded currency rates draw the ribbon's path, while recent market movement changes its flow and width. Your song adds sparkle and makes me dance; louder music doesn't mean a more turbulent market. During playback, we step through recorded observations every two seconds.";
    case 'weaker':
      return "Not necessarily! A weaker euro buys fewer dollars, which matters differently depending on which currency you have and what you want to buy. Up and down don't mean good and bad for everyone.";
  }
}
