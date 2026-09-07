import { calculateTurn } from "./calculations.js";
import { companyValue } from "./state.js";
import { selectScenario } from "./scenarios.js";

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
  const before = { customers: state.customers, satisfaction: state.satisfaction, cash: state.cash };
  const result = calculateTurn(state, decisions, state.scenario, rng);
  const dangerMonths = result.cash < -500000 ? state.dangerMonths + 1 : Math.max(0, state.dangerMonths - 1);
  const month = state.month + 1;
  const bankrupt = result.cash < -2500000 || dangerMonths >= 3;
  const finished = state.month >= state.maxMonths;
  const next = { ...state, ...result, month, price: decisions.price, advertising: decisions.advertising,
    employees: state.employees + decisions.hires, monthsWithoutDevelopment: decisions.development > 0 ? 0 : state.monthsWithoutDevelopment + 1,
    dangerMonths, lastDecisions: { ...decisions }, gameOver: bankrupt || finished };
  const report = { ...result, before, scenario: state.scenario, advice: feedback[state.scenario.advice], bankrupt, finished };
  next.history = [...state.history, report];
  if (!next.gameOver) next.scenario = selectScenario(next, rng);
  return next;
}

export function finalEvaluation(state) {
  const value = companyValue(state);
  if (state.history.at(-1)?.bankrupt) return { grade: "D", value, label: "資金が尽き、事業継続が困難になりました。" };
  let score = value / 1000000 + Math.max(0, state.profit) / 120000 + state.satisfaction * .45;
  const grade = score >= 130 ? "S" : score >= 105 ? "A" : score >= 80 ? "B" : score >= 58 ? "C" : "D";
  return { grade, value, label: value >= 100000000 ? "企業価値1億円を突破しました。" : "24か月の経営を完走しました。" };
}
