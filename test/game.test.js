import test from "node:test";
import assert from "node:assert/strict";
import { calculateTurn } from "../src/calculations.js";
import { scenarios, selectScenario } from "../src/scenarios.js";
import { createInitialState } from "../src/state.js";
import { advanceTurn, assessRisk, assessSuccess, finalEvaluation } from "../src/turn.js";
import { businesses } from "../src/data/businesses.js";
import { serializeGame, deserializeGame } from "../src/save.js";
import { evaluateDecision, updateCeoStatus } from "../src/decisionScore.js";
import { chainEffects, growthRiskMultiplier, updateEventChain } from "../src/growthRisk.js";
import { resolveExecution, executionSummary } from "../src/execution.js";
import { advanceCompetition, competitivePressure } from "../src/competition.js";
import { executionReportHtml, resultModalHtml, scoreRating } from "../src/ui.js";
import { competitorLabel, competitorTypeLabel, regimeLabel, strategyLabel } from "../src/labels.js";
import { advanceProject, startProject } from "../src/projects.js";
import { projectById, projects } from "../src/data/projects.js";

const scenario = id => scenarios.find(item => item.id === id);
const rngSequence = (...values) => { let index = 0; return () => values[Math.min(index++, values.length - 1)]; };
const stableExecution = decisions => ({ advertising: { plannedSpend: decisions.advertising, multiplier: 1, reason: "test" }, hiring: { planned: decisions.hires, actual: decisions.hires, plannedCost: decisions.hires * 160000, actualCost: decisions.hires * 160000, costMultiplier: 1, reason: "test" }, development: { plannedInvestment: decisions.development, multiplier: 1, reason: "test" }, shocks: [] });

test("aligned advertising decision has a better acquisition outcome", () => {
  const state = createInitialState(() => .5);
  const aligned = calculateTurn(state, { price: 1200, advertising: 250000, hires: 0, development: 150000 }, scenario("ad-boom"), () => .5);
  const ignored = calculateTurn(state, { price: 1200, advertising: 50000, hires: 0, development: 150000 }, scenario("ad-boom"), () => .5);
  assert.equal(aligned.quality, "aligned");
  assert.ok(aligned.newCustomers > ignored.newCustomers * 2);
});

test("support capacity improves after delayed hiring becomes active", () => {
  const state = { ...createInitialState(() => .5), customers: 400, employees: 8 };
  const hired = calculateTurn({ ...state, appliedHires: 4 }, { price: 1200, advertising: 100000, hires: 0, development: 150000 }, scenario("support-strain"), () => .5);
  const adsOnly = calculateTurn(state, { price: 1200, advertising: 300000, hires: 0, development: 150000 }, scenario("support-strain"), () => .5);
  assert.ok(hired.satisfaction > adsOnly.satisfaction);
  assert.ok(hired.churned < adsOnly.churned);
});

test("neglect and high customer load make relevant scenarios more likely", () => {
  const state = { ...createInitialState(() => .5), customers: 3000, employees: 5, monthsWithoutDevelopment: 8, satisfaction: 40 };
  const weights = Object.fromEntries(scenarios.map(item => [item.id, item.weight(state)]));
  assert.ok(weights["support-strain"] > weights["market-growth"]);
  assert.ok(weights["competitor-update"] > 2);
});

test("scenario selection does not immediately repeat", () => {
  const state = createInitialState(() => .5);
  state.scenario = scenario("market-growth");
  assert.notEqual(selectScenario(state, () => 0).id, "market-growth");
});

test("game ends after 20 quarters and receives an evaluation", () => {
  let state = createInitialState(() => .5);
  state.month = 20;
  state.scenario = scenario("recovery");
  state = advanceTurn(state, state.lastDecisions, () => .5);
  assert.equal(state.gameOver, true);
  assert.match(finalEvaluation(state).grade, /^[SABCD]$/);
});

test("the initial release has all 20 requested market signals", () => {
  assert.equal(scenarios.length, 20);
});

test("development and hiring are shown as pending before their effects apply", () => {
  let state = createInitialState(() => .5);
  state.scenario = scenario("market-growth");
  state = advanceTurn(state, { price: 1200, advertising: 100000, hires: 2, development: 300000 }, () => .5);
  assert.equal(state.pendingEffects.length, 2);
  assert.equal(state.pendingEffects[0].due, 3);
});

