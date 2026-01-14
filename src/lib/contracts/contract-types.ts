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

const normalizeContractTypeValue = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const CONTRACT_TYPE_NORMALIZED_MAP = new Map<string, ContractType>([
  ...CONTRACT_TYPES.map((type) => [normalizeContractTypeValue(type), type]),
  ...Object.entries(CONTRACT_TYPE_LABELS).map(([type, label]) => [
    normalizeContractTypeValue(label),
    type as ContractType,
  ]),
]);

export function normalizeContractTypeInput(value: string): ContractType | null {
  const normalized = normalizeContractTypeValue(value);
  return CONTRACT_TYPE_NORMALIZED_MAP.get(normalized) ?? null;
}

export function getContractTypeLabel(type: string): string {
  return CONTRACT_TYPE_LABELS[type as ContractType] ?? type;
}
