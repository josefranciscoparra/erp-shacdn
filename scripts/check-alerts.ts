import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const alerts = await prisma.alert.findMany({
    where: {
      date: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    },
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      description: true,
      date: true,
      status: true,
      incidents: true,
      employee: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`\n📊 Alertas de hoy encontradas: ${alerts.length}\n`);

  alerts.forEach((alert, index) => {
    console.log(`Alerta #${index + 1}:`);
    console.log(`  ID: ${alert.id}`);
    console.log(`  Tipo: ${alert.type}`);
    console.log(`  Severidad: ${alert.severity}`);
    console.log(`  Título: ${alert.title}`);
    console.log(`  Descripción: ${alert.description}`);
    console.log(`  Estado: ${alert.status}`);
    console.log(`  Empleado: ${alert.employee.firstName} ${alert.employee.lastName}`);
    console.log(`  Incidencias: ${JSON.stringify(alert.incidents, null, 2)}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
