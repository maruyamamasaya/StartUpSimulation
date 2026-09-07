import { clamp } from "./state.js";

const seed = [
  { id: "A", name: "A COMPANY", type: "LOW COST", price: 850, product: 38, brand: 34, share: 31 },
  { id: "B", name: "B COMPANY", type: "PRODUCT", price: 1550, product: 72, brand: 48, share: 27 },
  { id: "C", name: "C COMPANY", type: "BRAND", price: 1450, product: 56, brand: 76, share: 20 }
];
export const createCompetitors = () => seed.map(item => ({ ...item }));

export function advanceCompetition(competitors, regime, rng = Math.random) {
  return competitors.map((competitor, index) => {
    const move = rng();
    if (competitor.id === "A" && move > .58) return { ...competitor, price: Math.max(650, competitor.price - 60), share: competitor.share + 1, signal: "A社が価格を引き下げ、低価格層へ攻勢をかけています。" };
    if (competitor.id === "B" && move > .48) return { ...competitor, product: clamp(competitor.product + 4, 0, 100), share: competitor.share + (regime === "GROWTH" ? 1 : 0), signal: "B社が大型アップデートを発表し、専門メディアで注目を集めています。" };
    if (competitor.id === "C" && move > .52) return { ...competitor, brand: clamp(competitor.brand + 3, 0, 100), signal: "C社が顧客体験キャンペーンを開始し、ブランド想起を高めています。" };
    return { ...competitor, share: Math.max(8, competitor.share + (index === 0 ? -1 : 0)), signal: "競合は現在の方針を維持しています。" };
  });
}

export const competitorSignal = competitors => competitors.map(c => `${c.name} / ${c.signal}`).join(" ");
