import { companyValue, LIMITS } from "./state.js";
import { strategies } from "./strategy.js";
import { executiveMeeting } from "./meeting.js";
import { businessById } from "./data/businesses.js";
import { balance } from "./data/balance.js";
import { competitorLabel, competitorTypeLabel, regimeLabel, strategyLabel } from "./labels.js";

const yen = value => `${Math.round(value).toLocaleString("ja-JP")}円`;
const signed = value => `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString("ja-JP")}`;
const controlDefinitions = [
  ["price", "商品価格", "PRICE", value => yen(value)], ["advertising", "広告費", "ADVERTISING", yen],
  ["hires", "採用人数", "HIRING", value => `${value}人`], ["development", "開発投資", "DEVELOPMENT", yen]
];

export function bindUI(actions) {
  document.querySelector("#next-turn").addEventListener("click", actions.onNext);
  document.querySelector("#emergency-loan").addEventListener("click", actions.onLoan);
  document.querySelector("#strategy").addEventListener("click", event => { const button = event.target.closest("button[data-strategy]"); if (button) actions.onStrategy(button.dataset.strategy); });
  document.querySelector("#controls").addEventListener("click", event => {
    const button = event.target.closest("button[data-key]");
    if (button) actions.onAdjust(button.dataset.key, Number(button.dataset.direction));
  });
  document.querySelector("#ending").addEventListener("click", event => { if (event.target.closest("button")) actions.onRestart(); });
}

