import { companyValue, LIMITS } from "./state.js";
import { strategies } from "./strategy.js";
import { executiveMeeting } from "./meeting.js";
import { businessById } from "./data/businesses.js";
import { balance } from "./data/balance.js";
import { competitorLabel, competitorTypeLabel, regimeLabel, strategyLabel } from "./labels.js";
import { projects, projectById } from "./data/projects.js";

const yen = value => `${Math.round(value).toLocaleString("ja-JP")}円`;
const signed = value => `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString("ja-JP")}`;
const controlDefinitions = [
  ["price", "商品価格", "PRICE", value => yen(value)], ["advertising", "広告費", "ADVERTISING", yen],
  ["hires", "採用人数", "HIRING", value => `${value}人`], ["development", "開発投資", "DEVELOPMENT", yen]
];

const mobileMedia = globalThis.matchMedia?.("(max-width: 800px)") || { matches: false, addEventListener() {} };

function syncMobileDisclosures() {
  document.querySelectorAll(".mobile-disclosure").forEach(disclosure => { disclosure.open = !mobileMedia.matches; });
}

function closeMobileOverlay(selector) {
  document.querySelector(selector).hidden = true;
  document.body.classList.remove("mobile-overlay-open");
  document.querySelector("#hud-menu").setAttribute("aria-expanded", "false");
}

function openMobileInfo(title, html) {
  document.querySelector("#mobile-info-title").textContent = title;
  document.querySelector("#mobile-info-content").innerHTML = html;
  document.querySelector("#mobile-info-modal").hidden = false;
  document.body.classList.add("mobile-overlay-open");
  document.querySelector("#close-mobile-info").focus();
}

export function bindUI(actions) {
  syncMobileDisclosures();
  mobileMedia.addEventListener("change", syncMobileDisclosures);
  document.querySelector("#next-turn").addEventListener("click", actions.onNext);
  document.querySelector("#emergency-loan").addEventListener("click", actions.onLoan);
  document.querySelector("#strategy").addEventListener("click", event => { const button = event.target.closest("button[data-strategy]"); if (button) actions.onStrategy(button.dataset.strategy); });
  document.querySelector("#controls").addEventListener("click", event => {
    const button = event.target.closest("button[data-key]");
    if (button) actions.onAdjust(button.dataset.key, Number(button.dataset.direction));
  });
  document.querySelector("#hud-controls").addEventListener("click", event => {
    const button = event.target.closest("button[data-key]");
    if (button) actions.onAdjust(button.dataset.key, Number(button.dataset.direction));
  });
  document.querySelector("#hud-strategy").addEventListener("change", event => actions.onStrategy(event.target.value));
  document.querySelector("#hud-next-turn").addEventListener("click", actions.onNext);
  document.querySelector("#hud-emergency-loan").addEventListener("click", actions.onLoan);
  document.querySelector("#hud-menu").addEventListener("click", () => {
    document.querySelector("#mobile-menu-modal").hidden = false;
    document.body.classList.add("mobile-overlay-open");
    document.querySelector("#hud-menu").setAttribute("aria-expanded", "true");
    document.querySelector("#close-mobile-menu").focus();
  });
  document.querySelector("#close-mobile-menu").addEventListener("click", () => closeMobileOverlay("#mobile-menu-modal"));
  document.querySelector("#close-mobile-info").addEventListener("click", () => closeMobileOverlay("#mobile-info-modal"));
  document.querySelector("#hud-signal-detail").addEventListener("click", () => openMobileInfo("MARKET SIGNAL", document.querySelector(".scenario-copy").innerHTML));
  document.querySelector("#mobile-menu-modal nav").addEventListener("click", event => {
    const panel = event.target.closest("[data-mobile-panel]");
    const action = event.target.closest("[data-mobile-action]");
    if (panel) {
      const sources = { status: ["COMPANY STATUS", "#status-grid"], market: ["MARKET & COMPETITORS", "#market-board"], meeting: ["EXECUTIVE MEETING", "#meeting"] };
      const [title, selector] = sources[panel.dataset.mobilePanel];
      closeMobileOverlay("#mobile-menu-modal");
      const content = document.querySelector(selector).innerHTML;
      openMobileInfo(title, panel.dataset.mobilePanel === "status" ? `<div class="status-grid">${content}</div>` : content);
    }
    if (action) {
      closeMobileOverlay("#mobile-menu-modal");
      if (action.dataset.mobileAction === "projects") actions.onOpenProjects();
      if (action.dataset.mobileAction === "result") actions.onPreviousResult();
    }
  });
  document.querySelector("#ending").addEventListener("click", event => { if (event.target.closest("button")) actions.onRestart(); });
  document.querySelector("#continue-quarter").addEventListener("click", actions.onResultContinue);
  document.querySelector("#previous-result").addEventListener("click", actions.onPreviousResult);
  document.querySelector("#project-summary").addEventListener("click", event => { if (event.target.closest("button")) actions.onOpenProjects(); });
  document.querySelector("#close-projects").addEventListener("click", actions.onCloseProjects);
  document.querySelector("#project-list").addEventListener("click", event => { const button = event.target.closest("button[data-project]"); if (button) actions.onStartProject(button.dataset.project); });
}