test("market regime and competitors progress with the company", () => {
  let state = createInitialState(() => .8);
  state.month = 5;
  state.regime = "INTRODUCTION";
  state.scenario = scenario("recovery");
  state = advanceTurn(state, state.lastDecisions, () => .9);
  assert.equal(state.regime, "GROWTH");
  assert.equal(state.competitors.length, 3);
  assert.ok(state.totalMarket > 0);
});

test("bankruptcy requires sustained or severe cash trouble", () => {
  let state = { ...createInitialState(() => .5), cash: -600000, dangerMonths: 1, scenario: scenario("recession") };
  state = advanceTurn(state, { price: 500, advertising: 600000, hires: 8, development: 600000 }, () => .5);
  assert.equal(state.gameOver, true);
  assert.equal(state.history.at(-1).bankrupt, true);
});

test("a single modest deficit does not immediately end the game", () => {
  let state = { ...createInitialState(() => .5), cash: 100000, dangerMonths: 0, scenario: scenario("recession") };
  state = advanceTurn(state, { price: 200, advertising: 0, hires: 0, development: 0 }, () => .5);
  assert.equal(state.gameOver, false);
  assert.equal(state.warning.type, "BANKRUPTCY");
});

test("all ten businesses create distinct company scales without exposing difficulty", () => {
  assert.equal(businesses.length, 10);
  const saas = createInitialState("saas", () => .5);
  const consulting = createInitialState("consulting", () => .5);
  assert.notEqual(saas.price, consulting.price);
  assert.notEqual(saas.customers, consulting.customers);
  assert.equal("hiddenDifficulty" in saas, false);
});

test("business multipliers materially change the same nominal decision", () => {
  const saas = createInitialState("saas", () => .5);
  const mobile = createInitialState("mobile", () => .5);
  const decisions = { price: 1200, advertising: 200000, hires: 0, development: 0 };
  const a = calculateTurn({ ...saas, price: 1200 }, decisions, scenario("ad-boom"), () => .5);
  const b = calculateTurn({ ...mobile, price: 1200 }, decisions, scenario("ad-boom"), () => .5);
  assert.notEqual(a.newCustomers, b.newCustomers);
});

test("warnings precede sustained market defeat", () => {
  const before = { customers: 100 };
  const state = { ...createInitialState(() => .5), customers: 90, marketShare: 2, cash: 3000000 };
  assert.equal(assessRisk(state, before).type, "MARKET DEFEAT");
});

test("all failure modes are derived from observable company conditions", () => {
  const base = createInitialState(() => .5);
  assert.equal(assessRisk({ ...base, cash: -3000000 }, { customers: base.customers }).type, "BANKRUPTCY");
  assert.equal(assessRisk({ ...base, satisfaction: 20, developmentLevel: 10 }, { customers: base.customers }).type, "BUSINESS COLLAPSE");
  assert.equal(assessRisk({ ...base, cash: 1000000, crisisTurns: 3, profit: -1 }, { customers: base.customers }).type, "FAILED TURNAROUND");
  assert.equal(assessRisk({ ...base, month: 13, cash: 100000, customers: 1, initialCustomers: 100, marketShare: 4, brand: 5 }, { customers: 1 }).type, "TIME LIMIT FAILURE");
});

test("market leadership is recognized as a success route", () => {
  const state = { ...createInitialState(() => .5), leaderTurns: 3 };
  assert.equal(assessSuccess(state), "MARKET LEADER");
});

test("a valuable differentiated company can reach acquisition", () => {
  const state = { ...createInitialState(() => .5), month: 12, cash: 200000000, developmentLevel: 80, brand: 80 };
  assert.equal(assessSuccess(state), "ACQUISITION");
});

test("save data round-trips the complete game state", () => {
  const state = createInitialState("education", () => .5);
  assert.deepEqual(deserializeGame(serializeGame(state)), state);
});

test("a long-term project charges its full cost when started and enforces one active project", () => {
  const base = { ...createInitialState(() => .5), cash: 20000000 };
  const started = startProject(base, "new-product");
  assert.equal(started.error, null);
  assert.equal(started.state.cash, base.cash - projectById("new-product").cost);
  assert.equal(started.state.activeProject.remaining, 3);
  assert.match(startProject(started.state, "rebrand").error, /1件/);
});

