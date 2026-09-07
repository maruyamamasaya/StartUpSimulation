import { calculateTurn } from "./calculations.js";
import { companyValue } from "./state.js";
import { selectScenario } from "./scenarios.js";
import { advanceCompetition, competitorSignal } from "./competition.js";
import { strategyFor } from "./strategy.js";
import { businessById } from "./data/businesses.js";
import { balance } from "./data/balance.js";
import { evaluateDecision, updateCeoStatus } from "./decisionScore.js";
import { updateEventChain } from "./growthRisk.js";
import { resolveExecution, executionSummary } from "./execution.js";
import { advanceProject } from "./projects.js";

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

export function assessRisk(state, before) {
  if (state.lowScoreStreak >= 3 || state.ceoTrust <= 5 || state.lastDecisionScore <= 10 || (state.eventChain?.step >= 4 && state.lastDecisionScore < 25)) return { type: "CEO DISMISSAL", immediate: true, message: "取締役会の信任を失い、CEOを解任されました。" };
  if (state.cash < balance.severeBankruptcy) return { type: "BANKRUPTCY", immediate: true, message: "資金が深刻な水準まで不足しています。" };
  if (state.cash < 0) return { type: "BANKRUPTCY", message: "現金残高がマイナスです。次四半期までに資金繰りを改善してください。" };
  if (state.marketShare < balance.marketDefeatShare && state.customers < before.customers) return { type: "MARKET DEFEAT", message: "低い市場シェアと顧客減少が同時に続いています。" };
  if (state.satisfaction < balance.collapseSatisfaction && state.developmentLevel < balance.collapseDevelopment) return { type: "BUSINESS COLLAPSE", message: "顧客体験と商品力がともに危険な状態です。" };
  if (state.crisisTurns >= balance.turnaroundDeadline && state.profit < 0) return { type: "FAILED TURNAROUND", message: "CRISIS MODE後も赤字が改善していません。" };
  if (state.month >= balance.timeLimitCheckpoint && companyValue(state) < businessById(state.businessId).initialCash * 1.2 && state.marketShare < 5 && state.customers < state.initialCustomers) return { type: "TIME LIMIT FAILURE", message: "長期低迷が続き、次年度へ進む最低基盤が揺らいでいます。" };
  return null;
}

export function assessSuccess(state) {
  const value = companyValue(state);
  const business = businessById(state.businessId);
  if (state.month >= 12 && value >= balance.acquisitionValue * business.hiddenDifficulty && state.developmentLevel >= 68 && state.brand >= 55) return "ACQUISITION";
  if (state.leaderTurns >= 3) return "MARKET LEADER";
  if (state.month > state.maxMonths && state.profit / Math.max(1, state.revenue) >= balance.sustainableMargin && state.cash > 6000000 && state.satisfaction >= 70 && state.brand >= 50 && state.marketShare >= balance.sustainableShare) return "SUSTAINABLE COMPANY";
  if (state.month > state.maxMonths && value >= Math.max(balance.independentValue, business.initialCash * 5) && state.marketShare >= 10 && state.brand >= 50) return "INDEPENDENT SUCCESS";
  if (state.month > state.maxMonths && value >= business.initialCash * 1.5 && state.cash > 0 && state.profit > 0 && state.satisfaction >= 55 && state.marketShare >= 3) return "LONG-TERM SURVIVAL";
  return null;
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
  const decisionAssessment = evaluateDecision(state, decisions, state.scenario);
  const regime = nextRegime(state);
  const competitors = advanceCompetition(state.competitors, regime, rng, state);
  const execution = resolveExecution({ ...prepared, competitors }, decisions, state.scenario, rng);
  const result = calculateTurn({ ...prepared, competitors }, decisions, state.scenario, rng, execution);
  const ceo = updateCeoStatus(state, decisionAssessment.score, result);
  const dangerMonths = result.cash < -500000 ? state.dangerMonths + 1 : Math.max(0, state.dangerMonths - 1);
  const month = state.month + 1;
  const finished = state.month >= state.maxMonths;
  const business = businessById(state.businessId);
  const totalMarket = Math.max(Math.round(business.marketSize * .3), Math.round(state.totalMarket * ({ INTRODUCTION: 1.02, GROWTH: 1.08, MATURE: 1.01, DECLINE: .95 }[regime]) * business.marketGrowth));
  const marketShare = Math.round(Math.max(0, Math.min(60, result.customers / totalMarket * 100 - result.competition.shareLoss)) * 10) / 10;
  const scheduled = [
    ...(prepared.pendingEffects || []),
    ...(decisions.development ? [{ type: "development", label: "Product Development", value: decisions.development / 55000 * execution.development.multiplier, due: month + 1, cost: decisions.development }] : []),
    ...(execution.hiring.actual ? [{ type: "hiring", label: "New Team Members", value: execution.hiring.actual, due: month + 1, cost: execution.hiring.actualCost }] : [])
  ];
  const chain = updateEventChain(state, result, decisions, marketShare);
  const previous = state.lastDecisions || decisions;
  const decisionStreaks = {
    advertising: decisions.advertising >= previous.advertising && decisions.advertising > state.revenue * .2 ? (state.decisionStreaks?.advertising || 0) + 1 : 0,
    discount: decisions.price < previous.price ? (state.decisionStreaks?.discount || 0) + 1 : 0,
    hiring: decisions.hires >= 3 ? (state.decisionStreaks?.hiring || 0) + 1 : 0,
    development: decisions.development > state.revenue * .25 ? (state.decisionStreaks?.development || 0) + 1 : 0,
    priceChanges: decisions.price !== previous.price ? (state.decisionStreaks?.priceChanges || 0) + 1 : 0,
    repeatedPlan: ["price","advertising","development"].every(key => decisions[key] === previous[key]) && decisions.hires === 0 ? (state.decisionStreaks?.repeatedPlan || 0) + 1 : 0
  };
  const crisisTurns = result.cash < balance.crisisThreshold ? state.crisisTurns + 1 : 0;
  const leaderTurns = marketShare >= balance.marketLeaderShare ? state.leaderTurns + 1 : 0;
  let next = { ...prepared, ...result, month, price: decisions.price, advertising: decisions.advertising,
    employees: Math.max(1, state.employees + execution.hiring.actual - execution.shocks.reduce((sum, shock) => sum + (shock.employeeLoss || 0), 0)), pendingEffects: scheduled, competitors, totalMarket, marketShare, regime, eventChain: chain,
    monthsWithoutDevelopment: decisions.development > 0 ? 0 : state.monthsWithoutDevelopment + 1,
    emergencyDebt: (state.emergencyDebt || 0) + result.emergencyLoan, dangerMonths, crisisTurns, leaderTurns, lastDecisions: { ...decisions }, decisionStreaks,
    ceoTrust: ceo.ceoTrust, lowScoreStreak: ceo.lowScoreStreak, lastDecisionScore: decisionAssessment.score,
    activeCrises: [...execution.shocks.map(shock => shock.label), ...(chain ? [chain.label] : []), ...(state.scenario.modifiers.market < .7 ? [state.scenario.title] : [])], gameOver: false };
  const projectProgress = advanceProject(next);
  next = projectProgress.state;
  const risk = assessRisk(next, before);
  const warningCount = risk && state.warning?.type === risk.type ? state.warningCount + 1 : risk ? 1 : 0;
  const failure = risk && (risk.immediate || warningCount >= balance.warningDuration) ? risk.type : null;
  next = { ...next, warning: failure ? null : risk, warningCount, resultType: failure };
  const success = failure ? null : assessSuccess(next);
  if (success) next.resultType = success;
  if (finished && !next.resultType) next.resultType = "TIME LIMIT FAILURE";
  next.gameOver = Boolean(next.resultType);
  const bankrupt = next.resultType === "BANKRUPTCY";
  const report = { ...result, before: { ...before, marketShare: state.marketShare }, decisions: { ...decisions }, scenario: state.scenario, advice: feedback[state.scenario.advice], decisionScore: decisionAssessment.score, decisionFeedback: decisionAssessment.feedback, executionReport: executionSummary(execution), ceoTrust: next.ceoTrust, bankrupt, finished, warning: next.warning, resultType: next.resultType, regimeChange: regime !== state.regime ? `${state.regime} → ${regime}` : null, competitorSignal: competitorSignal(competitors), competitorActions: competitors.map(c => ({ id: c.id, name: c.name, ...c.lastAction, after: { price: c.price, product: c.product, brand: c.brand, share: c.share } })), marketShareBefore: state.marketShare, marketShareAfter: marketShare, activeCrises: next.activeCrises, appliedEffects: prepared.appliedEffects, projectUpdate: projectProgress.update };
  next.history = [...state.history, report];
  if (!next.gameOver) next.scenario = selectScenario(next, rng);
  return next;
}

