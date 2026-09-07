import { clamp } from "./state.js";
import { decisionQuality, outcomeMultiplier } from "./random.js";
import { strategyFor } from "./strategy.js";
import { businessById } from "./data/businesses.js";
import { chainEffects } from "./growthRisk.js";

export function calculateTurn(state, decisions, scenario, rng = Math.random) {
  const m = scenario.modifiers;
  const strategy = strategyFor(state);
  const business = businessById(state.businessId);
  const customerScale = Math.sqrt(business.customers / 800);
  const regime = { INTRODUCTION: .9, GROWTH: 1.25, MATURE: .78, DECLINE: .58 }[state.regime] || 1;
  const quality = decisionQuality(state, decisions, scenario);
  const luck = outcomeMultiplier(quality, rng);
  const chain = chainEffects(state);
  const adFatigue = Math.max(.55, 1 - (state.decisionStreaks?.advertising || 0) * .1);
  const hiresEffective = decisions.hires * m.hiring;
  const developmentGain = (state.appliedDevelopment || 0) * m.development * business.development;
  const capacityPerEmployee = business.customers / business.employees;
  const capacity = (state.employees + (state.appliedHires || 0) + hiresEffective * .15) * capacityPerEmployee * 1.12 * business.productivity * chain.productivity;
  const staffingRatio = capacity / Math.max(state.customers, 1);
  const pricePressure = Math.max(-.04, (decisions.price - business.price) / business.price * .13 * m.priceSensitivity * business.priceSensitivity * (state.marketTraits.priceSensitivity === "HIGH" ? 1.25 : 1));

  const adCustomers = (decisions.advertising / 2100) * customerScale * m.ad * regime * strategy.ad * business.ad * luck * adFatigue * chain.acquisition;
  const wordOfMouth = state.customers * (state.satisfaction / 100) * (state.brand / 100) * .075 * business.wordOfMouth * luck;
  const marketCustomers = 24 * customerScale * m.market * regime * business.marketGrowth * luck;
  const newCustomers = Math.max(0, Math.round((adCustomers + wordOfMouth + marketCustomers) * clamp(1 - pricePressure * 2.5, .35, 1.35)));

  const neglectPenalty = decisions.development === 0 ? 2.5 + state.monthsWithoutDevelopment * .45 : 0;
  const staffingEffect = (staffingRatio - 1) * 10;
  const priceDissatisfaction = Math.max(0, decisions.price - business.price) / Math.max(170, business.price * .18);
  const satisfaction = clamp(state.satisfaction + developmentGain * .5 * business.satisfaction + staffingEffect - priceDissatisfaction - neglectPenalty + m.satisfaction + chain.satisfaction, 18, 96);
  const churnRate = clamp((.072 - satisfaction * .00048 + pricePressure + Math.max(0, 1 - staffingRatio) * .045) * business.churn * chain.churn, .012, .3);
  const churned = Math.max(0, Math.round(state.customers * churnRate * m.churn * (2 - luck)));
  const customers = Math.min(business.ceiling, Math.max(0, state.customers + newCustomers - churned));
  const revenue = Math.round(customers * decisions.price * 3 * business.revenue);
  const payroll = Math.round((state.employees + decisions.hires) * 55000 * 3 * business.hiringCost);
  const hiringCost = decisions.hires * 160000 * business.hiringCost / m.hiring;
  const scaleCost = customers >= 2500 ? 1.12 : customers >= 1000 ? 1.06 : 1;
  const operatingCost = Math.round((180000 + customers * 70) * 3 * business.operatingCost * scaleCost * chain.operatingCost);
  const debtService = Math.round((state.emergencyDebt || 0) * .04);
  const emergencyLoan = decisions.emergencyLoan ? 2000000 : 0;
  const profit = Math.round(revenue * business.margin - decisions.advertising - decisions.development * business.developmentCost - payroll - hiringCost - operatingCost - debtService);
  const cash = Math.round(state.cash + profit + emergencyLoan);
  const discountDamage = (state.decisionStreaks?.discount || 0) >= 2 ? 1.5 : 0;
  const brand = clamp(state.brand + m.brand + (satisfaction - 62) * .035 + (quality === "aligned" ? .6 : -.15) - discountDamage, 5, 100);
  const developmentLevel = clamp(state.developmentLevel + developmentGain - 1.4, 5, 100);

  return { quality, luck, newCustomers, churned, customers, satisfaction: Math.round(satisfaction), churnRate,
    revenue, profit, cash, payroll, emergencyLoan, brand: Math.round(brand), developmentLevel: Math.round(developmentLevel) };
}
