/* SGRH Instalum · Administración y seguridad (RF-SEG-01 a RF-SEG-05) y trazabilidad */
"use strict";
const claveTemporal = () => "Temp" + Math.floor(1000 + Math.random() * 9000) + "A";

/* ---------- Cuentas de usuario (RF-SEG-02) ---------- */
VIEWS.cuentas = {
  mod: () => "Administración", title: () => "Cuentas de usuario", hu: () => "RF-SEG-02 · Administrar las cuentas de usuario · RF-SEG-01 · Bloqueo y desbloqueo", permiso: "admin",
  init(tab) { tab.sel = DB.d.usuarios[0].user; tab.nueva = false; tab.sort = { k: "user", dir: 1 }; },
  tools(tab) {
    return { nuevo: () => { tab.nueva = true; tab.sel = null; pintar(); }, guardar: () => $("#uSave") && $("#uSave").click(),
      exportar: () => pedirFormato({ titulo: "Cuentas de usuario", modulo: "Administración", columnas: [{ t: "Usuario" }, { t: "Nombre" }, { t: "Correo" }, { t: "Perfil" }, { t: "Estado" }], filas: DB.d.usuarios.map(u => [u.user, u.nombre, u.correo, u.perfil, u.estado]) }) };
  },
  render(tab) {
    const lv = listview({ cols: [{ k: "user", t: "Usuario", w: 110 }, { k: "nombre", t: "Nombre" }, { k: "perfil", t: "Perfil" }, { k: "estado", t: "Estado", f: r => pill(r.estado), w: 110 }],
      rows: DB.d.usuarios.map(u => ({ _id: u.user, ...u })), sel: tab.sel, sort: tab.sort });
    const u = tab.nueva ? { user: "", nombre: "", correo: "", perfil: CAT.perfiles[1], estado: "Habilitada", intentos: 0 } : DB.usuario(tab.sel);
    const yo = u && ST.user.user === u.user;
    return `<div class="dochead"><h2>Cuentas de usuario</h2><span class="sub">${DB.d.usuarios.length} cuentas</span><span class="r"><button class="btn" id="uNew">Nueva cuenta…</button></span></div>
    <div class="grid2" style="grid-template-columns:1.2fr 1fr"><div>${lv.html}<p class="muted small">Seleccione una cuenta para ver o modificar sus datos.</p></div>
    <fieldset class="fs" style="margin-top:0"><legend>${tab.nueva ? "Nueva cuenta" : "Cuenta seleccionada"}</legend>${u ? `<div id="uMsg"></div><div style="--lw:90px">
      <div class="row"><label class="l" for="uU">Usuario</label><div class="ctl"><input type="text" id="uU" class="req" maxlength="20" value="${E(u.user)}" ${tab.nueva ? "" : "readonly"}></div></div>
      <div class="row"><label class="l" for="uN">Nombre</label><div class="ctl"><input type="text" id="uN" class="req" maxlength="60" value="${E(u.nombre)}"></div></div>
      <div class="row"><label class="l" for="uC">Correo</label><div class="ctl"><input type="email" id="uC" class="req" maxlength="80" value="${E(u.correo)}"></div></div>
      <div class="row"><label class="l" for="uP">Perfil</label><div class="ctl"><select id="uP" class="req" ${yo ? "disabled title='No puede cambiar su propio perfil'" : ""}>${opts(CAT.perfiles, u.perfil)}</select></div></div>
      <div class="row"><label class="l">Estado</label><div class="ctl">${pill(u.estado)}${u.estado === "Bloqueada" ? `<span class="muted small">${u.intentos} intentos fallidos</span>` : ""}${u.debeCambiar ? `<span class="muted small">Clave temporal pendiente de cambio</span>` : ""}</div></div></div>
      <div class="actions" style="flex-wrap:wrap"><button class="btn pri" id="uSave">${tab.nueva ? "Crear cuenta" : "Guardar"}</button>
      ${tab.nueva ? `<button class="btn" id="uCancel">Cancelar</button>` : `${u.estado === "Bloqueada" ? `<button class="btn" id="uUnl">Desbloquear</button>` : ""}<button class="btn" id="uRes">Restablecer clave</button>${yo ? "" : `<button class="btn" id="uDis">${u.estado === "Deshabilitada" ? "Habilitar" : "Deshabilitar"}</button><button class="btn" id="uDel">Eliminar…</button>`}`}</div>` : `<p class="muted">Seleccione una cuenta.</p>`}</fieldset></div>`;
  },
  mount(w, tab) {
    bindList(w, tab, { onSelect: () => { tab.nueva = false; pintar(); } });
    $("#uNew").onclick = () => { tab.nueva = true; tab.sel = null; pintar(); };
    const msg = (t, k = "err") => barErr($("#uMsg"), t, k);
    const sv = $("#uSave"); if (!sv) return;
    sv.onclick = async () => {
      const user = $("#uU").value.trim(), nombre = $("#uN").value.trim().replace(/\s+/g, " "), correo = $("#uC").value.trim(), perfil = $("#uP").value;
      if (!user || !nombre || !correo) return msg("Complete usuario, nombre y correo.");
      if (!/^[A-Za-z0-9._-]{3,20}$/.test(user)) return msg("El usuario debe tener entre 3 y 20 caracteres (letras, números, punto, guion), sin espacios.");
      if (!U.correoValido(correo)) return msg("El correo no tiene un formato válido.");
      const otro = DB.d.usuarios.find(x => x.correo.toLowerCase() === correo.toLowerCase() && (tab.nueva || x.user !== tab.sel));
      if (otro) return msg(`Ese correo ya está asociado a la cuenta ${otro.user}.`);
      if (tab.nueva) {
        if (DB.usuario(user)) return msg("Ya existe una cuenta con ese usuario.");
        const clave = claveTemporal();
        DB.d.usuarios.push({ user, nombre, correo, perfil, clave, estado: "Habilitada", intentos: 0, claveAnterior: "", debeCambiar: true });
        DB.log(ST.user.user, "Administración", "Creación de cuenta", `${user} · ${perfil}`);
        tab.nueva = false; tab.sel = user; pintar();
        dialog({ icon: "ok", head: "Cuenta creada", html: `<p>Usuario: <b>${E(user)}</b><br>Perfil: ${E(perfil)}<br>Clave temporal: <b>${clave}</b></p><p class="muted small">Es de un solo uso: el sistema pedirá cambiarla en el primer ingreso.</p>` });
      } else {
        const u = DB.usuario(tab.sel), camb = [];
        if (u.nombre !== nombre) camb.push("nombre"); if (u.correo !== correo) camb.push("correo"); if (u.perfil !== perfil) camb.push(`perfil ${u.perfil} → ${perfil}`);
        if (!camb.length) { pintar(); return barErr($("#uMsg"), "No hubo cambios que guardar.", "info"); }
        Object.assign(u, { nombre, correo, perfil }); DB.log(ST.user.user, "Administración", "Modificación de cuenta", `${u.user} · ${camb.join(", ")}`);
        pintar(); barErr($("#uMsg"), "Cambios guardados. Los permisos del nuevo perfil se aplican de inmediato.", "ok");
      }
    };
    const c = $("#uCancel"); if (c) c.onclick = () => { tab.nueva = false; tab.sel = DB.d.usuarios[0].user; pintar(); };
    const un = $("#uUnl"); if (un) un.onclick = () => { const u = DB.usuario(tab.sel); u.estado = "Habilitada"; u.intentos = 0; DB.log(ST.user.user, "Administración", "Desbloqueo de cuenta", u.user); pintar(); barErr($("#uMsg"), `La cuenta ${u.user} quedó habilitada.`, "ok"); };
    const rs = $("#uRes"); if (rs) rs.onclick = async () => {
      const u = DB.usuario(tab.sel); if (!await confirmar(`¿Restablecer la clave de ${u.user}?`, "<p>Se generará una clave temporal de un solo uso y la cuenta quedará habilitada.</p>")) return;
      const k = claveTemporal(); u.claveAnterior = u.clave; u.clave = k; u.estado = u.estado === "Deshabilitada" ? "Deshabilitada" : "Habilitada"; u.intentos = 0; u.debeCambiar = true;
      DB.log(ST.user.user, "Administración", "Restablecimiento de clave", u.user); pintar();
      dialog({ icon: "ok", head: "Clave restablecida", html: `<p>Clave temporal de <b>${E(u.user)}</b>: <b>${k}</b></p><p class="muted small">El usuario deberá cambiarla al ingresar.</p>` });
    };
    const ds = $("#uDis"); if (ds) ds.onclick = async () => {
      const u = DB.usuario(tab.sel), hab = u.estado === "Deshabilitada";
      if (!await confirmar(`¿${hab ? "Habilitar" : "Deshabilitar"} la cuenta ${u.user}?`, hab ? "<p>El usuario podrá volver a ingresar.</p>" : "<p>El usuario no podrá ingresar al sistema. Sus registros y la bitácora se conservan.</p>")) return;
      u.estado = hab ? "Habilitada" : "Deshabilitada"; u.intentos = 0; DB.log(ST.user.user, "Administración", hab ? "Habilitación de cuenta" : "Deshabilitación de cuenta", u.user); pintar();
    };
    const dl = $("#uDel"); if (dl) dl.onclick = () => {
      DB.log(ST.user.user, "Administración", "Intento de eliminación bloqueado", `Cuenta ${tab.sel}`);
      aviso("Las cuentas no se eliminan", "<p>Para conservar la trazabilidad de la bitácora, las cuentas no se borran. Use <b>Deshabilitar</b> para impedir el acceso.</p>", "warn");
    };
  },
};
HELP.cuentas = { t: "Cuentas de usuario", html: "<ul><li><b>Nueva cuenta</b>: usuario único, nombre, correo único y perfil. El sistema entrega una clave temporal de un solo uso.</li><li><b>Desbloquear</b>: habilita una cuenta bloqueada por 3 intentos fallidos.</li><li><b>Restablecer clave</b>: genera una clave temporal.</li><li><b>Deshabilitar</b>: impide el ingreso sin borrar la cuenta. Si el usuario tiene una sesión abierta, se cierra en su siguiente acción.</li><li>Usted no puede cambiar su propio perfil ni deshabilitarse.</li></ul>" };

