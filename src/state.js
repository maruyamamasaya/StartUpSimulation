import { createCompetitors } from "./competition.js";
import { businessById } from "./data/businesses.js";

export const LIMITS = {
  price: { min: 200, max: 120000, step: 100 }, advertising: { min: 0, max: 1200000, step: 50000 },
  hires: { min: 0, max: 12, step: 1 }, development: { min: 0, max: 1500000, step: 50000 }
};

export function createInitialState(businessId = "saas", rng = Math.random) {
  if (typeof businessId === "function") { rng = businessId; businessId = "saas"; }
  const business = businessById(businessId);
  const customers = Math.round(business.customers * (.92 + rng() * .16));
  const cash = Math.round(business.initialCash * (.94 + rng() * .12));
  const price = business.price;
  const advertising = Math.round(business.initialCash * .025);
  const development = Math.round(business.initialCash * .035);
  return {
    saveVersion: 1, runSeed: Math.floor(rng() * 2147483647), businessId: business.id, initialCustomers: customers,
    month: 1, maxMonths: 20, cash, customers, revenue: customers * price * 3 * business.revenue, profit: 0,
    price, advertising, employees: business.employees, developmentLevel: 42,
    satisfaction: 67, churnRate: .045, brand: 28, scenario: null, strategy: "growth",
    regime: "INTRODUCTION", totalMarket: Math.round(business.marketSize * (.92 + rng() * .16)), marketShare: Math.round(customers / business.marketSize * 1000) / 10,
    competitors: createCompetitors(), pendingEffects: [], eventChain: null, ceoTrust: 70, lowScoreStreak: 0,
    decisionStreaks: { advertising: 0, discount: 0, hiring: 0, development: 0 },
    marketTraits: { priceSensitivity: rng() > .5 ? "HIGH" : "BALANCED", techChange: rng() > .5 ? "FAST" : "STEADY", loyalty: rng() > .5 ? "LOW" : "HIGH" },
    warning: null, warningCount: 0, crisisTurns: 0, leaderTurns: 0, resultType: null,
    monthsWithoutDevelopment: 0, dangerMonths: 0, emergencyDebt: 0, gameOver: false, history: [],
    lastDecisions: { price, advertising, hires: 0, development, emergencyLoan: false }
  };
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const companyValue = state => {
  const business = businessById(state.businessId);
  return Math.round(state.cash + state.customers * (12000 + state.satisfaction * 180) * business.customerValue + state.brand * 180000 * business.brand);
};
