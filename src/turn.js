import { calculateTurn } from "./calculations.js";
import { companyValue } from "./state.js";
import { selectScenario } from "./scenarios.js";
import { advanceCompetition, competitorSignal } from "./competition.js";
import { strategyFor } from "./strategy.js";

function applyPending(state) {
  const due = state.pendingEffects.filter(effect => effect.due <= state.month);
  const pendingEffects = state.pendingEffects.filter(effect => effect.due > state.month);
  return { ...state, pendingEffects, appliedDevelopment: due.filter(e => e.type === "development").reduce((sum, e) => sum + e.value, 0), appliedHires: due.filter(e => e.type === "hiring").reduce((sum, e) => sum + e.value, 0), appliedEffects: due };
}

function nextRegime(state) {
  if (state.month === 5) return "GROWTH";
  if (state.month === 13) return "MATURE";
  if (state.month === 18) return "DECLINE";
  return state.regime;
}

const feedback = {
  advertising: "注目が集まる局面では、認知獲得への投資が成長速度を左右します。", market: "市場の追い風も、届ける手段があってこそ顧客増加につながります。",
  price: "価格競争では顧客数と単価の両方を見て、値下げ余地を判断することが重要です。", development: "競合の商品力が高まる局面では、集客だけでなく既存顧客の維持も重要です。",
  quality: "品質への不安には、短期の集客より商品体験の回復が効きやすくなります。", hiring: "採用しやすい時期に余力を作ると、将来の顧客増にも耐えやすくなります。",
  support: "顧客が増えた会社では、獲得と同じくらい対応体制が継続率を左右します。", stability: "評判が揺れる局面では、期待を広げる前に顧客体験を整える視点も必要です。",
  momentum: "良い口コミは満足度とブランドの蓄積から生まれ、次の成長を助けます。", efficiency: "需要が弱い局面では、売上だけでなく固定費と投資回収の時間も重要です。",
  growth: "回復局面では投資余力と成長機会のバランスが、その後の差になります。", people: "採用コストが高い時期は、必要な余力と資金繰りを慎重に見比べましょう。"
};

export function advanceTurn(state, decisions, rng = Math.random) {
  if (state.gameOver) return state;
  const prepared = applyPending(state);
  const before = { customers: state.customers, satisfaction: state.satisfaction, cash: state.cash };
  const result = calculateTurn(prepared, decisions, state.scenario, rng);
  const dangerMonths = result.cash < -500000 ? state.dangerMonths + 1 : Math.max(0, state.dangerMonths - 1);
  const month = state.month + 1;
  const bankrupt = result.cash < -2500000 || dangerMonths >= 3;
  const finished = state.month >= state.maxMonths;
  const regime = nextRegime(state);
  const competitors = advanceCompetition(state.competitors, regime, rng);
  const totalMarket = Math.max(1800, Math.round(state.totalMarket * ({ INTRODUCTION: 1.05, GROWTH: 1.12, MATURE: 1.02, DECLINE: .93 }[regime])));
  const marketShare = Math.round(Math.min(60, result.customers / totalMarket * 1000) / 10);
  const scheduled = [
    ...(prepared.pendingEffects || []),
    ...(decisions.development ? [{ type: "development", label: "Product Development", value: decisions.development / 55000, due: month + 1, cost: decisions.development }] : []),
    ...(decisions.hires ? [{ type: "hiring", label: "New Team Members", value: decisions.hires, due: month + 1, cost: decisions.hires * 160000 }] : [])
  ];
  const chain = state.customers / Math.max(1, state.employees) > 110 && decisions.hires === 0
    ? { id: "talent", step: Math.min(4, (state.eventChain?.id === "talent" ? state.eventChain.step : 0) + 1), label: "人材不足チェーン" }
    : decisions.development === 0 && state.monthsWithoutDevelopment > 2
      ? { id: "product", step: Math.min(4, (state.eventChain?.id === "product" ? state.eventChain.step : 0) + 1), label: "商品力低下チェーン" }
      : result.cash < 1500000 ? { id: "cash", step: Math.min(4, (state.eventChain?.id === "cash" ? state.eventChain.step : 0) + 1), label: "資金不足チェーン" }
      : result.satisfaction < 55 ? { id: "satisfaction", step: Math.min(4, (state.eventChain?.id === "satisfaction" ? state.eventChain.step : 0) + 1), label: "顧客満足度低下チェーン" }
      : marketShare < 8 ? { id: "competition", step: Math.min(4, (state.eventChain?.id === "competition" ? state.eventChain.step : 0) + 1), label: "競争激化チェーン" }
      : null;
  const next = { ...prepared, ...result, month, price: decisions.price, advertising: decisions.advertising,
    employees: state.employees + decisions.hires, pendingEffects: scheduled, competitors, totalMarket, marketShare, regime, eventChain: chain,
    monthsWithoutDevelopment: decisions.development > 0 ? 0 : state.monthsWithoutDevelopment + 1,
    emergencyDebt: (state.emergencyDebt || 0) + result.emergencyLoan, dangerMonths, lastDecisions: { ...decisions }, gameOver: bankrupt || finished };
  const report = { ...result, before, scenario: state.scenario, advice: feedback[state.scenario.advice], bankrupt, finished, regimeChange: regime !== state.regime ? `${state.regime} → ${regime}` : null, competitorSignal: competitorSignal(competitors), appliedEffects: prepared.appliedEffects };
  next.history = [...state.history, report];
  if (!next.gameOver) next.scenario = selectScenario(next, rng);
  return next;
}

export function finalEvaluation(state) {
  const value = companyValue(state);
  if (state.history.at(-1)?.bankrupt) return { grade: "D", value, label: "資金が尽き、事業継続が困難になりました。" };
  let score = value / 1000000 + Math.max(0, state.profit) / 120000 + state.satisfaction * .45 + strategyFor(state).score(state);
  const grade = score >= 130 ? "S" : score >= 105 ? "A" : score >= 80 ? "B" : score >= 58 ? "C" : "D";
  return { grade, value, label: value >= 100000000 ? "企業価値1億円を突破しました。" : "5年間の経営を完走しました。", strategy: strategyFor(state).label };
}
