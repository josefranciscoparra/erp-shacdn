import { NextResponse } from "next/server";

import { hash } from "bcryptjs";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { generateSafeEmployeeNumber } from "@/lib/employee-numbering";
import { generateTemporaryPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

// Schema de validación para el wizard completo
const wizardSchema = z.object({
  // Datos del empleado
  employee: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    secondLastName: z.string().optional().nullable(),
    nifNie: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    mobilePhone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    province: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(),
    nationality: z.string().optional().nullable(),
    iban: z.string().optional().nullable(),
    emergencyContactName: z.string().optional().nullable(),
    emergencyContactPhone: z.string().optional().nullable(),
    emergencyRelationship: z.string().optional().nullable(),
    employmentStatus: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]).default("ACTIVE"),
    photoUrl: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    expenseApproverId: z.string().optional().nullable(),
    createUser: z.boolean().default(false),
  }),
  // Datos del contrato
  contract: z.object({
    contractType: z.string().min(1),
    startDate: z.string(),
    endDate: z.string().optional().nullable(),
    grossSalary: z.number().optional().nullable(),
    positionId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    costCenterId: z.string().optional().nullable(),
    managerId: z.string().optional().nullable(),
    weeklyHours: z.number().default(40),
    workingDaysPerWeek: z.number().default(5),
    hasIntensiveSchedule: z.boolean().default(false),
    intensiveStartDate: z.string().optional().nullable(),
    intensiveEndDate: z.string().optional().nullable(),
    intensiveWeeklyHours: z.number().optional().nullable(),
    hasCustomWeeklyPattern: z.boolean().default(false),
    mondayHours: z.number().optional().nullable(),
    tuesdayHours: z.number().optional().nullable(),
    wednesdayHours: z.number().optional().nullable(),
    thursdayHours: z.number().optional().nullable(),
    fridayHours: z.number().optional().nullable(),
    saturdayHours: z.number().optional().nullable(),
    sundayHours: z.number().optional().nullable(),
    intensiveMondayHours: z.number().optional().nullable(),
    intensiveTuesdayHours: z.number().optional().nullable(),
    intensiveWednesdayHours: z.number().optional().nullable(),
    intensiveThursdayHours: z.number().optional().nullable(),
    intensiveFridayHours: z.number().optional().nullable(),
    intensiveSaturdayHours: z.number().optional().nullable(),
    intensiveSundayHours: z.number().optional().nullable(),
    // Schedule type FIXED
    scheduleType: z.enum(["FLEXIBLE", "FIXED", "SHIFTS"]).optional().nullable(),
    workMonday: z.boolean().optional().nullable(),
    workTuesday: z.boolean().optional().nullable(),
    workWednesday: z.boolean().optional().nullable(),
    workThursday: z.boolean().optional().nullable(),
    workFriday: z.boolean().optional().nullable(),
    workSaturday: z.boolean().optional().nullable(),
    workSunday: z.boolean().optional().nullable(),
    hasFixedTimeSlots: z.boolean().optional().nullable(),
    mondayStartTime: z.string().optional().nullable(),
    mondayEndTime: z.string().optional().nullable(),
    tuesdayStartTime: z.string().optional().nullable(),
    tuesdayEndTime: z.string().optional().nullable(),
    wednesdayStartTime: z.string().optional().nullable(),
    wednesdayEndTime: z.string().optional().nullable(),
    thursdayStartTime: z.string().optional().nullable(),
    thursdayEndTime: z.string().optional().nullable(),
    fridayStartTime: z.string().optional().nullable(),
    fridayEndTime: z.string().optional().nullable(),
    saturdayStartTime: z.string().optional().nullable(),
    saturdayEndTime: z.string().optional().nullable(),
    sundayStartTime: z.string().optional().nullable(),
    sundayEndTime: z.string().optional().nullable(),
    // Breaks
    mondayBreakStartTime: z.string().optional().nullable(),
    mondayBreakEndTime: z.string().optional().nullable(),
    tuesdayBreakStartTime: z.string().optional().nullable(),
    tuesdayBreakEndTime: z.string().optional().nullable(),
    wednesdayBreakStartTime: z.string().optional().nullable(),
    wednesdayBreakEndTime: z.string().optional().nullable(),
    thursdayBreakStartTime: z.string().optional().nullable(),
    thursdayBreakEndTime: z.string().optional().nullable(),
    fridayBreakStartTime: z.string().optional().nullable(),
    fridayBreakEndTime: z.string().optional().nullable(),
    saturdayBreakStartTime: z.string().optional().nullable(),
    saturdayBreakEndTime: z.string().optional().nullable(),
    sundayBreakStartTime: z.string().optional().nullable(),
    sundayBreakEndTime: z.string().optional().nullable(),
    // Intensive time slots
    intensiveMondayStartTime: z.string().optional().nullable(),
    intensiveMondayEndTime: z.string().optional().nullable(),
    intensiveTuesdayStartTime: z.string().optional().nullable(),
    intensiveTuesdayEndTime: z.string().optional().nullable(),
    intensiveWednesdayStartTime: z.string().optional().nullable(),
    intensiveWednesdayEndTime: z.string().optional().nullable(),
    intensiveThursdayStartTime: z.string().optional().nullable(),
    intensiveThursdayEndTime: z.string().optional().nullable(),
    intensiveFridayStartTime: z.string().optional().nullable(),
    intensiveFridayEndTime: z.string().optional().nullable(),
    intensiveSaturdayStartTime: z.string().optional().nullable(),
    intensiveSaturdayEndTime: z.string().optional().nullable(),
    intensiveSundayStartTime: z.string().optional().nullable(),
    intensiveSundayEndTime: z.string().optional().nullable(),
    // Intensive breaks
    intensiveMondayBreakStartTime: z.string().optional().nullable(),
    intensiveMondayBreakEndTime: z.string().optional().nullable(),
    intensiveTuesdayBreakStartTime: z.string().optional().nullable(),
    intensiveTuesdayBreakEndTime: z.string().optional().nullable(),
    intensiveWednesdayBreakStartTime: z.string().optional().nullable(),
    intensiveWednesdayBreakEndTime: z.string().optional().nullable(),
    intensiveThursdayBreakStartTime: z.string().optional().nullable(),
    intensiveThursdayBreakEndTime: z.string().optional().nullable(),
    intensiveFridayBreakStartTime: z.string().optional().nullable(),
    intensiveFridayBreakEndTime: z.string().optional().nullable(),
    intensiveSaturdayBreakStartTime: z.string().optional().nullable(),
    intensiveSaturdayBreakEndTime: z.string().optional().nullable(),
    intensiveSundayBreakStartTime: z.string().optional().nullable(),
    intensiveSundayBreakEndTime: z.string().optional().nullable(),
  }),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUser = session.user;

    const body = await request.json();
    const data = wizardSchema.parse(body);

    // TRANSACCIÓN ATÓMICA: Todo o nada
    const result = await prisma.$transaction(async (tx) => {
      let userId: string | null = null;
      let temporaryPassword: string | null = null;

      // 1. Crear usuario de sistema (SIEMPRE obligatorio para cada empleado)
      const tempPassword = generateTemporaryPassword();
      const hashedPassword = await hash(tempPassword, 10);

      const user = await tx.user.create({
        data: {
          email: data.employee.email,
          password: hashedPassword,
          name: `${data.employee.firstName} ${data.employee.lastName}`,
          role: "EMPLOYEE",
          orgId: currentUser.orgId,
          mustChangePassword: true,
        },
      });

      userId = user.id;
      temporaryPassword = tempPassword;

      // Guardar contraseña temporal
      await tx.temporaryPassword.create({
        data: {
          userId: user.id,
          orgId: currentUser.orgId,
          password: tempPassword,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          reason: "Nuevo empleado creado",
          createdById: currentUser.id,
        },
      });

      // 2. Generar número de empleado - Método SEGURO con reintentos
      // Primero obtener prefijo de la organización
      const org = await tx.organization.findUnique({
        where: { id: currentUser.orgId },
        select: { employeeNumberPrefix: true },
      });
      const prefix = org?.employeeNumberPrefix ?? "EMP";

      // Usar función segura con sistema de reintentos (4 capas de defensa)
      const numberResult = await generateSafeEmployeeNumber(tx, currentUser.orgId, prefix);

      // Si no se pudo generar número, continuar sin número (requiere revisión)
      if (!numberResult.success) {
        console.warn(
          `⚠️ No se pudo generar número de empleado único. Empleado creado sin número para revisión manual. Error: ${numberResult.error}`,
        );
      }

      // 3. Crear empleado
      const employee = await tx.employee.create({
        data: {
          employeeNumber: numberResult.employeeNumber,
          requiresEmployeeNumberReview: numberResult.requiresReview,
          firstName: data.employee.firstName,
          lastName: data.employee.lastName,
          secondLastName: data.employee.secondLastName,
          nifNie: data.employee.nifNie,
          email: data.employee.email,
          phone: data.employee.phone,
          mobilePhone: data.employee.mobilePhone,
          address: data.employee.address,
          city: data.employee.city,
          postalCode: data.employee.postalCode,
          province: data.employee.province,
          country: data.employee.country,
          birthDate: data.employee.birthDate ? new Date(data.employee.birthDate) : null,
          nationality: data.employee.nationality,
          iban: data.employee.iban,
          emergencyContactName: data.employee.emergencyContactName,
          emergencyContactPhone: data.employee.emergencyContactPhone,
          emergencyRelationship: data.employee.emergencyRelationship,
          employmentStatus: data.employee.employmentStatus,
          photoUrl: data.employee.photoUrl,
          notes: data.employee.notes,
          orgId: currentUser.orgId,
          userId,
          expenseApproverId: data.employee.expenseApproverId,
        },
      });

      // 4. Crear contrato
      const contract = await tx.employmentContract.create({
        data: {
          employeeId: employee.id,
          orgId: currentUser.orgId,
          contractType: data.contract.contractType,
          startDate: new Date(data.contract.startDate),
          endDate: data.contract.endDate ? new Date(data.contract.endDate) : null,
          grossSalary: data.contract.grossSalary,
          positionId: data.contract.positionId,
          departmentId: data.contract.departmentId,
          costCenterId: data.contract.costCenterId,
          managerId: data.contract.managerId,
          weeklyHours: data.contract.weeklyHours,
          workingDaysPerWeek: data.contract.workingDaysPerWeek,
          hasIntensiveSchedule: data.contract.hasIntensiveSchedule,
          intensiveStartDate: data.contract.intensiveStartDate,
          intensiveEndDate: data.contract.intensiveEndDate,
          intensiveWeeklyHours: data.contract.intensiveWeeklyHours,
          hasCustomWeeklyPattern: data.contract.hasCustomWeeklyPattern,
          mondayHours: data.contract.mondayHours,
          tuesdayHours: data.contract.tuesdayHours,
          wednesdayHours: data.contract.wednesdayHours,
          thursdayHours: data.contract.thursdayHours,
          fridayHours: data.contract.fridayHours,
          saturdayHours: data.contract.saturdayHours,
          sundayHours: data.contract.sundayHours,
          intensiveMondayHours: data.contract.intensiveMondayHours,
          intensiveTuesdayHours: data.contract.intensiveTuesdayHours,
          intensiveWednesdayHours: data.contract.intensiveWednesdayHours,
          intensiveThursdayHours: data.contract.intensiveThursdayHours,
          intensiveFridayHours: data.contract.intensiveFridayHours,
          intensiveSaturdayHours: data.contract.intensiveSaturdayHours,
          intensiveSundayHours: data.contract.intensiveSundayHours,
          scheduleType: data.contract.scheduleType,
          workMonday: data.contract.workMonday,
          workTuesday: data.contract.workTuesday,
          workWednesday: data.contract.workWednesday,
          workThursday: data.contract.workThursday,
          workFriday: data.contract.workFriday,
          workSaturday: data.contract.workSaturday,
          workSunday: data.contract.workSunday,
          hasFixedTimeSlots: data.contract.hasFixedTimeSlots,
          mondayStartTime: data.contract.mondayStartTime,
          mondayEndTime: data.contract.mondayEndTime,
          tuesdayStartTime: data.contract.tuesdayStartTime,
          tuesdayEndTime: data.contract.tuesdayEndTime,
          wednesdayStartTime: data.contract.wednesdayStartTime,
          wednesdayEndTime: data.contract.wednesdayEndTime,
          thursdayStartTime: data.contract.thursdayStartTime,
          thursdayEndTime: data.contract.thursdayEndTime,
          fridayStartTime: data.contract.fridayStartTime,
          fridayEndTime: data.contract.fridayEndTime,
          saturdayStartTime: data.contract.saturdayStartTime,
          saturdayEndTime: data.contract.saturdayEndTime,
          sundayStartTime: data.contract.sundayStartTime,
          sundayEndTime: data.contract.sundayEndTime,
          mondayBreakStartTime: data.contract.mondayBreakStartTime,
          mondayBreakEndTime: data.contract.mondayBreakEndTime,
          tuesdayBreakStartTime: data.contract.tuesdayBreakStartTime,
          tuesdayBreakEndTime: data.contract.tuesdayBreakEndTime,
          wednesdayBreakStartTime: data.contract.wednesdayBreakStartTime,
          wednesdayBreakEndTime: data.contract.wednesdayBreakEndTime,
          thursdayBreakStartTime: data.contract.thursdayBreakStartTime,
          thursdayBreakEndTime: data.contract.thursdayBreakEndTime,
          fridayBreakStartTime: data.contract.fridayBreakStartTime,
          fridayBreakEndTime: data.contract.fridayBreakEndTime,
          saturdayBreakStartTime: data.contract.saturdayBreakStartTime,
          saturdayBreakEndTime: data.contract.saturdayBreakEndTime,
          sundayBreakStartTime: data.contract.sundayBreakStartTime,
          sundayBreakEndTime: data.contract.sundayBreakEndTime,
          intensiveMondayStartTime: data.contract.intensiveMondayStartTime,
          intensiveMondayEndTime: data.contract.intensiveMondayEndTime,
          intensiveTuesdayStartTime: data.contract.intensiveTuesdayStartTime,
          intensiveTuesdayEndTime: data.contract.intensiveTuesdayEndTime,
          intensiveWednesdayStartTime: data.contract.intensiveWednesdayStartTime,
          intensiveWednesdayEndTime: data.contract.intensiveWednesdayEndTime,
          intensiveThursdayStartTime: data.contract.intensiveThursdayStartTime,
          intensiveThursdayEndTime: data.contract.intensiveThursdayEndTime,
          intensiveFridayStartTime: data.contract.intensiveFridayStartTime,
          intensiveFridayEndTime: data.contract.intensiveFridayEndTime,
          intensiveSaturdayStartTime: data.contract.intensiveSaturdayStartTime,
          intensiveSaturdayEndTime: data.contract.intensiveSaturdayEndTime,
          intensiveSundayStartTime: data.contract.intensiveSundayStartTime,
          intensiveSundayEndTime: data.contract.intensiveSundayEndTime,
          intensiveMondayBreakStartTime: data.contract.intensiveMondayBreakStartTime,
          intensiveMondayBreakEndTime: data.contract.intensiveMondayBreakEndTime,
          intensiveTuesdayBreakStartTime: data.contract.intensiveTuesdayBreakStartTime,
          intensiveTuesdayBreakEndTime: data.contract.intensiveTuesdayBreakEndTime,
          intensiveWednesdayBreakStartTime: data.contract.intensiveWednesdayBreakStartTime,
          intensiveWednesdayBreakEndTime: data.contract.intensiveWednesdayBreakEndTime,
          intensiveThursdayBreakStartTime: data.contract.intensiveThursdayBreakStartTime,
          intensiveThursdayBreakEndTime: data.contract.intensiveThursdayBreakEndTime,
          intensiveFridayBreakStartTime: data.contract.intensiveFridayBreakStartTime,
          intensiveFridayBreakEndTime: data.contract.intensiveFridayBreakEndTime,
          intensiveSaturdayBreakStartTime: data.contract.intensiveSaturdayBreakStartTime,
          intensiveSaturdayBreakEndTime: data.contract.intensiveSaturdayBreakEndTime,
          intensiveSundayBreakStartTime: data.contract.intensiveSundayBreakStartTime,
          intensiveSundayBreakEndTime: data.contract.intensiveSundayBreakEndTime,
        },
      });

      return {
        employeeId: employee.id,
        contractId: contract.id,
        userId,
        temporaryPassword,
        userWasCreated: !!userId,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creating employee via wizard:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }

    // Error de Prisma: Constraint único duplicado (P2002)
    if (error.code === "P2002") {
      const fields = error.meta?.target;
      console.log("Prisma P2002 - Campos duplicados:", fields);

      // Normalizar fields a array si es string
      const fieldsArray = Array.isArray(fields) ? fields : [fields];
      const fieldsStr = fieldsArray.join(", ");

      // Número de empleado duplicado (esto NO debería pasar)
      if (fieldsArray.includes("employeeNumber")) {
        console.error("CRITICAL: Número de empleado duplicado detectado. Esto indica un problema de concurrencia.");
        return NextResponse.json(
          {
            error: `Error de sistema: número de empleado duplicado. Por favor, inténtalo de nuevo. Si el problema persiste, contacta con soporte.`,
          },
          { status: 409 },
        );
      }

      // NIF/NIE duplicado
      if (fieldsArray.includes("nifNie")) {
        return NextResponse.json(
          { error: `Ya existe un empleado con este NIF/NIE en tu organización` },
          { status: 409 },
        );
      }

      // Email duplicado
      if (fieldsArray.includes("email")) {
        return NextResponse.json({ error: `Ya existe un usuario con este email en tu organización` }, { status: 409 });
      }

      // Fallback con información del campo
      return NextResponse.json(
        { error: `Ya existe un registro con este valor en el campo: ${fieldsStr}` },
        { status: 409 },
      );
    }

    // Otros errores de Prisma
    if (error.code) {
      console.log("Prisma error code:", error.code, "Message:", error.message);
      return NextResponse.json({ error: `Error de base de datos (${error.code}): ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ error: "Error al crear empleado" }, { status: 500 });
  }
}
