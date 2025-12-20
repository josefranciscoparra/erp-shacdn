export const PTO_BALANCE_TYPES = ["VACATION", "PERSONAL_MATTERS", "COMP_TIME"] as const;

export type PtoBalanceType = (typeof PTO_BALANCE_TYPES)[number];

export const DEFAULT_PTO_BALANCE_TYPE: PtoBalanceType = "VACATION";
