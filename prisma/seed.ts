import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de base de datos...')

  // Limpiar datos existentes
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // Crear organización de prueba
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Company S.L.',
      vat: 'B12345678',
      active: true,
    },
  })
  console.log('✅ Organización creada:', org.name)

  // Crear usuarios con diferentes roles
  const hashedPassword = await bcrypt.hash('password123', 10)

  const users = await Promise.all([
    // Super Admin
    prisma.user.create({
      data: {
        email: 'superadmin@demo.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        orgId: org.id,
        active: true,
      },
    }),
    // Admin de Organización
    prisma.user.create({
      data: {
        email: 'admin@demo.com',
        password: hashedPassword,
        name: 'Admin Demo',
        role: 'ORG_ADMIN',
        orgId: org.id,
        active: true,
      },
    }),
    // HR Admin
    prisma.user.create({
      data: {
        email: 'hr@demo.com',
        password: hashedPassword,
        name: 'HR Manager',
        role: 'HR_ADMIN',
        orgId: org.id,
        active: true,
      },
    }),
    // Manager
    prisma.user.create({
      data: {
        email: 'manager@demo.com',
        password: hashedPassword,
        name: 'Team Manager',
        role: 'MANAGER',
        orgId: org.id,
        active: true,
      },
    }),
    // Empleado
    prisma.user.create({
      data: {
        email: 'employee@demo.com',
        password: hashedPassword,
        name: 'Juan Empleado',
        role: 'EMPLOYEE',
        orgId: org.id,
        active: true,
      },
    }),
  ])

  console.log('✅ Usuarios creados:')
  users.forEach(user => {
    console.log(`   - ${user.email} (${user.role})`)
  })

  console.log('\n📝 Credenciales de acceso:')
  console.log('   Email: cualquiera de los anteriores')
  console.log('   Password: password123')
  console.log('\n🎉 Seed completado con éxito!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })