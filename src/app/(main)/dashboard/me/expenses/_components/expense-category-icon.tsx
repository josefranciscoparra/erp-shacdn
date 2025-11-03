import { Bed, Car, Fuel, ParkingCircle, Receipt, Route, UtensilsCrossed } from "lucide-react";

import type { ExpenseCategory } from "@/stores/expenses-store";

interface ExpenseCategoryIconProps {
  category: ExpenseCategory;
  className?: string;
}

const categoryConfig: Record<
  ExpenseCategory,
  {
    icon: React.ElementType;
    label: string;
    color: string;
  }
> = {
  FUEL: {
    icon: Fuel,
    label: "Combustible",
    color: "text-orange-500",
  },
  MILEAGE: {
    icon: Car,
    label: "Kilometraje",
    color: "text-blue-500",
  },
  MEAL: {
    icon: UtensilsCrossed,
    label: "Comida",
    color: "text-green-500",
  },
  TOLL: {
    icon: Route,
    label: "Peaje",
    color: "text-purple-500",
  },
  PARKING: {
    icon: ParkingCircle,
    label: "Parking",
    color: "text-indigo-500",
  },
  LODGING: {
    icon: Bed,
    label: "Alojamiento",
    color: "text-pink-500",
  },
  OTHER: {
    icon: Receipt,
    label: "Otros",
    color: "text-gray-500",
  },
};

export function ExpenseCategoryIcon({ category, className }: ExpenseCategoryIconProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return <Icon className={`${config.color} ${className ?? ""}`} />;
}

export function getCategoryLabel(category: ExpenseCategory): string {
  return categoryConfig[category].label;
}

export { categoryConfig };