export function render(state, decisions, evaluation = null) {
  const business = businessById(state.businessId);
  const quarter = ((Math.min(state.month, 20) - 1) % 4) + 1;
  const year = Math.ceil(Math.min(state.month, 20) / 4);
  document.querySelector("#month-label").textContent = `YEAR ${year} / Q${quarter}`;
  document.querySelector("#hud-quarter").textContent = `YEAR ${year} / Q${quarter}`;
  document.querySelector("#hud-execute-label").textContent = `YEAR ${year} / Q${quarter} を実行`;
  document.querySelector("#business-label").textContent = `${business.name} / ${strategyLabel(state.strategy)}`;
  document.querySelector("#scenario-category").textContent = state.gameOver ? "最終レポート" : strategyLabel(state.scenario.category);
  document.querySelector("#scenario-title").textContent = state.gameOver ? "5年間の経営結果" : state.scenario.title;
  document.querySelector("#scenario-description").textContent = state.gameOver ? "積み重ねた判断が、会社の現在地を作りました。" : state.scenario.description;
  document.querySelector("#hud-signal-category").textContent = state.gameOver ? "FINAL" : strategyLabel(state.scenario.category);
  document.querySelector("#hud-signal-title").textContent = state.gameOver ? "5年間の経営結果" : state.scenario.title;
  document.querySelector("#hud-signal-description").textContent = state.gameOver ? "積み重ねた判断が、会社の現在地を作りました。" : state.scenario.description;
  document.querySelector("#market-board").innerHTML = `<p><strong>${regimeLabel(state.regime)}</strong> / 市場規模 ${state.totalMarket.toLocaleString()} / 自社シェア ${state.marketShare}%</p><p class="muted">${state.competitors.map(c => `${competitorLabel(c)} ${c.share}% · ${competitorTypeLabel(c.type)} · 価格 ${yen(c.price)} · 商品力 ${c.product} · ブランド ${c.brand}`).join("<br>")}</p>`;
  document.querySelector("#meeting").innerHTML = executiveMeeting(state).map(([role, comment]) => `<p><strong>${role}</strong> <span>${comment}</span></p>`).join("");
  const cards = [
    ["所持金", yen(state.cash), "CASH"], ["顧客数", `${state.customers.toLocaleString()}人`, "CUSTOMERS"],
    ["四半期売上", yen(state.revenue), "REVENUE"], ["四半期利益", yen(state.profit), "PROFIT"],
    ["顧客満足度", `${state.satisfaction} / 100`, "SATISFACTION"], ["従業員数", `${state.employees}人`, "TEAM"],
    ["ブランド力", `${state.brand} / 100`, "BRAND"], ["開発レベル", `${state.developmentLevel} / 100`, "PRODUCT"],
    ["CEO信任度", `${state.ceoTrust ?? 70} / 100`, "BOARD TRUST"]
  ];
  document.querySelector("#mobile-kpis").innerHTML = cards.slice(0, 4).map(([label, value, code]) => `<div><small>${code}</small><span>${label}</span><strong class="${value.startsWith("-") ? "negative" : ""}">${value}</strong></div>`).join("");
  document.querySelector("#hud-kpis").innerHTML = [cards[0], cards[2], cards[3], cards[1]].map(([label, value, code]) => `<div><small>${code}</small><span>${label}</span><strong class="${value.startsWith("-") ? "negative" : ""}">${value}</strong></div>`).join("");
  if (state.customers >= 900) cards.push(["市場シェア", `${state.marketShare}%`, "SHARE"], ["解約率", `${(state.churnRate * 100).toFixed(1)}%`, "CHURN"], ["CAC", yen(decisions.advertising / Math.max(1, state.history.at(-1)?.newCustomers || 1)), "CAC"]);
  document.querySelector("#status-grid").innerHTML = cards.map(([label, value, code]) => `<div class="stat"><small>${code}</small><span>${label}</span><strong class="${value.startsWith("-") ? "negative" : ""}">${value}</strong></div>`).join("");
  document.querySelector("#controls").innerHTML = controlDefinitions.map(([key, label, code, format]) => `<div class="control"><div><small>${code}</small><label>${label}</label></div><div class="stepper"><button data-key="${key}" data-direction="-1" aria-label="${label}を減らす">−</button><output>${format(decisions[key])}</output><button data-key="${key}" data-direction="1" aria-label="${label}を増やす">＋</button></div></div>`).join("");
  document.querySelector("#hud-controls").innerHTML = controlDefinitions.map(([key, label, code, format]) => `<div class="hud-control"><label><small>${code}</small>${label}</label><div class="stepper"><button data-key="${key}" data-direction="-1" aria-label="${label}を減らす">−</button><output>${format(decisions[key])}</output><button data-key="${key}" data-direction="1" aria-label="${label}を増やす">＋</button></div></div>`).join("");
  document.querySelector("#strategy").innerHTML = Object.entries(strategies).map(([id, strategy]) => `<button data-strategy="${id}" class="${state.strategy === id ? "selected" : ""}" title="${strategy.description}">${strategyLabel(id)}</button>`).join("");
  document.querySelector("#hud-strategy").innerHTML = Object.keys(strategies).map(id => `<option value="${id}" ${state.strategy === id ? "selected" : ""}>${strategyLabel(id)}</option>`).join("");
  document.querySelector("#hud-strategy").disabled = state.month !== 1 || state.gameOver;
  document.querySelector("#planned-cost").textContent = yen(decisions.advertising + decisions.development + decisions.hires * 160000);
  document.querySelector("#hud-planned-cost").textContent = yen(decisions.advertising + decisions.development + decisions.hires * 160000);
  const activeProject = state.activeProject && projectById(state.activeProject.id);
  const projectSummary = document.querySelector("#project-summary");
  projectSummary.innerHTML = activeProject
    ? `<div><small>LONG-TERM PROJECT</small><strong>${activeProject.name}</strong><span>進行中 ${activeProject.duration - state.activeProject.remaining} / ${activeProject.duration} 四半期</span></div><button class="text-button">詳細を見る</button>`
    : `<div><small>LONG-TERM PROJECT</small><strong>進行中のプロジェクトなし</strong></div><button class="text-button" ${state.gameOver ? "disabled" : ""}>新規開始</button>`;
  const crisis = state.cash < balance.crisisThreshold;
  document.querySelector("#crisis").hidden = !crisis;
  document.querySelector("#emergency-loan").hidden = !crisis;
  document.querySelector("#hud-crisis").hidden = !crisis;
  document.querySelector("#hud-emergency-loan").hidden = !crisis;
  document.querySelector("#next-turn").disabled = state.gameOver;
  document.querySelector("#hud-next-turn").disabled = state.gameOver;
  document.querySelector('[data-mobile-action="result"]').disabled = state.history.length === 0;
  const warning = document.querySelector("#warning");
  warning.hidden = !state.warning;
  if (state.warning) warning.innerHTML = `<div class="section-label"><span>SURVIVAL</span> BOARD WARNING</div><h2>${state.warning.type}</h2><p>${state.warning.message}</p><p>次の四半期は、立て直しの重要な機会です。</p>`;
  document.querySelector("#previous-result").hidden = state.history.length === 0;
  const report = state.history.at(-1);
  document.querySelector("#annual").hidden = !(report && state.month > 1 && (state.month - 1) % 4 === 0);
  if (report && state.month > 1 && (state.month - 1) % 4 === 0) document.querySelector("#annual").innerHTML = `<div class="section-label"><span>ANNUAL</span> YEAR ${Math.floor((state.month - 2) / 4) + 1} REVIEW</div><p>年間売上 <strong>${yen(report.revenue * 4)}</strong> ／ 年間利益 <strong>${yen(report.profit * 4)}</strong> ／ 企業価値 <strong>${yen(companyValue(state))}</strong></p>`;
  const pending = state.pendingEffects || [];
  document.querySelector("#pending").hidden = pending.length === 0;
  if (pending.length) document.querySelector("#pending").innerHTML = `<div class="section-label"><span>FUTURE</span> PENDING EFFECTS</div>${pending.map(effect => `<p><strong>${effect.label}</strong> ${yen(effect.cost)} — 効果開始予定: YEAR ${Math.ceil(effect.due / 4)} Q${((effect.due - 1) % 4) + 1}</p>`).join("")}`;
  if (evaluation) renderEnding(evaluation, state);
}

