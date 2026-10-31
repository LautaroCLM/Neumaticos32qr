# Guía de Despliegue a Producción y Manual Operativo — Neumáticos el 32

Este documento contiene las instrucciones exhaustivas para el despliegue a producción de la plataforma **Neumáticos el 32**, el checklist de verificación previo a la puesta en marcha, el manual de uso diario para el personal del taller y las políticas de respaldo y mantenimiento en el plan gratuito de Supabase.

---

## 📑 Tabla de Contenidos
1. [Despliegue de Base de Datos en Supabase](#1-despliegue-de-base-de-datos-en-supabase)
2. [Despliegue de la Aplicación en Vercel](#2-despliegue-de-la-aplicación-en-vercel)
3. [Checklist de Salida a Producción (Pre-Go-Live)](#3-checklist-de-salida-a-producción-pre-go-live)
4. [Manual de Operación para el Taller](#4-manual-de-operación-para-el-taller)
5. [Políticas de Respaldo y Mitigación de Pausa en Free-Tier](#5-políticas-de-respaldo-y-mitigación-de-pausa-en-free-tier)

---

## 1. Despliegue de Base de Datos en Supabase

### 1.1. Vinculación del Proyecto con Supabase CLI
Instalá la CLI de Supabase si aún no la tenés e iniciá sesión con tu cuenta:
```bash
npx supabase login
```
Vinculá el repositorio local al proyecto remoto de producción utilizando su Reference ID (ubicado en General Settings de Supabase):
```bash
npx supabase link --project-ref <tu-project-ref>
```

### 1.2. Activación de Extensiones y Aplicación de Migraciones
1. **Activar pg_cron en el Dashboard de Supabase:**
   - Antes de empujar las migraciones, ingresá a Supabase Dashboard -> **Database** -> **Extensions**.
   - Buscá `pg_cron` y asegurate de activarla (toggle en ON).
   - *Nota:* Si tu proyecto aún no la tiene activa, la migración de cron está diseñada con detección tolerante (`DO $$ ... $$`) para continuar sin romper el despliegue.

2. **Empujar Migraciones:**
Empujá todas las migraciones de forma atómica y ordenada a la base remota:
```bash
npx supabase db push
```
Esto aplicará en orden:
1. `20261028000000_init_schema.sql` (tablas centrales, RLS, triggers de cálculo y rate limiting).
2. `20261028000001_ticket_customization.sql` (plantillas, auditoría inmutable `service_revisions`, purga estricta en servidor).
3. `20261030000000_rate_limit_cleanup_cron.sql` (programación horaria de limpieza con `pg_cron`).
4. `20261030000001_differentiate_token_error.sql` (diferenciación clara de token revocado vs inexistente).
5. `20261031000000_vehicle_hide_prices_inherit.sql` (los vehículos heredan del taller la opción de ocultar precios).
6. `20261031000001_customers_and_owners.sql` (clientes y propietarios de cada vehículo).
7. `20261031000002_ticket_number_and_public_access.sql` (número de ticket y acceso público por patente y teléfono).
8. `20261031000003_security_hardening.sql` (permisos explícitos sobre tablas y funciones).

### 1.3. Carga del Bootstrap de Producción (¡NO usar `seed.sql`!)
> [!CAUTION]
> **NUNCA ejecutes `seed.sql` en producción.**
> `seed.sql` contiene vehículos de juguete, patentes inventadas y fuerza tokens fijos de prueba que deshabilitan la seguridad criptográfica.

Para producción, utilizá **exclusivamente** el archivo:
```
supabase/production-bootstrap.sql
```
Corrélo desde el **SQL Editor** del dashboard de Supabase. No pisa datos ni duplica plantillas si se ejecuta dos veces.
Este script inicializa:
- El registro principal del taller (con ID `00000000-0000-0000-0000-000000000001`).
- Las 5 plantillas oficiales de trabajo de gomería (Neumáticos Nuevos, Alineación y Balanceo 3D, Frenos Delanteros, etc.).
- Cero vehículos, cero servicios ficticios y cero usuarios demo.

### 1.4. Configuración de Seguridad en el Dashboard de Supabase
1. **Deshabilitar Signups Públicos:**
   - Navegá a **Authentication** -> **Sign In / Providers** -> **User Signups**.
   - **Desactivá** `Allow new users to sign up`. De esta forma, ningún usuario externo podrá auto-registrarse en el sistema.
   - **No desactives el proveedor Email:** si se apaga, el personal tampoco puede iniciar sesión.
2. **Crear el Primer Usuario Administrador:**
   - En **Authentication** -> **Users**, hacé clic en **Add User** -> **Create User**.
   - Ingresá el correo del dueño o encargado del taller y una contraseña robusta (mínimo 12 caracteres, mayúsculas, números y símbolos).
   - Marcá la opción `Auto Confirm User?` para que no requiera verificación por correo.
   - Copiá el `User UID` (UUID) generado por Supabase.
   - Dirigite a **SQL Editor** y ejecutá el siguiente comando reemplazando `<USER_UID>`:
```sql
INSERT INTO public.staff_users (id, shop_id, nombre, rol, is_active)
VALUES (
    '<USER_UID>',
    '00000000-0000-0000-0000-000000000001',
    'Administrador General',
    'admin',
    TRUE
)
ON CONFLICT (id) DO UPDATE 
SET rol = 'admin', is_active = TRUE;
```

---

## 2. Despliegue de la Aplicación en Vercel

### 2.1. Creación del Proyecto
1. Ingresá a [Vercel](https://vercel.com/) y hacé clic en **Add New...** -> **Project**.
2. Conectá el repositorio Git donde subiste el código.
3. El framework detectado debe ser **Next.js**.
4. En **Settings** -> **Functions**, elegí la región **São Paulo (`gru1`)**, la misma de la base de datos.
5. Como rama de producción, elegí `master`.

### 2.2. Configuración de Variables de Entorno (Environment Variables)
Configurá las siguientes variables obligatorias para los entornos **Production** y **Preview**:

| Variable | Origen / Dónde obtenerla | Descripción |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard -> Project Settings -> API | URL base del proyecto (ej. `https://xxxxxx.supabase.co`). Debe comenzar con `https://`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard -> Project Settings -> API | Llave pública anónima (`anon` `public`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard -> Project Settings -> API | Llave maestra de servidor (`service_role`). **Nunca exponer en variables con prefijo NEXT_PUBLIC**. |
| `NEXT_PUBLIC_SITE_URL` | Dominio final de la aplicación | **Crítico:** La URL pública canónica con HTTPS (ej. `https://neumaticos32.com.ar` o `https://neumaticos-el-32.vercel.app`). De esta variable se generan los enlaces impresos en los stickers QR. |

> [!WARNING]
> La validación de entorno (`lib/env.ts`) abortará inmediatamente el arranque del servidor si `NEXT_PUBLIC_SITE_URL` contiene `localhost` o no utiliza protocolo seguro `https://` en entorno de producción.

### 2.3. Configuración de Dominio Propio
1. En el proyecto de Vercel, andá a **Settings** -> **Domains**.
2. Agregá tu dominio registrado (ej. `neumaticos32.com.ar` o `www.neumaticos32.com.ar`).
3. Configurá los registros DNS correspondientes en tu registrador (NIC Argentina / Cloudflare):
   - Registro `A` apuntando a `76.76.21.21` (para la raíz).
   - Registro `CNAME` apuntando a `cname.vercel-dns.com` (para subdominios como `www`).
4. Vercel emitirá automáticamente el certificado SSL Let's Encrypt en minutos.

---

## 3. Checklist de Salida a Producción (Pre-Go-Live)

Completá cada uno de estos ítems antes de imprimir los primeros stickers en el taller:

- [ ] **Base de datos limpia:** Verificado que `vehicles` y `services` no tienen filas ficticias de prueba.
- [ ] **Bootstrap aplicado:** `shops` contiene el registro con id `00000000-0000-0000-0000-000000000001` y `service_templates` tiene las 5 plantillas base.
- [ ] **Auth protegido:** `Allow new users to sign up` apagado y proveedor Email encendido en Supabase Auth.
- [ ] **Admin inicial asignado:** El usuario de login tiene su fila en `staff_users` con `rol = 'admin'` y `is_active = TRUE`.
- [ ] **Dominio y SSL:** Vercel muestra estado **Ready** con HTTPS activo en el dominio canónico.
- [ ] **Cabeceras de seguridad:** Comprobado que `curl -I https://<tu-dominio>/v/<token>` responde:
  - `Cache-Control: no-store`
  - `X-Robots-Tag: noindex, nofollow`
  - `Referrer-Policy: no-referrer`
- [ ] **robots.txt activo:** `https://<tu-dominio>/robots.txt` prohíbe explícitamente el indexado de `/admin/`, `/api/` y `/v/`.
- [ ] **Prueba de acceso público:** Probar una patente no registrada y verificar que responde `"Los datos no coinciden con ningún vehículo registrado."` sin arrojar errores 500 ni exponer datos. Probar una registrada con los últimos 4 dígitos del propietario y verificar que abre el historial.
- [ ] **Prueba de login de operario:** Crear un operario desde Supabase (Auth + `staff_users`, igual que el administrador), iniciar sesión, y confirmar que al entrar a `/admin/settings` es redirigido inmediatamente a `/admin/dashboard`.
- [ ] **Prueba de sticker QR con celular real:** Crear un vehículo de prueba, abrir el modal de sticker, escanear el QR con la cámara del celular y comprobar que carga en menos de 3 segundos en red 4G. (Luego anular el servicio de prueba).

---

## 4. Manual de Operación para el Taller

### 4.1. Ingreso de un Vehículo por Primera Vez
1. Abrí el panel del taller en el celular o tablet (`/admin/dashboard`).
2. Tocá el botón rojo **"Alta de Vehículo"**.
3. Completá:
   - **Patente:** Formato nuevo (`AA 123 BB`) o antiguo (`ABC 123`).
   - **Marca y Modelo:** Ej. `Toyota Hilux`.
   - **Año:** Ej. `2023` (opcional).
   - **Nombre y teléfono del cliente:** Si el teléfono ya está cargado, el vehículo se asocia a ese cliente. Con sus últimos 4 dígitos, el cliente puede ver su historial desde la web sin el sticker.
4. Tocá **"Registrar Vehículo"**. El sistema generará automáticamente un código QR único y seguro.
5. Desde la ficha del vehículo, tocá **"Enviar Historial por WhatsApp"** para mandarle el enlace al cliente.

### 4.2. Impresión y Colocación del Sticker
1. En la ficha del vehículo, tocá **"Imprimir Sticker"**.
2. Aparecerá la ventana con el sticker en tamaño normalizado (apto para hojas autoadhesivas de etiquetas o impresora térmica):
   - El sticker incluye el logo del taller, la patente bien visible, el QR de escaneo y el aviso para el conductor.
3. Imprimilo y pegalo en el **marco de la puerta del conductor**, donde solo se ve con la puerta abierta.
   - **Nunca en el parabrisas ni en otro vidrio:** quien escanee el QR ve precios, kilometraje y todo el historial, y desde afuera lo podría hacer cualquiera.
4. Explicale al cliente: *"Cada vez que quieras ver qué cubiertas te pusimos, la fecha de rotación o cuándo te toca el próximo control, abrí la puerta y apuntá la cámara de tu celular al sticker"*.
5. **Si el vehículo cambia de dueño**, seguí los pasos de la sección 4.5 para que el nuevo dueño no vea lo que pagó el anterior.

### 4.3. Carga de un Nuevo Servicio (Menos de 1 minuto)
1. Escaneá el sticker del auto o buscalo en `/admin/vehicles` por patente.
2. Tocá **"Nuevo Servicio"**.
3. **Usá una Plantilla:** Seleccioná una plantilla rápida (ej. *"Cambio de Neumáticos"*) para autocompletar conceptos.
4. Ingresá:
   - **Kilometraje actual** del tablero.
   - Cantidad y precio de las cubiertas o trabajos.
   - **Próximo Control Recomendado:** Kilometraje (ej. sumar 10.000 km) o fecha sugerida.
   - **Notas al Cliente:** Mensajes que verá el dueño (ej. *"Revisar presión en frío a las 30 libras"*).
   - **Notas Internas:** Datos confidenciales del taller que **NUNCA** saldrán del panel (ej. *"Llanta delantera derecha con pequeño golpe, cliente avisado"*).
5. Revisá la vista previa en vivo y tocá **"Registrar Servicio"**.

### 4.4. ¿Qué hacer si un dato quedó mal cargado?
- **Correcciones menores (km, tipografía, precio):**
  - Entrá a la ficha del vehículo, tocá el ícono del lápiz (`Editar`).
  - Corregí el dato e indicá el motivo de la modificación (ej. *"Corrección de kilometraje por error de tipeo"*).
  - Tocá **"Guardar Cambios"**. La base de datos mantendrá una auditoría inmutable de la versión previa para tranquilidad contable.
- **Anulaciones (Servicio duplicado o factura cancelada):**
  - Solo un usuario con rol de **Administrador** puede anular servicios.
  - Al editar el servicio, tocá el botón rojo **"Anular Servicio"** e ingresá la justificación.
  - El registro quedará archivado y desaparecerá automáticamente de la vista pública del cliente.

### 4.5. ¿Qué hacer si el cliente perdió el sticker o el vehículo cambió de dueño?
**Si cambió de dueño:** en la ficha del vehículo, tocá **"Cambiar Propietario"**, elegí o cargá al nuevo dueño e indicá **"El vehículo cambió de dueño"**. El QR se regenera solo y el nuevo dueño ve el historial técnico, sin los precios ni las notas de los trabajos anteriores. Imprimí el nuevo sticker. Si el propietario solo estaba mal cargado, indicá **"Estaba mal cargado"**: el QR no cambia.

**Si perdió el sticker:**
1. Buscá el auto por patente en `/admin/vehicles`.
2. Entrá a su ficha y seleccioná **"Regenerar QR"**.
3. Al confirmar:
   - El enlace viejo queda **invalidado de inmediato**. Si alguien intenta escanear el sticker viejo, la web le informará *"Enlace Inexistente"* y no mostrará ningún dato del vehículo.
   - Se crea un nuevo código QR seguro.
4. Imprimí el nuevo sticker y entregáselo al cliente.

---

## 5. Políticas de Respaldo y Mitigación de Pausa en Free-Tier

### 5.1. Mitigación de la Pausa por Inactividad en Supabase Free-Tier
Los proyectos gratuitos de Supabase que no reciben tráfico durante 7 días entran en estado de pausa automática (*"Paused Project"*). Para evitar que esto ocurra durante períodos de vacaciones o baja actividad:

#### Opción A (Recomendada): Tarea Cron Externa Gratuita
Configurá un ping HTTP semanal utilizando cualquier servicio gratuito de monitoreo (como [Cron-Job.org](https://cron-job.org/), [UptimeRobot](https://uptimerobot.com/) o [Better Stack](https://betterstack.com/)):
- **URL a monitorear:** `https://<tu-app-en-vercel>/api/health`
- **Frecuencia:** Cada 3 días (o cada lunes a las 09:00 hs).
- Esta petición GET invoca `/api/health`, que realiza una verificación trivial en la base de datos de Supabase sin registrar intentos de rate limit ni exponer datos del taller, garantizando que el proyecto permanezca siempre 100% activo.

#### Opción B: Script en GitHub Actions
Podés crear un flujo programado en `.github/workflows/keep-alive.yml`:
```yaml
name: Supabase Keep-Alive
on:
  schedule:
    - cron: '0 12 */4 * *' # Cada 4 días a las 12:00 UTC
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Health Endpoint
        run: curl -sSf "https://${{ secrets.PROD_SITE_URL }}/api/health" > /dev/null
```

### 5.2. Políticas de Copias de Respaldo (Backups)
1. **Backups Diarios de Supabase:** En el plan gratuito, Supabase realiza respaldos lógicos diarios accesibles desde **Database** -> **Backups**.
2. **Copia de Respaldo Local Manual (Recomendado quincenalmente):**
   Podés descargar un volcado completo de la estructura y datos de producción a tu computadora:
```bash
npx supabase db dump --linked --data-only -f backup-datos-$(date +%Y%m%d).sql
```
   Guardá este archivo `.sql` en una carpeta segura fuera de servidores web. Contiene el historial completo de vehículos y servicios del taller.
