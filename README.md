# Control Docente - Proyectos de Programación Web

Sistema web para la entrega, revisión y retroalimentación de proyectos de programación web de estudiantes.

## Estructura

```
control-docente/
├── src/
│   ├── estudiantes/
│   │   └── index.html
│   ├── docente/
│   │   └── index.html
│   └── shared/
├── docs/
│   └── schema-supabase.sql
├── tests/
│   └── manual-checklist.md
├── package.json
└── README.md
```

## Requisitos

- Navegador moderno (Chrome, Firefox, Edge)
- Cuenta de Supabase

## Configuración

1. Ejecuta el script SQL de `docs/schema-supabase.sql` en tu proyecto de Supabase.
2. Actualiza `SUPABASE_URL` y `SUPABASE_ANON_KEY` en ambos archivos HTML.
3. Abre `src/estudiantes/index.html` para el portal de estudiantes.
4. Abre `src/docente/index.html` para el panel docente.

## Scripts

```bash
npm start
npm test
```

## Notas

- El registro de estudiantes está protegido por código docente almacenado en Supabase.
- Las contraseñas se hashean con SHA-256 en el frontend.
- No uses este sistema en producción sin activar RLS en Supabase.
