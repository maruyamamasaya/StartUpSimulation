import { clamp } from "./state.js";
import { businessById } from "./data/businesses.js";

const adviceChecks = {
  advertising: (_s, d, p) => d.advertising > p.advertising,
  market: (_s, d, p) => d.advertising >= p.advertising || d.price <= p.price,
  price: (_s, d, p, b) => d.price < p.price && d.price >= b.price * .65,
  development: (_s, d, p) => d.development > p.development,
  quality: (_s, d, p) => d.development > p.development,
  hiring: (s, d) => d.hires > 0 || s.customers / Math.max(1, s.employees) < 85,
  support: (s, d) => d.hires > 0 || s.customers / Math.max(1, s.employees) < 85,
  stability: (_s, d, p) => d.development > p.development || d.hires > 0,
  momentum: (_s, d, p) => d.advertising >= p.advertising,
  efficiency: (_s, d, p) => d.advertising <= p.advertising && d.hires <= 1,
  growth: (_s, d, p) => d.advertising > p.advertising || d.development > p.development,
  people: (_s, d) => d.hires <= 2
};

export function evaluateDecision(state, decisions, scenario) {
  const business = businessById(state.businessId);
  const previous = state.lastDecisions || decisions;
  const planned = decisions.advertising + decisions.development * business.developmentCost + decisions.hires * 325000 * business.hiringCost;
  const load = state.customers / Math.max(1, state.employees);
  const cashRatio = planned / Math.max(500000, state.cash);
  const cheapestCompetitor = Math.min(...state.competitors.map(item => item.price));
  const strongestProduct = Math.max(...state.competitors.map(item => item.product));
  const strongestBrand = Math.max(...state.competitors.map(item => item.brand));
  const feedback = [];
  let score = 100;
  if (!(adviceChecks[scenario.advice]?.(state, decisions, previous, business) ?? true)) { score -= 14; feedback.push("市場シグナルへの対応が遅れています"); }
  if (cashRatio > .65) { score -= Math.min(28, 10 + (cashRatio - .65) * 24); feedback.push("投資額が現在の資金余力に対して高すぎます"); }
  else if (state.cash < 2500000 && planned > state.cash * .35) { score -= 12; feedback.push("資金繰りを守る余地が不足しています"); }
  if (load > 110 && decisions.hires === 0) { score -= Math.min(24, 10 + (load - 110) / 12); feedback.push("顧客規模に対する採用・運営体制が不足しています"); }
  else if (load > 90 && decisions.hires > 0) feedback.push("採用判断は適切でした");
  if ((state.monthsWithoutDevelopment >= 2 || state.developmentLevel < 45) && decisions.development === 0) { score -= 16; feedback.push("商品力低下に対する開発投資が不足しています"); }
  else if (decisions.development > 0 && decisions.development <= Math.max(250000, state.cash * .25)) feedback.push("開発投資は妥当でした");
  if (decisions.price < business.price * .62) { score -= 17; feedback.push("値下げが収益性とブランドを損なう水準です"); }
  if (decisions.price > business.price * 1.55 && state.marketTraits.priceSensitivity === "HIGH") { score -= 13; feedback.push("価格感応度の高い市場に対して価格が強気すぎます"); }
  if (decisions.price > cheapestCompetitor * 1.55 && state.developmentLevel < strongestProduct && state.brand < strongestBrand) { score -= 18; feedback.push("競合との価格差を正当化する商品力・ブランド優位が不足しています"); }
  if ((state.decisionStreaks?.advertising || 0) >= 2 && decisions.advertising >= previous.advertising && decisions.advertising > state.revenue * .22) { score -= 10; feedback.push("広告の連続投入で獲得効率が低下しています"); }
  if ((state.decisionStreaks?.hiring || 0) >= 2 && decisions.hires >= 3) { score -= 12; feedback.push("急採用の継続で組織負荷と固定費が膨らんでいます"); }
  if ((state.decisionStreaks?.priceChanges || 0) >= 2 && decisions.price !== previous.price) { score -= 9; feedback.push("頻繁な価格変更が顧客の信頼を損ねています"); }
  if ((state.decisionStreaks?.repeatedPlan || 0) >= 2 && ["price","advertising","development"].every(key => decisions[key] === previous[key]) && decisions.hires === 0) { score -= 8; feedback.push("同じ施策の反復で市場への適応が遅れています"); }
  if (state.eventChain?.step >= 2) {
    const responses = { talent: decisions.hires > 0, organization: decisions.hires <= 1 && decisions.development > 0, product: decisions.development > 0, infrastructure: decisions.development > 0, satisfaction: decisions.development > 0 || decisions.hires > 0, reputation: decisions.development > 0 && decisions.advertising <= previous.advertising, cash: planned < state.cash * .3 || decisions.emergencyLoan, competition: decisions.development > 0 || decisions.price < previous.price };
    if (!responses[state.eventChain.id]) { score -= 12; feedback.push(`${state.eventChain.label}への対策が不十分です`); }
  }
  score = Math.round(clamp(score, 0, 100));
  if (!feedback.length) feedback.push("市場・財務・運営のバランスが取れた判断でした");
  return { score, feedback: feedback.slice(0, 4) };
}

export function updateCeoStatus(state, score, performance = {}) {
  const lowScoreStreak = score < 60 ? (state.lowScoreStreak || 0) + 1 : 0;
  const delta = score >= 80 ? 3 : score >= 70 ? 0 : score >= 60 ? -3 : score >= 40 ? -8 : -15;
  const performanceDelta = performance.profit > 0 && performance.customers >= state.customers ? 1 : performance.profit < 0 ? -1 : 0;
  const repetitionPenalty = lowScoreStreak >= 2 ? (lowScoreStreak - 1) * 3 : 0;
  return { ceoTrust: Math.round(clamp((state.ceoTrust ?? 70) + delta + performanceDelta - repetitionPenalty, 0, 100)), lowScoreStreak };
}
