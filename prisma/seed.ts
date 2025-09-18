import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de base de datos...");

  // Limpiar datos existentes
  await prisma.employmentContract.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.position.deleteMany();
  await prisma.department.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Crear organización de prueba
  const org = await prisma.organization.create({
    data: {
      name: "Demo Company S.L.",
      vat: "B12345678",
      active: true,
    },
  });
  console.log("✅ Organización creada:", org.name);

  // Crear usuarios con diferentes roles
  const hashedPassword = await bcrypt.hash("password123", 10);

  const users = await Promise.all([
    // Super Admin
    prisma.user.create({
      data: {
        email: "superadmin@demo.com",
        password: hashedPassword,
        name: "Super Admin",
        role: "SUPER_ADMIN",
        orgId: org.id,
        active: true,
      },
    }),
    // Admin de Organización
    prisma.user.create({
      data: {
        email: "admin@demo.com",
        password: hashedPassword,
        name: "Admin Demo",
        role: "ORG_ADMIN",
        orgId: org.id,
        active: true,
      },
    }),
    // HR Admin - Ana García
    prisma.user.create({
      data: {
        email: "hr@demo.com",
        password: hashedPassword,
        name: "Ana García",
        role: "HR_ADMIN",
        orgId: org.id,
        active: true,
      },
    }),
    // Manager - Juan Empleado
    prisma.user.create({
      data: {
        email: "manager@demo.com",
        password: hashedPassword,
        name: "Juan Empleado",
        role: "MANAGER",
        orgId: org.id,
        active: true,
      },
    }),
    // Empleado básico genérico
    prisma.user.create({
      data: {
        email: "employee@demo.com",
        password: hashedPassword,
        name: "Empleado Genérico",
        role: "EMPLOYEE",
        orgId: org.id,
        active: true,
      },
    }),
    // Carlos López - Contable
    prisma.user.create({
      data: {
        email: "carlos.lopez@demo.com",
        password: hashedPassword,
        name: "Carlos López",
        role: "EMPLOYEE",
        orgId: org.id,
        active: true,
      },
    }),
    // María Pérez - Coordinadora
    prisma.user.create({
      data: {
        email: "maria.perez@demo.com",
        password: hashedPassword,
        name: "María Pérez",
        role: "EMPLOYEE",
        orgId: org.id,
        active: true,
      },
    }),
    // Lucía Fernández - Desarrolladora
    prisma.user.create({
      data: {
        email: "lucia.fernandez@demo.com",
        password: hashedPassword,
        name: "Lucía Fernández",
        role: "EMPLOYEE",
        orgId: org.id,
        active: true,
      },
    }),
  ]);

  console.log("✅ Usuarios creados:");
  users.forEach((user) => {
    console.log(`   - ${user.email} (${user.role})`);
  });

  // Crear centros de coste
  const costCenter = await prisma.costCenter.create({
    data: {
      name: "Oficina Central Madrid",
      code: "MAD001",
      address: "Calle Gran Vía 123, Madrid",
      timezone: "Europe/Madrid",
      orgId: org.id,
    },
  });

  // Crear departamentos
  const departments = await Promise.all([
    prisma.department.create({
      data: {
        name: "Recursos Humanos",
        description: "Gestión del talento humano",
        orgId: org.id,
        costCenterId: costCenter.id,
      },
    }),
    prisma.department.create({
      data: {
        name: "Finanzas",
        description: "Administración financiera",
        orgId: org.id,
        costCenterId: costCenter.id,
      },
    }),
    prisma.department.create({
      data: {
        name: "Operaciones",
        description: "Operaciones diarias",
        orgId: org.id,
        costCenterId: costCenter.id,
      },
    }),
    prisma.department.create({
      data: {
        name: "Tecnología",
        description: "Desarrollo y sistemas",
        orgId: org.id,
        costCenterId: costCenter.id,
      },
    }),
  ]);

  // Crear posiciones
  const positions = await Promise.all([
    prisma.position.create({
      data: {
        title: "Generalista RRHH",
        description: "Gestión integral de recursos humanos",
        level: "Senior",
        orgId: org.id,
      },
    }),
    prisma.position.create({
      data: {
        title: "Contable Senior",
        description: "Contabilidad y finanzas corporativas",
        level: "Senior",
        orgId: org.id,
      },
    }),
    prisma.position.create({
      data: {
        title: "Coordinador de Operaciones",
        description: "Coordinación de procesos operativos",
        level: "Middle",
        orgId: org.id,
      },
    }),
    prisma.position.create({
      data: {
        title: "Desarrollador Full Stack",
        description: "Desarrollo web y aplicaciones",
        level: "Senior",
        orgId: org.id,
      },
    }),
    prisma.position.create({
      data: {
        title: "Analista Junior",
        description: "Análisis de datos y reportes",
        level: "Junior",
        orgId: org.id,
      },
    }),
  ]);

  // Crear empleados con usuarios asociados
  const employees = await Promise.all([
    // Ana García - HR Admin
    prisma.employee.create({
      data: {
        employeeNumber: "EMP001",
        firstName: "Ana",
        lastName: "García",
        secondLastName: "Rodríguez",
        nifNie: "12345678A",
        email: "hr@demo.com",
        phone: "+34 912 345 678",
        mobilePhone: "+34 699 123 456",
        address: "Calle Alcalá 45, 3º B",
        city: "Madrid",
        postalCode: "28014",
        province: "Madrid",
        country: "ES",
        birthDate: new Date("1985-03-15"),
        nationality: "Española",
        orgId: org.id,
        userId: users[2].id, // Ana García - HR Admin user
      },
    }),
    // Carlos López - Contable
    prisma.employee.create({
      data: {
        employeeNumber: "EMP002",
        firstName: "Carlos",
        lastName: "López",
        secondLastName: "Martín",
        nifNie: "87654321B",
        email: "carlos.lopez@demo.com",
        phone: "+34 913 456 789",
        mobilePhone: "+34 688 234 567",
        address: "Avenida de América 123, 2º A",
        city: "Madrid",
        postalCode: "28028",
        province: "Madrid",
        country: "ES",
        birthDate: new Date("1982-06-20"),
        nationality: "Española",
        orgId: org.id,
        userId: users[5].id, // Carlos López user
      },
    }),
    // María Pérez - Coordinadora
    prisma.employee.create({
      data: {
        employeeNumber: "EMP003",
        firstName: "María",
        lastName: "Pérez",
        secondLastName: "González",
        nifNie: "11223344C",
        email: "maria.perez@demo.com",
        phone: "+34 914 567 890",
        mobilePhone: "+34 677 345 678",
        address: "Calle Serrano 87, 1º C",
        city: "Madrid",
        postalCode: "28006",
        province: "Madrid",
        country: "ES",
        birthDate: new Date("1990-11-10"),
        nationality: "Española",
        orgId: org.id,
        userId: users[6].id, // María Pérez user
      },
    }),
    // Juan Empleado - Manager
    prisma.employee.create({
      data: {
        employeeNumber: "EMP004",
        firstName: "Juan",
        lastName: "Empleado",
        secondLastName: "Sánchez",
        nifNie: "55667788D",
        email: "manager@demo.com",
        phone: "+34 915 678 901",
        mobilePhone: "+34 666 456 789",
        address: "Plaza Mayor 12, 4º D",
        city: "Madrid",
        postalCode: "28012",
        province: "Madrid",
        country: "ES",
        birthDate: new Date("1980-07-25"),
        nationality: "Española",
        orgId: org.id,
        userId: users[3].id, // Juan Empleado - Manager user
      },
    }),
    // Lucía Fernández - Desarrolladora
    prisma.employee.create({
      data: {
        employeeNumber: "EMP005",
        firstName: "Lucía",
        lastName: "Fernández",
        secondLastName: "Ruiz",
        nifNie: "99887766E",
        email: "lucia.fernandez@demo.com",
        phone: "+34 916 789 012",
        mobilePhone: "+34 655 567 890",
        address: "Calle Fuencarral 234, 5º A",
        city: "Madrid",
        postalCode: "28004",
        province: "Madrid",
        country: "ES",
        birthDate: new Date("1992-02-14"),
        nationality: "Española",
        orgId: org.id,
        userId: users[7].id, // Lucía Fernández user
      },
    }),
  ]);

  // Crear contratos laborales
  await Promise.all([
    // Ana García - RRHH
    prisma.employmentContract.create({
      data: {
        contractType: "INDEFINIDO",
        startDate: new Date("2023-01-10"),
        weeklyHours: 40.0,
        grossSalary: 45000.0,
        orgId: org.id,
        employeeId: employees[0].id,
        positionId: positions[0].id,
        departmentId: departments[0].id,
        costCenterId: costCenter.id,
      },
    }),
    // Carlos López - Finanzas
    prisma.employmentContract.create({
      data: {
        contractType: "INDEFINIDO",
        startDate: new Date("2022-06-01"),
        weeklyHours: 40.0,
        grossSalary: 50000.0,
        orgId: org.id,
        employeeId: employees[1].id,
        positionId: positions[1].id,
        departmentId: departments[1].id,
        costCenterId: costCenter.id,
      },
    }),
    // María Pérez - Operaciones
    prisma.employmentContract.create({
      data: {
        contractType: "TEMPORAL",
        startDate: new Date("2024-03-15"),
        endDate: new Date("2025-03-14"),
        weeklyHours: 40.0,
        grossSalary: 38000.0,
        orgId: org.id,
        employeeId: employees[2].id,
        positionId: positions[2].id,
        departmentId: departments[2].id,
        costCenterId: costCenter.id,
      },
    }),
    // Juan Empleado - Manager
    prisma.employmentContract.create({
      data: {
        contractType: "INDEFINIDO",
        startDate: new Date("2021-09-01"),
        weeklyHours: 40.0,
        grossSalary: 55000.0,
        orgId: org.id,
        employeeId: employees[3].id,
        positionId: positions[2].id,
        departmentId: departments[2].id,
        costCenterId: costCenter.id,
      },
    }),
    // Lucía Fernández - Desarrolladora
    prisma.employmentContract.create({
      data: {
        contractType: "INDEFINIDO",
        startDate: new Date("2023-08-01"),
        weeklyHours: 37.5,
        grossSalary: 48000.0,
        orgId: org.id,
        employeeId: employees[4].id,
        positionId: positions[3].id,
        departmentId: departments[3].id,
        costCenterId: costCenter.id,
      },
    }),
  ]);

  console.log("✅ Empleados creados:");
  employees.forEach((emp) => {
    console.log(`   - ${emp.firstName} ${emp.lastName} (${emp.employeeNumber})`);
  });

  console.log("\n📝 Credenciales de acceso:");
  console.log("   Email: cualquiera de los anteriores");
  console.log("   Password: password123");
  console.log("\n🎉 Seed completado con éxito!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
