export interface PipelineStage {
  id: string;
  label: string;
  timeLimitHours?: number;
  color: string;
  isTerminal?: boolean;
}

// B1 fix: timeLimitHours for chamada stages is 24 (not 0.25)
export const PIPELINE_STAGES: PipelineStage[] = [
  { id: "aguardando_atendimento", label: "Aguardando Atendimento", timeLimitHours: 0.5, color: "#c89a3a" },
  { id: "primeira_chamada", label: "1ª Chamada", timeLimitHours: 24, color: "#c8a96e" },
  { id: "segunda_chamada", label: "2ª Chamada", timeLimitHours: 24, color: "#c8a96e" },
  { id: "terceira_chamada", label: "3ª Chamada", timeLimitHours: 24, color: "#c8a96e" },
  { id: "em_atendimento", label: "Em Atendimento", color: "#5cb87a" },
  { id: "visita_gerada", label: "Visita Gerada", color: "#5cb87a" },
  { id: "futuro_lancamento", label: "Futuro Lançamento", color: "#888888" },
  { id: "lancamento", label: "Lançamento", color: "#888888" },
  { id: "proprietario_atendimento", label: "Proprietário - Atendimento", color: "#888888" },
  { id: "proprietario_concluido", label: "Proprietário - Concluído", color: "#5cb87a", isTerminal: true },
  { id: "descarte_sem_perfil", label: "Descarte - Sem Perfil", color: "#c85a5a", isTerminal: true },
  { id: "descarte_nao_responde", label: "Descarte - Não Responde", color: "#c85a5a", isTerminal: true },
  { id: "descarte_tentativa_futura", label: "Tentativa Futura", timeLimitHours: 720, color: "#c85a5a" },
  { id: "negocio_fechado", label: "Negócio Fechado", color: "#5cb87a", isTerminal: true },
  { id: "pasta_feita", label: "Pasta Feita", color: "#5cb87a", isTerminal: true },
];

export function getStageById(id: string): PipelineStage | undefined {
  return PIPELINE_STAGES.find((s) => s.id === id);
}

export function isOverdue(enteredAt: string | null, stage: PipelineStage): boolean {
  if (!enteredAt || !stage.timeLimitHours) return false;
  const elapsed = (Date.now() - new Date(enteredAt).getTime()) / 3_600_000;
  return elapsed > stage.timeLimitHours;
}
