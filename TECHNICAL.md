# Documentación Técnica - Timenow ERP

> **Audiencia**: Desarrolladores backend/Java que quieren entender el stack frontend moderno y las decisiones arquitectónicas del proyecto.

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura Next.js](#arquitectura-nextjs)
4. [Base de Datos y ORM](#base-de-datos-y-orm)
5. [Autenticación y Autorización](#autenticación-y-autorización)
6. [Gestión de Estado](#gestión-de-estado)
7. [Sistema de Temas](#sistema-de-temas)
8. [API Routes](#api-routes)
9. [Validación de Datos](#validación-de-datos)
10. [TypeScript](#typescript)
11. [Componentes UI](#componentes-ui)
12. [Almacenamiento de Archivos](#almacenamiento-de-archivos)
13. [Firma Electrónica](#firma-electrónica)
14. [Build y Deployment](#build-y-deployment)
15. [Scripts y Comandos](#scripts-y-comandos)

---

## 1. Resumen Ejecutivo

### ¿Qué es Timenow?

**Timenow** es un sistema ERP (Enterprise Resource Planning) moderno enfocado en:

- ✅ Gestión de Recursos Humanos (RRHH)
- ✅ Control de tiempos y fichajes
- ✅ Gestión de vacaciones (PTO - Paid Time Off)
- ✅ Firma electrónica de documentos (SES)
- ✅ Multi-tenancy (multi-organización)

### Alcance del Proyecto

Este es un ERP **SaaS B2B** donde:

- Múltiples organizaciones pueden usar el mismo sistema
- Cada organización tiene sus propios empleados, departamentos, etc.
- Hay separación total de datos entre organizaciones (multi-tenancy)
- Sistema de roles: Super Admin, Org Admin, HR Admin, Manager, Employee

### ¿Por qué un stack JavaScript/TypeScript y no Java?

**Ventajas clave:**

- **Full-stack con un solo lenguaje**: TypeScript en frontend y backend
- **Server-Side Rendering (SSR)**: Next.js renderiza en servidor, mejor SEO y performance
- **Developer Experience**: Hot-reload instantáneo, ecosystem npm masivo
- **Deploy moderno**: Vercel, Cloudflare, etc. optimizados para Next.js
- **UI moderna**: React + Tailwind CSS permite UIs complejas con menos código

**Comparación con Java/Spring:**

```
Java/Spring Boot          →  Next.js 15
Spring MVC Controllers    →  API Routes
JPA/Hibernate            →  Prisma ORM
Thymeleaf/JSP            →  React Server Components
Bean Validation          →  Zod
Spring Security          →  NextAuth
```

---

## 2. Stack Tecnológico

### 2.1 Frontend

#### **React 19** (UI Library)

**¿Qué es?**

- Librería de JavaScript para construir interfaces de usuario basada en componentes
- Cada componente es una función que retorna JSX (HTML + JavaScript)

**¿Por qué React y no Angular/Vue?**

- ✅ **Ecosystem**: Mayor cantidad de librerías y componentes listos
- ✅ **Talent pool**: Más desarrolladores conocen React
- ✅ **Server Components**: React 19 permite renderizar en servidor de forma nativa
- ✅ **Next.js**: Framework más maduro y optimizado para producción

**Analogía Java:**

```
React Component  ≈  JSP Tag / Thymeleaf Fragment
Props           ≈  Parámetros del tag
State           ≈  Variables de instancia
```

---

#### **Next.js 15** (Framework Full-Stack)

**¿Qué es?**

- Framework de React que añade:
  - **Routing** basado en sistema de archivos
  - **Server-Side Rendering (SSR)**
  - **API Routes** (backend en el mismo proyecto)
  - **Optimizaciones** automáticas (code splitting, image optimization, etc.)

**¿Por qué Next.js y no React puro?**

| Aspecto         | React puro (CRA/Vite)                 | Next.js                         |
| --------------- | ------------------------------------- | ------------------------------- |
| **Routing**     | Necesitas React Router (manual)       | Basado en carpetas (automático) |
| **SEO**         | ❌ Malo (CSR = Client-Side Rendering) | ✅ Excelente (SSR/SSG)          |
| **Performance** | Depende de tu config                  | ✅ Optimizado out-of-the-box    |
| **Backend**     | Necesitas Express/Fastify separado    | ✅ API Routes integradas        |
| **Deploy**      | Necesitas configurar servidor         | ✅ Vercel one-click deploy      |

**Analogía Java:**

```
Next.js  ≈  Spring Boot (framework opinionado y completo)
React    ≈  Servlets (librería base, necesitas configurar todo)
```

**Ejemplo de routing:**

```
src/app/
  └── dashboard/
      ├── page.tsx          → /dashboard
      └── employees/
          └── page.tsx      → /dashboard/employees
```

vs Java Spring:

```java
@GetMapping("/dashboard")
@GetMapping("/dashboard/employees")
```

---

#### **TypeScript** (Lenguaje)

**¿Qué es?**

- JavaScript con **tipos estáticos**
- Se compila a JavaScript antes de ejecutarse

**¿Por qué TypeScript y no JavaScript puro?**

- ✅ **Type safety**: Errores en compile-time, no en runtime
- ✅ **Autocomplete**: IntelliSense en VSCode
- ✅ **Refactoring seguro**: Como en Java
- ✅ **Menos bugs**: El compilador te avisa de errores

**Analogía Java:**

```typescript
// TypeScript (tipado estático)
interface Employee {
  id: string;
  name: string;
  salary: number;
}

function getEmployee(id: string): Employee {
  // ...
}
```

vs JavaScript puro (sin tipos):

```javascript
// JavaScript (cualquier cosa vale)
function getEmployee(id) {
  return {}; // ¿Qué propiedades tiene? Nadie lo sabe
}
```

**TypeScript es a JavaScript lo que Java es a lenguajes dinámicos como Python/Ruby.**

---

#### **Tailwind CSS v4** (Estilos)

**¿Qué es?**

- Framework de CSS basado en **utility classes**
- En lugar de escribir CSS custom, usas clases predefinidas

**¿Por qué Tailwind y no CSS/SCSS/Bootstrap?**

| Aspecto             | CSS/SCSS          | Bootstrap     | Tailwind                  |
| ------------------- | ----------------- | ------------- | ------------------------- |
| **Personalización** | ✅ Total          | ❌ Difícil    | ✅ Total                  |
| **Tamaño bundle**   | Depende           | ❌ Grande     | ✅ Pequeño (tree-shaking) |
| **Consistencia**    | ❌ Manual         | ✅ Automática | ✅ Automática             |
| **Speed**           | ❌ Lento escribir | ✅ Rápido     | ✅ Muy rápido             |

**Ejemplo:**

```tsx
// Con Tailwind
<button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
  Click me
</button>

// Con CSS custom (necesitas crear archivo .css separado)
<button className="my-custom-button">
  Click me
</button>

/* my-styles.css */
.my-custom-button {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}
```

**Analogía Java:**

- Tailwind es como usar **Lombok**: convenciones sobre configuración
- CSS custom es como escribir todos tus getters/setters a mano

---

#### **shadcn/ui** (Componentes UI)

**¿Qué es?**

- **NO es una librería de componentes** (como Material-UI o Ant Design)
- Es una **colección de componentes copiables** que instalas en tu proyecto
- Basado en Radix UI (componentes headless accesibles)

**¿Por qué shadcn/ui y no Material-UI/Ant Design?**

| Aspecto             | Material-UI            | Ant Design                  | shadcn/ui                 |
| ------------------- | ---------------------- | --------------------------- | ------------------------- |
| **Personalización** | ❌ Difícil (overrides) | ❌ Difícil (less variables) | ✅ Total (código tuyo)    |
| **Bundle size**     | ❌ Grande              | ❌ Grande                   | ✅ Pequeño (tree-shaking) |
| **Ownership**       | ❌ Dependencia externa | ❌ Dependencia externa      | ✅ Código en tu repo      |
| **Accesibilidad**   | ✅ Buena               | ⚠️ Regular                  | ✅ Excelente (Radix UI)   |

**Filosofía:**

```bash
# Material-UI (instalas librería)
npm install @mui/material

# shadcn/ui (copias componentes a tu proyecto)
npx shadcn@latest add button
# → Crea archivo src/components/ui/button.tsx en TU proyecto
```

**Ventaja**: Si necesitas modificar el Button, editas TU archivo. No estás luchando contra overrides de CSS.

---

### 2.2 Backend

#### **Next.js API Routes** (REST API)

**¿Qué es?**

- **Backend integrado en Next.js**
- Cada archivo en `src/app/api/` es un endpoint REST

**Estructura:**

```
src/app/api/
  └── employees/
      ├── route.ts           → GET/POST /api/employees
      └── [id]/
          └── route.ts       → GET/PUT/DELETE /api/employees/:id
```

**Ejemplo de endpoint:**

```typescript
// src/app/api/employees/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    where: { orgId: session.user.orgId },
  });

  return NextResponse.json(employees);
}
```

**Analogía Java/Spring:**

```java
@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

  @GetMapping
  public ResponseEntity<List<Employee>> getEmployees() {
    // ...
  }
}
```

**¿Por qué API Routes y no Express/Fastify separado?**

- ✅ **Monorepo**: Frontend y backend en el mismo proyecto
- ✅ **TypeScript compartido**: Interfaces y tipos reutilizables
- ✅ **Deploy unificado**: Un solo deploy (Vercel/Cloudflare)
- ✅ **No CORS**: Frontend y backend en mismo dominio

---

#### **Prisma ORM** (Base de datos)

**¿Qué es?**

- ORM moderno para Node.js (como JPA/Hibernate para Java)
- Type-safe queries (autocomplete en TypeScript)

**¿Por qué Prisma y no Sequelize/TypeORM?**

| Aspecto                  | Sequelize  | TypeORM          | Prisma                    |
| ------------------------ | ---------- | ---------------- | ------------------------- |
| **Type safety**          | ❌ Débil   | ⚠️ Mejorable     | ✅ Perfecto               |
| **Developer Experience** | ❌ Verbose | ⚠️ Regular       | ✅ Excelente              |
| **Migrations**           | ⚠️ Manual  | ⚠️ Auto-generate | ✅ Auto-generate + review |
| **Autocomplete**         | ❌ No      | ⚠️ Parcial       | ✅ Total                  |

**Ejemplo comparativo:**

```typescript
// Prisma (type-safe, autocomplete)
const employees = await prisma.employee.findMany({
  where: {
    orgId: "org-123",
    active: true,
  },
  include: {
    user: true,
    employmentContracts: {
      where: { active: true },
    },
  },
});

// Sequelize (sin autocomplete, prone a errores)
const employees = await Employee.findAll({
  where: {
    orgId: "org-123",
    active: true,
  },
  include: [{ model: User }, { model: EmploymentContract, where: { active: true } }],
});
```

**Analogía Java:**

```
Prisma    ≈  JPA + Hibernate + Querydsl
Schema    ≈  @Entity classes
Migrate   ≈  Flyway/Liquibase
Client    ≈  EntityManager
```

**Schema Prisma:**

```prisma
model Employee {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  email     String?  @unique
  active    Boolean  @default(true)

  // Relaciones
  user              User?
  employmentContracts EmploymentContract[]

  @@index([email])
}
```

vs Java JPA:

```java
@Entity
@Table(name = "employees")
public class Employee {
  @Id
  private String id;

  private String firstName;
  private String lastName;

  @Column(unique = true)
  private String email;

  private Boolean active = true;

  @OneToOne
  private User user;

  @OneToMany
  private List<EmploymentContract> contracts;
}
```

---

#### **PostgreSQL** (Base de datos)

**¿Por qué PostgreSQL y no MySQL/MongoDB?**

| Feature              | MySQL       | PostgreSQL   | MongoDB     |
| -------------------- | ----------- | ------------ | ----------- |
| **ACID Compliance**  | ✅ Sí       | ✅ Sí        | ⚠️ Eventual |
| **JSON Support**     | ⚠️ Limitado | ✅ Excelente | ✅ Nativo   |
| **Complex Queries**  | ⚠️ Regular  | ✅ Excelente | ❌ Limitado |
| **Transacciones**    | ✅ Sí       | ✅ Sí        | ⚠️ Limitado |
| **Full-text Search** | ⚠️ Básico   | ✅ Avanzado  | ✅ Bueno    |

**PostgreSQL elegido porque:**

- ✅ **Relacional**: Un ERP necesita relaciones complejas (empleados, contratos, departamentos)
- ✅ **JSONB**: Permite campos JSON cuando son necesarios (timeline de firmas, metadata)
- ✅ **Extensiones**: PostGIS (geolocalización), pg_trgm (búsqueda fuzzy), etc.
- ✅ **Prisma**: Mejor soporte y features

**Casos de uso JSON en SQL relacional:**

```prisma
model SignatureEvidence {
  id       String @id

  // Timeline como JSON (eventos variables)
  timeline Json // [{event: "CREATED", timestamp: "..."}, {...}]

  // Metadata flexible
  signerMetadata Json // {ip: "...", userAgent: "...", geolocation: {...}}
}
```

**Analogía:** Es como usar `@Type(type = "json")` en Hibernate.

---

### 2.3 Herramientas y Librerías

#### **Zod** (Validación)

**¿Qué es?**

- Librería de validación de schemas TypeScript-first
- Validación en runtime + inferencia de tipos

**¿Por qué Zod y no Yup/Joi?**

| Aspecto            | Joi        | Yup         | Zod          |
| ------------------ | ---------- | ----------- | ------------ |
| **TypeScript**     | ⚠️ Addon   | ⚠️ Addon    | ✅ Nativo    |
| **Type inference** | ❌ No      | ⚠️ Limitado | ✅ Perfecto  |
| **Bundle size**    | ❌ Grande  | ⚠️ Medio    | ✅ Pequeño   |
| **DX**             | ⚠️ Regular | ⚠️ Regular  | ✅ Excelente |

**Ejemplo:**

```typescript
import { z } from "zod";

// Schema de validación
const employeeSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Email inválido").optional(),
  salary: z.number().positive("Salario debe ser positivo"),
});

// TypeScript infiere el tipo automáticamente
type Employee = z.infer<typeof employeeSchema>;
// → { firstName: string; lastName: string; email?: string; salary: number }

// Validar datos
const result = employeeSchema.safeParse(data);
if (!result.success) {
  console.log(result.error.errors); // Errores detallados
}
```

**Analogía Java:**

```java
// Bean Validation (JSR 380)
public class Employee {
  @NotBlank(message = "Nombre requerido")
  private String firstName;

  @NotBlank(message = "Apellido requerido")
  private String lastName;

  @Email(message = "Email inválido")
  private String email;

  @Positive(message = "Salario debe ser positivo")
  private BigDecimal salary;
}
```

**Ventaja de Zod**: Puedes usar el MISMO schema en frontend y backend.

---

#### **Zustand** (State Management)

**¿Qué es?**

- Librería de gestión de estado global **minimalista**
- Alternativa a Redux/MobX

**¿Por qué Zustand y no Redux/Context API?**

| Aspecto            | Redux             | Context API   | Zustand           |
| ------------------ | ----------------- | ------------- | ----------------- |
| **Boilerplate**    | ❌ Mucho          | ✅ Poco       | ✅ Mínimo         |
| **Performance**    | ✅ Buena          | ❌ Re-renders | ✅ Excelente      |
| **DevTools**       | ✅ Redux DevTools | ❌ No         | ✅ Redux DevTools |
| **Learning curve** | ❌ Alta           | ✅ Baja       | ✅ Muy baja       |
| **TypeScript**     | ⚠️ Verbose        | ✅ Bueno      | ✅ Excelente      |

**Ejemplo de store:**

```typescript
// src/stores/employees-store.ts
import { create } from "zustand";

interface EmployeesState {
  employees: Employee[];
  isLoading: boolean;

  // Actions
  setEmployees: (employees: Employee[]) => void;
  fetchEmployees: () => Promise<void>;
}

export const useEmployeesStore = create<EmployeesState>((set) => ({
  employees: [],
  isLoading: false,

  setEmployees: (employees) => set({ employees }),

  fetchEmployees: async () => {
    set({ isLoading: true });
    const response = await fetch("/api/employees");
    const employees = await response.json();
    set({ employees, isLoading: false });
  },
}));
```

**Uso en componentes:**

```typescript
function EmployeeList() {
  const { employees, fetchEmployees, isLoading } = useEmployeesStore();

  useEffect(() => {
    fetchEmployees();
  }, []);

  if (isLoading) return <Loading />;
  return <Table data={employees} />;
}
```

**Analogía Java:**

```
Zustand Store  ≈  Spring @Service (Singleton)
Actions        ≈  Métodos públicos del Service
State          ≈  Variables de instancia
```

**Diferencia clave**: En React, el estado causa re-renders automáticos de la UI.

---

#### **NextAuth v5** (Autenticación)

**¿Qué es?**

- Librería de autenticación para Next.js
- Soporta múltiples providers (credentials, OAuth, etc.)
- Manejo de sesiones (JWT o database)

**¿Por qué NextAuth y no Passport/Auth0?**

| Aspecto                 | Passport.js    | Auth0             | NextAuth      |
| ----------------------- | -------------- | ----------------- | ------------- |
| **Next.js integration** | ⚠️ Manual      | ⚠️ Manual         | ✅ Nativo     |
| **Costo**               | ✅ Gratis      | ❌ Paid (límites) | ✅ Gratis     |
| **Control**             | ✅ Total       | ❌ SaaS           | ✅ Total      |
| **OAuth providers**     | ⚠️ Manual      | ✅ Automático     | ✅ Automático |
| **TypeScript**          | ⚠️ Tipos addon | ✅ Bueno          | ✅ Excelente  |

**Configuración:**

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          orgId: user.orgId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.orgId = user.orgId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.orgId = token.orgId;
      return session;
    },
  },
});
```

**Analogía Java/Spring Security:**

```java
// Spring Security equivalente
@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) {
    http
      .authorizeRequests()
        .antMatchers("/api/**").authenticated()
      .and()
      .formLogin()
        .loginProcessingUrl("/api/auth/login")
      .and()
      .logout()
        .logoutUrl("/api/auth/logout");
    return http.build();
  }
}
```

**Uso en API:**

```typescript
// Proteger endpoint
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Usuario autenticado
  const orgId = session.user.orgId;
  // ...
}
```

---

#### **TanStack Table** (Data Tables)

**¿Qué es?**

- Librería headless (sin UI) para construir tablas complejas
- Soporta: sorting, filtering, pagination, row selection, etc.

**¿Por qué TanStack Table y no AG Grid/Material Table?**

| Aspecto             | AG Grid                | Material Table | TanStack Table |
| ------------------- | ---------------------- | -------------- | -------------- |
| **Licencia**        | ❌ Comercial (premium) | ✅ MIT         | ✅ MIT         |
| **Personalización** | ⚠️ Limitada            | ❌ Difícil     | ✅ Total       |
| **Bundle size**     | ❌ Muy grande          | ❌ Grande      | ✅ Pequeño     |
| **Headless**        | ❌ No                  | ❌ No          | ✅ Sí          |
| **TypeScript**      | ✅ Bueno               | ⚠️ Regular     | ✅ Excelente   |

**Headless = Solo lógica, tú pones el HTML/CSS**

Ejemplo:

```typescript
const table = useReactTable({
  data: employees,
  columns: [
    {
      accessorKey: 'firstName',
      header: 'Nombre',
      cell: info => info.getValue()
    },
    {
      accessorKey: 'email',
      header: 'Email'
    }
  ],
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel()
});

// Renderizado custom con tus estilos
return (
  <table className="custom-styles">
    <thead>
      {table.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => (
            <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
              {header.column.columnDef.header}
            </th>
          ))}
        </tr>
      ))}
    </thead>
    <tbody>
      {table.getRowModel().rows.map(row => (
        <tr key={row.id}>
          {row.getVisibleCells().map(cell => (
            <td key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
```

---

## 3. Arquitectura Next.js

### 3.1 App Router (Next.js 15)

**¿Qué es App Router?**

- Nuevo sistema de routing introducido en Next.js 13+
- Basado en **carpetas y archivos** (file-system routing)
- Soporta **React Server Components (RSC)**

**Comparación con Pages Router (viejo):**

| Aspecto               | Pages Router       | App Router                    |
| --------------------- | ------------------ | ----------------------------- |
| **Ubicación**         | `pages/`           | `src/app/`                    |
| **Routing**           | Archivo = ruta     | Carpeta + `page.tsx` = ruta   |
| **Layouts**           | ⚠️ Manual          | ✅ Anidados automáticos       |
| **Server Components** | ❌ No              | ✅ Sí (por defecto)           |
| **Metadata**          | ⚠️ Componente Head | ✅ Función `generateMetadata` |

**Ejemplo de estructura:**

```
src/app/
  ├── layout.tsx              # Layout root (para TODAS las páginas)
  ├── page.tsx                # Homepage (/)
  ├── (external)/             # Route group (NO afecta la URL)
  │   └── landing/
  │       └── page.tsx        # /landing
  └── (main)/                 # Route group protegido
      ├── layout.tsx          # Layout para rutas autenticadas
      └── dashboard/
          ├── page.tsx        # /dashboard
          ├── employees/
          │   ├── page.tsx    # /dashboard/employees
          │   ├── [id]/
          │   │   └── page.tsx # /dashboard/employees/123 (dynamic route)
          │   └── _components/  # Componentes específicos (NO son rutas)
          │       └── employee-table.tsx
          └── settings/
              └── page.tsx    # /dashboard/settings
```

**Analogía Java/Spring:**

```
src/app/dashboard/employees/page.tsx
≈
@GetMapping("/dashboard/employees")
public String employees() { ... }

src/app/dashboard/employees/[id]/page.tsx
≈
@GetMapping("/dashboard/employees/{id}")
public String employee(@PathVariable String id) { ... }
```

**Route Groups: `(nombre)`**

- Carpetas entre paréntesis NO afectan la URL
- Sirven para organizar rutas con layouts compartidos

```
(external)/        → Layout para páginas públicas
  └── login/       → /login (NO /external/login)

(main)/            → Layout para páginas autenticadas
  └── dashboard/   → /dashboard (NO /main/dashboard)
```

---

### 3.2 Server Components vs Client Components

**Concepto revolucionario de React 19:**

- Por defecto, TODO es **Server Component** (renderiza en servidor)
- Si necesitas interactividad (useState, onClick), usas `'use client'`

**Server Components:**

```typescript
// src/app/dashboard/employees/page.tsx
// NO tiene 'use client' → Server Component

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function EmployeesPage() {
  // Esto corre en el SERVIDOR
  const session = await auth();

  const employees = await prisma.employee.findMany({
    where: { orgId: session.user.orgId }
  });

  // Renderiza HTML en servidor y envía al cliente
  return (
    <div>
      <h1>Empleados</h1>
      <ul>
        {employees.map(emp => (
          <li key={emp.id}>{emp.firstName}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Client Components:**

```typescript
// src/components/employee-form.tsx
'use client'; // ← Marca como Client Component

import { useState } from 'react';

export function EmployeeForm() {
  const [name, setName] = useState('');

  // Esto corre en el NAVEGADOR
  const handleSubmit = () => {
    // Enviar a API
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)} // Interactividad
      />
      <button type="submit">Guardar</button>
    </form>
  );
}
```

**¿Cuándo usar cada uno?**

| Caso de uso            | Tipo                |
| ---------------------- | ------------------- |
| Fetch de datos         | ✅ Server Component |
| Formularios con estado | ✅ Client Component |
| Layouts estáticos      | ✅ Server Component |
| Modales, dropdowns     | ✅ Client Component |
| SEO content            | ✅ Server Component |
| Animations             | ✅ Client Component |

**Analogía Java:**

```
Server Component  ≈  JSP/Thymeleaf (renderiza en servidor)
Client Component  ≈  JavaScript en el navegador
```

**Ventaja**: Server Components NO envían JavaScript al navegador → páginas más rápidas.

---

### 3.3 Layouts Anidados

**Concepto:**

- Cada carpeta puede tener su propio `layout.tsx`
- Los layouts se anidan automáticamente

**Ejemplo:**

```
src/app/
  ├── layout.tsx                    # Layout raíz (HTML, fonts, providers)
  └── (main)/
      ├── layout.tsx                # Layout autenticado (sidebar, header)
      └── dashboard/
          ├── layout.tsx            # Layout específico dashboard
          └── employees/
              └── page.tsx          # Página empleados
```

**Cuando visitas `/dashboard/employees`, Next.js renderiza:**

```tsx
<RootLayout>
  {" "}
  {/* app/layout.tsx */}
  <MainLayout>
    {" "}
    {/* app/(main)/layout.tsx */}
    <DashboardLayout>
      {" "}
      {/* app/(main)/dashboard/layout.tsx */}
      <EmployeesPage /> {/* app/(main)/dashboard/employees/page.tsx */}
    </DashboardLayout>
  </MainLayout>
</RootLayout>
```

**Analogía Java/Spring:**

```
Thymeleaf layout hierarchy:
  └── layout.html (master)
      └── th:fragment="content"
          └── employees.html

Next.js:
  └── Root Layout
      └── {children}
          └── Employees Page
```

**Ventaja**: Solo el `page.tsx` cambia, los layouts persisten (no re-render del sidebar).

---

### 3.4 Colocation Pattern

**Patrón de organización:**

- Componentes, hooks, utils específicos de una ruta se colocan en `_components/`, `_hooks/`, etc.
- El `_` indica que NO es una ruta

**Ejemplo:**

```
src/app/(main)/dashboard/employees/
  ├── page.tsx                        # Página principal
  ├── _components/
  │   ├── employee-table.tsx          # Tabla específica
  │   ├── employee-form.tsx           # Formulario específico
  │   └── employee-filters.tsx        # Filtros específicos
  ├── _hooks/
  │   └── use-employee-data.ts        # Hook personalizado
  └── [id]/
      ├── page.tsx                    # Detalle empleado
      └── _components/
          └── employee-detail-card.tsx
```

**Ventaja**: Todo lo relacionado con "employees" está en la misma carpeta.

**Analogía Java/Maven:**

```
com.timenow.employees/
  ├── EmployeeController.java
  ├── EmployeeService.java
  ├── EmployeeRepository.java
  └── dto/
      ├── EmployeeRequest.java
      └── EmployeeResponse.java
```

---

### 3.5 Metadata y SEO

**Cada página puede exportar metadata:**

```typescript
// src/app/dashboard/employees/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Empleados - Timenow',
  description: 'Gestión de empleados de la organización'
};

export default function EmployeesPage() {
  return <div>...</div>;
}
```

**Next.js automáticamente genera:**

```html
<head>
  <title>Empleados - Timenow</title>
  <meta name="description" content="Gestión de empleados de la organización" />
</head>
```

**Metadata dinámica:**

```typescript
// src/app/dashboard/employees/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
  });

  return {
    title: `${employee.firstName} ${employee.lastName} - Timenow`,
    description: `Perfil de ${employee.firstName}`,
  };
}
```

**Analogía Java/Spring:**

```java
// Controller retorna ModelAndView con title
@GetMapping("/employees/{id}")
public ModelAndView employee(@PathVariable String id) {
  ModelAndView mav = new ModelAndView("employee");
  mav.addObject("title", employee.getName());
  return mav;
}
```

---

## 4. Base de Datos y ORM

### 4.1 Prisma ORM

**Flujo de trabajo con Prisma:**

1. **Escribes el schema** (`prisma/schema.prisma`)
2. **Generas migración** (`npx prisma migrate dev`)
3. **Prisma genera el cliente** (tipos TypeScript automáticos)
4. **Usas el cliente** con autocomplete total

**Schema Prisma:**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  vat       String?  @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  users     User[]
  employees Employee[]

  @@map("organizations")
}

model User {
  id       String  @id @default(cuid())
  email    String  @unique
  password String
  name     String
  role     Role    @default(EMPLOYEE)
  active   Boolean @default(true)

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([email])
  @@index([orgId])
  @@map("users")
}

enum Role {
  SUPER_ADMIN
  ORG_ADMIN
  HR_ADMIN
  MANAGER
  EMPLOYEE
}
```

**Características clave:**

- **`@id`**: Primary key
- **`@default(cuid())`**: Genera ID único automáticamente
- **`@unique`**: Constraint de unicidad
- **`@relation`**: Define foreign key
- **`@@index`**: Índice de base de datos
- **`@@map`**: Nombre de tabla custom
- **`onDelete: Cascade`**: Borrado en cascada

---

### 4.2 Multi-tenancy

**Estrategia elegida: Row-level separation**

Cada modelo tiene campo `orgId` que referencia a `Organization`:

```prisma
model Employee {
  id    String @id @default(cuid())
  name  String

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id])

  @@index([orgId])
}
```

**Ventajas:**

- ✅ Una sola base de datos (más barato)
- ✅ Backups unificados
- ✅ Queries eficientes con índices en `orgId`

**Desventajas:**

- ⚠️ Debes SIEMPRE filtrar por `orgId` (riesgo de data leak)

**Solución: Helper de Prisma**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// Helper para queries multi-tenant
export function createOrgPrisma(orgId: string) {
  return {
    employee: {
      findMany: (args) =>
        prisma.employee.findMany({
          ...args,
          where: { ...args?.where, orgId },
        }),
      findUnique: (args) =>
        prisma.employee.findUnique({
          ...args,
          where: { ...args.where, orgId },
        }),
      // ... más métodos
    },
  };
}
```

**Uso:**

```typescript
const session = await auth();
const db = createOrgPrisma(session.user.orgId);

// Automáticamente filtra por orgId
const employees = await db.employee.findMany();
```

**Analogía Java/Spring:**

```java
@Entity
@Where(clause = "org_id = :orgId") // Hibernate filter
public class Employee {
  @Column(name = "org_id")
  private String orgId;
}
```

---

### 4.3 Migraciones

**Estrategia incremental (desarrollo ágil):**

En lugar de crear TODO el schema de una vez:

1. Sprint 0: Solo `Organization`, `User`, `Session`
2. Sprint 1: Añadir `Employee`, `Department`, `CostCenter`
3. Sprint 2: Añadir `TimeEntry`, `WorkdaySummary`
4. Sprint 3: Añadir `PtoRequest`, `PtoBalance`

**Comandos:**

```bash
# Crear migración (desarrollo)
npx prisma migrate dev --name add_employees_table

# Aplicar migraciones (producción)
npx prisma migrate deploy

# Sincronizar schema sin migración (desarrollo rápido)
npx prisma db push

# Resetear base de datos (BORRA DATOS)
npx prisma migrate reset
```

**IMPORTANTE: `db push` vs `migrate dev`**

| Comando                | Cuándo usar                                            |
| ---------------------- | ------------------------------------------------------ |
| `prisma db push`       | Desarrollo rápido, cambios temporales, NO perder datos |
| `prisma migrate dev`   | Cambios finales que quieres versionar                  |
| `prisma migrate reset` | Solo con PERMISO EXPLÍCITO (borra todo)                |

**Analogía Java:**

```
prisma migrate  ≈  Flyway/Liquibase
db push         ≈  Hibernate hbm2ddl.auto=update
```

---

### 4.4 Seed Data

**Archivo de seed:**

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Crear organización demo
  const org = await prisma.organization.create({
    data: {
      name: "Acme Corp",
      vat: "B12345678",
      active: true,
    },
  });

  // Crear super admin
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.create({
    data: {
      email: "admin@acme.com",
      password: hashedPassword,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      orgId: org.id,
    },
  });

  console.log("✅ Seed completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Ejecutar seed:**

```bash
npx prisma db seed
```

**Configuración en `package.json`:**

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## 5. Autenticación y Autorización

### 5.1 NextAuth v5 (Auth.js)

**Configuración completa:**

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Buscar usuario
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { organization: true },
        });

        if (!user) {
          throw new Error("Usuario no encontrado");
        }

        // Verificar contraseña
        const isValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isValid) {
          throw new Error("Contraseña incorrecta");
        }

        // Verificar que esté activo
        if (!user.active) {
          throw new Error("Usuario inactivo");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  callbacks: {
    // Añadir campos custom al JWT
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.orgId = user.orgId;
      }
      return token;
    },

    // Añadir campos custom a la sesión
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.orgId = token.orgId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});
```

**Extender tipos de NextAuth:**

```typescript
// src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    orgId: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      orgId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    orgId: string;
  }
}
```

---

### 5.2 Proteger API Routes

```typescript
// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // 1. Verificar autenticación
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 2. Verificar rol
  if (!["ORG_ADMIN", "HR_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // 3. Query con orgId (multi-tenancy)
  const employees = await prisma.employee.findMany({
    where: {
      orgId: session.user.orgId,
    },
  });

  return NextResponse.json(employees);
}
```

**Helper para permisos:**

```typescript
// src/lib/permissions.ts
import { auth } from "./auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new Error("Sin permisos");
  }
  return session;
}

// Uso
export async function GET() {
  const session = await requireRole(["ORG_ADMIN", "HR_ADMIN"]);
  // ...
}
```

---

### 5.3 Proteger Páginas (Server Components)

```typescript
// src/app/(main)/dashboard/employees/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function EmployeesPage() {
  // Verificar autenticación
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Verificar rol
  if (!['ORG_ADMIN', 'HR_ADMIN'].includes(session.user.role)) {
    redirect('/unauthorized');
  }

  // Fetch datos del servidor
  const employees = await prisma.employee.findMany({
    where: { orgId: session.user.orgId }
  });

  return <EmployeeList employees={employees} />;
}
```

**Middleware para rutas (opcional):**

```typescript
// src/middleware.ts
import { auth } from "./lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Rutas públicas
  if (pathname.startsWith("/auth") || pathname === "/") {
    return NextResponse.next();
  }

  // Verificar autenticación
  if (!req.auth) {
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar acceso a /admin
  if (pathname.startsWith("/admin")) {
    if (req.auth.user.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## 6. Gestión de Estado

### 6.1 Zustand Stores

**Patrón de store para entidades:**

```typescript
// src/stores/employees-store.ts
import { create } from "zustand";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  active: boolean;
}

interface EmployeesState {
  // Estado
  employees: Employee[];
  selectedEmployee: Employee | null;
  isLoading: boolean;
  error: string | null;

  // Setters síncronos
  setEmployees: (employees: Employee[]) => void;
  setSelectedEmployee: (employee: Employee | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Acciones asíncronas
  fetchEmployees: () => Promise<void>;
  createEmployee: (data: Partial<Employee>) => Promise<void>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
}

export const useEmployeesStore = create<EmployeesState>((set, get) => ({
  // Estado inicial
  employees: [],
  selectedEmployee: null,
  isLoading: false,
  error: null,

  // Setters
  setEmployees: (employees) => set({ employees }),
  setSelectedEmployee: (employee) => set({ selectedEmployee: employee }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Acciones
  fetchEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Error al cargar empleados");
      const employees = await response.json();
      set({ employees, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createEmployee: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Error al crear empleado");
      const newEmployee = await response.json();

      // Actualizar estado local
      set((state) => ({
        employees: [...state.employees, newEmployee],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateEmployee: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Error al actualizar");
      const updated = await response.json();

      // Actualizar en el array
      set((state) => ({
        employees: state.employees.map((emp) => (emp.id === id ? updated : emp)),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteEmployee: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error al eliminar");

      // Eliminar del array local
      set((state) => ({
        employees: state.employees.filter((emp) => emp.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
```

**Uso en componentes:**

```typescript
// src/app/(main)/dashboard/employees/_components/employee-list.tsx
'use client';

import { useEffect } from 'react';
import { useEmployeesStore } from '@/stores/employees-store';

export function EmployeeList() {
  const {
    employees,
    isLoading,
    error,
    fetchEmployees,
    deleteEmployee
  } = useEmployeesStore();

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {employees.map((emp) => (
        <div key={emp.id}>
          <span>{emp.firstName} {emp.lastName}</span>
          <button onClick={() => deleteEmployee(emp.id)}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

### 6.2 Zustand con Persist

**Para guardar estado en localStorage:**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  setTheme: (theme: "light" | "dark") => void;
  toggleSidebar: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarCollapsed: false,

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),
    }),
    {
      name: "preferences-storage", // Clave en localStorage
    },
  ),
);
```

**IMPORTANTE: SSR Hydration**

Zustand con `persist` puede causar errores de hidratación en Next.js. Solución:

```typescript
// src/stores/preferences/preferences-provider.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePreferencesStore } from './preferences-store';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    usePreferencesStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return null; // o skeleton loader
  }

  return <>{children}</>;
}
```

Uso en layout:

```typescript
// src/app/layout.tsx
import { PreferencesProvider } from '@/stores/preferences/preferences-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PreferencesProvider>
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
```

---

## 7. Sistema de Temas

### 7.1 CSS Variables con OKLCH

**¿Qué es OKLCH?**

- Nuevo espacio de color moderno (reemplazo de HSL/RGB)
- Perceptualmente uniforme (colores se ven equilibrados)
- Mejor para manipulación programática

**Estructura:**

```
oklch(L C H)
  L = Lightness (0-1)
  C = Chroma (saturación, 0-0.4)
  H = Hue (0-360)
```

**Definición de variables:**

```css
/* src/app/globals.css */

:root {
  /* Light mode */
  --background: oklch(1 0 0); /* Blanco puro */
  --foreground: oklch(0.1884 0.0128 248); /* Texto oscuro */
  --primary: oklch(0.6723 0.1606 245); /* Azul primary */
  --primary-foreground: oklch(1 0 0); /* Texto en primary */
  --border: oklch(0.9 0.002 286); /* Bordes sutiles */
  --radius: 0.5rem; /* Border radius */
}

.dark {
  /* Dark mode */
  --background: oklch(0.15 0 0); /* Negro/gris oscuro */
  --foreground: oklch(0.98 0 0); /* Texto claro */
  --primary: oklch(0.7 0.19 245); /* Azul más brillante */
  --border: oklch(0.25 0.002 286); /* Bordes oscuros */
}
```

**Uso en Tailwind:**

```tsx
<div className="bg-background text-foreground border-border border">
  <button className="bg-primary text-primary-foreground">Click me</button>
</div>
```

Tailwind mapea automáticamente:

- `bg-background` → `var(--color-background)`
- `text-primary` → `var(--color-primary)`

---

### 7.2 Theme Presets

**Sistema de presets:** Múltiples temas predefinidos

```css
/* src/styles/presets/brutalist.css */
[data-theme-preset="brutalist"] {
  --background: oklch(1 0 0);
  --primary: oklch(0.1 0 0); /* Negro brutalist */
  --radius: 0rem; /* Sin border radius */
  --shadow: none; /* Sin sombras */
}

/* src/styles/presets/soft-pop.css */
[data-theme-preset="soft-pop"] {
  --primary: oklch(0.7 0.2 330); /* Rosa vibrante */
  --secondary: oklch(0.75 0.18 180); /* Cyan */
  --radius: 1rem; /* Muy redondeado */
}
```

**Aplicar preset:**

```tsx
<html data-theme-preset="brutalist" className="dark">
  <body>...</body>
</html>
```

**Store de preferencias:**

```typescript
interface PreferencesState {
  mode: "light" | "dark";
  preset: "blue" | "brutalist" | "soft-pop";

  setMode: (mode: "light" | "dark") => void;
  setPreset: (preset: string) => void;
}
```

---

## 8. API Routes

### 8.1 Estructura RESTful

**Convenciones Next.js:**

| Archivo                                 | HTTP Method      | Ruta                           |
| --------------------------------------- | ---------------- | ------------------------------ |
| `api/employees/route.ts`                | GET, POST        | `/api/employees`               |
| `api/employees/[id]/route.ts`           | GET, PUT, DELETE | `/api/employees/:id`           |
| `api/employees/[id]/contracts/route.ts` | GET, POST        | `/api/employees/:id/contracts` |

**Ejemplo completo:**

```typescript
// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

// Schema de validación
const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  nifNie: z.string().min(1),
});

// GET /api/employees
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const employees = await prisma.employee.findMany({
      where: { orgId: session.user.orgId },
      include: {
        user: { select: { email: true, role: true } },
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST /api/employees
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Validar rol
    if (!["ORG_ADMIN", "HR_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Parsear body
    const body = await request.json();

    // Validar con Zod
    const result = createEmployeeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos", details: result.error.errors }, { status: 400 });
    }

    // Crear empleado
    const employee = await prisma.employee.create({
      data: {
        ...result.data,
        orgId: session.user.orgId,
        country: "ES",
        active: true,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
```

**Endpoint con parámetro dinámico:**

```typescript
// src/app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

// GET /api/employees/:id
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: params.id,
      orgId: session.user.orgId, // Multi-tenancy
    },
    include: {
      employmentContracts: true,
      documents: true,
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  return NextResponse.json(employee);
}

// PUT /api/employees/:id
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();

  const employee = await prisma.employee.updateMany({
    where: {
      id: params.id,
      orgId: session.user.orgId, // Seguridad: solo su org
    },
    data: body,
  });

  if (employee.count === 0) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/employees/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Soft delete (marcar como inactivo)
  const employee = await prisma.employee.updateMany({
    where: {
      id: params.id,
      orgId: session.user.orgId,
    },
    data: {
      active: false,
    },
  });

  if (employee.count === 0) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

---

### 8.2 Upload de archivos

**Endpoint de upload:**

```typescript
// src/app/api/employees/[id]/documents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const documentKind = formData.get("kind") as string;

  if (!file) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  // Validar tipo de archivo
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  }

  // Validar tamaño (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Archivo muy grande (máx 5MB)" }, { status: 400 });
  }

  // Convertir File a Buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Subir a storage (R2/Azure)
  const storageUrl = await storage.uploadEmployeeDocument({
    orgId: session.user.orgId,
    employeeId: params.id,
    fileName: file.name,
    buffer,
    mimeType: file.type,
  });

  // Guardar registro en BD
  const document = await prisma.employeeDocument.create({
    data: {
      kind: documentKind,
      fileName: file.name,
      storageUrl,
      fileSize: file.size,
      mimeType: file.type,
      employeeId: params.id,
      orgId: session.user.orgId,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
```

**Storage abstraction (Cloudflare R2):**

```typescript
// src/lib/storage/providers/r2.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadEmployeeDocument({
  orgId,
  employeeId,
  fileName,
  buffer,
  mimeType,
}: {
  orgId: string;
  employeeId: string;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const key = `${orgId}/employees/${employeeId}/${Date.now()}-${fileName}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
```

---

## 9. Validación de Datos

### 9.1 Zod Schemas

**Schemas reutilizables:**

```typescript
// src/lib/validations/employee.ts
import { z } from "zod";

export const createEmployeeSchema = z.object({
  employeeNumber: z.string().optional(),
  firstName: z.string().min(1, "Nombre requerido").max(100),
  lastName: z.string().min(1, "Apellido requerido").max(100),
  secondLastName: z.string().max(100).optional(),
  nifNie: z.string().regex(/^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$/, "NIF/NIE inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  birthDate: z.string().optional(),
  iban: z
    .string()
    .regex(/^ES\d{22}$/, "IBAN español inválido")
    .optional()
    .or(z.literal("")),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, "Código postal inválido")
    .optional(),
  province: z.string().max(100).optional(),
  country: z.string().length(2).default("ES"),
  nationality: z.string().length(2).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
```

**Uso en API:**

```typescript
// src/app/api/employees/route.ts
import { createEmployeeSchema } from "@/lib/validations/employee";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = createEmployeeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  // result.data está tipado y validado
  const employee = await prisma.employee.create({
    data: result.data,
  });

  return NextResponse.json(employee);
}
```

**Uso en formularios (React Hook Form):**

```typescript
// src/components/employee-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployeeSchema, CreateEmployeeInput } from '@/lib/validations/employee';

export function EmployeeForm() {
  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      country: 'ES'
    }
  });

  const onSubmit = async (data: CreateEmployeeInput) => {
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('firstName')} />
      {form.formState.errors.firstName && (
        <span>{form.formState.errors.firstName.message}</span>
      )}

      <button type="submit">Guardar</button>
    </form>
  );
}
```

---

## 10. TypeScript

### 10.1 Configuración

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true, // Modo estricto
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,

    // Path aliases
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Ventajas de `strict: true`:**

- ✅ `strictNullChecks`: No permite `null/undefined` implícitos
- ✅ `strictFunctionTypes`: Valida tipos de funciones
- ✅ `noImplicitAny`: No permite `any` implícito
- ✅ `noImplicitThis`: `this` debe tener tipo explícito

---

### 10.2 Path Aliases

```typescript
// Sin alias
import { Button } from "../../../../components/ui/button";
import { prisma } from "../../../../lib/prisma";

// Con alias @/*
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
```

**Configurar en `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

---

### 10.3 Type Safety con Prisma

**Prisma genera tipos automáticamente:**

```typescript
import { Employee, User, Prisma } from "@prisma/client";

// Tipo generado del schema
const employee: Employee = {
  id: "emp_123",
  firstName: "Juan",
  lastName: "Pérez",
  // ... todos los campos del schema
};

// Tipo para crear (sin id, sin timestamps)
const newEmployee: Prisma.EmployeeCreateInput = {
  firstName: "María",
  lastName: "García",
  organization: {
    connect: { id: "org_123" },
  },
};

// Include types
const employeeWithUser = await prisma.employee.findUnique({
  where: { id: "emp_123" },
  include: { user: true },
});

// Tipo automático: Employee & { user: User | null }
console.log(employeeWithUser.user?.email); // ✅ Autocomplete
```

---

## 11. Componentes UI

### 11.1 shadcn/ui Components

**Instalación de componentes:**

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add table
npx shadcn@latest add dialog
```

Esto crea archivos en `src/components/ui/`:

**Button component:**

```typescript
// src/components/ui/button.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

export { Button, buttonVariants }
```

**Uso:**

```tsx
<Button>Default</Button>
<Button variant="destructive">Eliminar</Button>
<Button variant="outline" size="sm">Pequeño</Button>
<Button variant="ghost">Ghost</Button>
```

---

### 11.2 Form con shadcn/ui

```bash
npx shadcn@latest add form
```

**Formulario completo:**

```typescript
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  email: z.string().email('Email inválido').optional(),
});

export function EmployeeForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Juan" {...field} />
              </FormControl>
              <FormDescription>
                Nombre del empleado
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Apellido</FormLabel>
              <FormControl>
                <Input placeholder="Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="juan@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  );
}
```

---

### 11.3 DataTable Pattern

**Componente DataTable reutilizable:**

```typescript
// src/components/data-table/data-table.tsx
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
```

**Definir columnas:**

```typescript
// src/app/(main)/dashboard/employees/_components/columns.tsx
import { ColumnDef } from '@tanstack/react-table';
import { Employee } from '@/stores/employees-store';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';

export const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: 'employeeNumber',
    header: 'Nº',
  },
  {
    accessorKey: 'firstName',
    header: 'Nombre',
  },
  {
    accessorKey: 'lastName',
    header: 'Apellidos',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'active',
    header: 'Estado',
    cell: ({ row }) => (
      <span className={row.original.active ? 'text-green-600' : 'text-red-600'}>
        {row.original.active ? 'Activo' : 'Inactivo'}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const employee = row.original;

      return (
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      );
    },
  },
];
```

**Uso:**

```typescript
// src/app/(main)/dashboard/employees/_components/employee-list.tsx
'use client';

import { useEmployeesStore } from '@/stores/employees-store';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from './columns';

export function EmployeeList() {
  const { employees } = useEmployeesStore();

  return <DataTable columns={columns} data={employees} />;
}
```

---

## 12. Almacenamiento de Archivos

### 12.1 Cloudflare R2 (S3-compatible)

**¿Por qué R2 y no S3/Azure?**

| Aspecto            | AWS S3        | Azure Blob   | Cloudflare R2    |
| ------------------ | ------------- | ------------ | ---------------- |
| **Precio egress**  | ❌ Caro       | ❌ Caro      | ✅ Gratis        |
| **Precio storage** | $0.023/GB     | $0.018/GB    | $0.015/GB        |
| **API**            | S3 compatible | Propio       | ✅ S3 compatible |
| **Performance**    | ✅ Excelente  | ✅ Excelente | ✅ Excelente     |

**Configuración:**

```typescript
// src/lib/storage/providers/r2.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // https://[account-id].r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export class R2Storage {
  async upload({ key, body, contentType }: { key: string; body: Buffer; contentType: string }): Promise<string> {
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    return getSignedUrl(r2, command, { expiresIn });
  }
}

export const storage = new R2Storage();
```

**Uso en upload:**

```typescript
// src/app/api/employees/[id]/documents/upload/route.ts
import { storage } from "@/lib/storage/providers/r2";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${orgId}/employees/${employeeId}/${Date.now()}-${file.name}`;

  const url = await storage.upload({
    key,
    body: buffer,
    contentType: file.type,
  });

  // Guardar url en base de datos
  await prisma.employeeDocument.create({
    data: {
      fileName: file.name,
      storageUrl: url,
      // ...
    },
  });

  return NextResponse.json({ url });
}
```

---

## 13. Firma Electrónica

### 13.1 Sistema SES (Simple Electronic Signature)

**Componentes:**

1. **SignableDocument**: PDF que necesita firmas
2. **SignatureRequest**: Workflow de firma
3. **Signer**: Cada firmante
4. **SignatureEvidence**: Auditoría inmutable

**Flujo de firma:**

```
1. Admin sube PDF → SignableDocument
2. Admin crea SignatureRequest con Signers
3. Sistema envía notificaciones a firmantes
4. Firmante accede con token único
5. Firmante da consentimiento (checkbox)
6. Firmante confirma firma
7. Sistema genera evidencia (timeline, metadata, hashes)
8. Sistema marca signer como SIGNED
9. Si todos firmaron → SignatureRequest = COMPLETED
```

**Crear solicitud de firma:**

```typescript
// src/app/api/signatures/requests/create/route.ts
import { storage } from "@/lib/storage";
import { generateSignToken } from "@/lib/signatures";

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();

  // 1. Crear documento firmable
  const document = await prisma.signableDocument.create({
    data: {
      title: body.title,
      description: body.description,
      category: body.category,
      originalFileUrl: body.fileUrl,
      originalHash: body.fileHash,
      fileSize: body.fileSize,
      orgId: session.user.orgId,
      createdById: session.user.id,
      expiresAt: body.expiresAt,
    },
  });

  // 2. Crear solicitud de firma
  const request = await prisma.signatureRequest.create({
    data: {
      documentId: document.id,
      orgId: session.user.orgId,
      policy: "SES",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    },
  });

  // 3. Crear firmantes
  for (const [index, signerId] of body.signerIds.entries()) {
    const token = generateSignToken();

    await prisma.signer.create({
      data: {
        requestId: request.id,
        employeeId: signerId,
        order: index + 1,
        signToken: token,
      },
    });

    // 4. Enviar notificación
    await sendSignatureNotification({
      employeeId: signerId,
      requestId: request.id,
      token,
    });
  }

  return NextResponse.json({ requestId: request.id });
}
```

**Sesión de firma:**

```typescript
// src/app/api/signatures/sessions/[token]/route.ts
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const signer = await prisma.signer.findUnique({
    where: { signToken: params.token },
    include: {
      request: {
        include: {
          document: true,
        },
      },
      employee: true,
    },
  });

  if (!signer) {
    return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  }

  if (signer.status !== "PENDING") {
    return NextResponse.json({ error: "Ya firmado" }, { status: 400 });
  }

  // Verificar expiración
  if (new Date() > signer.request.expiresAt) {
    return NextResponse.json({ error: "Expirado" }, { status: 410 });
  }

  return NextResponse.json({
    document: signer.request.document,
    employee: signer.employee,
    signer: {
      id: signer.id,
      order: signer.order,
    },
  });
}
```

**Confirmar firma:**

```typescript
// src/app/api/signatures/sessions/[token]/confirm/route.ts
import { createSignatureEvidence } from "@/lib/signatures/evidence-builder";
import { signPDF } from "@/lib/signatures/pdf-signer";

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const signer = await prisma.signer.findUnique({
    where: { signToken: params.token },
    include: {
      request: {
        include: {
          document: true,
          signers: true,
        },
      },
      employee: true,
    },
  });

  // ... validaciones

  // 1. Firmar PDF (añadir firma visual)
  const signedPdfUrl = await signPDF({
    originalUrl: signer.request.document.originalFileUrl,
    signerName: `${signer.employee.firstName} ${signer.employee.lastName}`,
    signDate: new Date(),
  });

  // 2. Calcular hash del PDF firmado
  const signedHash = await calculateFileHash(signedPdfUrl);

  // 3. Crear evidencia
  const evidence = await createSignatureEvidence({
    requestId: signer.request.id,
    signerId: signer.id,
    ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
    preSignHash: signer.request.document.originalHash,
    postSignHash: signedHash,
  });

  // 4. Actualizar signer
  await prisma.signer.update({
    where: { id: signer.id },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      signedFileUrl: signedPdfUrl,
      signedHash,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    },
  });

  // 5. Verificar si todos firmaron
  const allSigned = signer.request.signers.every((s) => s.id === signer.id || s.status === "SIGNED");

  if (allSigned) {
    await prisma.signatureRequest.update({
      where: { id: signer.request.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ success: true });
}
```

---

## 14. Build y Deployment

### 14.1 Turbopack

**¿Qué es Turbopack?**

- Nuevo bundler de Next.js (reemplazo de Webpack)
- Escrito en Rust (muy rápido)
- ~700x más rápido que Webpack en HMR

**Activar en desarrollo:**

```bash
npm run dev -- --turbopack
# o en package.json
"dev": "next dev --turbopack"
```

**Ventajas:**

- ✅ **Fast Refresh**: Cambios instantáneos en el navegador
- ✅ **Incremental compilation**: Solo recompila lo que cambió
- ✅ **Better error messages**: Errores más claros

---

### 14.2 Build de Producción

```bash
npm run build
```

**Proceso:**

1. **Type checking**: TypeScript valida tipos
2. **Linting**: ESLint valida código
3. **Compilation**: Next.js compila todo a `.next/`
4. **Static generation**: Pre-renderiza páginas estáticas
5. **Optimization**: Minifica, tree-shaking, image optimization

**Salida:**

```
Page                                       Size     First Load JS
┌ ○ /                                      5.2 kB         90.3 kB
├ ○ /dashboard/employees                   8.1 kB         95.2 kB
├ ● /dashboard/employees/[id]              3.4 kB         88.5 kB
└ ○ /auth/login                            2.1 kB         87.2 kB

○  (Static)  automatically rendered as static HTML
●  (SSG)     automatically generated as static HTML + JSON
```

---

### 14.3 Variables de Entorno

**Tipos de variables:**

| Tipo                   | Accesible desde    | Uso                        |
| ---------------------- | ------------------ | -------------------------- |
| `VARIABLE`             | Solo servidor      | Secrets (API keys, DB URL) |
| `NEXT_PUBLIC_VARIABLE` | Cliente y servidor | Configs públicas           |

**Ejemplo `.env`:**

```bash
# Solo servidor (privadas)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
R2_SECRET_ACCESS_KEY="..."

# Cliente y servidor (públicas)
NEXT_PUBLIC_APP_NAME="Timenow"
NEXT_PUBLIC_API_URL="https://api.timenow.com"
```

**Uso:**

```typescript
// src/app/api/employees/route.ts
const dbUrl = process.env.DATABASE_URL; // ✅ Solo servidor

// src/components/header.tsx
const appName = process.env.NEXT_PUBLIC_APP_NAME; // ✅ Cliente y servidor
```

**IMPORTANTE**: Variables sin `NEXT_PUBLIC_` NO están disponibles en el navegador (seguridad).

---

### 14.4 Deployment (Vercel)

**Deploy automático:**

1. Conectar repo GitHub a Vercel
2. Cada push a `main` → deploy automático
3. Cada PR → preview deployment

**Configuración:**

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

**Environment variables en Vercel:**

- Settings → Environment Variables
- Definir para Production, Preview, Development

**Alternativas a Vercel:**

- **Cloudflare Pages**: Deploy optimizado
- **Netlify**: Similar a Vercel
- **Self-hosted**: Docker + Node.js

---

## 15. Scripts y Comandos

### 15.1 Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky",
    "generate:presets": "ts-node scripts/generate-theme-presets.ts",
    "init:master": "tsx scripts/init-master-data.ts"
  }
}
```

**Prisma scripts:**

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

### 15.2 Comandos Prisma

```bash
# Desarrollo
npx prisma generate           # Generar cliente TypeScript
npx prisma migrate dev        # Crear y aplicar migración
npx prisma migrate reset      # Resetear BD (⚠️ borra datos)
npx prisma db push            # Sincronizar schema (sin migración)
npx prisma db seed            # Ejecutar seed

# Producción
npx prisma migrate deploy     # Aplicar migraciones pendientes
npx prisma generate           # Generar cliente

# Utilidades
npx prisma studio             # UI visual de la BD
npx prisma format             # Formatear schema.prisma
```

---

### 15.3 Husky + Lint-staged

**Pre-commit hook:**

```json
// .husky/pre-commit
npm run lint-staged

// package.json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

**Flujo:**

1. Haces `git commit`
2. Husky intercepta
3. Lint-staged ejecuta ESLint + Prettier en archivos staged
4. Si hay errores → commit BLOQUEADO
5. Si todo OK → commit se completa

---

## Resumen Final

**Timenow ERP está construido con:**

| Capa              | Tecnología              | Por qué                             |
| ----------------- | ----------------------- | ----------------------------------- |
| **Frontend**      | React 19 + Next.js 15   | SSR, routing integrado, DX          |
| **Lenguaje**      | TypeScript              | Type safety, autocomplete           |
| **Estilos**       | Tailwind CSS v4 + OKLCH | Utility-first, temas modernos       |
| **Componentes**   | shadcn/ui (Radix UI)    | Headless, customizable, accesible   |
| **Estado**        | Zustand                 | Minimalista, performance            |
| **Backend**       | Next.js API Routes      | Monorepo, TypeScript compartido     |
| **Base de datos** | PostgreSQL + Prisma     | Relacional, type-safe ORM           |
| **Autenticación** | NextAuth v5             | Integrado con Next.js, JWT          |
| **Validación**    | Zod                     | Type inference, reutilizable        |
| **Tablas**        | TanStack Table          | Headless, features avanzados        |
| **Storage**       | Cloudflare R2           | Sin costos de egress, S3-compatible |
| **Build**         | Turbopack               | Fast Refresh, Rust-powered          |
| **Deploy**        | Vercel                  | Optimizado para Next.js             |

---

**Próximos pasos para profundizar:**

- 📌 Pregúntame sobre secciones específicas que quieras ampliar
- 📌 Puedo explicar patrones avanzados (React Query, Server Actions, etc.)
- 📌 Puedo detallar el sistema de firma electrónica o cualquier feature
- 📌 Puedo comparar con arquitecturas Java/Spring en más detalle

¡Este documento es tu base técnica completa! Ahora pregúntame lo que necesites. 🚀

---

## 16. Preguntas Frecuentes (FAQ)

### P1: ¿Qué significa SSR?

**R: SSR = Server-Side Rendering (Renderizado del lado del servidor)**

El HTML se **genera en el servidor** antes de enviarlo al navegador del usuario.

#### Comparación visual:

**❌ CSR (Client-Side Rendering) - React tradicional:**

```
1. Navegador pide página → Servidor
2. Servidor envía HTML vacío + JavaScript
   <html>
     <body>
       <div id="root"></div>  ← Vacío
       <script src="app.js"></script>
     </body>
   </html>

3. Navegador descarga JavaScript (2-5 segundos)
4. JavaScript ejecuta y construye el HTML
5. Usuario VE el contenido
```

**Problema**: El usuario ve pantalla en blanco mientras carga JS. Google también ve HTML vacío (mal SEO).

---

**✅ SSR (Server-Side Rendering) - Next.js:**

```
1. Navegador pide página → Servidor
2. Servidor EJECUTA React en Node.js
3. Servidor genera HTML completo
   <html>
     <body>
       <h1>Empleados</h1>
       <ul>
         <li>Juan Pérez</li>    ← Contenido REAL
         <li>María García</li>
       </ul>
     </body>
   </html>

4. Navegador muestra HTML inmediatamente
5. JavaScript "hidrata" para interactividad
```

**Ventaja**: Usuario ve contenido INMEDIATAMENTE. Google ve HTML completo (buen SEO).

---

#### Analogía Java/Spring:

**SSR es como JSP o Thymeleaf:**

```java
// Spring Controller (SSR)
@GetMapping("/empleados")
public String empleados(Model model) {
    List<Employee> employees = employeeService.findAll();
    model.addAttribute("employees", employees);
    return "employees"; // Renderiza employees.html en SERVIDOR
}
```

El servidor genera el HTML y lo envía completo.

**CSR es como SPA (Angular/React) + REST API:**

```java
// Spring REST Controller
@GetMapping("/api/empleados")
@ResponseBody
public List<Employee> empleados() {
    return employeeService.findAll(); // Solo JSON
}
```

El navegador recibe JSON vacío y JavaScript construye el HTML en el cliente.

---

#### Ejemplo práctico en Next.js:

**Server Component (SSR):**

```typescript
// src/app/employees/page.tsx
import { prisma } from '@/lib/prisma';

// Esto corre en el SERVIDOR
export default async function EmployeesPage() {
  // Fetch de base de datos DIRECTO en el servidor
  const employees = await prisma.employee.findMany();

  // Retorna JSX que se renderiza a HTML en el servidor
  return (
    <div>
      <h1>Empleados</h1>
      <ul>
        {employees.map(emp => (
          <li key={emp.id}>{emp.firstName}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Flujo**:

1. Usuario visita `/employees`
2. Next.js ejecuta este código en el **servidor**
3. Consulta base de datos
4. Genera HTML completo con los nombres
5. Envía HTML al navegador
6. Usuario ve contenido INMEDIATAMENTE

---

#### Ventajas de SSR:

| Aspecto                   | CSR                            | SSR                                |
| ------------------------- | ------------------------------ | ---------------------------------- |
| **Primera carga**         | ❌ Lenta (espera JS)           | ✅ Rápida (HTML ya viene)          |
| **SEO**                   | ❌ Malo (Google ve HTML vacío) | ✅ Excelente (Google ve contenido) |
| **Performance percibida** | ❌ Pantalla blanca             | ✅ Contenido inmediato             |
| **Datos sensibles**       | ⚠️ API key expuesta            | ✅ Seguro (secretos en servidor)   |

---

#### Tipos de rendering en Next.js:

1. **SSR** (Server-Side Rendering)
   - HTML generado **en cada request**
   - Datos siempre frescos
   - Más lento que static

2. **SSG** (Static Site Generation)
   - HTML generado **en build time**
   - Ultra rápido (HTML pre-generado)
   - Datos pueden quedar desactualizados

3. **CSR** (Client-Side Rendering)
   - HTML vacío, JavaScript construye en cliente
   - Para partes interactivas (formularios, dashboards)

4. **ISR** (Incremental Static Regeneration)
   - SSG pero regenera cada X segundos
   - Combina velocidad + datos frescos

---

**En resumen:**

**SSR = El servidor genera el HTML antes de enviarlo al navegador**

Igual que cuando usas Thymeleaf/JSP en Spring, pero con la capacidad de convertirse en una app interactiva después de la carga inicial.

**Next.js hace SSR por defecto**, por eso es tan rápido y bueno para SEO comparado con React tradicional (CSR).

---

### P2: ¿Qué es Radix UI?

**R: Radix UI = Librería de componentes UI "headless" (sin estilos)**

Es una colección de **componentes accesibles SIN estilos** (headless). Te da la **funcionalidad y accesibilidad**, pero tú pones el **HTML y CSS**.

---

#### Concepto "Headless" (sin cabeza):

**❌ Componente tradicional (Material-UI, Bootstrap):**

```tsx
// Material-UI te da funcionalidad + estilos juntos
import { Button } from "@mui/material";

<Button variant="contained" color="primary">
  Click me
</Button>;

// Genera HTML + CSS predefinido (difícil de cambiar)
```

**Problema**: Si quieres estilos diferentes, debes **sobrescribir** CSS (complicado).

---

**✅ Componente headless (Radix UI):**

```tsx
// Radix solo te da la lógica (estados, accesibilidad, eventos)
import * as Dialog from "@radix-ui/react-dialog";

<Dialog.Root>
  <Dialog.Trigger className="tu-clase-aqui">Abrir</Dialog.Trigger>

  <Dialog.Portal>
    <Dialog.Overlay className="tu-overlay-custom" />
    <Dialog.Content className="tu-modal-custom">
      <Dialog.Title>Título</Dialog.Title>
      <Dialog.Description>Descripción</Dialog.Description>
      <Dialog.Close>Cerrar</Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>;
```

**Ventaja**: Tú controlas TODO el HTML y CSS. Radix solo maneja:

- ✅ Abrir/cerrar modal
- ✅ Accesibilidad (ARIA, foco, teclado)
- ✅ Portales (renderizar fuera del DOM)
- ✅ Estados (open, closed, etc.)

---

#### Analogía Java:

**Radix UI es como un Interface en Java:**

```java
// Interface (define el contrato, sin implementación)
public interface Repository<T> {
    T findById(Long id);
    List<T> findAll();
    void save(T entity);
}

// Tú implementas como quieras
public class JpaRepository implements Repository<Employee> {
    // Tu implementación custom
}
```

Radix te da el **contrato** (eventos, accesibilidad, estados), tú pones la **implementación** (HTML/CSS).

---

#### ¿Por qué Radix UI en el proyecto?

**El stack completo es:**

```
shadcn/ui (capa visual)
    ↓ usa
Radix UI (lógica + accesibilidad)
    ↓ usa
Tailwind CSS (estilos)
```

**Ejemplo real: Botón dropdown**

**1. Radix UI proporciona la funcionalidad:**

```tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

<DropdownMenu.Root>
  <DropdownMenu.Trigger>Menú</DropdownMenu.Trigger>

  <DropdownMenu.Content>
    <DropdownMenu.Item>Opción 1</DropdownMenu.Item>
    <DropdownMenu.Item>Opción 2</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>;
```

**2. shadcn/ui crea un componente bonito encima:**

```tsx
// src/components/ui/dropdown-menu.tsx (creado por shadcn)
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuContent = React.forwardRef<...>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 rounded-md border bg-popover p-1 shadow-md",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));

export { DropdownMenu, DropdownMenuContent, ... }
```

**3. Tú usas el componente de shadcn:**

```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger>Menú</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Editar</DropdownMenuItem>
    <DropdownMenuItem>Eliminar</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

---

#### Componentes que proporciona Radix UI:

**Navegación:**

- **Dropdown Menu** - Menú desplegable
- **Navigation Menu** - Menú de navegación
- **Tabs** - Pestañas
- **Accordion** - Acordeón expandible

**Overlays:**

- **Dialog** - Modal/diálogo
- **Popover** - Popover flotante
- **Tooltip** - Tooltip al hover
- **Alert Dialog** - Diálogo de confirmación

**Formularios:**

- **Select** - Select dropdown
- **Checkbox** - Checkbox accesible
- **Radio Group** - Radio buttons
- **Switch** - Toggle switch
- **Slider** - Slider de rango

**Otros:**

- **Progress** - Barra de progreso
- **Context Menu** - Menú contextual (click derecho)
- **Toast** - Notificaciones
- **Scroll Area** - Área scrolleable custom

---

#### Ventajas de Radix UI:

| Aspecto                  | Material-UI / Ant Design          | Radix UI                             |
| ------------------------ | --------------------------------- | ------------------------------------ |
| **Estilos**              | ❌ Predefinidos (difícil cambiar) | ✅ Tú controlas 100%                 |
| **Accesibilidad**        | ✅ Buena                          | ✅ Excelente (WAI-ARIA compliant)    |
| **Bundle size**          | ❌ Grande (~300KB)                | ✅ Pequeño (tree-shakeable)          |
| **Customización**        | ⚠️ Via overrides (complicado)     | ✅ Total (es tu código)              |
| **Curva de aprendizaje** | ✅ Baja (plug & play)             | ⚠️ Media (más control = más trabajo) |

---

#### Comparación con alternativas:

**Radix UI (headless):**

```tsx
// Tú defines TODO
<Dialog.Root>
  <Dialog.Trigger className="rounded bg-blue-500 px-4 py-2">Abrir</Dialog.Trigger>
  <Dialog.Content className="rounded-lg bg-white p-6 shadow-xl">Tu contenido</Dialog.Content>
</Dialog.Root>
```

**Material-UI (styled):**

```tsx
// Estilos predefinidos
<Button variant="contained" color="primary" onClick={handleOpen}>
  Abrir
</Button>
<Dialog open={open}>
  <DialogContent>
    Tu contenido
  </DialogContent>
</Dialog>
```

**Headless UI (alternativa a Radix):**

```tsx
// Similar a Radix, hecho por Tailwind Labs
<Dialog open={isOpen}>
  <Dialog.Panel className="bg-white p-6">Tu contenido</Dialog.Panel>
</Dialog>
```

---

#### ¿Por qué Radix en lugar de Headless UI?

| Aspecto            | Headless UI       | Radix UI           |
| ------------------ | ----------------- | ------------------ |
| **Componentes**    | ⚠️ Menos variedad | ✅ Más componentes |
| **Composabilidad** | ⚠️ Menos flexible | ✅ Muy flexible    |
| **Accesibilidad**  | ✅ Buena          | ✅ Excelente       |
| **Documentación**  | ✅ Buena          | ✅ Excelente       |
| **TypeScript**     | ✅ Bueno          | ✅ Excelente       |

---

#### Ejemplo real del proyecto:

**Dialog (Modal) en Timenow:**

**Radix proporciona la base:**

```tsx
// @radix-ui/react-dialog
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger />
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title />
      <Dialog.Description />
      <Dialog.Close />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**shadcn envuelve con estilos Tailwind:**

```tsx
// src/components/ui/dialog.tsx
const DialogContent = React.forwardRef<...>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className="fixed inset-0 bg-black/50" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        "bg-background p-6 shadow-lg rounded-lg border",
        "max-w-lg w-full",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
```

**Tú usas el componente final:**

```tsx
// src/app/dashboard/employees/_components/employee-form-dialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Nuevo Empleado</DialogTitle>
    </DialogHeader>
    <EmployeeForm />
  </DialogContent>
</Dialog>;
```

---

**En resumen:**

**Radix UI = Componentes con lógica y accesibilidad, pero SIN estilos**

Es como tener un motor de coche (Radix) al que le pones la carrocería que quieras (Tailwind + shadcn).

**Ventajas en Timenow:**

- ✅ **Accesibilidad** perfecta (WCAG compliant)
- ✅ **Personalización** total con Tailwind
- ✅ **Control** completo del código (está en tu repo via shadcn)
- ✅ **Bundle pequeño** (solo importas lo que usas)

**Radix hace el trabajo duro (estados, foco, teclado, ARIA), tú solo te preocupas de que se vea bonito** 🎨

---

### P3: ¿Usamos Server Components y Client Components? ¿Cuándo usar cada uno?

**R: Sí, usamos ambos tipos. Next.js elige automáticamente según necesites interactividad o no.**

---

#### Regla simple:

- **Server Component (por defecto)** → Sin interactividad
- **Client Component (`'use client'`)** → Con interactividad (useState, onClick, etc.)

---

#### Server Components (por defecto)

**Cuándo usar:**

- Fetch de datos
- Acceso a base de datos
- Leer variables de entorno secretas
- Renderizar contenido estático

**Ejemplo real del proyecto:**

```tsx
// src/app/dashboard/employees/page.tsx
// NO tiene 'use client' → Server Component

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function EmployeesPage() {
  // Corre en el SERVIDOR
  const session = await auth();
  const employees = await prisma.employee.findMany({
    where: { orgId: session.user.orgId },
  });

  // Genera HTML en servidor
  return (
    <div>
      <h1>Empleados</h1>
      {employees.map((emp) => (
        <div key={emp.id}>{emp.firstName}</div>
      ))}
    </div>
  );
}
```

**Ventajas:**

- ✅ No envía JavaScript al navegador
- ✅ Puede acceder a BD directamente
- ✅ Secretos seguros (API keys, tokens)

---

#### Client Components

**Cuándo usar:**

- Formularios con estado
- Botones con onClick
- useState, useEffect
- Event listeners
- Interactividad del usuario

**Ejemplo real del proyecto:**

```tsx
// src/app/dashboard/employees/_components/employee-form.tsx
"use client"; // ← MARCA COMO CLIENT

import { useState } from "react";
import { useForm } from "react-hook-form";

export function EmployeeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    await fetch("/api/employees", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("firstName")} />
      <button type="submit" disabled={isSubmitting}>
        Guardar
      </button>
    </form>
  );
}
```

**Características:**

- ✅ Puede usar useState, onClick, eventos
- ⚠️ Envía JavaScript al navegador
- ❌ No puede acceder a BD directamente
- ❌ No puede usar secretos

---

#### Composición (lo mejor de ambos)

**Patrón común:** Server Component que contiene Client Components

```tsx
// src/app/dashboard/employees/page.tsx
// Server Component (sin 'use client')

import { prisma } from "@/lib/prisma";
import { EmployeeForm } from "./_components/employee-form"; // Client Component

export default async function EmployeesPage() {
  // Fetch en servidor
  const departments = await prisma.department.findMany();

  return (
    <div>
      <h1>Empleados</h1>

      {/* Server Component renderiza HTML */}
      <div>Total departamentos: {departments.length}</div>

      {/* Client Component para interactividad */}
      <EmployeeForm departments={departments} />
    </div>
  );
}
```

**Flujo:**

1. Servidor ejecuta página y consulta BD
2. Servidor genera HTML con datos
3. Envía HTML + JavaScript del formulario
4. Usuario ve contenido inmediatamente
5. JavaScript "hidrata" el formulario para interactividad

---

#### Ejemplos del proyecto:

**✅ Server Components en Timenow:**

```
- src/app/dashboard/employees/page.tsx
- src/app/dashboard/me/page.tsx
- src/app/dashboard/settings/page.tsx
- src/app/layout.tsx
- src/app/(main)/layout.tsx
```

**✅ Client Components en Timenow:**

```
- src/components/employee-form.tsx
- src/components/auth/login-form.tsx
- src/stores/employees-store.tsx
- src/stores/preferences-store.tsx
- src/components/data-table/data-table.tsx
- src/components/ui/dialog.tsx (shadcn)
- src/components/notifications/notification-bell.tsx
```

---

#### Regla de oro:

**Si usas `useState`, `onClick`, `useEffect` → necesitas `'use client'`**

**Si solo renderizas HTML con datos del servidor → NO pongas `'use client'`**

---

#### Tabla resumen:

| Tipo       | Marca          | Dónde corre | Puede usar         | No puede usar       |
| ---------- | -------------- | ----------- | ------------------ | ------------------- |
| **Server** | Nada (default) | Servidor    | BD, secrets, async | useState, onClick   |
| **Client** | `'use client'` | Navegador   | useState, onClick  | BD directa, secrets |

**Usamos ambos:** Server para datos, Client para interactividad.

---

### P4: ¿Qué son los Hooks?

**R: Hooks = Funciones especiales de React que "enganchan" funcionalidades a tus componentes**

Son funciones que empiezan con `use` (useState, useEffect, useForm, etc.)

---

#### ¿Para qué sirven?

Permiten usar **estado** y otras features de React en componentes funcionales (antes solo en clases).

---

#### Hooks más comunes:

**useState - Crear estado**

```tsx
"use client";

function EmployeeForm() {
  const [name, setName] = useState(""); // Estado: name

  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)} // Actualiza estado
    />
  );
}
```

**Explicación:**

- `name` = valor actual
- `setName` = función para cambiarlo
- Cuando cambias `name` → componente se re-renderiza

---

**useEffect - Efectos secundarios**

```tsx
'use client';

function EmployeeList() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    // Corre después del render
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(data));
  }, []); // [] = solo corre una vez

  return <div>{employees.map(...)}</div>;
}
```

**Explicación:**

- Se ejecuta **después** de renderizar
- `[]` vacío = solo la primera vez
- `[name]` = cada vez que `name` cambie

---

**useForm - Formularios (react-hook-form)**

```tsx
"use client";
import { useForm } from "react-hook-form";

function EmployeeForm() {
  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("firstName")} />
      <input {...form.register("lastName")} />
    </form>
  );
}
```

---

**Custom Hooks - Hooks propios**

**Ejemplo del proyecto:**

```tsx
// src/stores/employees-store.tsx
import { create } from 'zustand';

export const useEmployeesStore = create((set) => ({
  employees: [],

  fetchEmployees: async () => {
    const res = await fetch('/api/employees');
    const data = await res.json();
    set({ employees: data });
  }
}));

// Uso:
function EmployeeList() {
  const { employees, fetchEmployees } = useEmployeesStore();

  useEffect(() => {
    fetchEmployees();
  }, []);

  return <div>{employees.map(...)}</div>;
}
```

---

#### Reglas de los Hooks:

1. **Solo en componentes funcionales** (no clases)
2. **Solo con `'use client'`** (no en Server Components)
3. **Siempre arriba del componente** (no dentro de if/loops)
4. **Siempre empiezan con `use`**

```tsx
✅ CORRECTO:
function MyComponent() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  return <div>...</div>;
}

❌ INCORRECTO:
function MyComponent() {
  if (condition) {
    const [count, setCount] = useState(0); // ❌ No dentro de if
  }

  return <div>...</div>;
}
```

---

#### Hooks en Timenow:

```tsx
// useState - Estado local
const [isOpen, setIsOpen] = useState(false);
const [loading, setLoading] = useState(true);

// useEffect - Fetch inicial
useEffect(() => {
  fetchEmployees();
}, []);

// useForm - Formularios
const form = useForm({ resolver: zodResolver(schema) });

// useEmployeesStore - Zustand store
const { employees, fetchEmployees } = useEmployeesStore();

// useRouter - Navegación (Next.js)
const router = useRouter();
router.push("/dashboard");
```

---

#### Analogía Java:

**Hooks ≈ Métodos helper que inyectan funcionalidad**

Similar a cómo en Spring inyectas servicios:

```java
@Component
public class EmployeeController {
  @Autowired // "Hook" que inyecta dependencia
  private EmployeeService employeeService;
}
```

En React:

```tsx
function EmployeeList() {
  const { employees } = useEmployeesStore(); // "Hook" que inyecta store
}
```

---

#### Resumen:

**Hooks = Funciones que empiezan con `use` y añaden funcionalidad a componentes**

- `useState` → Estado
- `useEffect` → Efectos secundarios
- `useForm` → Formularios
- `useXxxStore` → Stores Zustand
- Custom hooks → Lógica reutilizable

**Solo funcionan en Client Components** (`'use client'`)

---

### P5: ¿Qué es el Middleware?

**R: Middleware = Código que se ejecuta ANTES de que una petición llegue a la página**

Es un **interceptor** que corre en el servidor antes del routing.

---

#### ¿Para qué sirve?

- ✅ **Autenticación** - Verificar si el usuario está logueado
- ✅ **Redirecciones** - Redirigir según condiciones
- ✅ **Logging** - Registrar peticiones
- ✅ **Headers** - Modificar headers HTTP
- ✅ **Geolocalización** - Redirigir según país

---

#### Analogía Java/Spring:

**Middleware ≈ Filter o Interceptor**

```java
// Spring Filter (Middleware)
@Component
public class AuthenticationFilter extends OncePerRequestFilter {

  @Override
  protected void doFilterInternal(
    HttpServletRequest request,
    HttpServletResponse response,
    FilterChain filterChain
  ) {
    // Intercepta ANTES del controller
    if (!isAuthenticated(request)) {
      response.sendRedirect("/login");
      return;
    }

    filterChain.doFilter(request, response); // Continúa
  }
}
```

En Next.js es igual: intercepta antes de la página.

---

#### Ejemplo en Timenow:

```tsx
// src/middleware.ts
import { auth } from "./lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Rutas públicas (no interceptar)
  if (pathname.startsWith("/auth") || pathname === "/") {
    return NextResponse.next();
  }

  // Verificar autenticación
  if (!req.auth) {
    // Usuario NO autenticado → redirigir a login
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar acceso a /admin
  if (pathname.startsWith("/admin")) {
    if (req.auth.user.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Todo OK → continuar
  return NextResponse.next();
});

// Configurar qué rutas interceptar
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

#### Flujo de una petición:

```
1. Usuario visita /dashboard/employees
2. Middleware intercepta
3. Verifica autenticación
   - ❌ No autenticado → redirect a /auth/login
   - ✅ Autenticado → continúa
4. Verifica permisos
   - ❌ Sin permisos → redirect a /unauthorized
   - ✅ Con permisos → continúa
5. Página se renderiza
```

---

#### Casos de uso en Timenow:

**1. Proteger rutas autenticadas:**

```tsx
if (!req.auth) {
  return NextResponse.redirect("/auth/login");
}
```

**2. Verificar roles:**

```tsx
if (pathname.startsWith("/admin") && req.auth.user.role !== "SUPER_ADMIN") {
  return NextResponse.redirect("/unauthorized");
}
```

**3. Modificar headers:**

```tsx
const response = NextResponse.next();
response.headers.set("x-user-id", req.auth.user.id);
return response;
```

**4. Logging:**

```tsx
console.log(`${req.method} ${pathname} - ${req.auth?.user.email}`);
```

---

#### Matcher (qué rutas interceptar):

```tsx
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**Explicación:**

- `(?!...)` = negación (NOT)
- Intercepta TODO excepto:
  - `/api/*` (API routes)
  - `/_next/static/*` (archivos estáticos)
  - `/_next/image/*` (imágenes optimizadas)
  - `/favicon.ico`

---

#### Ventajas del Middleware:

| Aspecto              | Sin Middleware                 | Con Middleware           |
| -------------------- | ------------------------------ | ------------------------ |
| **Auth check**       | En cada página manualmente     | ✅ Una sola vez          |
| **Código duplicado** | ❌ Mucho                       | ✅ Centralizado          |
| **Performance**      | ⚠️ Verifica en cada componente | ✅ Una sola verificación |
| **Seguridad**        | ⚠️ Fácil olvidar proteger      | ✅ Protección automática |

---

#### Middleware vs Protección en página:

**❌ Sin middleware (manual en cada página):**

```tsx
// src/app/dashboard/employees/page.tsx
export default async function EmployeesPage() {
  const session = await auth();
  if (!session) redirect("/auth/login"); // Repetir en cada página

  // ...
}
```

**✅ Con middleware (automático):**

```tsx
// src/middleware.ts
if (!req.auth) return NextResponse.redirect("/auth/login");

// src/app/dashboard/employees/page.tsx
export default async function EmployeesPage() {
  // Ya está autenticado (garantizado)
  const employees = await prisma.employee.findMany();
  // ...
}
```

---

#### Estado actual en Timenow:

**Archivo:** `src/middleware.disabled.ts`

Está **deshabilitado** (por eso `.disabled.ts`), pero el código está listo:

```tsx
// Para habilitarlo: renombrar a middleware.ts
export default auth((req) => {
  // Lógica de autenticación
});
```

**¿Por qué deshabilitado?**

- Actualmente verificamos auth en cada página manualmente
- Middleware puede añadirse cuando escalemos

---

#### Resumen:

**Middleware = Interceptor que corre ANTES de la página**

- Corre en el servidor (edge runtime)
- Verifica auth, permisos, redirecciones
- Se ejecuta en TODAS las rutas que coincidan con `matcher`
- Similar a Filters/Interceptors de Spring

**Flujo:**

```
Request → Middleware → Página/API
```

---

## 17. Preguntas de Entrevista Técnica

### P: ¿Qué patrón arquitectónico has usado?

**R:** App Router de Next.js con patrón de **colocation** (componentes específicos junto a las rutas). Server Components por defecto, Client Components solo para interactividad.

---

### P: ¿Cómo manejas el estado?

**R:** Zustand para estado global (empleados, preferencias). Server Components para datos que vienen de BD. Client Components con useState/useForm para estado local de formularios.

---

### P: ¿Cómo implementaste la autenticación?

**R:** NextAuth v5 con estrategia JWT. Credentials provider con bcrypt para hashear contraseñas. Multi-tenancy con orgId en el token. Verificación en cada API route y página protegida.

---

### P: ¿Cómo gestionas la base de datos?

**R:** Prisma ORM con PostgreSQL. Migraciones incrementales (strategy ágil). Multi-tenancy con row-level separation (campo orgId en cada modelo). Prisma Client con type-safety completo.

---

### P: ¿Cómo validas los datos?

**R:** Zod para validación tanto en cliente como servidor. Schemas reutilizables. React Hook Form con zodResolver para formularios. Validación doble: frontend (UX) y backend (seguridad).

---

### P: ¿Qué patrón usas para las API?

**R:** REST con Next.js API Routes. Estructura por recurso (employees, contracts). Validación con Zod, autenticación con NextAuth, multi-tenancy con orgId en queries.

---

### P: ¿Cómo organizas los componentes?

**R:** Colocation pattern: componentes específicos en `_components/` dentro de cada ruta. Componentes compartidos en `src/components/`. shadcn/ui para UI (Radix + Tailwind). Componentes headless para máxima flexibilidad.

---

### P: ¿Server-Side o Client-Side Rendering?

**R:** Híbrido. Server Components para fetch de datos (SEO, performance). Client Components solo donde hay interactividad (formularios, modales). SSR por defecto para primera carga rápida.

---

### P: ¿Cómo manejas el CSS?

**R:** Tailwind CSS v4 con utility-first approach. CSS Variables con OKLCH para temas. Sistema de presets reutilizables (blue, brutalist, soft-pop). Dark mode con clase `.dark`.

---

### P: ¿Qué estrategia de deploy usas?

**R:** Vercel con deploy automático en cada push. Environment variables separadas por entorno. Turbopack para builds rápidos. Edge runtime para funciones críticas.

---

### P: ¿Cómo manejas el multi-tenancy?

**R:** Row-level separation. Cada modelo tiene campo orgId. Todas las queries filtran por orgId automáticamente. JWT incluye orgId del usuario. Aislamiento total de datos entre organizaciones.

---

### P: ¿Qué patrón sigues para las tablas?

**R:** TanStack Table headless. DataTable reutilizable. Columnas definidas con ColumnDef. Features: sorting, filtering, pagination, row selection. Responsive con container queries.

---

### P: ¿Cómo gestionas archivos?

**R:** Cloudflare R2 (S3-compatible). Upload con validación de tipo y tamaño. Storage abstraction para cambiar provider fácilmente. URLs firmadas para descargas seguras. Metadata en PostgreSQL.

---

### P: ¿Testing?

**R:** (Honesto) Aún no implementado, pero preparado para Jest + React Testing Library para componentes, y Playwright para E2E. Validación con Zod facilita tests de integración.

---

### P: ¿Manejo de errores?

**R:** Try-catch en API routes con respuestas consistentes. Error boundaries en React. Validación en múltiples capas (Zod, Prisma, custom). Mensajes de error user-friendly con sonner (toasts).

---

### P: ¿Optimizaciones de performance?

**R:** Server Components (menos JS al cliente). Code splitting automático con Next.js. Image optimization con next/image. Tree-shaking con Tailwind. Bundle analysis con @next/bundle-analyzer.

---

### P: ¿Seguridad?

**R:** Bcrypt para passwords (salt rounds 10). Secrets en variables de entorno (nunca en cliente). CSRF protection con NextAuth. SQL injection prevenido por Prisma. XSS prevenido por React (escape automático). Multi-tenancy con orgId obligatorio.

---

### P: ¿TypeScript, por qué?

**R:** Type safety en compile-time. Autocomplete/IntelliSense. Refactoring seguro. Prisma genera tipos automáticamente. Zod infiere tipos. Menos bugs en producción.

---

### P: ¿Por qué Next.js y no React puro?

**R:** SSR integrado (SEO). Routing basado en archivos (simple). API Routes (backend en mismo proyecto). Optimizaciones automáticas. Deploy optimizado en Vercel.

---

### P: ¿Qué mejorarías del proyecto?

**R:**

- Añadir tests (Jest + Playwright)
- Habilitar middleware para auth centralizada
- Implementar rate limiting
- Añadir React Query para cache
- Monitoring con Sentry
- Internacionalización completa (next-intl ya integrado)

---

### P: ¿Escalabilidad?

**R:**

- Multi-tenancy permite muchas orgs en mismo DB
- Prisma con connection pooling (PgBouncer ready)
- Edge functions para baja latencia
- Caching con React Query (preparado)
- CDN para assets estáticos (Vercel)
- Horizontal scaling con más instancias

---

### P: ¿Cómo manejas formularios complejos?

**R:** React Hook Form con Zod. Validación en tiempo real. defaultValues desde BD. Nested forms con dot notation. Reset/dirty state. Submission con loading states.

---

### P: ¿Convention over configuration?

**R:** Sí. File-based routing. Environment variables estándar. ESLint + Prettier con reglas estrictas. Estructura de carpetas clara. shadcn/ui con configuración mínima.

---

### P: ¿CI/CD?

**R:** GitHub + Vercel. Deploy automático en merge a main. Preview deployments en PRs. Husky + lint-staged para pre-commit hooks. ESLint bloquea commit si hay errores.

---

### P: ¿Versionado de API?

**R:** (Honesto) Actualmente v1 implícito. Preparado para `/api/v2/` cuando sea necesario. Prisma facilita migraciones sin breaking changes.

---

### P: ¿Logging y monitoring?

**R:** Console.log en desarrollo. Preparado para integrar Sentry (error tracking). Logs estructurados con metadata (userId, orgId). Next.js logging automático en producción.

---

### P: ¿Accesibilidad?

**R:** Radix UI (WAI-ARIA compliant). Semantic HTML. Keyboard navigation. Focus management. Screen reader friendly. Color contrast con OKLCH.

---

### P: ¿Mobile-first?

**R:** Responsive con Tailwind breakpoints. Container queries para componentes. Mobile-first CSS. Touch-friendly (botones 44px mínimo). Progressive Web App ready.

---

### P: ¿Qué aprendiste construyendo esto?

**R:**

- Server Components vs Client Components
- Prisma con multi-tenancy
- NextAuth v5 (beta)
- Tailwind v4 (nueva sintaxis)
- Type-safety end-to-end con TypeScript + Zod + Prisma
- Patrones de Next.js App Router
