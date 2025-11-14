/**
 * Implementación Mock del Servicio de Turnos
 *
 * Simula un backend real con datos en memoria.
 * IMPORTANTE: Este archivo será reemplazado por shift-service.api.ts cuando
 * se implemente el backend real.
 */

import type { IShiftService } from "./shift-service.interface";
import type {
  Shift,
  ShiftInput,
  ShiftFilters,
  ShiftServiceResponse,
  Zone,
  ZoneInput,
  ShiftTemplate,
  TemplateInput,
  ApplyTemplateInput,
  ApplyTemplateResponse,
  PublishShiftsResponse,
  ValidationResult,
  EmployeeShift,
  CostCenter,
  EmployeeWeekStats,
  ZoneCoverageStats,
  TimeSlot,
  DragResult,
  ShiftStatus,
  ShiftType,
  ConflictType,
} from "./types";

// ==================== DATOS SEED (BASE DE DATOS MOCK) ====================

/**
 * Lugares de trabajo (CostCenters) - Tiendas El Ganso Barcelona
 */
const MOCK_COST_CENTERS: CostCenter[] = [
  {
    id: "cc1",
    name: "Rambla del ganso",
    address: "Rambla Cataluña, 116, Barcelona",
    timezone: "Europe/Madrid",
    active: true,
  },
  {
    id: "cc2",
    name: "El Ganso Ferrán",
    address: "C/ Ferrán, 43-45, Barcelona",
    timezone: "Europe/Madrid",
    active: true,
  },
  {
    id: "cc3",
    name: "El Ganso Vidrieria",
    address: "C/ Vidrieria, 7, Barcelona",
    timezone: "Europe/Madrid",
    active: true,
  },
  {
    id: "cc4",
    name: "El Ganso Diagonal 616",
    address: "Avda. Diagonal, 616, Barcelona",
    timezone: "Europe/Madrid",
    active: true,
  },
  {
    id: "cc5",
    name: "El Ganso Diagonal 545",
    address: "Avda. Diagonal, 545, Barcelona",
    timezone: "Europe/Madrid",
    active: true,
  },
  {
    id: "cc6",
    name: "El Ganso Diagonal 557",
    address: "Avenida Diagonal 557, Barcelona",
    timezone: "Europe/Madrid",
    active: true,
  },
];

/**
 * Zonas de trabajo dentro de tiendas El Ganso
 */