test("a project cannot start without enough cash", () => {
  const state = { ...createInitialState(() => .5), cash: 1 };
  const attempted = startProject(state, "security");
  assert.match(attempted.error, /資金/);
  assert.equal(attempted.state, state);
});

test("a project advances each quarter and applies its effect only on completion", () => {
  const project = projectById("new-product");
  let state = { ...createInitialState(() => .5), activeProject: { id: project.id, remaining: project.duration, duration: project.duration } };
  const initialLevel = state.developmentLevel;
  let progress = advanceProject(state);
  assert.equal(progress.state.activeProject.remaining, 2);
  assert.equal(progress.state.developmentLevel, initialLevel);
  progress = advanceProject(progress.state);
  progress = advanceProject(progress.state);
  assert.equal(progress.state.activeProject, null);
  assert.equal(progress.state.developmentLevel, initialLevel + 15);
  assert.deepEqual(progress.state.completedProjects, [project.id]);
});

test("project progress survives save and continue deserialization", () => {
  const state = { ...createInitialState(() => .5), activeProject: { id: "operations", remaining: 1, duration: 2 } };
  assert.deepEqual(deserializeGame(serializeGame(state)).activeProject, state.activeProject);
  const legacy = { ...state }; delete legacy.activeProject; delete legacy.completedProjects; delete legacy.operatingEfficiency;
  const restored = deserializeGame(JSON.stringify(legacy));
  assert.equal(restored.activeProject, null);
  assert.deepEqual(restored.completedProjects, []);
  assert.equal(restored.operatingEfficiency, 1);
  assert.equal(projects.length, 5);
});

test("a balanced, signal-aware decision receives a high decision score", () => {
  const state = createInitialState("saas", () => .5);
  const decision = { price: state.price, advertising: state.advertising + 50000, hires: 0, development: state.development + 50000 };
  assert.ok(evaluateDecision(state, decision, scenario("ad-boom")).score >= 80);
});

test("an unaffordable and operationally reckless decision receives a low score", () => {
  const state = { ...createInitialState("saas", () => .5), cash: 600000, customers: 4000, employees: 4, monthsWithoutDevelopment: 4 };
  const decision = { price: 200, advertising: 1200000, hires: 0, development: 0 };
  assert.ok(evaluateDecision(state, decision, scenario("quality-issue")).score < 40);
});

test("decision score is independent from random outcome luck", () => {
  const state = createInitialState("saas", () => .5);
  const decision = { ...state.lastDecisions, advertising: state.advertising + 50000 };
  const score = evaluateDecision(state, decision, scenario("ad-boom")).score;
  calculateTurn(state, decision, scenario("ad-boom"), () => 0);
  assert.equal(evaluateDecision(state, decision, scenario("ad-boom")).score, score);
});

test("consecutive scores below 60 accelerate loss of CEO trust", () => {
  let state = createInitialState(() => .5);
  const first = updateCeoStatus(state, 50, { profit: -1, customers: state.customers - 1 });
  state = { ...state, ...first };
  const second = updateCeoStatus(state, 50, { profit: -1, customers: state.customers - 1 });
  assert.equal(second.lowScoreStreak, 2);
  assert.ok(second.ceoTrust < first.ceoTrust - 8);
});

test("three consecutive serious mistakes dismiss the CEO", () => {
  const state = { ...createInitialState(() => .5), lowScoreStreak: 3, ceoTrust: 40, lastDecisionScore: 50 };
  assert.equal(assessRisk(state, { customers: state.customers }).type, "CEO DISMISSAL");
});

test("one mild mistake does not end the game", () => {
  const state = { ...createInitialState(() => .5), lowScoreStreak: 1, ceoTrust: 62, lastDecisionScore: 58 };
  assert.notEqual(assessRisk(state, { customers: state.customers })?.type, "CEO DISMISSAL");
});

test("successful companies have a higher weighted risk-event exposure", () => {
  const base = createInitialState(() => .5);
  const grown = { ...base, customers: 3000, marketShare: 26, brand: 75 };
  assert.ok(growthRiskMultiplier(grown) > growthRiskMultiplier(base) * 2);
});

test("an ignored event chain escalates and worsens operating outcomes", () => {
  const state = { ...createInitialState(() => .5), customers: 2000, employees: 5, eventChain: { id: "talent", step: 1, label: "人材不足チェーン" } };
  const ignored = { price: state.price, advertising: 0, hires: 0, development: 0 };
  const chain = updateEventChain(state, { customers: state.customers, cash: state.cash, satisfaction: state.satisfaction }, ignored, 10);
  assert.equal(chain.step, 2);
  assert.ok(chainEffects({ ...state, eventChain: chain }).churn > chainEffects(state).churn);
});