/* ---------- Perfiles y permisos (RF-SEG-03) ---------- */
VIEWS.perfiles = {
  mod: () => "Administración", title: () => "Perfiles y permisos", hu: () => "RF-SEG-03 · Administrar los perfiles y permisos", permiso: "admin",
  init(tab) { tab.m = U.clon(DB.d.permisos); },
  tools(tab) { return { guardar: () => this.guardar(tab), deshacer: tab.dirty && (() => { tab.m = U.clon(DB.d.permisos); marcarSucio(tab, false); pintar(); }) }; },
  render(tab) {
    const cnt = p => DB.d.usuarios.filter(u => u.perfil === p && u.estado !== "Deshabilitada").length;
    return `<div class="dochead"><h2>Perfiles y permisos</h2><span class="sub">El menú, el navegador y las acciones de cada usuario dependen de su perfil</span></div>
    <div class="lv-wrap"><table class="lv perm"><thead><tr><th>Permiso</th>${CAT.perfiles.map(p => `<th>${E(p)}<br><span class="muted small">${cnt(p)} usuario(s)</span></th>`).join("")}</tr></thead><tbody>
    ${PERMISOS.map(([k, t]) => `<tr><td>${E(t)}</td>${CAT.perfiles.map(p => `<td><input type="checkbox" aria-label="${E(p + ": " + t)}" data-p="${E(p)}" data-k="${k}" ${tab.m[p].includes(k) ? "checked" : ""} ${p === "Jefe de Recursos Humanos" && k === "admin" ? "disabled title='El Jefe de RR.HH. siempre administra el sistema'" : ""}></td>`).join("")}</tr>`).join("")}
    </tbody></table></div><p class="muted small">El Jefe de Recursos Humanos siempre conserva la administración. «Bonificaciones: aprobar» requiere también «Bonificaciones: importar y calcular». «Registrar y modificar fichas» requiere «Contrataciones: consultar fichas».</p>
    <div class="actions"><button class="btn" id="pBase">Restaurar valores iniciales</button><button class="btn pri" id="pSave">Guardar (F2)</button></div>`;
  },
  mount(w, tab) {
    $$("[data-p]", w).forEach(c => c.onchange = () => {
      const a = tab.m[c.dataset.p], k = c.dataset.k;
      const add = x => { if (!a.includes(x)) a.push(x); }, del = x => { const i = a.indexOf(x); if (i >= 0) a.splice(i, 1); };
      if (c.checked) { add(k); if (k === "contrataciones.editar") add("contrataciones"); if (k === "bonificaciones.aprobar") add("bonificaciones"); }
      else { del(k); if (k === "contrataciones") del("contrataciones.editar"); if (k === "bonificaciones") del("bonificaciones.aprobar"); }
      marcarSucio(tab); guardarScroll(); pintar();
    });
    $("#pSave").onclick = () => this.guardar(tab);
    $("#pBase").onclick = () => { tab.m = U.clon(PERMISOS_BASE); marcarSucio(tab); pintar(); };
  },
  guardar(tab) {
    const camb = [];
    for (const p of CAT.perfiles) { const a = DB.d.permisos[p] || [], b = tab.m[p]; const mas = b.filter(x => !a.includes(x)), menos = a.filter(x => !b.includes(x)); if (mas.length || menos.length) camb.push(`${p}: ${mas.map(x => "+" + x).concat(menos.map(x => "−" + x)).join(" ")}`); }
    if (!camb.length) { marcarSucio(tab, false); tab.msg = "No hubo cambios en los permisos."; return pintar(); }
    DB.d.permisos = U.clon(tab.m); DB.log(ST.user.user, "Administración", "Cambio de permisos", camb.join(" · "));
    marcarSucio(tab, false); tab.msg = "Permisos guardados. Se aplican de inmediato en las sesiones abiertas."; pintar();
  },
};
HELP.perfiles = { t: "Perfiles y permisos", html: "<p>Marque los permisos de cada perfil y pulse <b>Guardar</b>. Los cambios se aplican de inmediato: el menú y el navegador de los usuarios con ese perfil se actualizan en su siguiente acción.</p><p>Los datos sensibles (sueldo, previsión y salud) solo los ven los perfiles con el permiso «Ver datos sensibles».</p>" };