const MOCK_ZONES: Zone[] = [
  // Rambla del ganso (tienda grande, 2 plantas)
  {
    id: "z1",
    name: "Planta Baja",
    costCenterId: "cc1",
    requiredCoverage: { morning: 3, afternoon: 3, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "z2",
    name: "Planta 1",
    costCenterId: "cc1",
    requiredCoverage: { morning: 2, afternoon: 2, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "z3",
    name: "Caja",
    costCenterId: "cc1",
    requiredCoverage: { morning: 1, afternoon: 2, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "z4",
    name: "Probadores",
    costCenterId: "cc1",
    requiredCoverage: { morning: 1, afternoon: 1, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  // Tienda Ferrán
  {
    id: "z5",
    name: "Planta Baja",
    costCenterId: "cc2",
    requiredCoverage: { morning: 2, afternoon: 2, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "z6",
    name: "Caja",
    costCenterId: "cc2",
    requiredCoverage: { morning: 1, afternoon: 1, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "z7",
    name: "Almacén",
    costCenterId: "cc2",
    requiredCoverage: { morning: 1, afternoon: 1, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  // Tienda Vidrieria
  {
    id: "z8",
    name: "Planta Baja",
    costCenterId: "cc3",
    requiredCoverage: { morning: 2, afternoon: 2, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "z9",
    name: "Caja",
    costCenterId: "cc3",
    requiredCoverage: { morning: 1, afternoon: 1, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  // Tienda Diagonal 616
  {
    id: "z10",
    name: "Planta Baja",
    costCenterId: "cc4",
    requiredCoverage: { morning: 2, afternoon: 2, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "z11",
    name: "Caja",
    costCenterId: "cc4",
    requiredCoverage: { morning: 1, afternoon: 1, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  // Tienda Diagonal 545
  {
    id: "z12",
    name: "Planta Baja",
    costCenterId: "cc5",
    requiredCoverage: { morning: 2, afternoon: 2, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "z13",
    name: "Caja",
    costCenterId: "cc5",
    requiredCoverage: { morning: 1, afternoon: 1, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  // Tienda Diagonal 557
  {
    id: "z14",
    name: "Planta Baja",
    costCenterId: "cc6",
    requiredCoverage: { morning: 2, afternoon: 2, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "z15",
    name: "Caja",
    costCenterId: "cc6",
    requiredCoverage: { morning: 1, afternoon: 1, night: 0 },
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
];

/**
 * Empleados El Ganso Barcelona - Sistema de turnos
 */
const MOCK_EMPLOYEES: EmployeeShift[] = [
  // Rambla del ganso (cc1)
  {
    id: "e1",
    firstName: "Francesc",
    lastName: "",
    contractHours: 40,
    usesShiftSystem: true,
    costCenterId: "cc1",
    absences: [],
  },
  {
    id: "e2",
    firstName: "Marta",
    lastName: "",
    contractHours: 30,
    usesShiftSystem: true,
    costCenterId: "cc1",
    absences: [],
  },
  {
    id: "e3",
    firstName: "Patricia",
    lastName: "",
    contractHours: 30,
    usesShiftSystem: true,
    costCenterId: "cc1",
    absences: [],
  },
  {
    id: "e4",
    firstName: "Tania",
    lastName: "",
    contractHours: 20,
    usesShiftSystem: true,
    costCenterId: "cc1",
    absences: [],
  },
  {
    id: "e5",
    firstName: "Andrea",
    lastName: "",
    contractHours: 20,
    usesShiftSystem: true,
    costCenterId: "cc1",
    absences: [],
  },
  {
    id: "e6",
    firstName: "Luna",
    lastName: "",
    contractHours: 20,
    usesShiftSystem: true,
    costCenterId: "cc1",
    absences: [],
  },
  // Tienda Ferrán (cc2)
  {
    id: "e7",
    firstName: "Marta",
    lastName: "Vila",
    contractHours: 40,
    usesShiftSystem: true,
    costCenterId: "cc2",
    absences: [],
  },
  {
    id: "e8",
    firstName: "Jordi",
    lastName: "Puig",
    contractHours: 30,
    usesShiftSystem: true,
    costCenterId: "cc2",
    absences: [],
  },
  // Tienda Vidrieria (cc3)
  {
    id: "e9",
    firstName: "Laura",
    lastName: "Martínez",
    contractHours: 40,
    usesShiftSystem: true,
    costCenterId: "cc3",
    absences: [],
  },
  {
    id: "e10",
    firstName: "Marc",
    lastName: "Serra",
    contractHours: 25,
    usesShiftSystem: true,
    costCenterId: "cc3",
    absences: [],
  },
  // Tienda Diagonal 616
  {
    id: "e11",
    firstName: "Clara",
    lastName: "Roca",
    contractHours: 40,
    usesShiftSystem: true,
    costCenterId: "cc4",
    absences: [],
  },
  {
    id: "e12",
    firstName: "Albert",
    lastName: "Camps",
    contractHours: 30,
    usesShiftSystem: true,
    costCenterId: "cc4",
    absences: [],
  },
  // Tienda Diagonal 545
  {
    id: "e13",
    firstName: "Sara",
    lastName: "Vidal",
    contractHours: 40,
    usesShiftSystem: true,
    costCenterId: "cc5",
    absences: [],
  },
  {
    id: "e14",
    firstName: "Sergi",
    lastName: "Pons",
    contractHours: 25,
    usesShiftSystem: true,
    costCenterId: "cc5",
    absences: [],
  },
  // Tienda Diagonal 557
  {
    id: "e15",
    firstName: "Júlia",
    lastName: "Mas",
    contractHours: 40,
    usesShiftSystem: true,
    costCenterId: "cc6",
    absences: [],
  },
  {
    id: "e16",
    firstName: "Roger",
    lastName: "Llopis",
    contractHours: 30,
    usesShiftSystem: true,
    costCenterId: "cc6",
    absences: [],
  },
];

/**
 * Turnos El Ganso Barcelona - Semana actual (18-24 Nov 2025)
 * Horarios típicos retail: 10:00-14:00 (mañana), 14:00-20:00 (tarde), 10:00-20:00 (completo)
 */
const MOCK_SHIFTS: Shift[] = [
  // ========== SEMANA 10-16 NOVIEMBRE ==========

  // LUNES 10 - Rambla del ganso
  {
    id: "s101",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-10",
    startTime: "10:00",
    endTime: "19:00", // 9h con 1h descanso = 8h trabajadas
    breakMinutes: 60,
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s102",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-10",
    startTime: "14:00",
    endTime: "20:30", // 6.5h con 30min descanso = 6h trabajadas
    breakMinutes: 30,
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s103",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-10",
    startTime: "10:00",
    endTime: "16:30", // 6.5h con 30min descanso = 6h trabajadas
    breakMinutes: 30,
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s104",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-10",
    startTime: "16:00",
    endTime: "20:15", // 4.25h con 15min descanso = 4h trabajadas
    breakMinutes: 15,
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s105",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-10",
    startTime: "10:00",
    endTime: "14:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s106",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-10",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // MARTES 11 - Rambla del ganso
  {
    id: "s107",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-11",
    startTime: "10:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s108",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-11",
    startTime: "10:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s109",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-11",
    startTime: "14:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s110",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-11",
    startTime: "10:00",
    endTime: "14:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s111",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-11",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s112",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-11",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // MIÉRCOLES 12 - Rambla del ganso
  {
    id: "s113",
    employeeId: "e1", // Francesc - 40h - VACACIONES
    date: "2025-11-12",
    startTime: "00:00",
    endTime: "23:59",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Vacaciones",
    status: "published",
    notes: "Día de vacaciones",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s114",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-12",
    startTime: "14:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s115",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-12",
    startTime: "10:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s116",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-12",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s117",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-12",
    startTime: "10:00",
    endTime: "14:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s118",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-12",
    startTime: "14:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // JUEVES 13 - Rambla del ganso
  {
    id: "s119",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-13",
    startTime: "10:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s120",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-13",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s121",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-13",
    startTime: "14:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s122",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-13",
    startTime: "10:00",
    endTime: "14:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s123",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-13",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Andrea tiene día libre el jueves

  // VIERNES 14 - Rambla del ganso
  {
    id: "s124",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-14",
    startTime: "10:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s125",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-14",
    startTime: "10:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s126",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-14",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s127",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-14",
    startTime: "14:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s128",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-14",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Tania tiene día libre el viernes

  // SÁBADO 15 - Rambla del ganso
  {
    id: "s129",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-15",
    startTime: "12:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s130",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-15",
    startTime: "14:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s131",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-15",
    startTime: "12:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s132",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-15",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s133",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-15",
    startTime: "12:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s134",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-15",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // DOMINGO 16 - Día de descanso para todos

  // ========== SEMANA 18-24 NOVIEMBRE ==========

  // LUNES 18 - Rambla del ganso
  {
    id: "s1",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-18",
    startTime: "10:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s2",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-18",
    startTime: "14:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s3",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-18",
    startTime: "14:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s4",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-18",
    startTime: "10:00",
    endTime: "14:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s5",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-18",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s6",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-18",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // MARTES 19 - Rambla del ganso
  {
    id: "s7",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-19",
    startTime: "10:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s8",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-19",
    startTime: "14:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s9",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-19",
    startTime: "10:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s10",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-19",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s11",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-19",
    startTime: "10:00",
    endTime: "14:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s12",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-19",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // MIÉRCOLES 20 - Rambla del ganso
  {
    id: "s13",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-20",
    startTime: "10:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s14",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-20",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s15",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-20",
    startTime: "14:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s16",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-20",
    startTime: "10:00",
    endTime: "14:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s17",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-20",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s18",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-20",
    startTime: "14:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // JUEVES 21 - Rambla del ganso
  {
    id: "s19",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-21",
    startTime: "10:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s20",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-21",
    startTime: "10:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s21",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-21",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s22",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-21",
    startTime: "14:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s23",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-21",
    startTime: "10:00",
    endTime: "14:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Andrea tiene día libre el jueves

  // VIERNES 22 - Rambla del ganso
  {
    id: "s24",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-22",
    startTime: "10:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s25",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-22",
    startTime: "14:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s26",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-22",
    startTime: "10:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s27",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-22",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s28",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-22",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Tania tiene día libre el viernes

  // SÁBADO 23 - Rambla del ganso
  {
    id: "s29",
    employeeId: "e1", // Francesc - 40h
    date: "2025-11-23",
    startTime: "12:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s30",
    employeeId: "e2", // Marta - 30h
    date: "2025-11-23",
    startTime: "14:00",
    endTime: "18:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s31",
    employeeId: "e3", // Patricia - 30h
    date: "2025-11-23",
    startTime: "12:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z2",
    role: "Planta 1",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s32",
    employeeId: "e4", // Tania - 20h
    date: "2025-11-23",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z4",
    role: "Probadores",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s33",
    employeeId: "e5", // Andrea - 20h
    date: "2025-11-23",
    startTime: "12:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Planta Baja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "s34",
    employeeId: "e6", // Luna - 20h
    date: "2025-11-23",
    startTime: "16:00",
    endTime: "20:00",
    costCenterId: "cc1",
    zoneId: "z3",
    role: "Caja",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // DOMINGO 24 - Día de descanso para todos
];

/**
 * Plantillas de turnos rotativos
 */
const MOCK_TEMPLATES: ShiftTemplate[] = [
  {
    id: "t1",
    name: "Rotativo Mañana-Tarde-Noche-Descanso",
    pattern: ["morning", "afternoon", "night", "off"],
    shiftDuration: 8,
    description: "Rotación clásica 4 días: M→T→N→D",
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
  {
    id: "t2",
    name: "Fines de Semana",
    pattern: ["saturday", "sunday", "off", "off", "off"],
    shiftDuration: 10,
    description: "Solo sábados y domingos con 3 días descanso",
    active: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  },
];

// ==================== CONFIGURACIÓN MOCK ====================

const MIN_REST_HOURS = 12;
const MAX_WEEKLY_HOURS_PERCENTAGE = 150; // 150% de la jornada pactada

// ==================== CLASE DE IMPLEMENTACIÓN MOCK ====================

export class ShiftServiceMock implements IShiftService {
  // Helpers para generar IDs únicos
  private generateId(prefix: string): string {
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== CRUD TURNOS ====================

  async getShifts(filters: ShiftFilters): Promise<Shift[]> {
    let result = [...MOCK_SHIFTS];

    if (filters.costCenterId) {
      result = result.filter((s) => s.costCenterId === filters.costCenterId);
    }

    if (filters.zoneId) {
      result = result.filter((s) => s.zoneId === filters.zoneId);
    }

    if (filters.role) {
      result = result.filter((s) => s.role?.toLowerCase().includes(filters.role!.toLowerCase()));
    }

    if (filters.status) {
      result = result.filter((s) => s.status === filters.status);
    }

    if (filters.employeeId) {
      result = result.filter((s) => s.employeeId === filters.employeeId);
    }

    if (filters.dateFrom) {
      result = result.filter((s) => s.date >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      result = result.filter((s) => s.date <= filters.dateTo!);
    }

    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 100));

    return result;
  }

  async getShiftById(id: string): Promise<Shift | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return MOCK_SHIFTS.find((s) => s.id === id) ?? null;
  }

  async createShift(data: ShiftInput): Promise<ShiftServiceResponse> {
    // Validar primero
    const validation = await this.validateShift(data);

    const newShift: Shift = {
      id: this.generateId("s"),
      ...data,
      status: validation.conflicts.length > 0 ? "conflict" : "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    MOCK_SHIFTS.push(newShift);

    await new Promise((resolve) => setTimeout(resolve, 150));

    return {
      success: true,
      data: newShift,
      validation,
    };
  }

  async updateShift(id: string, data: Partial<ShiftInput>): Promise<ShiftServiceResponse> {
    const index = MOCK_SHIFTS.findIndex((s) => s.id === id);
    if (index === -1) {
      return { success: false, error: "Turno no encontrado" };
    }

    const updated: Shift = {
      ...MOCK_SHIFTS[index],
      ...data,
      updatedAt: new Date(),
    };

    // Validar (excluir el turno que se está editando)
    const validation = await this.validateShift(
      {
        employeeId: updated.employeeId,
        date: updated.date,
        startTime: updated.startTime,
        endTime: updated.endTime,
        costCenterId: updated.costCenterId,
        zoneId: updated.zoneId,
        role: updated.role,
        notes: updated.notes,
      },
      id,
    );

    updated.status = validation.conflicts.length > 0 ? "conflict" : updated.status;

    MOCK_SHIFTS[index] = updated;

    await new Promise((resolve) => setTimeout(resolve, 150));

    return {
      success: true,
      data: updated,
      validation,
    };
  }

  async deleteShift(id: string): Promise<boolean> {
    const index = MOCK_SHIFTS.findIndex((s) => s.id === id);
    if (index === -1) return false;

    MOCK_SHIFTS.splice(index, 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return true;
  }

  async moveShift(shiftId: string, newEmployeeId?: string, newDate?: string, newZoneId?: string): Promise<DragResult> {
    const shift = MOCK_SHIFTS.find((s) => s.id === shiftId);
    if (!shift) {
      return { success: false };
    }

    // Aplicar solo los cambios especificados
    const updatedShift: Shift = {
      ...shift,
      employeeId: newEmployeeId ?? shift.employeeId,
      date: newDate ?? shift.date,
      zoneId: newZoneId ?? shift.zoneId,
      updatedAt: new Date(),
    };

    // Si cambia zona, actualizar también el costCenterId
    if (newZoneId && newZoneId !== shift.zoneId) {
      const newZone = MOCK_ZONES.find((z) => z.id === newZoneId);
      if (newZone) {
        updatedShift.costCenterId = newZone.costCenterId;
      }
    }

    // Validar nuevo destino (excluir el turno que se está moviendo)
    const validation = await this.validateShift(
      {
        employeeId: updatedShift.employeeId,
        date: updatedShift.date,
        startTime: updatedShift.startTime,
        endTime: updatedShift.endTime,
        costCenterId: updatedShift.costCenterId,
        zoneId: updatedShift.zoneId,
        role: updatedShift.role,
        notes: updatedShift.notes,
      },
      shiftId,
    );

    // Mantener el estado original si no hay conflictos, o marcarlo como conflict si los hay
    updatedShift.status = validation.conflicts.length > 0 ? "conflict" : shift.status;

    const index = MOCK_SHIFTS.findIndex((s) => s.id === shiftId);
    MOCK_SHIFTS[index] = updatedShift;

    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      updatedShift,
      conflicts: validation.conflicts,
    };
  }

  async copyShift(shiftId: string, newEmployeeId?: string, newDate?: string, newZoneId?: string): Promise<DragResult> {
    const shift = MOCK_SHIFTS.find((s) => s.id === shiftId);
    if (!shift) {
      return { success: false };
    }

    // Crear nuevo turno con los cambios especificados
    const copiedShift: Shift = {
      ...shift,
      id: Math.random().toString(36).substring(2, 11), // Nuevo ID
      employeeId: newEmployeeId ?? shift.employeeId,
      date: newDate ?? shift.date,
      zoneId: newZoneId ?? shift.zoneId,
      status: "draft", // Los turnos copiados siempre son draft
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Si cambia zona, actualizar también el costCenterId
    if (newZoneId && newZoneId !== shift.zoneId) {
      const newZone = MOCK_ZONES.find((z) => z.id === newZoneId);
      if (newZone) {
        copiedShift.costCenterId = newZone.costCenterId;
      }
    }

    // Validar nuevo turno
    const validation = await this.validateShift({
      employeeId: copiedShift.employeeId,
      date: copiedShift.date,
      startTime: copiedShift.startTime,
      endTime: copiedShift.endTime,
      costCenterId: copiedShift.costCenterId,
      zoneId: copiedShift.zoneId,
      role: copiedShift.role,
      notes: copiedShift.notes,
    });

    copiedShift.status = validation.conflicts.length > 0 ? "conflict" : "draft";

    // Añadir el turno copiado al array
    MOCK_SHIFTS.push(copiedShift);

    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      updatedShift: copiedShift,
      conflicts: validation.conflicts,
    };
  }

  async resizeShift(shiftId: string, newStartTime: string, newEndTime: string): Promise<ShiftServiceResponse> {
    return this.updateShift(shiftId, { startTime: newStartTime, endTime: newEndTime });
  }

  // ==================== VALIDACIONES ====================

  async validateShift(data: ShiftInput, excludeShiftId?: string): Promise<ValidationResult> {
    const conflicts: ValidationResult["conflicts"] = [];
    const warnings: ValidationResult["warnings"] = [];

    // 1. Validar solapamiento
    const hasOverlap = await this.hasOverlap(data.employeeId, data.date, data.startTime, data.endTime, excludeShiftId);
    if (hasOverlap) {
      conflicts.push({
        type: "overlap",
        message: "Este turno solapa con otro turno del mismo empleado",
        severity: "error",
      });
    }

    // 2. Validar descanso mínimo
    const hasRest = await this.hasMinimumRest(data.employeeId, data.date, data.startTime);
    if (!hasRest) {
      conflicts.push({
        type: "min_rest",
        message: `No cumple el descanso mínimo de ${MIN_REST_HOURS}h entre turnos`,
        severity: "warning",
      });
    }

    // 3. Validar ausencia
    const isAbsent = await this.isEmployeeAbsent(data.employeeId, data.date);
    if (isAbsent) {
      conflicts.push({
        type: "absence",
        message: "El empleado está ausente en esta fecha (vacaciones/baja)",
        severity: "warning",
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      isValid: conflicts.filter((c) => c.severity === "error").length === 0,
      conflicts,
      warnings,
    };
  }

  async hasOverlap(
    employeeId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeShiftId?: string,
  ): Promise<boolean> {
    const employeeShifts = MOCK_SHIFTS.filter(
      (s) => s.employeeId === employeeId && s.date === date && s.id !== excludeShiftId,
    );

    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    for (const shift of employeeShifts) {
      const shiftStart = this.timeToMinutes(shift.startTime);
      const shiftEnd = this.timeToMinutes(shift.endTime);

      // Detectar solapamiento
      if ((start >= shiftStart && start < shiftEnd) || (end > shiftStart && end <= shiftEnd)) {
        return true;
      }
    }

    return false;
  }

  async hasMinimumRest(employeeId: string, date: string, startTime: string): Promise<boolean> {
    // Buscar turno anterior del empleado
    const employeeShifts = MOCK_SHIFTS.filter((s) => s.employeeId === employeeId).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const dateObj = new Date(date);
    const prevDayDate = new Date(dateObj);
    prevDayDate.setDate(prevDayDate.getDate() - 1);
    const prevDayStr = prevDayDate.toISOString().split("T")[0];

    const prevShift = employeeShifts.find((s) => s.date === prevDayStr);
    if (!prevShift) return true; // No hay turno anterior, OK

    const prevEndMinutes = this.timeToMinutes(prevShift.endTime);
    const currentStartMinutes = this.timeToMinutes(startTime);

    // Calcular diferencia (puede cruzar medianoche)
    const restMinutes =
      currentStartMinutes >= prevEndMinutes
        ? currentStartMinutes - prevEndMinutes
        : 24 * 60 - prevEndMinutes + currentStartMinutes;

    return restMinutes >= MIN_REST_HOURS * 60;
  }

  async isEmployeeAbsent(employeeId: string, date: string): Promise<boolean> {
    const employee = MOCK_EMPLOYEES.find((e) => e.id === employeeId);
    if (!employee) return false;

    return employee.absences.some((absence) => {
      return date >= absence.start && date <= absence.end;
    });
  }

  // ==================== CRUD ZONAS ====================

  async getZones(costCenterId?: string): Promise<Zone[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (costCenterId) {
      return MOCK_ZONES.filter((z) => z.costCenterId === costCenterId);
    }
    return [...MOCK_ZONES];
  }

  async getZoneById(id: string): Promise<Zone | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return MOCK_ZONES.find((z) => z.id === id) ?? null;
  }

  async createZone(data: ZoneInput): Promise<Zone> {
    const newZone: Zone = {
      id: this.generateId("z"),
      ...data,
      active: data.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MOCK_ZONES.push(newZone);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return newZone;
  }

  async updateZone(id: string, data: Partial<ZoneInput>): Promise<Zone> {
    const index = MOCK_ZONES.findIndex((z) => z.id === id);
    if (index === -1) throw new Error("Zona no encontrada");

    MOCK_ZONES[index] = {
      ...MOCK_ZONES[index],
      ...data,
      updatedAt: new Date(),
    };

    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_ZONES[index];
  }

  async deleteZone(id: string): Promise<boolean> {
    const index = MOCK_ZONES.findIndex((z) => z.id === id);
    if (index === -1) return false;

    MOCK_ZONES.splice(index, 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return true;
  }

  // ==================== CRUD PLANTILLAS ====================

  async getTemplates(): Promise<ShiftTemplate[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return [...MOCK_TEMPLATES];
  }

  async getTemplateById(id: string): Promise<ShiftTemplate | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return MOCK_TEMPLATES.find((t) => t.id === id) ?? null;
  }

  async createTemplate(data: TemplateInput): Promise<ShiftTemplate> {
    const newTemplate: ShiftTemplate = {
      id: this.generateId("t"),
      ...data,
      active: data.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MOCK_TEMPLATES.push(newTemplate);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return newTemplate;
  }

  async updateTemplate(id: string, data: Partial<TemplateInput>): Promise<ShiftTemplate> {
    const index = MOCK_TEMPLATES.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("Plantilla no encontrada");

    MOCK_TEMPLATES[index] = {
      ...MOCK_TEMPLATES[index],
      ...data,
      updatedAt: new Date(),
    };

    await new Promise((resolve) => setTimeout(resolve, 100));
    return MOCK_TEMPLATES[index];
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const index = MOCK_TEMPLATES.findIndex((t) => t.id === id);
    if (index === -1) return false;

    MOCK_TEMPLATES.splice(index, 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return true;
  }

  async applyTemplate(input: ApplyTemplateInput): Promise<ApplyTemplateResponse> {
    const template = await this.getTemplateById(input.templateId);
    if (!template) {
      return { success: false, totalCreated: 0, error: "Plantilla no encontrada" };
    }

    const createdShifts: Shift[] = [];
    const dateFrom = new Date(input.dateFrom);
    const dateTo = new Date(input.dateTo);

    // Simular generación de turnos según plantilla
    // (Lógica simplificada para el mock)
    const currentDate = new Date(dateFrom);
    let patternIndex = input.initialGroup % template.pattern.length;

    while (currentDate <= dateTo) {
      const shiftType = template.pattern[patternIndex];

      if (shiftType !== "off") {
        // Crear turno para cada empleado
        for (const employeeId of input.employeeIds) {
          const { startTime, endTime } = this.getShiftTimes(shiftType, template.shiftDuration);

          const shift: Shift = {
            id: this.generateId("s"),
            employeeId,
            date: currentDate.toISOString().split("T")[0],
            startTime,
            endTime,
            costCenterId: input.costCenterId,
            zoneId: input.zoneId,
            role: `${template.name} - ${shiftType}`,
            status: "draft",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          MOCK_SHIFTS.push(shift);
          createdShifts.push(shift);
        }
      }

      // Avanzar día y patrón
      currentDate.setDate(currentDate.getDate() + 1);
      patternIndex = (patternIndex + 1) % template.pattern.length;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      success: true,
      createdShifts,
      totalCreated: createdShifts.length,
    };
  }

  // ==================== OPERACIONES MASIVAS ====================

  async copyWeek(sourceWeekStart: string, targetWeekStart: string, filters: ShiftFilters): Promise<number> {
    const sourceDate = new Date(sourceWeekStart);
    const targetDate = new Date(targetWeekStart);
    const daysDiff = Math.floor((targetDate.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24));

    // Obtener turnos de semana origen
    const sourceWeekEnd = new Date(sourceDate);
    sourceWeekEnd.setDate(sourceWeekEnd.getDate() + 6);

    const shiftsTosCopy = await this.getShifts({
      ...filters,
      dateFrom: sourceWeekStart,
      dateTo: sourceWeekEnd.toISOString().split("T")[0],
    });

    let copiedCount = 0;

    for (const shift of shiftsTosCopy) {
      const newDate = new Date(shift.date);
      newDate.setDate(newDate.getDate() + daysDiff);

      const newShift: Shift = {
        ...shift,
        id: this.generateId("s"),
        date: newDate.toISOString().split("T")[0],
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      MOCK_SHIFTS.push(newShift);
      copiedCount++;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    return copiedCount;
  }

  async publishShifts(filters: ShiftFilters): Promise<PublishShiftsResponse> {
    const shifts = await this.getShifts(filters);
    const toPublish = shifts.filter((s) => s.status === "draft");

    for (const shift of toPublish) {
      const index = MOCK_SHIFTS.findIndex((s) => s.id === shift.id);
      if (index !== -1) {
        MOCK_SHIFTS[index].status = "published";
        MOCK_SHIFTS[index].updatedAt = new Date();
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    return {
      success: true,
      publishedCount: toPublish.length,
      publishedShifts: toPublish,
    };
  }

  async deleteMultipleShifts(shiftIds: string[]): Promise<number> {
    let deletedCount = 0;

    for (const id of shiftIds) {
      const deleted = await this.deleteShift(id);
      if (deleted) deletedCount++;
    }

    return deletedCount;
  }

  // ==================== CONSULTAS Y ESTADÍSTICAS ====================

  async getShiftEmployees(costCenterId?: string): Promise<EmployeeShift[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (costCenterId) {
      return MOCK_EMPLOYEES.filter((e) => e.costCenterId === costCenterId);
    }
    return [...MOCK_EMPLOYEES];
  }

  async getCostCenters(): Promise<CostCenter[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return [...MOCK_COST_CENTERS];
  }

  async getEmployeeWeekStats(employeeId: string, weekStart: string): Promise<EmployeeWeekStats> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const shifts = await this.getEmployeeShifts(employeeId, weekStart, weekEnd.toISOString().split("T")[0]);

    const assignedHours = shifts.reduce((total, shift) => {
      const duration = this.calculateShiftDuration(shift.startTime, shift.endTime);
      return total + duration;
    }, 0);

    const employee = MOCK_EMPLOYEES.find((e) => e.id === employeeId);
    const contractHours = employee?.contractHours ?? 40;

    const percentage = (assignedHours / contractHours) * 100;

    let status: "under" | "ok" | "over" = "ok";
    if (percentage < 70) status = "under";
    else if (percentage > 130) status = "over";

    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      employeeId,
      weekStart,
      assignedHours,
      contractHours,
      percentage,
      status,
    };
  }

  async getZoneCoverageStats(zoneId: string, date: string, timeSlot: TimeSlot): Promise<ZoneCoverageStats> {
    const zone = await this.getZoneById(zoneId);
    if (!zone) {
      throw new Error("Zona no encontrada");
    }

    const required = zone.requiredCoverage[timeSlot];

    const shifts = await this.getZoneShifts(zoneId, date, date);

    // Contar asignados en esta franja
    const assigned = shifts.filter((shift) => {
      const start = this.timeToMinutes(shift.startTime);
      const end = this.timeToMinutes(shift.endTime);

      // Determinar si el turno cae en la franja
      if (timeSlot === "morning") return start < 16 * 60; // Antes de 16:00
      if (timeSlot === "afternoon") return start >= 16 * 60 && end <= 24 * 60; // 16:00-00:00
      if (timeSlot === "night") return start >= 0 && start < 8 * 60; // 00:00-08:00

      return false;
    }).length;

    const percentage = (assigned / (required || 1)) * 100;

    let status: "danger" | "warning" | "ok" = "ok";
    if (percentage < 70) status = "danger";
    else if (percentage < 100) status = "warning";

    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      zoneId,
      date,
      timeSlot,
      assigned,
      required,
      percentage,
      status,
    };
  }

  async getEmployeeShifts(employeeId: string, dateFrom: string, dateTo: string): Promise<Shift[]> {
    return this.getShifts({ employeeId, dateFrom, dateTo });
  }

  async getZoneShifts(zoneId: string, dateFrom: string, dateTo: string): Promise<Shift[]> {
    return this.getShifts({ zoneId, dateFrom, dateTo });
  }

  // ==================== HELPERS PRIVADOS ====================

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  private calculateShiftDuration(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime);
    let end = this.timeToMinutes(endTime);

    // Si el turno cruza medianoche (ej: 22:00-06:00)
    if (end <= start) {
      end += 24 * 60;
    }

    return (end - start) / 60; // Retornar en horas
  }

  private getShiftTimes(shiftType: ShiftType, duration: number): { startTime: string; endTime: string } {
    const times = {
      morning: { start: "08:00", duration },
      afternoon: { start: "16:00", duration },
      night: { start: "00:00", duration },
      saturday: { start: "09:00", duration },
      sunday: { start: "09:00", duration },
      custom: { start: "08:00", duration },
      off: { start: "00:00", duration: 0 },
    };

    const config = times[shiftType];
    const startMinutes = this.timeToMinutes(config.start);
    const endMinutes = startMinutes + config.duration * 60;

    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;

    return {
      startTime: config.start,
      endTime: `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`,
    };
  }
}

// ==================== EXPORTAR INSTANCIA SINGLETON ====================

/**
 * Instancia única del servicio mock
 * Importar esta variable desde el store y componentes
 */
export const shiftService = new ShiftServiceMock();
