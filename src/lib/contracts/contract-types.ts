export const CONTRACT_TYPES = [
  "INDEFINIDO",
  "TEMPORAL",
  "PRACTICAS",
  "FORMACION",
  "OBRA_SERVICIO",
  "EVENTUAL",
  "INTERINIDAD",
  "FIJO_DISCONTINUO",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export const DEFAULT_CONTRACT_TYPE: ContractType = "INDEFINIDO";

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  INDEFINIDO: "Indefinido",
  TEMPORAL: "Temporal",
  PRACTICAS: "Prácticas",
  FORMACION: "Formación",
  OBRA_SERVICIO: "Obra o Servicio",
  EVENTUAL: "Eventual",
  INTERINIDAD: "Interinidad",
  FIJO_DISCONTINUO: "Fijo Discontinuo",
};

export const CONTRACT_TYPE_OPTIONS = CONTRACT_TYPES.map((type) => ({
  value: type,
  label: CONTRACT_TYPE_LABELS[type],
}));

export function getContractTypeLabel(type: string): string {
  return CONTRACT_TYPE_LABELS[type as ContractType] ?? type;
}
