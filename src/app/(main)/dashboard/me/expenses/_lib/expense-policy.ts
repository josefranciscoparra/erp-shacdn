export const EXPENSE_CATEGORIES = ["FUEL", "MILEAGE", "MEAL", "TOLL", "PARKING", "LODGING", "OTHER"] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseMode = "PRIVATE" | "PUBLIC" | "MIXED";

export interface ExpenseCategoryRequirement {
  requiresReceipt?: boolean;
  vatAllowed?: boolean;
  description?: string;
  maxDailyAmount?: number | null;
}

export interface ExpensePolicyClient {
  expenseMode: ExpenseMode;
  mileageRate: number;
  attachmentRequired: boolean;
  vatAllowed: boolean;
  categoryRequirements: Record<ExpenseCategory, ExpenseCategoryRequirement>;
}

export function resolveExpenseMode(expenseMode?: string | null): ExpenseMode {
  if (expenseMode === "PUBLIC" || expenseMode === "MIXED" || expenseMode === "PRIVATE") {
    return expenseMode;
  }
  return "PRIVATE";
}

export function serializeExpensePolicy(policy: any, expenseMode?: string | null): ExpensePolicyClient | null {
  if (!policy) return null;

  const rawMileageRate = Number(policy.mileageRateEurPerKm);
  const mileageRate = Number.isNaN(rawMileageRate) ? 0.26 : rawMileageRate;
  const attachmentRequired = policy.attachmentRequired === true;
  const vatAllowed = policy.vatAllowed !== undefined ? policy.vatAllowed === true : true;
  const rawRequirements =
    policy.categoryRequirements && typeof policy.categoryRequirements === "object" ? policy.categoryRequirements : {};

  const categoryRequirements = EXPENSE_CATEGORIES.reduce(
    (acc, category) => {
      const raw = rawRequirements[category] ?? {};
      let maxDailyAmount: number | null = null;
      if (raw.maxDailyAmount !== undefined && raw.maxDailyAmount !== null) {
        const parsedAmount = Number(raw.maxDailyAmount);
        maxDailyAmount = Number.isNaN(parsedAmount) ? null : parsedAmount;
      }

      acc[category] = {
        requiresReceipt: raw.requiresReceipt,
        vatAllowed: raw.vatAllowed,
        description: raw.description,
        maxDailyAmount,
      };
      return acc;
    },
    {} as Record<ExpenseCategory, ExpenseCategoryRequirement>,
  );

  return {
    expenseMode: resolveExpenseMode(expenseMode),
    mileageRate,
    attachmentRequired,
    vatAllowed,
    categoryRequirements,
  };
}

export function getCategoryRequirement(
  policy: ExpensePolicyClient | null | undefined,
  category?: string | null,
): ExpenseCategoryRequirement {
  if (!policy || !category) return {};
  if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) return {};
  const categoryKey = category as ExpenseCategory;
  const requirement = policy.categoryRequirements[categoryKey];
  return requirement ?? {};
}

export function isReceiptRequired(policy: ExpensePolicyClient | null | undefined, category?: string | null): boolean {
  if (!policy) return false;
  const requirement = getCategoryRequirement(policy, category);
  if (typeof requirement.requiresReceipt === "boolean") {
    return requirement.requiresReceipt;
  }
  return policy.attachmentRequired === true;
}

export function isVatAllowed(policy: ExpensePolicyClient | null | undefined, category?: string | null): boolean {
  if (!policy) return true;
  const requirement = getCategoryRequirement(policy, category);
  if (typeof requirement.vatAllowed === "boolean") {
    return requirement.vatAllowed;
  }
  return policy.vatAllowed === true;
}

export function getCategoryLimit(
  policy: ExpensePolicyClient | null | undefined,
  category?: string | null,
): number | null {
  if (!policy) return null;
  const requirement = getCategoryRequirement(policy, category);
  if (typeof requirement.maxDailyAmount === "number") {
    return requirement.maxDailyAmount;
  }
  return null;
}
