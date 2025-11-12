/**
 * Datos MOCK para el Dashboard de Turnos
 *
 * ⚠️ IMPORTANTE: Estos son datos ficticios para demostración visual
 * NO conectar con API ni base de datos
 */

export interface MockStats {
  totalShifts: number;
  draftShifts: number;
  publishedShifts: number;
  conflictShifts: number;
  coverage: number;
  employeesWithoutShifts: number;
  totalEmployees: number;
  hoursAssigned: number;
  hoursContracted: number;
}

export interface MockAlert {
  id: string;
  type: "conflict" | "coverage" | "unpublished" | "no_shifts" | "hours";
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  affectedEmployees: string[];
  weekDisplay: string;
}

export interface MockCenterZone {
  name: string;
  coverage: number;
  requiredEmployees: number;
  assignedEmployees: number;
}

export interface MockCenter {
  id: string;
  name: string;
  totalShifts: number;
  coverage: number;
  alerts: number;
  zones: MockCenterZone[];
}

/**
 * Estadísticas generales del dashboard
 */
export const MOCK_DASHBOARD_STATS: MockStats = {
  totalShifts: 34,
  draftShifts: 3,
  publishedShifts: 28,
  conflictShifts: 3,
  coverage: 67,
  employeesWithoutShifts: 12,
  totalEmployees: 45,
  hoursAssigned: 240,
  hoursContracted: 320,
};

/**
 * Alertas críticas que requieren atención
 */
export const MOCK_CRITICAL_ALERTS: MockAlert[] = [
  {
    id: "alert-1",
    type: "conflict",
    severity: "error",
    title: "3 conflictos de horario detectados",
    description: "Empleados con turnos superpuestos que requieren reasignación inmediata",
    affectedEmployees: ["Ana García", "Carlos López", "María Sánchez"],
    weekDisplay: "Semana 10-16 Nov 2025",
  },
  {
    id: "alert-2",
    type: "coverage",
    severity: "error",
    title: "Cobertura insuficiente en Recepción",
    description: "Solo 45% de cobertura en horario de mayor demanda",
    affectedEmployees: ["Pedro Martínez"],
    weekDisplay: "Semana 10-16 Nov 2025",
  },
  {
    id: "alert-3",
    type: "no_shifts",
    severity: "warning",
    title: "12 empleados sin turnos asignados",
    description: "Empleados activos que no tienen ningún turno programado esta semana",
    affectedEmployees: [
      "Laura Torres",
      "Javier Ruiz",
      "Carmen Díaz",
      "Roberto Fernández",
      "Isabel Moreno",
      "Diego Jiménez",
      "Patricia Álvarez",
      "Miguel Romero",
      "Elena Navarro",
      "Francisco Gil",
      "Lucía Serrano",
      "Antonio Molina",
    ],
    weekDisplay: "Semana 10-16 Nov 2025",
  },
  {
    id: "alert-4",
    type: "unpublished",
    severity: "warning",
    title: "3 turnos en borrador sin publicar",
    description: "Turnos creados que aún no han sido publicados y notificados a los empleados",
    affectedEmployees: ["Sofía Castro", "Raúl Ortiz", "Marta Ramos"],
    weekDisplay: "Semana 17-23 Nov 2025",
  },
  {
    id: "alert-5",
    type: "hours",
    severity: "warning",
    title: "Horas contratadas por debajo del objetivo",
    description: "Solo se han asignado 240h de 320h contratadas (75%)",
    affectedEmployees: [],
    weekDisplay: "Semana 10-16 Nov 2025",
  },
  {
    id: "alert-6",
    type: "coverage",
    severity: "info",
    title: "Cobertura completa en Centro Barcelona",
    description: "Todas las zonas tienen 100% de cobertura programada",
    affectedEmployees: [],
    weekDisplay: "Semana 10-16 Nov 2025",
  },
];

/**
 * Resumen por centro de trabajo - Tiendas El Ganso Barcelona
 */
