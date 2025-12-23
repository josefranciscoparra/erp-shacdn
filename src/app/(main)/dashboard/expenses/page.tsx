"use client";

import { useCallback, useEffect, useState } from "react";

import { Download, TrendingDown, TrendingUp, ShieldAlert } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  exportExpensesCSV,
  getExpensesByCategory,
  getExpensesByEmployee,
  getExpenseStats,
  getExpensesTrend,
} from "@/server/actions/expense-analytics";

type Stats = {
  currentPeriod: {
    total: number;
    submitted: { count: number };
    approved: { count: number };
  };
  comparison: {
    percentageChange: number;
    trend: "up" | "down" | "stable";
  };
};

type CategoryData = {
  category: string;
  total: number;
  count: number;
};

type TrendData = {
  monthName: string;
  total: number;
  count: number;
};

type EmployeeData = {
  employeeName: string;
  total: number;
  count: number;
};

// Colores para las categorías
const CATEGORY_COLORS: Record<string, string> = {
  FUEL: "#3b82f6", // blue
  MILEAGE: "#10b981", // green
  MEAL: "#f59e0b", // amber
  TOLL: "#ef4444", // red
  PARKING: "#8b5cf6", // violet
  LODGING: "#ec4899", // pink
  OTHER: "#6b7280", // gray
};

// Formatear moneda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

// Formatear categoría
const formatCategory = (category: string) => {
  const labels: Record<string, string> = {
    FUEL: "Combustible",
    MILEAGE: "Kilometraje",
    MEAL: "Comidas",
    TOLL: "Peajes",
    PARKING: "Parking",
    LODGING: "Alojamiento",
    OTHER: "Otros",
  };
  return labels[category] ?? category;
};

export default function ExpensesAnalyticsPage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Analytics de Gastos" description="Métricas y estadísticas de gastos de la organización." />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar datos en paralelo
      const [statsResult, categoryResult, trendResult, employeeResult] = await Promise.all([
        getExpenseStats().catch(() => null),
        getExpensesByCategory().catch(() => null),
        getExpensesTrend(6).catch(() => null),
        getExpensesByEmployee().catch(() => null),
      ]);

      // Stats
      if (statsResult?.success) {
        setStats({
          currentPeriod: {
            total: Number(statsResult.stats.currentPeriod.total),
            submitted: { count: statsResult.stats.currentPeriod.submitted.count },
            approved: { count: statsResult.stats.currentPeriod.approved.count },
          },
          comparison: statsResult.stats.comparison,
        });
      }

      // Categorías
      if (categoryResult?.success) {
        setCategoryData(
          categoryResult.data.categories.map((cat) => ({
            category: cat.category,
            total: Number(cat.total),
            count: cat.count,
          })),
        );
      }

      // Tendencia
      if (trendResult?.success) {
        setTrendData(
          trendResult.data.map((item) => ({
            monthName: item.monthName,
            total: Number(item.total),
            count: item.count,
          })),
        );
      }

      // Empleados
      if (employeeResult?.success) {
        setEmployeeData(
          employeeResult.data.employees.slice(0, 5).map((emp) => ({
            employeeName: emp.employeeName,
            total: Number(emp.total),
            count: emp.count,
          })),
        );
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError("Error al cargar los datos de análisis");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      // Llamar al server action para generar el CSV
      const result = await exportExpensesCSV();

      if (!result.success) {
        toast.error(result.error ?? "Error al exportar gastos");
        return;
      }

      // Crear blob con BOM UTF-8 para compatibilidad con Excel
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + result.csv], {
        type: "text/csv;charset=utf-8;",
      });

      // Crear link de descarga
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gastos_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`CSV exportado correctamente (${result.count} gastos)`);
    } catch (err) {
      console.error("Error exporting CSV:", err);
      toast.error("Error inesperado al exportar CSV");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <PermissionGuard permission="approve_requests" fallback={permissionFallback}>
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Analytics de Gastos"
            description="Métricas y estadísticas de gastos de la organización."
          />

          {/* KPI Cards skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="mt-2 h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts skeleton */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  if (error) {
    return (
      <PermissionGuard permission="approve_requests" fallback={permissionFallback}>
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Analytics de Gastos"
            description="Métricas y estadísticas de gastos de la organización."
          />

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="approve_requests" fallback={permissionFallback}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Analytics de Gastos"
          description="Métricas y estadísticas de gastos de la organización."
          action={
            <button
              className="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exportando..." : "Exportar CSV"}
            </button>
          }
        />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total del mes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total del Mes</CardTitle>
              {stats && stats.comparison.trend === "up" && <TrendingUp className="h-4 w-4 text-green-600" />}
              {stats && stats.comparison.trend === "down" && <TrendingDown className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats ? formatCurrency(stats.currentPeriod.total) : "-"}</div>
              {stats && (
                <p className={`text-xs ${stats.comparison.percentageChange > 0 ? "text-green-600" : "text-red-600"}`}>
                  {stats.comparison.percentageChange > 0 ? "+" : ""}
                  {stats.comparison.percentageChange.toFixed(1)}% vs mes anterior
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pendientes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes de Aprobación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.currentPeriod.submitted.count ?? 0}</div>
              <p className="text-muted-foreground text-xs">Gastos enviados</p>
            </CardContent>
          </Card>

          {/* Aprobados */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprobados este Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.currentPeriod.approved.count ?? 0}</div>
              <p className="text-muted-foreground text-xs">Gastos aprobados</p>
            </CardContent>
          </Card>

          {/* Promedio por empleado */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {employeeData.length > 0
                  ? formatCurrency(employeeData.reduce((sum, e) => sum + e.total, 0) / employeeData.length)
                  : "-"}
              </div>
              <p className="text-muted-foreground text-xs">Gasto medio</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Gastos por Categoría - Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
              <CardDescription>Distribución de gastos aprobados del mes actual</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ category, percent }) => `${formatCategory(category)}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => formatCategory(label)}
                    />
                    <Legend formatter={(value) => formatCategory(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center">
                  <p className="text-muted-foreground text-sm">No hay datos de categorías disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Empleados - Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Empleados</CardTitle>
              <CardDescription>Empleados con mayor gasto aprobado este mes</CardDescription>
            </CardHeader>
            <CardContent>
              {employeeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={employeeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `${value.toLocaleString()}€`} />
                    <YAxis type="category" dataKey="employeeName" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name) => [formatCurrency(value), name === "total" ? "Total" : name]}
                    />
                    <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center">
                  <p className="text-muted-foreground text-sm">No hay datos de empleados disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tendencia Mensual - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Gastos</CardTitle>
            <CardDescription>Evolución de gastos aprobados en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" />
                  <YAxis tickFormatter={(value) => `${value.toLocaleString()}€`} />
                  <Tooltip
                    formatter={(value: number, name) => [
                      name === "total" ? formatCurrency(value) : value,
                      name === "total" ? "Total" : "Cantidad",
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Total"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Cantidad"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-muted-foreground text-sm">No hay datos de tendencia disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info card para usuarios sin datos */}
        {categoryData.length === 0 && trendData.length === 0 && employeeData.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-2">No hay datos de gastos disponibles</p>
              <p className="text-muted-foreground text-sm">
                Los gráficos se mostrarán cuando haya gastos aprobados en el sistema.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionGuard>
  );
}
