export const strategies = {
  growth: { label: "GROWTH", description: "成長最優先。広告・市場シェアを重視します。", ad: 1.16, price: 1, score: s => s.marketShare * 2.2 + s.customers / 90 + s.revenue / 1000000 },
  profit: { label: "PROFIT", description: "利益率と資金の強さを重視します。", ad: .86, price: 1.05, score: s => Math.max(0, s.profit / Math.max(s.revenue, 1)) * 700 + s.cash / 180000 },
  premium: { label: "PREMIUM", description: "高品質・高価格・信頼を積み上げます。", ad: .94, price: 1.16, score: s => s.satisfaction * .7 + s.brand * .8 + s.price / 45 - s.churnRate * 200 },
  product: { label: "PRODUCT", description: "商品力と技術優位を将来の成長につなげます。", ad: .96, price: 1.04, score: s => s.developmentLevel * 1.1 + s.satisfaction * .45 + s.customers / 180 },
  brand: { label: "BRAND", description: "ブランドと顧客ロイヤルティを重視します。", ad: 1.03, price: 1.08, score: s => s.brand * 1.2 + s.satisfaction * .65 + s.marketShare }
};

export const strategyFor = state => strategies[state.strategy] || strategies.growth;
