export const LIMITS = {
  price: { min: 500, max: 2500, step: 100 }, advertising: { min: 0, max: 600000, step: 50000 },
  hires: { min: 0, max: 8, step: 1 }, development: { min: 0, max: 600000, step: 50000 }
};

export function createInitialState(rng = Math.random) {
  const customers = 760 + Math.floor(rng() * 121);
  const cash = 3600000 + Math.floor(rng() * 500001);
  const price = 1200;
  return {
    month: 1, maxMonths: 20, cash, customers, revenue: customers * price * 3, profit: 0,
    price, advertising: 100000, employees: 8, developmentLevel: 42,
    satisfaction: 67, churnRate: .045, brand: 28, scenario: null, strategy: "growth",
    regime: "INTRODUCTION", totalMarket: 5000 + Math.floor(rng() * 1501), marketShare: 22,
    competitors: createCompetitors(), pendingEffects: [], eventChain: null, chainStep: 0,
    marketTraits: { priceSensitivity: rng() > .5 ? "HIGH" : "BALANCED", techChange: rng() > .5 ? "FAST" : "STEADY", loyalty: rng() > .5 ? "LOW" : "HIGH" },
    monthsWithoutDevelopment: 0, dangerMonths: 0, emergencyDebt: 0, gameOver: false, history: [],
    lastDecisions: { price, advertising: 100000, hires: 0, development: 150000, emergencyLoan: false }
  };
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const companyValue = s => Math.round(s.cash + s.customers * (12000 + s.satisfaction * 180) + s.brand * 180000);
import { createCompetitors } from "./competition.js";
