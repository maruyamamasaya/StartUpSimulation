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

const scenario = id => scenarios.find(item => item.id === id);

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
