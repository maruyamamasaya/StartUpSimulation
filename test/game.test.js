import test from "node:test";
import assert from "node:assert/strict";
import { calculateTurn } from "../src/calculations.js";
import { scenarios, selectScenario } from "../src/scenarios.js";
import { createInitialState } from "../src/state.js";
import { advanceTurn, finalEvaluation } from "../src/turn.js";

const scenario = id => scenarios.find(item => item.id === id);

test("aligned advertising decision has a better acquisition outcome", () => {
  const state = createInitialState(() => .5);
  const aligned = calculateTurn(state, { price: 1200, advertising: 250000, hires: 0, development: 150000 }, scenario("ad-boom"), () => .5);
  const ignored = calculateTurn(state, { price: 1200, advertising: 50000, hires: 0, development: 150000 }, scenario("ad-boom"), () => .5);
  assert.equal(aligned.quality, "aligned");
  assert.ok(aligned.newCustomers > ignored.newCustomers * 2);
});

test("support strain rewards hiring with satisfaction and retention", () => {
  const state = { ...createInitialState(() => .5), customers: 1600, employees: 8 };
  const hired = calculateTurn(state, { price: 1200, advertising: 100000, hires: 4, development: 150000 }, scenario("support-strain"), () => .5);
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
  let state = { ...createInitialState(() => .5), cash: -2000000, dangerMonths: 0, scenario: scenario("recession") };
  state = advanceTurn(state, { price: 1200, advertising: 0, hires: 0, development: 0 }, () => .5);
  assert.equal(state.gameOver, false);
  assert.equal(state.dangerMonths, 1);
});
