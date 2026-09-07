import { clamp } from "./state.js";
import { projectById } from "./data/projects.js";

export function startProject(state, projectId) {
  const project = projectById(projectId);
  if (!project) return { state, error: "プロジェクトが見つかりません。" };
  if (state.gameOver) return { state, error: "ゲーム終了後は開始できません。" };
  if (state.activeProject) return { state, error: "同時に進められるプロジェクトは1件までです。" };
  if (state.cash < project.cost) return { state, error: "資金が不足しています。" };
  return {
    state: { ...state, cash: state.cash - project.cost, activeProject: { id: project.id, remaining: project.duration, duration: project.duration } },
    error: null
  };
}

export function advanceProject(state) {
  if (!state.activeProject) return { state, update: null };
  const project = projectById(state.activeProject.id);
  if (!project) return { state: { ...state, activeProject: null }, update: null };
  const remaining = state.activeProject.remaining - 1;
  if (remaining > 0) return { state: { ...state, activeProject: { ...state.activeProject, remaining } }, update: { id: project.id, completed: false, remaining } };
  const effect = project.effect;
  const completed = {
    ...state,
    activeProject: null,
    completedProjects: [...(state.completedProjects || []), project.id],
    developmentLevel: clamp(state.developmentLevel + (effect.developmentLevel || 0), 5, 100),
    brand: clamp(state.brand + (effect.brand || 0), 5, 100),
    satisfaction: clamp(state.satisfaction + (effect.satisfaction || 0), 18, 96),
    totalMarket: Math.round(state.totalMarket * (effect.totalMarketMultiplier || 1)),
    operatingEfficiency: (state.operatingEfficiency || 1) * (effect.operatingEfficiency || 1)
  };
  return { state: completed, update: { id: project.id, completed: true, remaining: 0, effectLabel: project.effectLabel } };
}
