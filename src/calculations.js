import { clamp } from "./state.js";
import { decisionQuality, outcomeMultiplier } from "./random.js";

export function calculateTurn(state, decisions, scenario, rng = Math.random) {
  const m = scenario.modifiers;
  const quality = decisionQuality(state, decisions, scenario);
  const luck = outcomeMultiplier(quality, rng);
  const hiresEffective = decisions.hires * m.hiring;
  const developmentGain = (decisions.development / 55000) * m.development;
  const capacity = (state.employees + hiresEffective * .7) * 115;
  const staffingRatio = capacity / Math.max(state.customers, 1);
  const pricePressure = Math.max(-.04, (decisions.price - 1200) / 1200 * .13 * m.priceSensitivity);

  const adCustomers = (decisions.advertising / 2100) * m.ad * luck;
  const wordOfMouth = state.customers * (state.satisfaction / 100) * (state.brand / 100) * .075 * luck;
  const marketCustomers = 24 * m.market * luck;
  const newCustomers = Math.max(0, Math.round((adCustomers + wordOfMouth + marketCustomers) * clamp(1 - pricePressure * 2.5, .35, 1.35)));

  const neglectPenalty = decisions.development === 0 ? 2.5 + state.monthsWithoutDevelopment * .45 : 0;
  const staffingEffect = (staffingRatio - 1) * 10;
  const priceDissatisfaction = Math.max(0, decisions.price - 1150) / 170;
  const satisfaction = clamp(state.satisfaction + developmentGain * .5 + staffingEffect - priceDissatisfaction - neglectPenalty + m.satisfaction, 18, 96);
  const churnRate = clamp(.072 - satisfaction * .00048 + pricePressure + Math.max(0, 1 - staffingRatio) * .045, .012, .24);
  const churned = Math.max(0, Math.round(state.customers * churnRate * m.churn * (2 - luck)));
  const customers = Math.max(0, state.customers + newCustomers - churned);
  const revenue = customers * decisions.price;
  const payroll = (state.employees + decisions.hires) * 55000;
  const hiringCost = decisions.hires * 160000 / m.hiring;
  const operatingCost = 180000 + customers * 70;
  const profit = Math.round(revenue - decisions.advertising - decisions.development - payroll - hiringCost - operatingCost);
  const cash = Math.round(state.cash + profit);
  const brand = clamp(state.brand + m.brand + (satisfaction - 62) * .035 + (quality === "aligned" ? .6 : -.15), 5, 100);
  const developmentLevel = clamp(state.developmentLevel + developmentGain - 1.4, 5, 100);

  return { quality, luck, newCustomers, churned, customers, satisfaction: Math.round(satisfaction), churnRate,
    revenue, profit, cash, payroll, brand: Math.round(brand), developmentLevel: Math.round(developmentLevel) };
}
