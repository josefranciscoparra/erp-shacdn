import { z } from "zod";

export const ApprovalRequestTypeSchema = z.enum(["PTO", "MANUAL_TIME_ENTRY", "TIME_BANK", "EXPENSE"]);
export type ApprovalRequestType = z.infer<typeof ApprovalRequestTypeSchema>;

export const ApprovalCriterionSchema = z.enum([
  "DIRECT_MANAGER",
  "TEAM_RESPONSIBLE",
  "DEPARTMENT_RESPONSIBLE",
  "COST_CENTER_RESPONSIBLE",
  "HR_ADMIN",
]);
export type ApprovalCriterion = z.infer<typeof ApprovalCriterionSchema>;

export const ApprovalModeSchema = z.enum(["HIERARCHY", "LIST"]);
export type ApprovalMode = z.infer<typeof ApprovalModeSchema>;

export const ApprovalWorkflowSchema = z.object({
  mode: ApprovalModeSchema,
  criteriaOrder: z.array(ApprovalCriterionSchema).min(1),
  approverList: z.array(z.string()).default([]),
});

export type ApprovalWorkflowConfig = z.infer<typeof ApprovalWorkflowSchema>;

export const ApprovalSettingsSchema = z.object({
  version: z.literal(1),
  workflows: z.object({
    PTO: ApprovalWorkflowSchema,
    MANUAL_TIME_ENTRY: ApprovalWorkflowSchema,
    TIME_BANK: ApprovalWorkflowSchema,
    EXPENSE: ApprovalWorkflowSchema,
  }),
});

export type ApprovalSettings = z.infer<typeof ApprovalSettingsSchema>;

const defaultCriteriaOrder: ApprovalCriterion[] = [
  "DIRECT_MANAGER",
  "TEAM_RESPONSIBLE",
  "DEPARTMENT_RESPONSIBLE",
  "COST_CENTER_RESPONSIBLE",
];

export const DEFAULT_APPROVAL_SETTINGS: ApprovalSettings = {
  version: 1,
  workflows: {
    PTO: {
      mode: "HIERARCHY",
      criteriaOrder: defaultCriteriaOrder,
      approverList: [],
    },
    MANUAL_TIME_ENTRY: {
      mode: "HIERARCHY",
      criteriaOrder: defaultCriteriaOrder,
      approverList: [],
    },
    TIME_BANK: {
      mode: "HIERARCHY",
      criteriaOrder: defaultCriteriaOrder,
      approverList: [],
    },
    EXPENSE: {
      mode: "LIST",
      criteriaOrder: defaultCriteriaOrder,
      approverList: [],
    },
  },
};

export function normalizeApprovalSettings(raw: unknown): ApprovalSettings {
  const parsed = ApprovalSettingsSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  return DEFAULT_APPROVAL_SETTINGS;
}