test("an appropriate response recovers and clears an event chain", () => {
  const state = { ...createInitialState(() => .5), eventChain: { id: "talent", step: 2, label: "人材不足チェーン" } };
  const response = { ...state.lastDecisions, hires: 2 };
  const recovering = updateEventChain(state, state, response, 10);
  assert.equal(recovering.step, 1);
  assert.equal(recovering.recovering, true);
  assert.equal(updateEventChain({ ...state, eventChain: recovering }, state, response, 10), null);
});

test("competitor price gaps directly affect acquisition and churn", () => {
  const state = createInitialState("saas", () => .5); const decisions = { ...state.lastDecisions, price: state.price };
  const cheap = state.competitors.map(item => ({ ...item, price: state.price * .45 }));
  const expensive = state.competitors.map(item => ({ ...item, price: state.price * 1.1 }));
  const threatened = competitivePressure(state, decisions, cheap); const comfortable = competitivePressure(state, decisions, expensive);
  assert.ok(threatened.acquisition < comfortable.acquisition); assert.ok(threatened.churn > comfortable.churn);
});

test("competitor product, brand and share materially increase share pressure", () => {
  const state = { ...createInitialState(() => .5), developmentLevel: 45, brand: 35 };
  const weak = state.competitors.map(item => ({ ...item, product: 25, brand: 20, share: 10 }));
  const dominant = state.competitors.map(item => ({ ...item, product: 90, brand: 90, share: 45 }));
  assert.ok(competitivePressure(state, state.lastDecisions, dominant).shareLoss > competitivePressure(state, state.lastDecisions, weak).shareLoss);
});

test("targeted major competitor actions can reverse share rapidly", () => {
  const state = { ...createInitialState(() => .5), marketShare: 24 }; const moved = advanceCompetition(state.competitors, "GROWTH", () => .99, state);
  assert.ok(moved.reduce((sum, item, index) => sum + item.share - state.competitors[index].share, 0) >= 14); assert.ok(moved.some(item => item.lastAction.type === "FREE_PLAN"));
});

test("planned hiring can produce fewer actual hires", () => {
  const state = createInitialState(() => .5); const decisions = { ...state.lastDecisions, hires: 5 };
  const execution = resolveExecution(state, decisions, scenario("talent-shortage"), rngSequence(.5, .1, .5, .5, .5));
  assert.ok(execution.hiring.actual < execution.hiring.planned);
});

test("actual hiring cost can substantially exceed plan", () => {
  const state = createInitialState(() => .5); const decisions = { ...state.lastDecisions, hires: 4 };
  const execution = resolveExecution(state, decisions, scenario("talent-shortage"), rngSequence(.5, .5, .99, .5, .5));
  assert.ok(execution.hiring.actualCost > execution.hiring.plannedCost * 1.5);
});

test("advertising execution supports near-zero and near-double outcomes", () => {
  const state = createInitialState(() => .5);
  const low = resolveExecution(state, state.lastDecisions, scenario("ad-boom"), rngSequence(.01, .5, .5, .5, .5));
  const high = resolveExecution(state, state.lastDecisions, scenario("ad-boom"), rngSequence(.999, .5, .5, .5, .5));
  assert.ok(low.advertising.multiplier <= .05); assert.ok(high.advertising.multiplier >= 1.9);
});

test("development execution supports delay and exceptional success", () => {
  const state = createInitialState(() => .5);
  const delayed = resolveExecution(state, state.lastDecisions, scenario("quality-issue"), rngSequence(.5, .5, .5, .1, .5));
  const success = resolveExecution(state, state.lastDecisions, scenario("quality-issue"), rngSequence(.5, .5, .5, .95, .5));
  assert.ok(delayed.development.multiplier <= .3); assert.ok(success.development.multiplier >= 1.45);
});

test("execution randomness does not directly alter decision score", () => {
  const state = createInitialState(() => .5); const decisions = { ...state.lastDecisions, advertising: state.advertising + 50000 };
  const before = evaluateDecision(state, decisions, scenario("ad-boom")).score;
  resolveExecution(state, decisions, scenario("ad-boom"), () => 0); resolveExecution(state, decisions, scenario("ad-boom"), () => .999);
  assert.equal(evaluateDecision(state, decisions, scenario("ad-boom")).score, before);
});

