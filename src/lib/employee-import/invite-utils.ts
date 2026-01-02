import type { RowMessage, RowMessageType } from "./types";

export type InviteStatus = "PENDING" | "SENT" | "FAILED" | "NOT_APPLICABLE";

const INVITE_FIELD = "invite";

function normalizeMessages(messages?: RowMessage[] | null) {
  return Array.isArray(messages) ? messages : [];
}

export function getInviteMessage(messages?: RowMessage[] | null) {
  const normalized = normalizeMessages(messages);
  const inviteMessages = normalized.filter((message) => message.field === INVITE_FIELD);
  if (!inviteMessages.length) return null;
  return inviteMessages[inviteMessages.length - 1] ?? null;
}

export function resolveInviteStatus(params: {
  rowStatus?: string | null;
  createdUserId?: string | null;
  messages?: RowMessage[] | null;
  autoInviteEnabled?: boolean;
}): InviteStatus {
  const { rowStatus, createdUserId, messages, autoInviteEnabled } = params;
  if (rowStatus !== "IMPORTED" || !createdUserId) {
    return "NOT_APPLICABLE";
  }

  const inviteMessage = getInviteMessage(messages);
  if (!inviteMessage) {
    return autoInviteEnabled ? "SENT" : "PENDING";
  }

  if (inviteMessage.type === "SUCCESS") {
    return "SENT";
  }

  if (inviteMessage.type === "WARNING" || inviteMessage.type === "ERROR") {
    return "FAILED";
  }

  return "PENDING";
}

export function upsertInviteMessage(params: { messages?: RowMessage[] | null; type: RowMessageType; message: string }) {
  const normalized = normalizeMessages(params.messages);
  const filtered = normalized.filter((entry) => entry.field !== INVITE_FIELD);
  return [
    ...filtered,
    {
      type: params.type,
      field: INVITE_FIELD,
      message: params.message,
    },
  ];
}
