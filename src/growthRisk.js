const responseFor = (chain, decisions, previous, state) => ({
  talent: decisions.hires > 0, organization: decisions.hires <= 1 && decisions.development > 0,
  product: decisions.development > 0, infrastructure: decisions.development > 0,
  reputation: decisions.development > 0 && decisions.advertising <= previous.advertising,
  cash: decisions.emergencyLoan || decisions.advertising + decisions.development < state.cash * .3,
  satisfaction: decisions.hires > 0 || decisions.development > 0,
  competition: decisions.development > 0 || decisions.price < previous.price
})[chain.id];

export function chainEffects(state) {
  const step = state.eventChain?.step || 0;
  if (!step) return { acquisition: 1, churn: 1, satisfaction: 0, operatingCost: 1, productivity: 1 };
  const severity = Math.max(0, step - 1);
  return { acquisition: Math.max(.48, 1 - severity * .12), churn: 1 + severity * .16, satisfaction: -severity * 2, operatingCost: 1 + severity * .1, productivity: Math.max(.65, 1 - severity * .08) };
}

export function updateEventChain(state, result, decisions, marketShare) {
  const existing = state.eventChain;
  if (existing && responseFor(existing, decisions, state.lastDecisions || decisions, state)) return existing.step <= 1 ? null : { ...existing, step: existing.step - 1, recovering: true };
  let risk = null;
  const growth = result.customers / Math.max(1, state.initialCustomers);
  if (state.brand >= 70 && state.satisfaction < 68) risk = ["reputation", "ブランド炎上チェーン"];
  else if (state.employees >= 25 && (state.decisionStreaks?.hiring || 0) >= 2) risk = ["organization", "組織効率低下チェーン"];
  else if (result.customers >= 2500 && growth >= 1.5 && state.developmentLevel < 62) risk = ["infrastructure", "インフラ障害チェーン"];
  else if (state.customers / Math.max(1, state.employees) > 110 && decisions.hires === 0) risk = ["talent", "人材不足チェーン"];
  else if (decisions.development === 0 && state.monthsWithoutDevelopment > 2) risk = ["product", "商品力低下チェーン"];
  else if (result.cash < 1500000) risk = ["cash", "資金不足チェーン"];
  else if (result.satisfaction < 55) risk = ["satisfaction", "顧客満足度低下チェーン"];
  else if (marketShare < 8 || marketShare >= 15) risk = ["competition", "競争激化チェーン"];
  if (!risk) return existing && existing.step > 1 ? { ...existing, step: Math.min(4, existing.step + 1), recovering: false } : null;
  const same = existing?.id === risk[0];
  return { id: risk[0], step: Math.min(4, same ? existing.step + 1 : 1), label: risk[1], recovering: false };
}

export function growthRiskMultiplier(state) {
  let multiplier = 1;
  if (state.customers >= 1000) multiplier += .25;
  if (state.customers >= 2500) multiplier += .35;
  if (state.marketShare >= 15) multiplier += .4;
  if (state.marketShare >= 25) multiplier += .55;
  if (state.brand >= 70) multiplier += .35;
  return multiplier;
}
