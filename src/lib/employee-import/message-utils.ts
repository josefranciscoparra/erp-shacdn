import type { RowMessage, RowMessageType } from "./types";

function normalizeMessages(messages?: RowMessage[] | null) {
  return Array.isArray(messages) ? messages : [];
}

export function upsertRowMessage(params: {
  messages?: RowMessage[] | null;
  field: string;
  type: RowMessageType;
  message: string;
}) {
  const normalized = normalizeMessages(params.messages);
  const filtered = normalized.filter((entry) => entry.field !== params.field);

  return [
    ...filtered,
    {
      type: params.type,
      field: params.field,
      message: params.message,
    },
  ];
}