export function scoreRating(score) {
  if (score == null) return { label: "評価対象外", tone: "neutral" };
  if (score >= 90) return { label: "非常に良い判断", tone: "excellent" };
  if (score >= 70) return { label: "堅実な判断", tone: "sound" };
  if (score >= 60) return { label: "やや危険", tone: "risky" };
  return { label: "危険な判断", tone: "danger" };
}

const actionLabels = { PRICE_CUT: "値下げ", FREE_PLAN: "無料プランを投入", MAJOR_UPDATE: "大型アップデートを実施", BRAND_CAMPAIGN: "ブランド施策を強化", FUNDING_CAMPAIGN: "資金調達後に広告攻勢", HOLD: "方針を維持" };

export function resultModalHtml(report, turnNumber = 1) {
  const score = report.decisionScore;
  const feedback = report.decisionFeedback || ["この記録は旧バージョンのため採点対象外です"];
  const rating = scoreRating(score);
  const execution = report.executionReport;
  const events = [report.scenario?.title,
    execution?.advertising && `広告施策: ${execution.advertising.reason}`,
    execution?.development && `開発投資: ${execution.development.reason}`,
    execution?.hiring && `採用: 予定${execution.hiring.planned}名に対して${execution.hiring.actual}名`,
    report.projectUpdate?.completed && `プロジェクト完了: ${projectById(report.projectUpdate.id)?.name} — ${report.projectUpdate.effectLabel}`,
    ...(execution?.shocks || []).map(item => `重大リスク: ${item}`)
  ].filter(Boolean);
  const competitors = (report.competitorActions || []).map(action => `${competitorLabel(action)}が${actionLabels[action.type] || action.type}`);
  const hints = [report.competitorSignal, report.advice].filter(Boolean).slice(0, 3);
  const year = Math.floor((turnNumber - 1) / 4) + 1;
  const quarter = ((turnNumber - 1) % 4) + 1;
  return `<header class="modal-result-head"><p id="result-modal-title" class="eyebrow">YEAR ${year} / Q${quarter} RESULT</p><div class="score-wrap"><small>MANAGEMENT DECISION SCORE</small><div><strong id="animated-score" class="score-number ${rating.tone}" data-score="${score ?? 0}">0</strong><span>/ 100</span></div><p class="score-rating ${rating.tone}">${rating.label}</p></div></header><div class="modal-section"><h3>主要KPI</h3><div class="modal-kpis"><div><span>顧客数</span><strong>${report.before.customers.toLocaleString()} → ${report.customers.toLocaleString()}</strong></div><div><span>四半期利益</span><strong class="${report.profit < 0 ? "negative" : ""}">${signed(report.profit)}円</strong></div><div><span>市場シェア</span><strong>${report.marketShareBefore}% → ${report.marketShareAfter}%</strong></div><div><span>CEO信任度</span><strong>${report.ceoTrust ?? "—"} / 100</strong></div><div><span>満足度</span><strong>${report.before.satisfaction} → ${report.satisfaction}</strong></div></div></div><section class="modal-section"><h3>今回起きたこと</h3><ul>${events.map(item => `<li>${item}</li>`).join("")}</ul></section><div class="modal-section hint-section"><h3>次の四半期へのヒント</h3><ul>${hints.map(item => `<li>${item}</li>`).join("")}</ul></div><details class="modal-details" open><summary>詳細な分析と競合の動き</summary><div class="modal-columns"><section class="modal-section"><h3>今回の分析</h3><ul>${feedback.slice(0, 4).map(item => `<li>${item}</li>`).join("")}</ul></section>${competitors.length ? `<section class="modal-section"><h3>競合の主な動き</h3><ul>${competitors.map(item => `<li>${item}</li>`).join("")}</ul></section>` : ""}</div></details>`;
}

