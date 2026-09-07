const base = { market: 1, ad: 1, churn: 1, hiring: 1, development: 1, priceSensitivity: 1, satisfaction: 0, brand: 0 };

export const scenarios = [
  { id: "market-growth", category: "GROWTH", title: "市場が拡大しています", description: "業界への関心が高まり、これまで届かなかった層が商品を探し始めています。", modifiers: { market: 1.55, ad: 1.2 }, advice: "market", weight: s => 1.2 + s.brand / 100 },
  { id: "ad-boom", category: "OPPORTUNITY", title: "広告の追い風が吹いています", description: "関連メディアへのアクセスが急増し、競合各社も広告出稿を増やしています。", modifiers: { ad: 1.75, market: 1.15 }, advice: "advertising", weight: () => 1.15 },
  { id: "price-war", category: "COMPETITION", title: "競合が大幅値下げ", description: "価格比較サイトからの流入が増え、顧客はいつも以上に価格を見比べています。", modifiers: { priceSensitivity: 1.8, churn: 1.25, market: 1.1 }, advice: "price", weight: s => 1 + Math.max(0, s.price - 1200) / 600 },
  { id: "competitor-update", category: "PRODUCT", title: "競合が大型アップデート", description: "既存顧客からも「最近は新機能が少ない」という声が出始めています。", modifiers: { development: 1.8, churn: 1.3, ad: .72 }, advice: "development", weight: s => 1 + s.monthsWithoutDevelopment * .25 },
  { id: "social-backlash", category: "REPUTATION", title: "SNSで批判が拡散", description: "期待と実際の体験に差があるという投稿が注目され、慎重な対応が必要です。", modifiers: { churn: 1.5, ad: .65, satisfaction: -5, brand: -2 }, advice: "stability", weight: s => .6 + Math.max(0, 65 - s.satisfaction) / 20 },
  { id: "word-of-mouth", category: "MOMENTUM", title: "好意的な口コミが拡散", description: "利用者の紹介投稿が話題です。良い体験が次の顧客を呼び込んでいます。", modifiers: { market: 1.25, satisfaction: 2, brand: 3 }, advice: "momentum", weight: s => .5 + Math.max(0, s.satisfaction - 55) / 18 },
  { id: "talent-shortage", category: "PEOPLE", title: "採用市場がひっ迫", description: "経験者の採用競争が激化しています。増員には通常より大きなコストがかかります。", modifiers: { hiring: .65 }, advice: "people", weight: s => .7 + Math.max(0, s.customers / Math.max(s.employees, 1) - 135) / 120 },
  { id: "hiring-tailwind", category: "PEOPLE", title: "採用市場に好機", description: "優秀な人材が市場に増えています。組織の余力を作る機会かもしれません。", modifiers: { hiring: 1.65 }, advice: "hiring", weight: s => .9 + Math.max(0, s.customers / Math.max(s.employees, 1) - 100) / 100 },
  { id: "recession", category: "ECONOMY", title: "景気後退の兆し", description: "企業や家庭で支出を見直す動きが広がり、価格への視線が厳しくなっています。", modifiers: { market: .62, ad: .78, priceSensitivity: 1.45 }, advice: "efficiency", weight: () => .9 },
  { id: "recovery", category: "ECONOMY", title: "景況感が回復", description: "消費意欲が戻り始め、品質の良い商品には前向きな支出が見込まれます。", modifiers: { market: 1.4, ad: 1.15, priceSensitivity: .75 }, advice: "growth", weight: () => .9 },
  { id: "support-strain", category: "CUSTOMER", title: "サポートの遅れに不満", description: "SNSで対応の遅さを指摘する声が増加。顧客数に対して人手が足りていません。", modifiers: { hiring: 1.75, churn: 1.45, satisfaction: -4, ad: .7 }, advice: "support", weight: s => .5 + Math.max(0, s.customers / Math.max(s.employees, 1) - 105) / 45 },
  { id: "quality-issue", category: "PRODUCT", title: "商品品質に黄色信号", description: "細かな不具合の報告が重なり、顧客は改善の姿勢を注視しています。", modifiers: { development: 1.65, churn: 1.45, satisfaction: -4 }, advice: "quality", weight: s => .6 + s.monthsWithoutDevelopment * .22 }
].map(s => ({ ...s, modifiers: { ...base, ...s.modifiers } }));

export function selectScenario(state, rng = Math.random) {
  const candidates = scenarios.filter(s => s.id !== state.scenario?.id);
  const weights = candidates.map(s => Math.max(.1, s.weight(state)));
  let cursor = rng() * weights.reduce((sum, value) => sum + value, 0);
  return candidates.find((_, index) => (cursor -= weights[index]) <= 0) ?? candidates.at(-1);
}
