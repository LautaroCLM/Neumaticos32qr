# Neumáticos el 32 — Sistema de Historial Vehicular y Tickets QR

Aplicación web mobile-first instalable como PWA para taller/gomería "Neumáticos el 32".
Permite a los clientes consultar su historial de servicios escaneando un código QR pegado en el marco de la puerta de su vehículo o mediante búsqueda rápida por patente con protección de privacidad. Cuenta con un panel privado para operarios y administradores del taller.

---

## 🔒 Reglas de Seguridad y Privacidad

1. **Aislamiento Total entre Clientes:**
   - El acceso completo al ticket e historial se realiza mediante un `public_token` criptográfico de 48 caracteres hexadecimales no predecible ni enumerable.
   - Dos vehículos distintos jamás comparten datos ni historiales.
2. **Acceso desde la Web por Patente y Teléfono:**
   - La página principal pide la patente y los últimos 4 dígitos del teléfono del propietario actual. Si coinciden, abre el historial; si no, responde lo mismo exista o no la patente.
   - No muestra ningún dato del vehículo antes de validar.
   - Ejecución restringida exclusivamente a nivel de servidor (`service_role` en `/api/vehicle-access`), con la IP extraída de las cabeceras `x-forwarded-for` / `x-real-ip`.
   - **Rate Limiting:** Bloqueo tras 20 solicitudes/minuto por IP, y por patente tras 5 fallos en 15 minutos o 20 en 24 horas.
   - **Cambio de Dueño:** El historial pertenece al vehículo. Al registrar un cambio de dueño se regenera el QR y los tickets anteriores dejan de mostrar precios y notas.
3. **Control de Precios y Purga en Servidor:**
   - Configurable a nivel de taller o por vehículo individual (`ocultar_precios`).
   - Los campos desmarcados por visibilidad (`mostrar_km`, `mostrar_precio`, etc.) **se purgan directamente en la función SQL en el servidor**, de modo que jamás viajan en el JSON devuelto.
4. **Protección de Datos Internos y Auditoría Inmutable:**
   - `notas_internas`: solo visibles en el panel del taller, jamás se envían a la vista pública.
   - `service_revisions`: tabla inmutable protegida por un trigger que prohíbe `UPDATE` y `DELETE`.
   - `services`: RLS prohíbe `UPDATE` directo a todo el personal. Cualquier edición o anulación pasa por `update_service_with_audit`.
   - `anon` no tiene ningún permiso sobre las tablas: solo puede ejecutar `get_vehicle_by_token` y `get_public_shop`.

---

## ⚠️ Advertencia Crítica sobre `seed.sql` y Tokens de Demostración

> [!CAUTION]
> **El archivo `supabase/seed.sql` y los tokens fijados en él son EXCLUSIVAMENTE para entornos de desarrollo y demostración local.**
> **BAJO NINGUNA CIRCUNSTANCIA DEBE EJECUTARSE EN PRODUCCIÓN.** Todos los datos (patentes, teléfonos, dirección y sucursales) son ficticios y de ejemplo.
> Los tokens demo (`demo-token-amarok-ae123cd-el32` y `demo-token-hilux-ac456xy-el32`) fijados mediante `set_config('app.allow_token_mutation', 'on', true)` existen únicamente para facilitar las pruebas manuales locales de los enlaces `/v/{token}`. En producción, cada vehículo recibe un token criptográfico impredecible de 48 caracteres hexadecimales generado automáticamente por el trigger `BEFORE INSERT` con `encode(extensions.gen_random_bytes(24), 'hex')`.

---

## 🚀 Puesta en Marcha y Configuración Inicial

### 1. Variables de Entorno
Crear un archivo `.env.local` basado en `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key> # SOLO en servidor, jamás en cliente
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Aplicar Migraciones en Supabase
En el panel de Supabase (**SQL Editor**) o mediante el Supabase CLI (`supabase db push`), ejecutar en orden:
1. `supabase/migrations/20261028000000_init_schema.sql` (Esquema base, RLS, tablas principales)
2. `supabase/migrations/20261028000001_ticket_customization.sql` (Plantillas, auditoría, visibilidad y purga de campos)
3. `supabase/migrations/20261030000000_rate_limit_cleanup_cron.sql` (Limpieza horaria de intentos de búsqueda)
4. `supabase/migrations/20261030000001_differentiate_token_error.sql` (Diferencia token revocado de inexistente)
5. `supabase/migrations/20261031000000_vehicle_hide_prices_inherit.sql` (Los vehículos heredan del taller la opción de ocultar precios)
6. `supabase/migrations/20261031000001_customers_and_owners.sql` (Clientes y propietarios de cada vehículo)
7. `supabase/migrations/20261031000002_ticket_number_and_public_access.sql` (Número de ticket y acceso público)
8. `supabase/migrations/20261031000003_security_hardening.sql` (Permisos explícitos)

### 3. Deshabilitar Registro Público en Supabase Auth
Por seguridad, el registro libre de usuarios debe estar deshabilitado:
1. Ir a Supabase Dashboard -> **Authentication** -> **Sign In / Providers** -> **User Signups**.
2. Desactivar **"Allow new users to sign up"**.
3. **No desactivar el proveedor Email:** si se apaga, el personal tampoco puede iniciar sesión.
4. Guardar cambios.

### 4. Crear el Primer Usuario Administrador
Para dar de alta el primer administrador del taller:
1. Ir a Supabase Dashboard -> **Authentication** -> **Users** -> **"Add user"** (Crear usuario con email y contraseña).
2. Copiar el `User UID` generado.
3. Ir al **SQL Editor** y ejecutar:
```sql
-- Reemplazar '<USER_UID_AQUI>' por el UID copiado de Auth
-- Reemplazar el shop_id si creaste uno propio (por defecto '00000000-0000-0000-0000-000000000001')
INSERT INTO public.staff_users (id, shop_id, nombre, rol, is_active)
VALUES (
    '<USER_UID_AQUI>',
    '00000000-0000-0000-0000-000000000001',
    'Administrador Principal',
    'admin',
    TRUE
);
```

### 5. Ejecución en Desarrollo
```bash
npm install
npm run dev
```

---

## 🧪 Pruebas Automatizadas

```bash
# 1. Pruebas Unitarias Locales (Formatos de patentes argentinas, moneda ARS, Timezone BA)
npx tsx test/unit-test.ts

# 2. Pruebas de Reglas de Negocio en Memoria (Purga de campos, validaciones Zod)
npx tsx test/ticket-customization.test.ts

# 3. Pruebas contra Base de Datos Real (PostgreSQL / Supabase en Vivo)
# Requiere base de datos activa y migraciones aplicadas:
npx tsx test/real-db-tests.ts

# 4. Pruebas de Acceso por Patente, Rate Limiting, Propietarios y Privacidad
npx tsx test/vehicle-access-api.test.ts

# 5. Pruebas del Panel del Taller y Roles (Admin vs Operario, auditoría)
npx tsx test/admin-panel.test.ts

# 6. Pruebas End-to-End Completas con Playwright (Flujo Cliente, Taller, Roles y Enlaces)
npx playwright test
```

---

## 📖 Despliegue a Producción y Manual Operativo

Para la guía paso a paso de salida a producción (Supabase + Vercel), checklist de pre-lanzamiento, manual de uso para operarios y mitigación de pausas en free-tier, consultá:
👉 **[DEPLOYMENT.md](DEPLOYMENT.md)**