export function finalEvaluation(state) {
  const value = companyValue(state);
  const failure = ["BANKRUPTCY","CEO DISMISSAL","MARKET DEFEAT","BUSINESS COLLAPSE","FAILED TURNAROUND","TIME LIMIT FAILURE"].includes(state.resultType);
  const labels = { BANKRUPTCY:"資金が尽き、事業継続が困難になりました。", "CEO DISMISSAL":"判断ミスの連続により取締役会の信任を失い、CEOを解任されました。", "MARKET DEFEAT":"競争力を回復できず、市場から撤退しました。", "BUSINESS COLLAPSE":"商品と顧客体験の崩壊を立て直せませんでした。", "FAILED TURNAROUND":"期限内に再建できませんでした。", "TIME LIMIT FAILURE":"長期停滞から脱し、期限までに持続可能な基盤へ到達できませんでした。", ACQUISITION:"大手企業からの買収提案が成立しました。", "MARKET LEADER":"市場リーダーの地位を確立しました。", "SUSTAINABLE COMPANY":"安定した高収益企業を築きました。", "INDEPENDENT SUCCESS":"独立企業として大きな成長を遂げました。", "LONG-TERM SURVIVAL":"健全な状態で5年間を完走しました。" };
  if (failure) return { grade: "D", value, label: labels[state.resultType], result: state.resultType, analysis: analyzeHistory(state) };
  let score = value / 1000000 + Math.max(0, state.profit) / 120000 + state.satisfaction * .45 + strategyFor(state).score(state);
  const grade = score >= 130 ? "S" : score >= 105 ? "A" : score >= 80 ? "B" : score >= 58 ? "C" : "D";
  return { grade, value, label: labels[state.resultType] || "経営を完走しました。", result: state.resultType, strategy: strategyFor(state).label, analysis: analyzeHistory(state) };
}

function analyzeHistory(state) {
  const ranked = state.history.map((report, index) => ({ index, score: report.decisionScore ?? 50, report })).sort((a,b) => b.score - a.score);
  const label = item => item ? `YEAR ${Math.floor(item.index / 4) + 1} Q${item.index % 4 + 1}` : "—";
  return { best: label(ranked[0]), worst: label(ranked.at(-1)), turningPoint: label(ranked.find(item => item.report.warning) || ranked.at(-1)), years: Math.min(5, Math.ceil(state.history.length / 4)) };
}
