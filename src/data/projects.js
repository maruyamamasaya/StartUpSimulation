export const projects = [
  { id: "new-product", name: "新商品開発", cost: 8000000, duration: 3, description: "新しい主力商品を開発し、競争力の土台を作ります。", effectLabel: "完了時に商品力 +15", effect: { developmentLevel: 15 } },
  { id: "operations", name: "業務効率化", cost: 3500000, duration: 2, description: "業務フローと社内ツールを整備し、継続的に運営費を抑えます。", effectLabel: "完了後の運営費を10%削減", effect: { operatingEfficiency: .9 } },
  { id: "rebrand", name: "ブランド刷新", cost: 4500000, duration: 2, description: "ブランドの見せ方と顧客への約束を再設計します。", effectLabel: "完了時にブランド力 +12", effect: { brand: 12 } },
  { id: "security", name: "セキュリティ強化", cost: 3000000, duration: 2, description: "基盤と運用体制を見直し、顧客からの信頼を高めます。", effectLabel: "完了時に顧客満足度 +8", effect: { satisfaction: 8 } },
  { id: "new-market", name: "新市場開拓", cost: 6000000, duration: 3, description: "新しい顧客層へ販売経路を広げ、市場機会を増やします。", effectLabel: "完了時に市場規模 +20%", effect: { totalMarketMultiplier: 1.2 } }
];

export const projectById = id => projects.find(project => project.id === id);
