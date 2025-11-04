import { Fuel, Car, UtensilsCrossed, Ticket, ParkingCircle, Hotel, MoreHorizontal, type LucideIcon } from "lucide-react";

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    FUEL: "Combustible",
    MILEAGE: "Kilometraje",
    MEAL: "Comida",
    TOLL: "Peaje",
    PARKING: "Parking",
    LODGING: "Alojamiento",
    OTHER: "Otros",
  };

  return labels[category] ?? category;
}

export function getCategoryIcon(category: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    FUEL: Fuel,
    MILEAGE: Car,
    MEAL: UtensilsCrossed,
    TOLL: Ticket,
    PARKING: ParkingCircle,
    LODGING: Hotel,
    OTHER: MoreHorizontal,
  };

  return icons[category] ?? MoreHorizontal;
}

interface ExpenseCategoryIconProps {
  category: string;
  className?: string;
}

export function ExpenseCategoryIcon({ category, className }: ExpenseCategoryIconProps) {
  const Icon = getCategoryIcon(category);
  return <Icon className={className} />;
}
