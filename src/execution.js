import { clamp } from "./state.js";
import { businessById } from "./data/businesses.js";

function advertisingOutcome(roll) {
  if (roll < .035) return [.05, "広告クリエイティブが刺さらず、配信効果がほぼ止まりました"];
  if (roll < .1) return [.3, "媒体アルゴリズム変更で配信効率が急落しました"];
  if (roll < .28) return [.6, "競合の広告入札強化で獲得効率が低下しました"];
  if (roll < .72) return [.8 + (roll - .28) / .44 * .4, "広告はおおむね想定範囲で配信されました"];
  if (roll < .93) return [1.2 + (roll - .72) / .21 * .3, "訴求が市場の関心とうまく噛み合いました"];
  return [1.5 + (roll - .93) / .07 * .5, "SNSとインフルエンサー経由で偶発的に拡散しました"];
}

function hiringOutcome(planned, resultRoll, costRoll, marketFactor) {
  if (!planned) return { planned: 0, actual: 0, costMultiplier: 1, reason: "採用計画なし" };
  let actual = planned;
  let reason = "計画どおり候補者を確保しました";
  if (resultRoll < .08) { actual = 0; reason = "採用予定者の辞退が重なりました"; }
  else if (resultRoll < .3) { actual = Math.max(0, Math.floor(planned * (.35 + resultRoll))); reason = "採用市場の競争激化により候補者確保に苦戦しました"; }
  else if (resultRoll > .95) { actual = Math.min(planned + 1, 12); reason = "優秀な候補者との接点が想定以上に増えました"; }
  const costMultiplier = marketFactor * (costRoll > .92 ? 1.85 : costRoll > .75 ? 1.3 : .9 + costRoll * .3);
  if (costMultiplier >= 1.5) reason += "。採用単価も大幅に上昇しました";
  return { planned, actual, costMultiplier, reason };
}

function developmentOutcome(roll, surge) {
  if (roll < .025) return { multiplier: -.2, reason: "重大障害により開発成果の一部を失いました" };
  if (roll < .16) return { multiplier: .3, reason: "技術的負債とリリース延期で開発が遅延しました" };
  if (roll < .35) return { multiplier: .65, reason: "想定外の修正対応で進捗が鈍化しました" };
  if (roll > .9) return { multiplier: 1.5, reason: "技術的な突破口が見つかり、想定以上に改善しました" };
  const multiplier = .85 + (roll - .35) / .55 * .45;
  return { multiplier: multiplier * surge, reason: multiplier >= 1.1 ? "開発は想定を上回って進みました" : "開発はおおむね想定範囲で進みました" };
}

export function resolveExecution(state, decisions, scenario, rng = Math.random) {
  const business = businessById(state.businessId);
  const [advertisingMultiplier, advertisingReason] = advertisingOutcome(rng());
  const hiringMarket = scenario.modifiers.hiring < 1 ? 1.35 : 1;
  const hiring = hiringOutcome(decisions.hires, rng(), rng(), hiringMarket * (1 + (state.decisionStreaks?.hiring || 0) * .18));
  const developmentSurge = (decisions.development > Math.max(state.revenue * .3, 300000) ? .82 : 1) * Math.max(.65, 1 - (state.decisionStreaks?.development || 0) * .1);
  const development = developmentOutcome(rng(), developmentSurge);
  const shocks = [];
  const shockChance = .08 + (state.marketShare >= 15 ? .07 : 0) + (state.customers >= 2500 ? .08 : 0);
  const candidates = [
    ["KEY_PERSON_EXIT", "主力社員が突然退職", { employeeLoss: 2, satisfaction: -1 }],
    ["SERVER_OUTAGE", "サーバー障害が発生", { customerLossRate: .025, satisfaction: -5, extraCost: 350000 }],
    ["SECURITY_INCIDENT", "セキュリティ事故への対応が必要", { customerLossRate: .04, satisfaction: -7, extraCost: 600000 }],
    ["MAJOR_ACCOUNT_LOSS", "主要取引先が契約を解除", { customerLossRate: .06, extraCost: 120000 }],
    ["REGULATION_CHANGE", "法規制変更への緊急対応", { developmentPenalty: .35, extraCost: 450000 }],
    ["AD_ACCOUNT_STOP", "広告アカウントが一時停止", { advertisingCap: .05 }],
    ["COST_SPIKE", "原価とインフラ費が急騰", { extraCost: 700000 }]
  ];
  for (let i = 0; i < (state.customers >= 2500 ? 2 : 1); i++) {
    const roll = rng();
    if (roll < shockChance) {
      const picked = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))];
      shocks.push({ id: picked[0], label: picked[1], ...picked[2] });
    }
  }
  const advertising = { plannedSpend: decisions.advertising, multiplier: Math.min(advertisingMultiplier, ...shocks.filter(s => s.advertisingCap != null).map(s => s.advertisingCap), 2), reason: advertisingReason };
  const plannedHiringCost = decisions.hires * 160000 * business.hiringCost / scenario.modifiers.hiring;
  hiring.plannedCost = Math.round(plannedHiringCost);
  hiring.actualCost = Math.round(hiring.actual * 160000 * business.hiringCost / scenario.modifiers.hiring * hiring.costMultiplier);
  development.multiplier = clamp(development.multiplier - shocks.reduce((sum, shock) => sum + (shock.developmentPenalty || 0), 0), -.4, 1.5);
  return { advertising, hiring, development: { plannedInvestment: decisions.development, ...development }, shocks };
}

export function executionSummary(execution) {
  return {
    advertising: { ...execution.advertising, result: execution.advertising.multiplier < .5 ? "期待を大きく下回りました" : execution.advertising.multiplier > 1.4 ? "期待を大きく上回りました" : "想定範囲の成果でした" },
    hiring: execution.hiring,
    development: execution.development,
    shocks: execution.shocks.map(shock => shock.label)
  };
}
