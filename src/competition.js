import { clamp } from "./state.js";

const seed = [
  { id: "A", name: "A COMPANY", type: "LOW COST", price: 850, product: 38, brand: 34, share: 31 },
  { id: "B", name: "B COMPANY", type: "PRODUCT", price: 1550, product: 72, brand: 48, share: 27 },
  { id: "C", name: "C COMPANY", type: "BRAND", price: 1450, product: 56, brand: 76, share: 20 }
];
export const createCompetitors = (marketPrice = 1200) => seed.map(item => ({ ...item, price: Math.round(marketPrice * ({ A: .7, B: 1.3, C: 1.2 }[item.id])) }));

const typeWeight = { "LOW COST": { price: 1.35, product: .75, brand: .8 }, PRODUCT: { price: .75, product: 1.4, brand: .9 }, BRAND: { price: .65, product: .9, brand: 1.45 } };

export function competitivePressure(state, decisions, competitors = state.competitors) {
  const totalShare = Math.max(1, competitors.reduce((sum, item) => sum + item.share, 0));
  let pressure = 0;
  for (const competitor of competitors) {
    const weight = typeWeight[competitor.type] || { price: 1, product: 1, brand: 1 };
    const priceGap = (decisions.price - competitor.price) / Math.max(competitor.price, 1);
    const priceThreat = Math.max(-.35, Math.min(1.6, priceGap)) * weight.price;
    const productThreat = (competitor.product - state.developmentLevel) / 100 * weight.product;
    const brandThreat = (competitor.brand - state.brand) / 100 * weight.brand;
    pressure += (priceThreat + productThreat + brandThreat) * competitor.share / totalShare;
  }
  const cheapest = Math.min(...competitors.map(item => item.price));
  const premiumWithoutAdvantage = decisions.price > cheapest * 1.65 && state.developmentLevel < Math.max(...competitors.map(c => c.product)) && state.brand < Math.max(...competitors.map(c => c.brand));
  return {
    acquisition: clamp(1 - pressure * .42, .28, 1.45),
    churn: clamp(1 + pressure * .55 + (premiumWithoutAdvantage ? .45 : 0), .7, 2.2),
    brand: premiumWithoutAdvantage ? -2.5 : decisions.price < cheapest * .7 ? -1.8 : 0,
    shareLoss: Math.max(0, pressure * 2.8), cheapest, pressure, premiumWithoutAdvantage
  };
}

export function advanceCompetition(competitors, regime, rng = Math.random, player = {}) {
  return competitors.map((competitor, index) => {
    const move = rng();
    const targeted = (player.marketShare || 0) >= 15;
    const before = { price: competitor.price, product: competitor.product, brand: competitor.brand, share: competitor.share };
    if (competitor.id === "A" && move > (targeted ? .42 : .58)) { const major = move > .88; const price = Math.max(0, competitor.price - (major ? competitor.price : 130)); const shareGain = major ? 6 : 3; return { ...competitor, price, share: competitor.share + shareGain, lastAction: { type: major ? "FREE_PLAN" : "PRICE_CUT", shareGain, before }, signal: major ? "A社が無料プランを投入し、一気に顧客獲得へ動きました。" : "A社が大幅値下げし、低価格層へ攻勢をかけています。" }; }
    if (competitor.id === "B" && move > (targeted ? .36 : .48)) { const gain = move > .88 ? 10 : 6; return { ...competitor, product: clamp(competitor.product + gain, 0, 100), share: competitor.share + (gain === 10 ? 5 : 2), lastAction: { type: "MAJOR_UPDATE", productGain: gain, before }, signal: "B社が大型アップデートを発表し、商品力で顧客を奪いに来ています。" }; }
    if (competitor.id === "C" && move > (targeted ? .4 : .52)) { const gain = move > .9 ? 9 : 5; return { ...competitor, brand: clamp(competitor.brand + gain, 0, 100), share: competitor.share + (gain === 9 ? 4 : 2), lastAction: { type: gain === 9 ? "FUNDING_CAMPAIGN" : "BRAND_CAMPAIGN", brandGain: gain, before }, signal: gain === 9 ? "C社が大型資金調達を発表し、全市場で広告攻勢を開始しました。" : "C社が大型ブランドキャンペーンを開始しました。" }; }
    return { ...competitor, share: Math.max(8, competitor.share + (index === 0 ? -1 : 0)), lastAction: { type: "HOLD", before }, signal: "競合は現在の方針を維持しています。" };
  });
}

export const competitorSignal = competitors => competitors.map(c => `${c.name} / ${c.signal}`).join(" ");
