import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") ?? "";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

    // Normalizar el query para búsquedas con/sin acentos
    const normalizedQuery = query.trim();
    const queryVariants = [normalizedQuery];

    // Si contiene 'a', también buscar con 'á', 'à', 'ä', etc.
    if (normalizedQuery.toLowerCase().includes("a")) {
      queryVariants.push(normalizedQuery.replace(/a/gi, (match) => (match === "a" ? "á" : "Á")));
    }
    // Si contiene 'á', también buscar con 'a'
    if (normalizedQuery.toLowerCase().includes("á")) {
      queryVariants.push(normalizedQuery.replace(/á/gi, (match) => (match === "á" ? "a" : "A")));
    }
    // Lo mismo para otras vocales
    if (normalizedQuery.toLowerCase().includes("e")) {
      queryVariants.push(normalizedQuery.replace(/e/gi, (match) => (match === "e" ? "é" : "É")));
    }
    if (normalizedQuery.toLowerCase().includes("é")) {
      queryVariants.push(normalizedQuery.replace(/é/gi, (match) => (match === "é" ? "e" : "E")));
    }
    if (normalizedQuery.toLowerCase().includes("i")) {
      queryVariants.push(normalizedQuery.replace(/i/gi, (match) => (match === "i" ? "í" : "Í")));
    }
    if (normalizedQuery.toLowerCase().includes("í")) {
      queryVariants.push(normalizedQuery.replace(/í/gi, (match) => (match === "í" ? "i" : "I")));
    }
    if (normalizedQuery.toLowerCase().includes("o")) {
      queryVariants.push(normalizedQuery.replace(/o/gi, (match) => (match === "o" ? "ó" : "Ó")));
    }
    if (normalizedQuery.toLowerCase().includes("ó")) {
      queryVariants.push(normalizedQuery.replace(/ó/gi, (match) => (match === "ó" ? "o" : "O")));
    }
    if (normalizedQuery.toLowerCase().includes("u")) {
      queryVariants.push(normalizedQuery.replace(/u/gi, (match) => (match === "u" ? "ú" : "Ú")));
    }
    if (normalizedQuery.toLowerCase().includes("ú")) {
      queryVariants.push(normalizedQuery.replace(/ú/gi, (match) => (match === "ú" ? "u" : "U")));
    }

    // Construir el filtro de búsqueda
    // Buscar con todas las variantes del query
    const searchFilter = normalizedQuery
      ? {
          OR: queryVariants.flatMap((variant) => [
            {
              firstName: {
                contains: variant,
                mode: "insensitive" as const,
              },
            },
            {
              lastName: {
                contains: variant,
                mode: "insensitive" as const,
              },
            },
            {
              secondLastName: {
                contains: variant,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: variant,
                mode: "insensitive" as const,
              },
            },
            {
              employeeNumber: {
                contains: variant,
                mode: "insensitive" as const,
              },
            },
          ]),
        }
      : {};

    // Buscar empleados activos que coincidan con la búsqueda
    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        active: true,
        ...searchFilter,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        secondLastName: true,
        employeeNumber: true,
        email: true,
        employmentContracts: {
          where: {
            active: true,
          },
          select: {
            position: {
              select: {
                title: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
    });

    // Transformar los datos para mejor uso en el frontend
    const employeesData = employees.map((employee) => {
      const currentContract = employee.employmentContracts[0];
      const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

      return {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        secondLastName: employee.secondLastName,
        fullName,
        employeeNumber: employee.employeeNumber,
        email: employee.email,
        position: currentContract?.position?.title ?? null,
        department: currentContract?.department?.name ?? null,
      };
    });

    // Eliminar duplicados por ID
    const uniqueEmployees = Array.from(new Map(employeesData.map((e) => [e.id, e])).values());

    console.log(
      `[employees/search] Query: "${query}" | Variantes: ${queryVariants.length} | Found: ${employees.length} -> Unique: ${uniqueEmployees.length}`,
    );
    if (query.toLowerCase().includes("maría") || query.toLowerCase().includes("maria")) {
      const marias = uniqueEmployees.filter(
        (e) => e.fullName.toLowerCase().includes("maría") || e.fullName.toLowerCase().includes("maria"),
      );
      console.log(
        "[employees/search] Marías encontradas:",
        marias.map((m) => m.fullName),
      );
    }

    return NextResponse.json(uniqueEmployees);
  } catch (error) {
    console.error("Error al buscar empleados:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
