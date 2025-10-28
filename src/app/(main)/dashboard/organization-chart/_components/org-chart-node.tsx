import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface EmployeeNodeData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  photoUrl: string | null;
  position: string | null;
  department: string | null;
}

interface OrgChartNodeProps {
  employee: EmployeeNodeData;
  isHighlighted?: boolean;
}

export function OrgChartNode({ employee, isHighlighted = false }: OrgChartNodeProps) {
  const initials = `${employee.firstName[0] ?? ""}${employee.lastName[0] ?? ""}`.toUpperCase();
  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div
      className={`bg-card flex min-w-[220px] flex-col items-center gap-3 rounded-lg border p-4 shadow-xs transition-all hover:shadow-md ${
        isHighlighted ? "border-primary ring-primary ring-1" : ""
      }`}
    >
      <Avatar className="border-border h-16 w-16 border-2">
        <AvatarImage src={employee.photoUrl ?? undefined} alt={fullName} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-foreground text-sm leading-tight font-semibold">{fullName}</p>
        {employee.position && <p className="text-muted-foreground text-xs">{employee.position}</p>}
        {employee.department && <p className="text-muted-foreground text-xs italic">{employee.department}</p>}
        {employee.email && <p className="text-muted-foreground mt-1 truncate text-xs">{employee.email}</p>}
      </div>
    </div>
  );
}
