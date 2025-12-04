import { NextResponse } from "next/server";

import { hash } from "bcryptjs";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { generateTemporaryPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { generateSafeEmployeeNumber } from "@/services/employees";

// Schema de validación para el wizard completo
// NOTA: Los horarios se gestionan en Sistema de Horarios V2.0
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
  // Datos del contrato (solo campos del modelo EmploymentContract)
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
    scheduleType: z.enum(["FLEXIBLE", "FIXED", "SHIFT"]).optional().nullable(),
  }),
  // Asignacion de horario V2 (opcional)
  schedule: z
    .object({
      scheduleTemplateId: z.string(),
      validFrom: z.string(), // ISO date string
      assignmentType: z.enum(["FIXED", "SHIFT", "ROTATION", "FLEXIBLE"]).optional(),
    })
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUser = session.user;

    const body = await request.json();
    console.log("🔍 [WIZARD API] Body recibido:", JSON.stringify(body, null, 2));

    const data = wizardSchema.parse(body);
    console.log("✅ [WIZARD API] Datos validados:", JSON.stringify(data, null, 2));

    // TRANSACCIÓN ATÓMICA: Todo o nada
    const result = await prisma.$transaction(async (tx) => {
      let userId: string | null = null;
      let temporaryPassword: string | null = null;

      // 1. Crear usuario de sistema (SIEMPRE obligatorio para cada empleado)
      console.log("👤 [WIZARD API] Creando usuario...");
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
      console.log("👷 [WIZARD API] Creando empleado...");
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

      // 4. Crear contrato (solo campos del modelo EmploymentContract)
      // NOTA: Los horarios se gestionan en Sistema de Horarios V2.0, no en el contrato
      console.log("📄 [WIZARD API] Creando contrato...");
      const contractPayload = {
        employeeId: employee.id,
        orgId: currentUser.orgId,
        contractType: data.contract.contractType,
        startDate: new Date(data.contract.startDate),
        endDate: data.contract.endDate ? new Date(data.contract.endDate) : null,
        grossSalary: data.contract.grossSalary ?? null,
        positionId: data.contract.positionId ?? null,
        departmentId: data.contract.departmentId ?? null,
        costCenterId: data.contract.costCenterId ?? null,
        managerId: data.contract.managerId ?? null,
        weeklyHours: data.contract.weeklyHours ?? 40,
        workingDaysPerWeek: data.contract.workingDaysPerWeek ?? 5,
        workScheduleType: (data.contract.scheduleType as any) ?? "FIXED",
      };
      console.log("📋 [WIZARD API] Payload contrato:", JSON.stringify(contractPayload, null, 2));

      const contract = await tx.employmentContract.create({
        data: contractPayload,
      });

      // 5. Crear asignacion de horario V2 (si se proporciono)
      let scheduleAssignmentId: string | null = null;
      console.log("📅 [WIZARD API] Verificando schedule data:", JSON.stringify(data.schedule, null, 2));
      if (data.schedule?.scheduleTemplateId) {
        console.log("📅 [WIZARD API] Creando asignacion de horario V2...");
        // Determinar el tipo de asignación (por defecto FIXED si no se especifica)
        const assignmentType = data.schedule.assignmentType ?? "FIXED";
        console.log("📅 [WIZARD API] assignmentType:", assignmentType);
        console.log("📅 [WIZARD API] scheduleTemplateId:", data.schedule.scheduleTemplateId);
        console.log("📅 [WIZARD API] validFrom:", data.schedule.validFrom);
        console.log("📅 [WIZARD API] employeeId:", employee.id);
        console.log("📅 [WIZARD API] orgId:", currentUser.orgId);

        try {
          const scheduleAssignment = await tx.employeeScheduleAssignment.create({
            data: {
              employeeId: employee.id,
              scheduleTemplateId: data.schedule.scheduleTemplateId,
              assignmentType,
              validFrom: new Date(data.schedule.validFrom),
              isActive: true,
            },
          });
          scheduleAssignmentId = scheduleAssignment.id;
          console.log("✅ [WIZARD API] Asignacion de horario creada:", scheduleAssignmentId);
        } catch (scheduleError: any) {
          console.error("❌ [WIZARD API] Error creando asignacion de horario:", scheduleError);
          console.error("❌ [WIZARD API] Error code:", scheduleError.code);
          console.error("❌ [WIZARD API] Error message:", scheduleError.message);
          throw scheduleError;
        }
      } else {
        console.log("📅 [WIZARD API] No se creará asignación de horario (schedule es null o no tiene templateId)");
      }

      return {
        employeeId: employee.id,
        contractId: contract.id,
        userId,
        temporaryPassword,
        userWasCreated: !!userId,
        scheduleAssignmentId,
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
