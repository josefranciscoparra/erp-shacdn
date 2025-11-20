import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  // Buscar el empleado RRHH
  const user = await prisma.user.findFirst({
    where: { email: 'rrhh@timenow.cloud' },
    include: {
      employees: {
        include: {
          scheduleAssignments: {
            where: { active: true },
            include: {
              template: {
                include: {
                  periods: {
                    include: {
                      patterns: {
                        include: {
                          timeSlots: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user || !user.employees[0]) {
    console.log('❌ Usuario o empleado no encontrado');
    return;
  }

  const employee = user.employees[0];
  console.log('👤 Empleado:', employee.firstName, employee.lastName);
  console.log('📋 Asignaciones activas:', employee.scheduleAssignments.length);

  if (employee.scheduleAssignments.length === 0) {
    console.log('❌ NO hay asignaciones de horario activas');
  } else {
    employee.scheduleAssignments.forEach((assignment, idx) => {
      console.log(`\n📅 Asignación ${idx + 1}:`);
      console.log('  Template:', assignment.template.name);
      console.log('  Start:', assignment.startDate);
      console.log('  End:', assignment.endDate);
      console.log('  Períodos:', assignment.template.periods.length);

      assignment.template.periods.forEach((period, pIdx) => {
        console.log(`  Período ${pIdx + 1}: ${period.type} (${period.startDate} - ${period.endDate})`);
        console.log(`    Patterns: ${period.patterns.length}`);
        period.patterns.forEach(pattern => {
          console.log(`      ${pattern.dayOfWeek}: ${pattern.timeSlots.length} franjas`);
        });
      });
    });
  }

  await prisma.$disconnect();
})();
