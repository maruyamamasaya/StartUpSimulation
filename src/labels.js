const regimeLabels = {
  INTRODUCTION: "導入期",
  GROWTH: "成長期",
  MATURE: "成熟期",
  DECLINE: "衰退期"
};

const competitorTypeLabels = {
  "LOW COST": "低価格型",
  PRODUCT: "商品力重視",
  BRAND: "ブランド重視"
};

const strategyLabels = {
  growth: "成長重視",
  profit: "利益重視",
  premium: "高付加価値",
  product: "商品重視",
  brand: "ブランド重視"
};

export const regimeLabel = regime => regimeLabels[regime] || regime;
export const competitorTypeLabel = type => competitorTypeLabels[type] || type;
export const strategyLabel = strategy => strategyLabels[String(strategy).toLowerCase()] || strategy;
export const competitorLabel = competitor => competitor?.id ? `${competitor.id}社` : competitor?.name || "";