export const MOCK_CENTERS: MockCenter[] = [
  {
    id: "cc1",
    name: "Rambla del ganso",
    totalShifts: 34,
    coverage: 67,
    alerts: 3,
    zones: [
      {
        name: "Planta Baja",
        coverage: 75,
        requiredEmployees: 5,
        assignedEmployees: 4,
      },
      {
        name: "Planta 1",
        coverage: 67,
        requiredEmployees: 4,
        assignedEmployees: 3,
      },
      {
        name: "Caja",
        coverage: 60,
        requiredEmployees: 3,
        assignedEmployees: 2,
      },
      {
        name: "Probadores",
        coverage: 50,
        requiredEmployees: 2,
        assignedEmployees: 1,
      },
    ],
  },
  {
    id: "cc2",
    name: "El Ganso Ferrán",
    totalShifts: 16,
    coverage: 85,
    alerts: 1,
    zones: [
      {
        name: "Planta Baja",
        coverage: 100,
        requiredEmployees: 4,
        assignedEmployees: 4,
      },
      {
        name: "Caja",
        coverage: 75,
        requiredEmployees: 2,
        assignedEmployees: 2,
      },
      {
        name: "Almacén",
        coverage: 67,
        requiredEmployees: 2,
        assignedEmployees: 1,
      },
    ],
  },
  {
    id: "cc3",
    name: "El Ganso Vidrieria",
    totalShifts: 12,
    coverage: 75,
    alerts: 1,
    zones: [
      {
        name: "Planta Baja",
        coverage: 100,
        requiredEmployees: 4,
        assignedEmployees: 4,
      },
      {
        name: "Caja",
        coverage: 50,
        requiredEmployees: 2,
        assignedEmployees: 1,
      },
    ],
  },
  {
    id: "cc4",
    name: "El Ganso Diagonal 616",
    totalShifts: 14,
    coverage: 90,
    alerts: 0,
    zones: [
      {
        name: "Planta Baja",
        coverage: 100,
        requiredEmployees: 4,
        assignedEmployees: 4,
      },
      {
        name: "Caja",
        coverage: 75,
        requiredEmployees: 2,
        assignedEmployees: 2,
      },
    ],
  },
  {
    id: "cc5",
    name: "El Ganso Diagonal 545",
    totalShifts: 12,
    coverage: 80,
    alerts: 1,
    zones: [
      {
        name: "Planta Baja",
        coverage: 100,
        requiredEmployees: 4,
        assignedEmployees: 4,
      },
      {
        name: "Caja",
        coverage: 50,
        requiredEmployees: 2,
        assignedEmployees: 1,
      },
    ],
  },
  {
    id: "cc6",
    name: "El Ganso Diagonal 557",
    totalShifts: 14,
    coverage: 85,
    alerts: 0,
    zones: [
      {
        name: "Planta Baja",
        coverage: 100,
        requiredEmployees: 4,
        assignedEmployees: 4,
      },
      {
        name: "Caja",
        coverage: 67,
        requiredEmployees: 2,
        assignedEmployees: 1,
      },
    ],
  },
];

/**
 * Función helper para filtrar datos por centro
 */
export function getStatsByCenter(centerId: string): MockStats {
  if (centerId === "all") {
    return MOCK_DASHBOARD_STATS;
  }

  const center = MOCK_CENTERS.find((c) => c.id === centerId);

  if (!center) {
    return MOCK_DASHBOARD_STATS;
  }

  // Calcular stats específicas del centro
  return {
    totalShifts: center.totalShifts,
    draftShifts: Math.floor(center.totalShifts * 0.1),
    publishedShifts: Math.floor(center.totalShifts * 0.85),
    conflictShifts: center.alerts,
    coverage: center.coverage,
    employeesWithoutShifts: Math.floor((100 - center.coverage) / 10),
    totalEmployees: center.zones.reduce((sum, z) => sum + z.requiredEmployees, 0),
    hoursAssigned: center.totalShifts * 8,
    hoursContracted: center.zones.reduce((sum, z) => sum + z.requiredEmployees * 40, 0),
  };
}

/**
 * Función helper para filtrar alertas por centro
 */
export function getAlertsByCenter(centerId: string): MockAlert[] {
  if (centerId === "all") {
    return MOCK_CRITICAL_ALERTS;
  }

  // Filtrar alertas que afecten al centro específico
  // Por simplicidad, devolvemos todas pero en producción esto se filtraría
  return MOCK_CRITICAL_ALERTS.slice(0, 3);
}

/**
 * Función helper para obtener resumen de centros
 */
export function getCentersSummary(centerId: string): MockCenter[] {
  if (centerId === "all") {
    return MOCK_CENTERS;
  }

  const center = MOCK_CENTERS.find((c) => c.id === centerId);
  return center ? [center] : [];
}