export function resultModalActions() {
  const closeResult = () => {
    document.querySelector("#result-modal").hidden = true;
    document.body.classList.remove("modal-open");
  };
  const openLatestResult = (report, turnNumber, replay = false) => {
    if (!report) return;
    const modal = document.querySelector("#result-modal");
    document.querySelector("#result-modal-content").innerHTML = resultModalHtml(report, turnNumber);
    document.querySelector(".modal-details").open = !mobileMedia.matches;
    document.querySelector("#continue-quarter").childNodes[0].textContent = replay ? "結果を閉じる " : report.resultType ? "最終結果へ " : "次の四半期へ ";
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const scoreNode = document.querySelector("#animated-score");
    const target = Number(scoreNode.dataset.score);
    const start = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - start) / 950);
      scoreNode.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(tick);
      else scoreNode.classList.add("score-complete");
    };
    requestAnimationFrame(tick);
    document.querySelector("#continue-quarter").focus();
  };
  return { openLatestResult, closeResult };
}

export function projectModalHtml(state) {
  return projects.map(project => {
    const unavailable = Boolean(state.activeProject) || state.cash < project.cost || state.gameOver;
    const reason = state.activeProject ? "別のプロジェクトが進行中" : state.cash < project.cost ? "資金不足" : state.gameOver ? "ゲーム終了" : "開始する";
    return `<article class="project-option"><div><h3>${project.name}</h3><p>${project.description}</p><dl><div><dt>費用</dt><dd>${yen(project.cost)}</dd></div><div><dt>期間</dt><dd>${project.duration}四半期</dd></div><div><dt>効果</dt><dd>${project.effectLabel}</dd></div></dl></div><button class="secondary" data-project="${project.id}" ${unavailable ? "disabled" : ""}>${reason}</button></article>`;
  }).join("");
}

export function projectModalActions() {
  const closeProjects = () => {
    document.querySelector("#project-modal").hidden = true;
    document.body.classList.remove("modal-open");
    document.querySelector("#project-error").textContent = "";
  };
  const openProjects = state => {
    document.querySelector("#project-list").innerHTML = projectModalHtml(state);
    document.querySelector("#project-error").textContent = "";
    document.querySelector("#project-modal").hidden = false;
    document.body.classList.add("modal-open");
    document.querySelector("#close-projects").focus();
  };
  const showProjectError = message => { document.querySelector("#project-error").textContent = message || ""; };
  return { openProjects, closeProjects, showProjectError };
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