/* ---------- Bitácora (RF-SEG-04) ---------- */
const isoBit = f => { const m = /^(\d\d)-(\d\d)-(\d{4})/.exec(f || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
VIEWS.bitacora = {
  mod: () => "Administración", title: () => "Bitácora", hu: () => "RF-SEG-04 · Registrar la bitácora de auditoría", permiso: "admin",
  init(tab) { tab.f = { q: "", u: "Todos", m: "Todos", d: "", h: "" }; tab.page = 0; },
  filas(tab) {
    const q = U.norm(tab.f.q.trim()), f = tab.f;
    return DB.d.bitacora.map((b, i) => ({ _id: "b" + i, ...b, iso: isoBit(b.fecha) })).reverse()
      .filter(b => (f.u === "Todos" || b.usuario === f.u) && (f.m === "Todos" || b.modulo === f.m) && (!f.d || b.iso >= f.d) && (!f.h || b.iso <= f.h) && (!q || U.norm(b.accion + " " + b.detalle + " " + b.usuario).includes(q)));
  },
  tools(tab) {
    return { buscar: () => $("#bQ").focus(), exportar: () => { const r = this.filas(tab), f = tab.f; pedirFormato({ titulo: "Bitácora de auditoría", modulo: "Administración", lineas: [`Filtros: usuario ${f.u} · módulo ${f.m} · desde ${f.d ? U.fecha(f.d) : "inicio"} · hasta ${f.h ? U.fecha(f.h) : "hoy"}${f.q ? " · texto «" + f.q + "»" : ""}`], columnas: [{ t: "Fecha y hora" }, { t: "Usuario" }, { t: "Módulo" }, { t: "Acción" }, { t: "Detalle" }], filas: r.map(b => [b.fecha, b.usuario, b.modulo, b.accion, b.detalle]) }); } };
  },
  render(tab) {
    const us = [...new Set(DB.d.bitacora.map(b => b.usuario))].sort(), ms = [...new Set(DB.d.bitacora.map(b => b.modulo))].sort();
    const lv = listview({ cols: [{ k: "fecha", t: "Fecha y hora", w: 140, nosort: true }, { k: "usuario", t: "Usuario", w: 110, nosort: true }, { k: "modulo", t: "Módulo", w: 130, nosort: true }, { k: "accion", t: "Acción", w: 210, nosort: true }, { k: "detalle", t: "Detalle", nosort: true }],
      rows: this.filas(tab), sel: tab.sel, pageSize: 18, page: tab.page, empty: "No hay registros con esos filtros." });
    tab.page = lv.page;
    return `<div class="dochead"><h2>Bitácora de auditoría</h2><span class="sub">${DB.d.bitacora.length} registros · accesos, cambios y exportaciones</span><span class="r"><button class="btn" id="bDel">Eliminar registro…</button></span></div>
    <div class="filters"><label>Buscar <input type="text" id="bQ" value="${E(tab.f.q)}" placeholder="Acción, detalle o usuario" style="width:200px"></label>
      <label>Usuario <select id="bU">${opts(["Todos", ...us], tab.f.u)}</select></label>
      <label>Módulo <select id="bM">${opts(["Todos", ...ms], tab.f.m)}</select></label>
      <label>Desde <input type="date" id="bD" value="${E(tab.f.d)}"></label><label>Hasta <input type="date" id="bH" value="${E(tab.f.h)}"></label><button class="btn" id="bClr">Limpiar</button></div>
    ${tab.f.d && tab.f.h && tab.f.d > tab.f.h ? `<div class="bar warn"><b class="ic">⚠</b><span>La fecha «Desde» es posterior a «Hasta».</span></div>` : ""}
    ${lv.html}${pager(lv, "")}<p class="muted small">Los registros de la bitácora no se pueden modificar ni eliminar.</p>`;
  },
  mount(w, tab) {
    bindBuscador($("#bQ"), tab, "q");
    [["#bU", "u"], ["#bM", "m"], ["#bD", "d"], ["#bH", "h"]].forEach(([s, k]) => $(s).onchange = e => { tab.f[k] = e.target.value; tab.page = 0; pintar(); });
    $("#bClr").onclick = () => { tab.f = { q: "", u: "Todos", m: "Todos", d: "", h: "" }; tab.page = 0; pintar(); };
    $("#bDel").onclick = () => { DB.log(ST.user.user, "Administración", "Intento de eliminación bloqueado", "Registro de bitácora"); aviso("Operación no permitida", "<p>Los registros de la bitácora de auditoría no se pueden modificar ni eliminar. El intento quedó registrado.</p>", "warn"); pintar(); };
    bindList(w, tab, {}); bindPager(w, tab);
  },
};
HELP.bitacora = { t: "Bitácora de auditoría", html: "<p>Registra automáticamente inicios y cierres de sesión, intentos fallidos, bloqueos, cambios de fichas, cuentas y permisos, cálculos, aprobaciones y exportaciones, con fecha, hora, usuario y detalle.</p><p>Filtre por texto, usuario, módulo o rango de fechas. Los registros no se pueden modificar ni eliminar.</p>" };

/* ---------- Trazabilidad: 51 historias de usuario ---------- */
const HU = [
  ["RF-SEG-01", "Autenticar el acceso al sistema", "Inicio de sesión: usuario, contraseña, 3 intentos y bloqueo, recordar usuario, restablecer por correo, clave temporal, cierre por inactividad"],
  ["RF-SEG-02", "Administrar las cuentas de usuario", "Administración › Cuentas de usuario"], ["RF-SEG-03", "Administrar los perfiles y permisos", "Administración › Perfiles y permisos · menú según perfil"],
  ["RF-SEG-04", "Registrar la bitácora de auditoría", "Administración › Bitácora"], ["RF-SEG-05", "Consultar la ayuda en línea", "F1 o botón Ayuda en cualquier pantalla"],
  ["RF-CON-01", "Registrar ficha de colaborador", "Contrataciones › Nueva ficha (borrador y registro)"], ["RF-CON-02", "Validar el RUT del colaborador", "Nueva ficha › Datos personales"],
  ["RF-CON-03", "Controlar fichas duplicadas", "Nueva ficha › RUT y correo institucional; reactivación de desvinculados"], ["RF-CON-04", "Registrar el contacto de emergencia", "Ficha › Contacto de emergencia"],
  ["RF-CON-05", "Registrar los datos del cargo", "Ficha › Cargo y contrato"], ["RF-CON-06", "Registrar previsión y salud", "Ficha › Previsión y salud (dato sensible)"],
  ["RF-CON-07", "Buscar ficha de colaborador", "Contrataciones › Colaboradores"], ["RF-CON-08", "Modificar la ficha de un colaborador", "Ficha › Editar · Historial de cambios"],
  ["RF-CON-09", "Gestionar el estado del colaborador", "Ficha › Cambiar estado · Fichas incompletas"], ["RF-CON-10", "Consultar capacitaciones desde la ficha", "Ficha › Capacitaciones"],
  ["RF-CON-11", "Asignar automáticamente el ID de la ficha", "Ficha › N° de ficha"],
  ["RF-CAP-01", "Crear capacitaciones en el catálogo anual", "Capacitaciones › Catálogo anual › Nueva"], ["RF-CAP-02", "Definir capacitaciones obligatorias por especialidad", "Catálogo › Obligatoria y especialidades · habilitación en la ficha"],
  ["RF-CAP-03", "Inscribir colaboradores en una capacitación", "Capacitaciones › Inscripciones"], ["RF-CAP-04", "Registrar la asistencia y el resultado", "Capacitaciones › Asistencia y resultados"],
  ["RF-CAP-05", "Registrar certificaciones con vigencia", "Asistencia y resultados › Aprobado · Certificaciones"], ["RF-CAP-06", "Alertar certificaciones por vencer", "Aviso al entrar al módulo · Certificaciones"],
  ["RF-CAP-07", "Consultar la matriz de competencias", "Capacitaciones › Matriz de competencias"], ["RF-CAP-08", "Consultar el historial de capacitaciones", "Capacitaciones › Historial por colaborador"],
  ["RF-CAP-09", "Consultar el plan anual de capacitaciones", "Catálogo anual › año y estado del plan"], ["RF-CAP-10", "Asignar capacitaciones a grupos de colaboradores", "Inscripciones › Asignar a grupo · asignación automática de obligatorias"],
  ["RF-CAP-11", "Modificar y dar de baja capacitaciones del catálogo", "Catálogo anual › Modificar · Dar de baja"], ["RF-CAP-12", "Consultar el catálogo por empresa capacitadora", "Catálogo anual › filtro Empresa"],
  ["RF-CAP-13", "Registrar empresas capacitadoras", "Capacitaciones › Empresas capacitadoras"], ["RF-CAP-14", "Registrar capacitadores", "Capacitaciones › Capacitadores"],
  ["RF-CAP-15", "Registrar tipos de capacitación", "Capacitaciones › Tipos de capacitación"], ["RF-CAP-16", "Programar la fecha y el horario de una capacitación", "Capacitaciones › Programación"],
  ["RF-CAP-17", "Buscar las calificaciones de servicio para detectar necesidades", "Capacitaciones › Necesidades por calificación"],
  ["RF-BON-01", "Importar las encuestas de servicio", "Bonificaciones › Importar encuestas"], ["RF-BON-02", "Registrar los rechazos de la importación", "Importar encuestas › Rechazos"],
  ["RF-BON-03", "Parametrizar la regla de cálculo de la bonificación", "Bonificaciones › Regla de cálculo"], ["RF-BON-04", "Calcular la bonificación del período", "Bonificaciones › Cálculo del período"],
  ["RF-BON-05", "Distribuir la bonificación de un proyecto", "Cálculo › Proyectos (partes iguales)"], ["RF-BON-06", "Aprobar el cálculo de bonificaciones", "Bonificaciones › Aprobación y pago"],
  ["RF-BON-07", "Consultar la trazabilidad del cálculo", "Cálculo › Detalle del colaborador"], ["RF-BON-08", "Consultar el histórico de bonificaciones", "Bonificaciones › Histórico"],
  ["RF-BON-09", "Identificar proyectos sin evaluación", "Cálculo › Proyectos excluidos"], ["RF-BON-10", "Controlar las fallas y duplicidades de la importación", "Importar encuestas › simulador del sistema de origen"],
  ["RF-BON-11", "Validar las condiciones previas al cálculo", "Cálculo › Condiciones previas"], ["RF-BON-12", "Buscar las calificaciones de servicio de un trabajador", "Bonificaciones › Calificaciones del trabajador"],
  ["RF-BON-13", "Registrar la bonificación aprobada para pago", "Aprobación y pago › Registrar para pago"],
  ["RF-REP-01", "Generar el reporte de colaboradores nuevos", "Reportes › Colaboradores nuevos"], ["RF-REP-02", "Generar el reporte de bonificaciones", "Reportes › Bonificaciones"],
  ["RF-REP-03", "Generar el reporte de capacitaciones", "Reportes › Capacitaciones"], ["RF-REP-04", "Exportar los reportes a PDF y Excel", "Botones Excel y PDF de cada reporte"],
  ["RF-REP-05", "Filtrar los reportes", "Filtros de cada reporte · Limpiar"],
];
VIEWS.trazabilidad = {
  title: () => "Trazabilidad de requisitos", hu: () => "Matriz de trazabilidad · historias de usuario ↔ pantallas del prototipo",
  init(tab) { tab.f = { m: "Todos" }; },
  render(tab) {
    const rows = HU.filter(h => tab.f.m === "Todos" || h[0].slice(3, 6) === tab.f.m);
    return `<div class="dochead"><h2>Trazabilidad de requisitos</h2><span class="sub">${HU.length} historias de usuario · todas funcionales en este prototipo</span></div>
    <div class="filters"><label>Módulo <select id="tM">${opts([["Todos", "Todos"], ["SEG", "Seguridad"], ["CON", "Contrataciones"], ["CAP", "Capacitaciones"], ["BON", "Bonificaciones"], ["REP", "Reportes"]], tab.f.m)}</select></label></div>
    <div class="lv-wrap"><table class="lv trace-tbl"><thead><tr><th style="width:100px">Historia</th><th>Requisito</th><th>Dónde se prueba</th><th style="width:100px">Estado</th></tr></thead><tbody>
    ${rows.map(([c, n, p]) => `<tr><td><b>${c}</b></td><td>${E(n)}</td><td>${E(p)}</td><td>${pill("Funcional", "Activo")}</td></tr>`).join("")}</tbody></table></div>`;
  },
  mount(w, tab) { $("#tM").onchange = e => { tab.f.m = e.target.value; pintar(); }; },
};
HELP.trazabilidad = { t: "Trazabilidad", html: "<p>Relaciona cada historia de usuario del Product Backlog con la pantalla donde se prueba. Use el filtro por módulo.</p>" };
