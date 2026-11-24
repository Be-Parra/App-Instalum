# SGRH Instalum · Prototipo funcional (Grupo 1)

Prototipo funcional del Sistema de Gestión de Recursos Humanos de Instalum.
Ingeniería de Requisitos (RQY1101) · Duoc UC
Product Owner: Carolina Vial Martín · Scrum Master: Benjamín Parra
Development Team: David Martínez, Rafael Cornejo y Benjamín Rojas.

Cubre las **51 historias de usuario** del Product Backlog: Seguridad (RF-SEG-01 a 05), Contrataciones (RF-CON-01 a 11), Capacitaciones (RF-CAP-01 a 17), Bonificaciones (RF-BON-01 a 13) y Reportes (RF-REP-01 a 05). En el sistema, el menú **Ayuda → Trazabilidad de requisitos** indica en qué pantalla se prueba cada historia.

## Cómo usarlo
Abra `index.html` en el navegador o entre al enlace de GitHub Pages. No requiere instalación ni servidor.

### Cómo encontrar cada función
- La pantalla **Inicio** tiene el buscador **«¿Qué necesita hacer?»**: escriba con sus palabras (por ejemplo «asignar capacitación», «prueba», «nueva ficha», «pago») y elija la función. Desde cualquier pantalla se abre el mismo buscador con **Ctrl + K** o con el botón de la barra superior.
- Debajo hay **tarjetas por módulo** con las acciones más usadas y una explicación breve, y la lista de **tareas pendientes** (un clic lleva a resolverlas).
- El botón **Inicio** de la barra de herramientas siempre vuelve a esta pantalla.

### Capacitaciones: asignar y evaluar
- **Asignar capacitación a un trabajador**: se elige el trabajador (se ven las capacitaciones que ya tiene, sus notas y certificaciones), el **área** en que se quiere capacitar y la capacitación. Se indica si rinde **prueba** y la nota mínima para aprobar (por defecto 4,0). También se llega desde la ficha del trabajador › Capacitaciones › **Añadir capacitación**.
- **Asignación masiva**: se marcan una o varias capacitaciones y un grupo de trabajadores (filtrando por departamento, especialidad o cargo) y se asignan en un solo paso. Al final se informa quién quedó asignado y quién no, con el motivo.
- **Registrar asistencia y notas**: al terminar la sesión se marca la asistencia y se ingresa la nota de la prueba (1,0 a 7,0). Con la nota mínima o más el trabajador queda **Aprobado** y recibe su certificación.

### Usuarios de prueba
| Perfil | Usuario | Contraseña |
|---|---|---|
| Jefe de Recursos Humanos (acceso total) | **User_Prueba** | **12344** |
| Colaborador de Contrataciones | prios | Contrata2026 |
| Colaborador de Capacitaciones | cvaldes | Capacita2026 |
| Colaborador de Bonificación | brojas | Bonifica2026 |
| Gerente y Subgerente (consulta y reportes) | gerencia | Gerencia2026 |
| Cuenta bloqueada (para probar el restablecimiento) | jmora | correo jose.mora@instalum.cl |
| Cuenta deshabilitada | tnavarro | — |

- Tras 3 contraseñas incorrectas, la cuenta se bloquea.
- «¿Olvidó su contraseña?» envía un correo a una **bandeja simulada** (botón «Correo» de la barra inferior).
- La sesión se cierra tras 15 minutos sin actividad.
- **F1** muestra la ayuda de la pantalla actual y **F2** guarda.

### Simulaciones incluidas
- **Sistema informático actual (encuestas de servicio):** en «Importar encuestas» un panel permite simular una caída del servicio, corregir encuestas rechazadas en el origen y agregar una encuesta tardía.
- **Correo:** los mensajes de restablecimiento de contraseña llegan a la bandeja simulada.

### Exportaciones
Los reportes se exportan a **Excel (.xlsx)** y **PDF** con el formato corporativo. Los listados también se pueden exportar desde el botón «Exportar» de la barra de herramientas.

### Datos
Al publicar una versión nueva, los datos de demostración se reinician una vez para cargar los ejemplos con notas.
Los datos se guardan en el navegador (localStorage). Para volver a los datos iniciales: menú **Ayuda → Restablecer datos de demostración**. Nombres, RUT, proyectos y montos son ficticios.

## Publicar en GitHub Pages
1. Cree un repositorio público, por ejemplo `sgrh-instalum`.
2. Suba el contenido de esta carpeta: `index.html`, la carpeta `assets` completa y este `README.md`.
3. En **Settings → Pages**, elija Branch `main` y carpeta `/ (root)` y pulse **Save**.
4. El enlace queda como `https://<usuario>.github.io/sgrh-instalum/` (tarda 1 o 2 minutos en publicarse).

## Estructura
```
index.html
assets/styles.css         estilo de aplicación de escritorio (ERP)
assets/data.js            datos de demostración y reglas de negocio
assets/core.js            diálogos, inicio de sesión, ventana, listas y exportación
assets/contrataciones.js  panel principal y fichas de colaboradores
assets/seguridad.js       cuentas, perfiles, bitácora y trazabilidad
assets/capacitaciones.js  catálogo, programación, inscripciones, notas, certificaciones
assets/asignaciones.js    asignación individual por área con prueba y asignación masiva
assets/bonificaciones.js  importación, regla, cálculo, aprobación y pago
assets/reportes.js        reportes con filtros
assets/inicio.js          arranque
assets/vendor/            jsPDF y jsPDF-AutoTable (licencia MIT)
```
