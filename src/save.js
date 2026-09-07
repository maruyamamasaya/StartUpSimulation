export const SAVE_KEY = "formula-company.save.v1";
export const serializeGame = state => JSON.stringify(state);
export const deserializeGame = text => {
  const state = JSON.parse(text);
  if (state?.saveVersion !== 1 || !state.businessId || !Array.isArray(state.history)) throw new Error("Unsupported save data");
  return { ...state, ceoTrust: state.ceoTrust ?? 70, lowScoreStreak: state.lowScoreStreak ?? 0, decisionStreaks: { advertising: 0, discount: 0, hiring: 0, development: 0, priceChanges: 0, repeatedPlan: 0, ...(state.decisionStreaks || {}) }, activeCrises: state.activeCrises || [] };
};
