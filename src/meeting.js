export function executiveMeeting(state) {
  const runway = Math.max(0, Math.floor(state.cash / Math.max(1, -Math.min(state.profit, -250000))));
  return [
    ["CFO", state.cash < 3000000 ? `現金余力は約${runway || 1}四半期です。投資の回収時期を慎重に見ましょう。` : "資金余力はありますが、利益率を守る投資配分が必要です。"],
    ["CMO", state.regime === "GROWTH" ? "市場は成長局面です。認知を止めれば競合にシェアを譲る可能性があります。" : "獲得単価が上がりやすい局面です。既存顧客への訴求も比較してください。"],
    ["CTO", state.competitors.find(c => c.id === "B").product > state.developmentLevel ? "B社の商品力が先行しています。開発投資の効果は次四半期以降に現れます。" : "商品力は維持できています。将来の差別化に向け、開発の継続性を検討しましょう。"],
    ["COO", state.customers / state.employees > 105 ? "顧客数に対する人員余力が薄い状態です。採用は次四半期から効く点に注意してください。" : "現場の余力は保てています。急成長時にも品質を落とさない設計が重要です。"]
  ];
}