test("repeating the same advertising plan reduces its efficiency", () => {
  const state = createInitialState(() => .5); const decisions = { ...state.lastDecisions, advertising: 300000 };
  const fresh = calculateTurn(state, decisions, scenario("ad-boom"), () => .5, stableExecution(decisions));
  const fatigued = calculateTurn({ ...state, decisionStreaks: { ...state.decisionStreaks, advertising: 4 } }, decisions, scenario("ad-boom"), () => .5, stableExecution(decisions));
  assert.ok(fatigued.newCustomers < fresh.newCustomers);
});

test("rapid growth can produce multiple simultaneous crises", () => {
  const state = { ...createInitialState(() => .5), customers: 3000, marketShare: 22 };
  const execution = resolveExecution(state, state.lastDecisions, scenario("recession"), rngSequence(.5, .5, .5, .5, 0, 0, 0, .2));
  assert.equal(execution.shocks.length, 2);
});

test("execution report includes plans, actuals, reasons and competitor changes", () => {
  const decisions = { price: 1200, advertising: 300000, hires: 4, development: 300000 }; const execution = stableExecution(decisions);
  const report = { executionReport: executionSummary(execution), competitorActions: [{ id: "A", name: "A COMPANY", type: "PRICE_CUT", before: { price: 850, product: 38, brand: 34, share: 31 }, after: { price: 720, product: 38, brand: 34, share: 35 } }], marketShareBefore: 23, marketShareAfter: 18 };
  const html = executionReportHtml(report);
  assert.match(html, /予定 4人 ／ 実績 4人/); assert.match(html, /test/); assert.match(html, /23% → 18%/); assert.match(html, /A社/);
});

test("result modal reuses exact report values and omits absent risk events", () => {
  const report = { decisionScore: 86, decisionFeedback: ["判断の根拠"], ceoTrust: 82, before: { customers: 3820, satisfaction: 71 }, customers: 4210, satisfaction: 74, profit: 1240000, marketShareBefore: 7.7, marketShareAfter: 8.4, scenario: { title: "広告の追い風" }, advice: "商品力も確認しましょう", competitorSignal: "B社が値下げしました", executionReport: { advertising: { reason: "想定以上の成果" }, hiring: { planned: 5, actual: 3 }, development: { reason: "成果は次期以降" }, shocks: [] }, competitorActions: [{ id: "B", type: "PRICE_CUT" }] };
  const html = resultModalHtml(report, 7);
  assert.match(html, /YEAR 2 \/ Q3 RESULT/);
  assert.match(html, /data-score="86"/);
  assert.match(html, /3,820 → 4,210/);
  assert.match(html, /7\.7% → 8\.4%/);
  assert.match(html, /82 \/ 100/);
  assert.match(html, /B社が値下げ/);
  assert.doesNotMatch(html, /重大リスク|undefined/);
});

test("result modal displays risk events only when present and keeps score bands", () => {
  const report = { decisionScore: 59, decisionFeedback: [], ceoTrust: 40, before: { customers: 10, satisfaction: 50 }, customers: 8, satisfaction: 45, profit: -100, marketShareBefore: 2, marketShareAfter: 1.5, executionReport: { shocks: ["サーバー障害が発生"] } };
  assert.match(resultModalHtml(report), /重大リスク: サーバー障害が発生/);
  assert.equal(scoreRating(90).label, "非常に良い判断");
  assert.equal(scoreRating(70).label, "堅実な判断");
  assert.equal(scoreRating(60).label, "やや危険");
  assert.equal(scoreRating(59).label, "危険な判断");
});

test("UI labels translate regimes, competitor types and strategies without changing internal values", () => {
  assert.equal(regimeLabel("INTRODUCTION"), "導入期");
  assert.equal(regimeLabel("DECLINE"), "衰退期");
  assert.equal(competitorTypeLabel("LOW COST"), "低価格型");
  assert.equal(competitorTypeLabel("PRODUCT"), "商品力重視");
  assert.equal(strategyLabel("GROWTH"), "成長重視");
  assert.equal(strategyLabel("product"), "商品重視");
  assert.equal(competitorLabel({ id: "B", name: "B COMPANY" }), "B社");
});