export function render(state, decisions, evaluation = null) {
  const business = businessById(state.businessId);
  const quarter = ((Math.min(state.month, 20) - 1) % 4) + 1;
  const year = Math.ceil(Math.min(state.month, 20) / 4);
  document.querySelector("#month-label").textContent = `YEAR ${year} / Q${quarter}`;
  document.querySelector("#business-label").textContent = `${business.name} / ${strategyLabel(state.strategy)}`;
  document.querySelector("#scenario-category").textContent = state.gameOver ? "最終レポート" : strategyLabel(state.scenario.category);
  document.querySelector("#scenario-title").textContent = state.gameOver ? "5年間の経営結果" : state.scenario.title;
  document.querySelector("#scenario-description").textContent = state.gameOver ? "積み重ねた判断が、会社の現在地を作りました。" : state.scenario.description;
  document.querySelector("#market-board").innerHTML = `<p><strong>${regimeLabel(state.regime)}</strong> / 市場規模 ${state.totalMarket.toLocaleString()} / 自社シェア ${state.marketShare}%</p><p class="muted">${state.competitors.map(c => `${competitorLabel(c)} ${c.share}% · ${competitorTypeLabel(c.type)} · 価格 ${yen(c.price)} · 商品力 ${c.product} · ブランド ${c.brand}`).join("<br>")}</p>`;
  document.querySelector("#meeting").innerHTML = executiveMeeting(state).map(([role, comment]) => `<p><strong>${role}</strong> <span>${comment}</span></p>`).join("");
  const cards = [
    ["所持金", yen(state.cash), "CASH"], ["顧客数", `${state.customers.toLocaleString()}人`, "CUSTOMERS"],
    ["四半期売上", yen(state.revenue), "REVENUE"], ["四半期利益", yen(state.profit), "PROFIT"],
    ["顧客満足度", `${state.satisfaction} / 100`, "SATISFACTION"], ["従業員数", `${state.employees}人`, "TEAM"],
    ["ブランド力", `${state.brand} / 100`, "BRAND"], ["開発レベル", `${state.developmentLevel} / 100`, "PRODUCT"],
    ["CEO信任度", `${state.ceoTrust ?? 70} / 100`, "BOARD TRUST"]
  ];
  if (state.customers >= 900) cards.push(["市場シェア", `${state.marketShare}%`, "SHARE"], ["解約率", `${(state.churnRate * 100).toFixed(1)}%`, "CHURN"], ["CAC", yen(decisions.advertising / Math.max(1, state.history.at(-1)?.newCustomers || 1)), "CAC"]);
  document.querySelector("#status-grid").innerHTML = cards.map(([label, value, code]) => `<div class="stat"><small>${code}</small><span>${label}</span><strong class="${value.startsWith("-") ? "negative" : ""}">${value}</strong></div>`).join("");
  document.querySelector("#controls").innerHTML = controlDefinitions.map(([key, label, code, format]) => `<div class="control"><div><small>${code}</small><label>${label}</label></div><div class="stepper"><button data-key="${key}" data-direction="-1" aria-label="${label}を減らす">−</button><output>${format(decisions[key])}</output><button data-key="${key}" data-direction="1" aria-label="${label}を増やす">＋</button></div></div>`).join("");
  document.querySelector("#strategy").innerHTML = Object.entries(strategies).map(([id, strategy]) => `<button data-strategy="${id}" class="${state.strategy === id ? "selected" : ""}" title="${strategy.description}">${strategyLabel(id)}</button>`).join("");
  document.querySelector("#planned-cost").textContent = yen(decisions.advertising + decisions.development + decisions.hires * 160000);
  const crisis = state.cash < balance.crisisThreshold;
  document.querySelector("#crisis").hidden = !crisis;
  document.querySelector("#emergency-loan").hidden = !crisis;
  document.querySelector("#next-turn").disabled = state.gameOver;
  const warning = document.querySelector("#warning");
  warning.hidden = !state.warning;
  if (state.warning) warning.innerHTML = `<div class="section-label"><span>SURVIVAL</span> BOARD WARNING</div><h2>${state.warning.type}</h2><p>${state.warning.message}</p><p>次の四半期は、立て直しの重要な機会です。</p>`;
  if (state.history.length) renderResult(state.history.at(-1));
  const report = state.history.at(-1);
  document.querySelector("#annual").hidden = !(report && state.month > 1 && (state.month - 1) % 4 === 0);
  if (report && state.month > 1 && (state.month - 1) % 4 === 0) document.querySelector("#annual").innerHTML = `<div class="section-label"><span>ANNUAL</span> YEAR ${Math.floor((state.month - 2) / 4) + 1} REVIEW</div><p>年間売上 <strong>${yen(report.revenue * 4)}</strong> ／ 年間利益 <strong>${yen(report.profit * 4)}</strong> ／ 企業価値 <strong>${yen(companyValue(state))}</strong></p>`;
  const pending = state.pendingEffects || [];
  document.querySelector("#pending").hidden = pending.length === 0;
  if (pending.length) document.querySelector("#pending").innerHTML = `<div class="section-label"><span>FUTURE</span> PENDING EFFECTS</div>${pending.map(effect => `<p><strong>${effect.label}</strong> ${yen(effect.cost)} — 効果開始予定: YEAR ${Math.ceil(effect.due / 4)} Q${((effect.due - 1) % 4) + 1}</p>`).join("")}`;
  const chain = state.eventChain ? `<p><strong>EVENT CHAIN: ${state.eventChain.label} / ${state.eventChain.step}段階目${state.eventChain.recovering ? "（回復中）" : ""}</strong> — 放置すると獲得・満足度・解約・コストへ連鎖します。</p>` : "";
  document.querySelector("#insight").innerHTML = `<div class="section-label"><span>MODEL</span> FORMULA INSIGHT</div><p>広告 → 新規顧客 → 売上。 一方で、顧客増加 → サポート負荷 → 満足度 → 解約という副作用があります。</p>${chain}`;
  if (evaluation) renderEnding(evaluation, state);
}

