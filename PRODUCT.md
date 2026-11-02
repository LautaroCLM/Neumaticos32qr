# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Clientes del taller:** dueños de autos y camionetas atendidos en Neumáticos el 32. Consultan el historial de su vehículo desde el celular, casi siempre escaneando el sticker QR pegado en el marco de la puerta, sin crear cuenta.
- **Dueño del taller (Leandro):** único administrador. Carga vehículos, clientes y servicios, configura el taller e imprime stickers. Usa el panel desde el celular en el taller y desde la computadora en el mostrador.
- **Operario (opcional):** rol con permisos reducidos, sin uso confirmado hoy.

## Product Purpose

Darle a cada vehículo atendido un historial digital propio: el último servicio y todos los anteriores, con fecha, hora, trabajo realizado, ítems, precio, kilometraje y próximo control recomendado. El éxito es que el cliente sepa qué se le hizo a su auto y cuánto pagó, y vuelva al taller cuando toca el próximo control.

## Positioning

El historial pertenece al vehículo, no al cliente: cada auto tiene un QR único e impredecible que abre su ticket sin registro. Es una herramienta propia de un solo taller, no una plataforma para varios.

## Operating Context

- El cliente abre el ticket con la cámara del celular, muchas veces en la calle o en el taller.
- Sin el QR, puede abrirlo desde la web con la patente y los últimos 4 dígitos del teléfono que dejó en el taller.
- Leandro carga cada servicio al terminar el trabajo, con plantillas para los trabajos frecuentes.
- Los stickers se imprimen desde el panel en formato de 70 × 55 mm.

## Capabilities and Constraints

- Next.js 15, React 19, Tailwind CSS 4 y Supabase; publicado en `https://neumaticos32.vercel.app` (dominio definitivo, sin dominio propio previsto).
- Tipos de servicio: neumáticos, alineación y balanceo, aceite y filtros, frenos, suspensión, mecánica general y otro.
- Privacidad: el taller puede ocultar precios, kilometraje, productos, sucursal, notas y campos extra por ticket o por vehículo. Tras un cambio de dueño, el nuevo dueño no ve precios ni notas anteriores.
- Las notas internas nunca se muestran al cliente.
- Moneda en pesos argentinos y fechas en hora de Buenos Aires.
- Patentes argentinas en formato Mercosur (`AA 123 BB`) y tradicional (`ABC 123`).
- El rediseño no debe cambiar la lógica del backend, las consultas, las APIs ni las validaciones, ni quitar funcionalidades.

## Brand Commitments

- Nombre: **Neumáticos el 32**.
- Logo existente en `public/logo.png` y `public/logo.webp` (640 × 640, con transparencia): rueda con llamas rojas, "NEUMATICOS" en plateado y "EL 32" en rojo. No se modifica.
- Identidad visual confirmada por el dueño del proyecto: negro como color principal, rojo como acento, blanco y grises para textos y superficies. Rojo de marca actual: `#D31A24`.
- Voz: español rioplatense, tuteo con voseo ("ingresá", "consultá").

## Evidence on Hand

- Logo en `public/` e `IMG/logo.png`.
- No hay fotos propias del taller ni de trabajos realizados. Se autorizó usar fotos de stock con licencia libre; no deben presentarse como fotos del local ni de clientes.
- No hay testimonios, reseñas, cifras ni clientes de referencia: no inventarlos.

## Product Principles

1. El cliente tiene que entender su ticket en segundos, desde el celular y sin explicaciones.
2. La privacidad del cliente pesa más que mostrar datos: lo oculto no se insinúa.
3. Cargar un servicio debe ser rápido para quien está trabajando en el taller.
4. Cada historial es de un vehículo y no se mezcla con otros.

## Accessibility & Inclusion

Contraste legible bajo luz exterior en celulares, objetivos táctiles de al menos 44 px y respeto por `prefers-reduced-motion`. No hay un estándar formal exigido más allá de WCAG 2.1 AA como referencia.
