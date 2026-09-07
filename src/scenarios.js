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
  ,{ id: "new-segment", category: "GROWTH", title: "新しい顧客層が現れました", description: "これまでとは異なる利用者がカテゴリに関心を示しています。届き方と価格の見直しが問われそうです。", modifiers: { market: 1.32, ad: 1.2 }, advice: "market", weight: () => .8 }
  ,{ id: "overseas-demand", category: "GROWTH", title: "海外需要の兆し", description: "国外からの問い合わせが増えています。まずは商品体験の土台を整えることが重要になりそうです。", modifiers: { market: 1.25, development: 1.2 }, advice: "development", weight: s => .5 + s.developmentLevel / 180 }
  ,{ id: "competitor-exit", category: "COMPETITION", title: "競合企業が撤退", description: "比較対象がひとつ減りました。短期の獲得だけでなく、受け皿となる運営体制が試されます。", modifiers: { market: 1.38, ad: 1.15 }, advice: "support", weight: () => .55 }
  ,{ id: "big-company-entry", category: "COMPETITION", title: "大企業が市場参入", description: "知名度のある新規参入が発表されました。価格だけに頼らない顧客体験が重要になりそうです。", modifiers: { churn: 1.28, ad: .82, priceSensitivity: 1.25 }, advice: "quality", weight: s => .45 + Math.max(0, s.profit) / 2000000 }
  ,{ id: "key-account", category: "CUSTOMER", title: "大口顧客から要望", description: "重要顧客が機能と対応品質への期待を伝えてきました。目先の売上と将来の信頼の配分が問われます。", modifiers: { development: 1.35, satisfaction: -2 }, advice: "development", weight: s => .55 + s.customers / 5000 }
  ,{ id: "cost-increase", category: "ECONOMY", title: "原価・インフラ費が上昇", description: "運営コストに上昇圧力があります。成長投資の速度と収益性を見比べる局面です。", modifiers: { market: .92, churn: 1.08 }, advice: "efficiency", weight: () => .8 }
  ,{ id: "funding-improves", category: "ECONOMY", title: "投資環境が改善", description: "市場の期待が高まり、成長企業に注目が集まっています。持続できる成長の根拠が重要になりそうです。", modifiers: { market: 1.18, ad: 1.1 }, advice: "growth", weight: () => .65 }
  ,{ id: "employee-overload", category: "PEOPLE", title: "社員の負荷が増大", description: "チームの疲弊が見え始めています。目先の獲得より、組織が続く速度を考える必要があります。", modifiers: { churn: 1.25, satisfaction: -3, hiring: 1.4 }, advice: "hiring", weight: s => .4 + Math.max(0, s.customers / Math.max(1, s.employees) - 115) / 70 }
].map(s => ({ ...s, modifiers: { ...base, ...s.modifiers } }));

export function selectScenario(state, rng = Math.random) {
  const candidates = scenarios.filter(s => s.id !== state.scenario?.id);
  const weights = candidates.map(s => Math.max(.1, s.weight(state)));
  let cursor = rng() * weights.reduce((sum, value) => sum + value, 0);
  return candidates.find((_, index) => (cursor -= weights[index]) <= 0) ?? candidates.at(-1);
}
