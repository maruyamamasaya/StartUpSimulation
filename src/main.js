import { createInitialState } from "./state.js";
import { selectScenario } from "./scenarios.js";
import { advanceTurn, finalEvaluation } from "./turn.js";
import { adjustDecision, bindUI, render } from "./ui.js";
import { businesses, businessById } from "./data/businesses.js";
import { SAVE_KEY, serializeGame, deserializeGame } from "./save.js";

let state;
let decisions;
let selectedBusiness = null;

function showSetup() {
  document.querySelector("#game").hidden = true;
  document.querySelector("#setup").hidden = false;
  const saved = localStorage.getItem(SAVE_KEY);
  document.querySelector("#continue").disabled = !saved;
  document.querySelector("#businesses").innerHTML = businesses.map(business => `<button data-business="${business.id}"><strong>${business.name}</strong><span>${business.description}</span></button>`).join("");
}

function start(businessId = selectedBusiness, strategy = document.querySelector("#initial-strategy").value) {
  state = createInitialState(businessId || "saas");
  state.strategy = strategy;
  state.scenario = selectScenario(state);
  decisions = { ...state.lastDecisions };
  document.querySelector("#result").hidden = true;
  document.querySelector("#ending").hidden = true;
  document.querySelector("#setup").hidden = true;
  document.querySelector("#game").hidden = false;
  render(state, decisions);
}

function save() {
  localStorage.setItem(SAVE_KEY, serializeGame(state));
  document.querySelector("#save-status").textContent = "SAVED";
}

document.querySelector("#businesses").addEventListener("click", event => {
  const button = event.target.closest("button[data-business]");
  if (!button) return;
  selectedBusiness = button.dataset.business;
  const business = businessById(selectedBusiness);
  document.querySelectorAll("#businesses button").forEach(item => item.classList.toggle("selected", item === button));
  const profile = document.querySelector("#business-profile");
  profile.hidden = false;
  profile.innerHTML = `<p class="eyebrow">BUSINESS PROFILE</p><h2>${business.name}</h2><p>${business.description}</p><p><strong>KEY FACTORS</strong> ${business.factors.join(" · ")}</p>`;
  document.querySelector("#start-company").disabled = false;
});
document.querySelector("#start-company").addEventListener("click", () => {
  if (localStorage.getItem(SAVE_KEY) && !confirm("既存のセーブを上書きして、新しい会社を始めますか？")) return;
  start(); save();
});
document.querySelector("#continue").addEventListener("click", () => {
  try { state = deserializeGame(localStorage.getItem(SAVE_KEY)); decisions = { ...state.lastDecisions, hires: 0, emergencyLoan: false }; document.querySelector("#setup").hidden = true; document.querySelector("#game").hidden = false; render(state, decisions, state.gameOver ? finalEvaluation(state) : null); document.querySelector("#save-status").textContent = "CONTINUED"; }
  catch { localStorage.removeItem(SAVE_KEY); showSetup(); }
});

bindUI({
  onAdjust(key, direction) { decisions = adjustDecision(decisions, key, direction); render(state, decisions); },
  onLoan() { decisions = { ...decisions, emergencyLoan: true }; render(state, decisions); },
  onStrategy(strategy) { if (state.month === 1) { state = { ...state, strategy }; render(state, decisions); } },
  onNext() {
    state = advanceTurn(state, decisions);
    decisions = { ...state.lastDecisions, hires: 0, emergencyLoan: false };
    render(state, decisions, state.gameOver ? finalEvaluation(state) : null);
    save();
  },
  onRestart: showSetup
});

showSetup();
