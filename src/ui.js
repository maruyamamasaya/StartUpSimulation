import { companyValue, LIMITS } from "./state.js";

const yen = value => `${Math.round(value).toLocaleString("ja-JP")}円`;
const signed = value => `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString("ja-JP")}`;
const controlDefinitions = [
  ["price", "商品価格", "PRICE", value => yen(value)], ["advertising", "広告費", "ADVERTISING", yen],
  ["hires", "採用人数", "HIRING", value => `${value}人`], ["development", "開発投資", "DEVELOPMENT", yen]
];

export function bindUI(actions) {
  document.querySelector("#next-turn").addEventListener("click", actions.onNext);
  document.querySelector("#controls").addEventListener("click", event => {
    const button = event.target.closest("button[data-key]");
    if (button) actions.onAdjust(button.dataset.key, Number(button.dataset.direction));
  });
  document.querySelector("#ending").addEventListener("click", event => { if (event.target.closest("button")) actions.onRestart(); });
}

export function render(state, decisions, evaluation = null) {
  document.querySelector("#month-label").textContent = `MONTH ${Math.min(state.month, 24)} / 24`;
  document.querySelector("#scenario-category").textContent = state.gameOver ? "FINAL REPORT" : state.scenario.category;
  document.querySelector("#scenario-title").textContent = state.gameOver ? "24か月の経営結果" : state.scenario.title;
  document.querySelector("#scenario-description").textContent = state.gameOver ? "積み重ねた判断が、会社の現在地を作りました。" : state.scenario.description;
  const cards = [
    ["所持金", yen(state.cash), "CASH"], ["顧客数", `${state.customers.toLocaleString()}人`, "CUSTOMERS"],
    ["月間売上", yen(state.revenue), "REVENUE"], ["月間利益", yen(state.profit), "PROFIT"],
    ["顧客満足度", `${state.satisfaction} / 100`, "SATISFACTION"], ["従業員数", `${state.employees}人`, "TEAM"],
    ["ブランド力", `${state.brand} / 100`, "BRAND"], ["開発レベル", `${state.developmentLevel} / 100`, "PRODUCT"]
  ];
  document.querySelector("#status-grid").innerHTML = cards.map(([label, value, code]) => `<div class="stat"><small>${code}</small><span>${label}</span><strong class="${value.startsWith("-") ? "negative" : ""}">${value}</strong></div>`).join("");
  document.querySelector("#controls").innerHTML = controlDefinitions.map(([key, label, code, format]) => `<div class="control"><div><small>${code}</small><label>${label}</label></div><div class="stepper"><button data-key="${key}" data-direction="-1" aria-label="${label}を減らす">−</button><output>${format(decisions[key])}</output><button data-key="${key}" data-direction="1" aria-label="${label}を増やす">＋</button></div></div>`).join("");
  document.querySelector("#planned-cost").textContent = yen(decisions.advertising + decisions.development + decisions.hires * 160000);
  document.querySelector("#next-turn").disabled = state.gameOver;
  if (state.history.length) renderResult(state.history.at(-1));
  if (evaluation) renderEnding(evaluation, state);
}

function renderResult(report) {
  const node = document.querySelector("#result");
  node.hidden = false;
  node.innerHTML = `<div class="section-label"><span>04</span> MONTHLY REPORT</div><div class="report-head"><div><small>DECISION FIT</small><h2>${report.quality === "aligned" ? "判断が状況と噛み合いました" : "難しい局面になりました"}</h2></div><strong class="fit ${report.quality}">${report.quality === "aligned" ? "GOOD FIT" : "REVIEW"}</strong></div><div class="report-grid"><div><span>新規顧客</span><strong>+${report.newCustomers}</strong></div><div><span>解約</span><strong>−${report.churned}</strong></div><div><span>顧客数</span><strong>${report.before.customers} → ${report.customers}</strong></div><div><span>利益</span><strong class="${report.profit < 0 ? "negative" : ""}">${signed(report.profit)}円</strong></div><div><span>満足度</span><strong>${report.before.satisfaction} → ${report.satisfaction}</strong></div></div><p class="advice">${report.advice}</p>`;
}

function renderEnding(evaluation, state) {
  const node = document.querySelector("#ending");
  node.hidden = false;
  node.innerHTML = `<div class="grade">${evaluation.grade}</div><div><p class="eyebrow">FINAL EVALUATION</p><h2>${evaluation.label}</h2><p>最終企業価値 <strong>${yen(evaluation.value)}</strong> ／ 最終利益 <strong>${yen(state.profit)}</strong></p><button class="secondary">もう一度経営する</button></div>`;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function adjustDecision(decisions, key, direction) {
  const limit = LIMITS[key];
  return { ...decisions, [key]: Math.min(limit.max, Math.max(limit.min, decisions[key] + limit.step * direction)) };
}
