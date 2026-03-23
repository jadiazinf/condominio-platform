---
name: roadmap
description: 'Skill de planificación del proyecto. Invócala con /roadmap para revisar el estado actual del desarrollo, ver qué fases están completadas, qué está en progreso, y qué sigue. Útil para retomar el trabajo entre sesiones. Acepta argumentos opcionales: "status" (resumen), "next" (siguiente tarea), "log" (registrar progreso), "phase N" (detalle de fase).'
---

# Roadmap y Planificación de la Plataforma

Esta skill gestiona el ciclo de planificación y seguimiento del desarrollo de la plataforma Latorre.

---

## Instrucciones

Al invocar esta skill, SIEMPRE lee primero el documento maestro de planificación:

```
Leer: ~/.claude/projects/-home-jesusdicen-proyects-latorre-platform/memory/platform-roadmap.md
```

Luego actúa según el argumento recibido:

### `/roadmap` o `/roadmap status`

1. Lee el roadmap completo
2. Muestra un resumen ejecutivo:
   - Fase actual y porcentaje de avance
   - Último log de progreso (fecha y resumen)
   - Top 3 tareas pendientes inmediatas
   - Bloqueadores si los hay
3. Formato: tabla concisa, no más de 20 líneas

### `/roadmap next`

1. Lee el roadmap
2. Identifica la siguiente tarea no completada de la fase actual
3. Explica qué hay que hacer, qué archivos tocar, y cómo empezar
4. Si la fase actual está completa, sugiere comenzar la siguiente fase
5. Pregunta al usuario si quiere proceder

### `/roadmap log`

1. Pide al usuario (o infiere del contexto) qué se hizo en esta sesión
2. Agrega una entrada al log de progreso en el roadmap con:
   - Fecha actual
   - Qué se completó (marcar checkboxes)
   - Qué quedó pendiente
   - Contexto relevante para la próxima sesión
3. Guarda el archivo actualizado

### `/roadmap phase <N>`

1. Muestra el detalle completo de la fase N
2. Estado de cada tarea (completada/pendiente)
3. Dependencias con otras fases
4. Estimación de esfuerzo

### `/roadmap add <descripción>`

1. Analiza la descripción del feature o tarea
2. Sugiere en qué fase encaja
3. Con confirmación del usuario, agrega al roadmap en la fase correcta
4. Actualiza el documento

---

## Reglas

- **Nunca inventes progreso.** Si no hay evidencia en el código de que algo está hecho, no lo marques como completado.
- **Verifica antes de marcar.** Para marcar una tarea como completada, verifica que el archivo/servicio/endpoint realmente existe en el codebase.
- **Mantén el log limpio.** Cada entrada del log debe ser autocontenida — alguien que lea solo esa entrada debe entender qué pasó.
- **Respeta las fases.** No sugieran saltar fases a menos que el usuario lo pida explícitamente.
- **Actualiza el roadmap** cada vez que se complete una tarea significativa durante la sesión de trabajo.

---

## Contexto del Proyecto

La plataforma es un SaaS de administración de condominios para el mercado venezolano/LATAM:

- **Stack**: Bun, Hono, Drizzle, PostgreSQL, Next.js, HeroUI
- **Monorepo**: apps/api, apps/web, packages/\*
- **Target**: Administradoras de condominios que gestionan múltiples propiedades
- **Contexto VE**: Multi-moneda (USD/VES), pago móvil, Zelle, alta inflación
- **Diferenciador buscado**: Automatización del ciclo financiero completo (presupuesto → cuota → recibo → cobro → conciliación → reportes)

El roadmap tiene 8 fases (0-7), desde estabilización hasta features diferenciadores. El documento maestro está en la memoria del proyecto y se actualiza sesión a sesión.
