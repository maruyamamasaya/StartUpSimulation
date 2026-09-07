export const randomBetween = (min, max, rng = Math.random) => min + (max - min) * rng();

export function decisionQuality(state, decisions, scenario) {
  const previous = state.lastDecisions;
  const raised = key => decisions[key] > previous[key];
  const lowerPrice = decisions.price < previous.price;
  const matches = {
    advertising: raised("advertising"), market: raised("advertising") || decisions.price <= previous.price,
    price: lowerPrice && decisions.price >= 700, development: raised("development"),
    quality: raised("development"), hiring: decisions.hires > 0, support: decisions.hires > 0,
    stability: raised("development") || decisions.hires > 0, momentum: decisions.advertising >= previous.advertising,
    efficiency: decisions.advertising <= previous.advertising && decisions.hires <= 1,
    growth: raised("advertising") || raised("development"), people: decisions.hires <= 2
  };
  return matches[scenario.advice] ? "aligned" : "misaligned";
}

export function outcomeMultiplier(quality, rng = Math.random) {
  return quality === "aligned" ? randomBetween(.92, 1.22, rng) : randomBetween(.72, 1.03, rng);
}
