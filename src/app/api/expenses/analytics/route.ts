import { NextRequest, NextResponse } from "next/server";

import {
  getExecutiveSummary,
  getExpensesByCategory,
  getExpensesByEmployee,
  getExpenseStats,
  getExpensesTrend,
} from "@/server/actions/expense-analytics";

/**
 * GET /api/expenses/analytics
 * Obtiene análisis y estadísticas de gastos
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") ?? "stats";

    switch (type) {
      case "stats": {
        // Estadísticas generales con comparativa
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        const dateRange = {
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined,
        };

        const result = await getExpenseStats(dateRange);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result.stats);
      }

      case "by-category": {
        // Gastos agrupados por categoría
        const year = searchParams.get("year");
        const month = searchParams.get("month");

        const result = await getExpensesByCategory(
          year ? parseInt(year) : undefined,
          month ? parseInt(month) : undefined
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result.data);
      }

      case "by-employee": {
        // Gastos agrupados por empleado (solo admins)
        const year = searchParams.get("year");
        const month = searchParams.get("month");

        const result = await getExpensesByEmployee(
          year ? parseInt(year) : undefined,
          month ? parseInt(month) : undefined
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result.data);
      }

      case "trend": {
        // Tendencia últimos N meses
        const months = searchParams.get("months");

        const result = await getExpensesTrend(months ? parseInt(months) : 12);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result.data);
      }

      case "executive": {
        // Resumen ejecutivo (solo admins)
        const year = searchParams.get("year");
        const month = searchParams.get("month");

        const result = await getExecutiveSummary(
          year ? parseInt(year) : undefined,
          month ? parseInt(month) : undefined
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result.summary);
      }

      default:
        return NextResponse.json(
          { error: "Tipo de análisis no válido. Use: stats, by-category, by-employee, trend, executive" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error en GET /api/expenses/analytics:", error);
    return NextResponse.json({ error: "Error al obtener análisis" }, { status: 500 });
  }
}
