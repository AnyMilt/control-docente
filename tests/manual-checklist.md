# Checklist de Pruebas Manuales

## Portal del Estudiante (`src/estudiantes/index.html`)

### Registro
- [ ] Abrir portal como estudiante nuevo
- [ ] Completar formulario con cédula, apellidos, nombres, paralelo, contraseña y código docente
- [ ] Verificar que aparece el mensaje de éxito y redirige al login
- [ ] Verificar que la tabla `alumnos` tiene el nuevo registro

### Login
- [ ] Ingresar con cédula y contraseña correctas
- [ ] Verificar que accede al entorno de trabajo
- [ ] Ingresar con cédula y contraseña incorrectas
- [ ] Verificar que aparece el mensaje de error

### Editor y Visor
- [ ] Cambiar entre pestañas HTML, CSS, JS y Vista Ejecución
- [ ] Escribir código en HTML y ver que se renderiza en la vista de ejecución
- [ ] Escribir código en CSS y ver que se aplica en la vista de ejecución
- [ ] Escribir código en JS y ver que se ejecuta en la vista de ejecución

### Proyectos
- [ ] Crear nuevo proyecto
- [ ] Si hay código en el editor, verificar que pide confirmación antes de descartar
- [ ] Guardar proyecto y verificar toast de éxito
- [ ] Verificar que el proyecto aparece en el selector del header
- [ ] Recargar la página y verificar que el proyecto sigue cargado
- [ ] Editar un proyecto existente y guardar cambios
- [ ] Verificar sincronización automática cuando el docente revisa el proyecto

### Seguridad
- [ ] Cerrar sesión y verificar que regresa al login
- [ ] Cambiar contraseña desde el modal
- [ ] Ingresar con la nueva contraseña

## Panel Docente (`src/docente/index.html`)

### Login Docente
- [ ] Ingresar con clave docente correcta
- [ ] Ingresar con clave docente incorrecta
- [ ] Verificar que se oculta el modal de login

### Gestión de Estudiantes
- [ ] Verificar que aparece la lista de estudiantes del paralelo
- [ ] Crear un estudiante nuevo desde el formulario
- [ ] Editar un estudiante existente
- [ ] Cancelar edición y verificar que se oculta el formulario
- [ ] Eliminar un estudiante y confirmar la acción
- [ ] Resetear contraseña de un estudiante y verificar que se establece en `123456`

### Revisión de Proyectos
- [ ] Seleccionar un estudiante y ver sus entregas
- [ ] Seleccionar un proyecto y ver el código en las pestañas
- [ ] Cambiar a la pestaña Vista Ejecución y ver el resultado
- [ ] Escribir observaciones en el panel de retroalimentación
- [ ] Aprobar proyecto (estado REVISADO)
- [ ] Devolver proyecto para corrección (estado POR REVISAR)
- [ ] Verificar que el estudiante ve la actualización sin recargar

### Análisis de Sintaxis
- [ ] Seleccionar un proyecto con errores HTML/CSS/JS
- [ ] Hacer clic en Analizar Sintaxis
- [ ] Verificar que muestra los errores detectados
- [ ] Verificar que genera retroalimentación automática

### Tiempo Real
- [ ] Registrar un nuevo estudiante desde el portal
- [ ] Verificar que el docente recibe toast y resalta header
- [ ] Enviar un proyecto desde el portal del estudiante
- [ ] Verificar que el docente ve la actualización sin recargar

## Base de Datos
- [ ] Verificar que las tablas `alumnos`, `entregas_tareas` y `configuracion` existen
- [ ] Verificar columnas y tipos de datos en Supabase
- [ ] Verificar que RLS está desactivado (para este proyecto)
