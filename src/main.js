import { createInitialState } from "./state.js";
import { selectScenario } from "./scenarios.js";
import { advanceTurn, finalEvaluation } from "./turn.js";
import { adjustDecision, bindUI, render } from "./ui.js";

let state;
let decisions;

function start() {
  state = createInitialState();
  state.scenario = selectScenario(state);
  decisions = { ...state.lastDecisions };
  document.querySelector("#result").hidden = true;
  document.querySelector("#ending").hidden = true;
  render(state, decisions);
}

bindUI({
  onAdjust(key, direction) { decisions = adjustDecision(decisions, key, direction); render(state, decisions); },
  onNext() {
    state = advanceTurn(state, decisions);
    decisions = { ...state.lastDecisions, hires: 0 };
    render(state, decisions, state.gameOver ? finalEvaluation(state) : null);
  },
  onRestart: start
});

start();