function renderResult(report) {
  const node = document.querySelector("#result");
  node.hidden = false;
  const score = report.decisionScore;
  const feedback = report.decisionFeedback || ["この記録は旧バージョンのため採点対象外です"];
  const rating = score == null ? "LEGACY" : score >= 90 ? "EXCELLENT" : score >= 70 ? "SOUND" : score >= 60 ? "RISKY" : "DANGER";
  const regimeChange = report.regimeChange?.split(" → ").map(regimeLabel).join(" → ");
  node.innerHTML = `<div class="section-label"><span>06</span> PREVIOUS QUARTER ANALYSIS</div><div class="report-head"><div><small>MANAGEMENT DECISION SCORE</small><h2>経営判断スコア: ${score ?? "—"} / 100</h2><p>CEO信任度: ${report.ceoTrust ?? "—"} / 100</p></div><strong class="fit ${(score ?? 70) >= 70 ? "aligned" : "misaligned"}">${rating}</strong></div><ul class="decision-feedback">${feedback.map(item => `<li>${item}</li>`).join("")}</ul>${executionReportHtml(report)}<div class="report-grid"><div><span>広告・市場による獲得</span><strong>+${report.newCustomers}</strong></div><div><span>解約・事故離脱</span><strong>−${report.churned + (report.shockCustomerLoss || 0)}</strong></div><div><span>顧客数</span><strong>${report.before.customers} → ${report.customers}</strong></div><div><span>四半期利益</span><strong class="${report.profit < 0 ? "negative" : ""}">${signed(report.profit)}円</strong></div><div><span>満足度</span><strong>${report.before.satisfaction} → ${report.satisfaction}</strong></div></div>${regimeChange ? `<p class="advice"><strong>市場フェーズ変更: ${regimeChange}</strong></p>` : ""}<p class="advice"><strong>COMPETITOR SIGNAL</strong> ${report.competitorSignal}</p><p class="advice">${report.advice}</p>`;
}

export function executionReportHtml(report) {
  if (!report.executionReport) return "";
  const { advertising, hiring, development, shocks } = report.executionReport;
  const competitorRows = (report.competitorActions || []).map(action => { const before = action.before || action.after; return `<p><strong>${competitorLabel(action)}</strong> ${action.type === "HOLD" ? "方針維持" : action.type} ／ 価格 ${yen(before.price)} → ${yen(action.after.price)} ／ 商品力 ${before.product} → ${action.after.product} ／ ブランド ${before.brand} → ${action.after.brand} ／ シェア ${before.share}% → ${action.after.share}%</p>`; }).join("");
  return `<section class="execution-report"><h3>判断と実行結果</h3><div class="execution-grid"><div><small>ADVERTISING</small><strong>予定 ${yen(advertising.plannedSpend)} ／ 効果 ${advertising.multiplier.toFixed(2)}倍</strong><p>${advertising.result} — ${advertising.reason}</p></div><div><small>HIRING</small><strong>予定 ${hiring.planned}人 ／ 実績 ${hiring.actual}人</strong><p>予定費 ${yen(hiring.plannedCost)} ／ 実績費 ${yen(hiring.actualCost)} — ${hiring.reason}</p></div><div><small>DEVELOPMENT</small><strong>予定 ${yen(development.plannedInvestment)} ／ 効果 ${development.multiplier.toFixed(2)}倍</strong><p>${development.reason}</p></div><div><small>MARKET SHARE</small><strong>${report.marketShareBefore}% → ${report.marketShareAfter}%</strong><p>競合の価格・商品力・ブランド・シェアを反映</p></div></div>${shocks.length ? `<div class="crisis-list"><strong>重大リスク同時発生</strong><ul>${shocks.map(item => `<li>${item}</li>`).join("")}</ul></div>` : ""}<div class="competitor-results"><h3>競合の実行結果</h3>${competitorRows}</div></section>`;
}

function renderEnding(evaluation, state) {
  const node = document.querySelector("#ending");
  node.hidden = false;
  const analysis = evaluation.analysis || {};
  node.innerHTML = `<div class="grade">${evaluation.grade}</div><div><p class="eyebrow">FINAL MANAGEMENT REPORT</p><h2>${evaluation.result || "RESULT"}</h2><p>${evaluation.label}</p><p>最終企業価値 <strong>${yen(evaluation.value)}</strong> ／ 市場シェア <strong>${state.marketShare}%</strong> ／ 生存年数 <strong>${analysis.years || 0}年</strong></p><p>BEST DECISION <strong>${analysis.best || "—"}</strong> ／ WORST DECISION <strong>${analysis.worst || "—"}</strong> ／ TURNING POINT <strong>${analysis.turningPoint || "—"}</strong></p><button class="secondary">NEW COMPANY</button></div>`;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function adjustDecision(decisions, key, direction) {
  const limit = LIMITS[key];
  return { ...decisions, [key]: Math.min(limit.max, Math.max(limit.min, decisions[key] + limit.step * direction)) };
}
