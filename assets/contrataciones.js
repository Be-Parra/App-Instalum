/* SGRH Instalum · Panel principal y módulo de Contrataciones (RF-CON-01 a RF-CON-11) */
"use strict";

/* ---------- Panel principal (RF-SEG-03: funciones según perfil) ---------- */
VIEWS.panel = {
  title: () => "Inicio", hu: () => "RF-SEG-03 · Funciones según el perfil del usuario · RF-SEG-05 · Ayuda en línea",
  tools: () => ({ nuevo: puede("contrataciones.editar") && (() => abrir("nueva")), buscar: () => { const q = $("#dQ"); if (q) q.focus(); } }),
  tareas() {
    const F = DB.d.fichas, per = U.periodo(-1), t = [];
    if (puede("contrataciones.editar")) F.filter(f => f.estado === "Incompleta").forEach(f => t.push(["Alta", `Completar la ficha ${f.id} · ${FICHA.nombre(f)}`, "Contrataciones", f.id]));
    if (puede("capacitaciones")) {
      const certs = certsAlerta();
      if (certs.length) t.push(["Alta", `${certs.length} certificación(es) vencida(s) o por vencer en 30 días`, "Capacitaciones", "certificaciones"]);
      DB.d.versiones.filter(v => !v.cerrada && v.fecha <= U.hoy() && DB.d.inscripciones.some(i => i.version === v.id && i.estado === "Inscrito"))
        .forEach(v => t.push(["Media", `Registrar asistencia y notas de «${DB.cap(v.cap).nombre}» (${U.fecha(v.fecha)})`, "Capacitaciones", "resultados"]));
      const pend = DB.d.inscripciones.filter(i => i.estado === "Pendiente (sin cupo)").length;
      if (pend) t.push(["Media", `${pend} trabajador(es) esperando cupo en capacitaciones obligatorias`, "Capacitaciones", "inscripciones"]);
    }
    if (puede("bonificaciones")) {
      if (!DB.d.importaciones.some(i => i.periodo === per)) t.push(["Alta", `Paso 1: importar las encuestas de ${U.mes(per)}`, "Bonificaciones", "importar"]);
      else if (!BON.calculo(DB.d, per)) t.push(["Media", `Paso 2: calcular las bonificaciones de ${U.mes(per)}`, "Bonificaciones", "calculo"]);
    }
    if (puede("bonificaciones.aprobar")) DB.d.calculos.filter(c => c.estado === "Pendiente de aprobación").forEach(c => t.push(["Alta", `Paso 3: aprobar o rechazar el cálculo de ${U.mes(c.periodo)} (${U.pesos(c.total)})`, "Bonificaciones", "aprobacion"]));
    if (puede("admin")) DB.d.usuarios.filter(x => x.estado === "Bloqueada").forEach(x => t.push(["Media", `Revisar la cuenta bloqueada de ${x.user}`, "Administración", "cuentas"]));
    return t;
  },
  render(tab) {
    const F = DB.d.fichas, u = ST.user, tareas = this.tareas();
    const res = [["Colaboradores activos", F.filter(f => f.estado === "Activo").length], ["Fichas por completar", F.filter(f => f.estado === "Incompleta").length], ["Con licencia", F.filter(f => f.estado === "Licencia").length]];
    if (puede("capacitaciones")) res.push(["Capacitaciones del plan " + U.anio(), capsVigentes().length], ["Certificaciones por vencer o vencidas", certsAlerta().length]);
    if (puede("admin")) res.push(["Cuentas bloqueadas", DB.d.usuarios.filter(x => x.estado === "Bloqueada").length]);
    const cards = MODS.map(m => {
      const acts = accionesDe(m.k); if (!acts.length) return "";
      const main = acts.filter(a => !a.g), extra = acts.filter(a => a.g);
      return `<section class="card" style="--mc:${m.c}"><h3>${E(m.t)}</h3><div class="acts">${main.map(a => `<button class="act" data-k="${E(a.k)}"><b>${E(a.t)}</b><span>${E(a.d)}</span></button>`).join("")}</div>
        ${extra.length ? `<div class="more">${[...new Set(extra.map(a => a.g))].map(g => `<div><span class="muted">${E(g)}:</span> ${extra.filter(a => a.g === g).map(a => `<button class="link" data-k="${E(a.k)}">${E(a.t)}</button>`).join(" · ")}</div>`).join("")}</div>` : ""}</section>`;
    }).join("");
    return `<div class="dochead"><h2>Inicio</h2><span class="sub">Bienvenido/a, ${E(u.nombre)} · ${E(u.perfil)}</span></div>
    <div class="hero"><label for="dQ">¿Qué necesita hacer?</label><input type="text" id="dQ" value="${E(tab.q || "")}" maxlength="60" placeholder="Escriba, por ejemplo: asignar capacitación, prueba, nueva ficha, pago de bonificación…" autocomplete="off"><div id="dRes" class="acc-res"></div>
      <p class="muted small">También puede pulsar <b>Ctrl + K</b> desde cualquier pantalla, o elegir una tarjeta de abajo.</p></div>
    ${tareas.length ? `<h3 class="h3">Tareas pendientes (${tareas.length})</h3><div class="lv-wrap"><table class="lv"><thead><tr><th style="width:80px">Prioridad</th><th>Tarea · haga clic para resolverla</th><th style="width:140px">Módulo</th></tr></thead><tbody>
      ${tareas.map(t => `<tr data-go="${E(t[3])}" class="go"><td>${pill(t[0], t[0] === "Alta" ? "warn" : "info")}</td><td>${E(t[1])}</td><td>${t[2]}</td></tr>`).join("")}</tbody></table></div>` : `<div class="bar ok"><b class="ic">✓</b><span>No hay tareas pendientes.</span></div>`}
    <h3 class="h3">¿Qué desea hacer?</h3><div class="dash">${cards}</div>
    <fieldset class="fs" style="max-width:560px"><legend>Resumen</legend><div class="summary">${res.map(r => `<div>${r[0]}</div><div class="v">${r[1]}</div>`).join("")}</div></fieldset>`;
  },
  mount(w, tab) {
    $$("[data-k]", w).forEach(b => b.onclick = () => abrir(b.dataset.k));
    $$("[data-go]", w).forEach(tr => tr.onclick = () => { const g = tr.dataset.go; if (g.startsWith("COL-")) { const f = DB.ficha(g); abrir(g, { edit: true, sec: secPendiente(f) }); } else abrir(g); });
    const q = $("#dQ"), r = $("#dRes");
    let res = [], sel = 0;
    const pinta = () => {
      tab.q = q.value; res = q.value.trim() ? buscarAcciones(q.value) : []; sel = Math.min(sel, Math.max(0, res.length - 1));
      r.innerHTML = !q.value.trim() ? "" : res.length ? res.map((a, i) => accHtml(a, i === sel)).join("") : sinAcciones;
      $$("[data-acc]", r).forEach((b, i) => b.onclick = () => abrir(res[i].k));
    };
    q.oninput = () => { sel = 0; pinta(); };
    q.onkeydown = e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, Math.min(res.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); pinta(); }
      if (e.key === "Enter" && res[sel]) { e.preventDefault(); const k = res[sel].k; q.value = ""; tab.q = ""; abrir(k); }
      if (e.key === "Escape") { q.value = ""; pinta(); }
    };
    pinta();
  },
};
HELP.panel = { t: "Inicio", html: "<p>Desde aquí se llega a todo el sistema:</p><ul><li><b>¿Qué necesita hacer?</b> Escriba con sus palabras lo que busca (por ejemplo «asignar capacitación», «prueba», «nueva ficha» o «pago») y elija la función. Desde cualquier pantalla puede abrir el mismo buscador con <b>Ctrl + K</b> o con el botón de la barra superior.</li><li><b>Tareas pendientes</b>: haga clic en una para ir directo a resolverla.</li><li><b>Tarjetas por módulo</b>: las acciones más usadas, con una explicación breve. Solo aparecen las que su perfil permite.</li><li>El botón <b>Inicio</b> de la barra superior siempre lo trae de vuelta aquí.</li></ul>" };
HELP.general = HELP.panel;

/* ---------- Colaboradores (RF-CON-07 buscar · RF-CON-09 estado) ---------- */
const filaColab = f => ({ _id: f.id, id: f.id, rut: f.rut, nombre: FICHA.nombre(f), cargo: f.cargo.cargo || "—", depto: f.cargo.departamento || "—", esp: f.cargo.especialidad || "—", ingreso: f.cargo.ingreso, estado: f.estado, _cls: f.estado === "Desvinculado" ? "mut" : "" });
VIEWS.colaboradores = {
  mod: () => "Contrataciones", title: () => "Colaboradores", hu: () => "RF-CON-07 · Buscar la ficha de un colaborador · RF-CON-09 · Gestionar el estado del colaborador", permiso: "contrataciones",
  init(tab) { tab.f = { q: "", estado: "Todos", depto: "Todos", esp: "Todas" }; tab.sort = { k: "id", dir: -1 }; tab.page = 0; },
  filas(tab) {
    const q = U.norm(tab.f.q.trim()), qr = U.rutLimpio(tab.f.q);
    return DB.d.fichas.filter(f => (tab.f.estado === "Todos" || f.estado === tab.f.estado) && (tab.f.depto === "Todos" || f.cargo.departamento === tab.f.depto) && (tab.f.esp === "Todas" || f.cargo.especialidad === tab.f.esp) &&
      (!q || U.norm(FICHA.nombre(f)).includes(q) || U.norm(f.id).includes(q) || (qr.length >= 3 && /\d/.test(qr) && U.rutLimpio(f.rut).includes(qr)))).map(filaColab);
  },
  cols: [{ k: "id", t: "N° ficha", w: 105 }, { k: "rut", t: "RUT", w: 115, sortv: r => +U.rutLimpio(r.rut).slice(0, -1) }, { k: "nombre", t: "Nombre" }, { k: "cargo", t: "Cargo" }, { k: "depto", t: "Departamento" }, { k: "esp", t: "Especialidad" }, { k: "ingreso", t: "Ingreso", f: r => U.fecha(r.ingreso), w: 95 }, { k: "estado", t: "Estado", f: r => pill(r.estado), w: 110 }],
  tools(tab) { return { nuevo: puede("contrataciones.editar") && (() => abrir("nueva")), buscar: () => $("#cQ") && $("#cQ").focus(), exportar: () => this.exportar(tab) }; },
  exportar(tab) {
    const r = listview({ cols: this.cols, rows: this.filas(tab), sort: tab.sort }).rows;
    const f = tab.f;
    pedirFormato({ titulo: "Listado de colaboradores", modulo: "Contrataciones", sensible: true, lineas: [`Filtros: búsqueda «${f.q || "todas"}» · estado ${f.estado} · departamento ${f.depto} · especialidad ${f.esp}`],
      columnas: [{ t: "N° ficha" }, { t: "RUT" }, { t: "Nombre" }, { t: "Cargo" }, { t: "Departamento" }, { t: "Especialidad" }, { t: "Ingreso" }, { t: "Estado" }],
      filas: r.map(x => [x.id, x.rut, x.nombre, x.cargo, x.depto, x.esp, U.fecha(x.ingreso), x.estado]) });
  },
  render(tab) {
    const rows = this.filas(tab);
    const lv = listview({ cols: this.cols, rows, sel: tab.sel, sort: tab.sort, pageSize: 14, page: tab.page, empty: tab.f.q ? `No se encontraron colaboradores para «${tab.f.q}». Revise el RUT, el nombre o el N° de ficha.` : "No hay colaboradores con esos filtros." });
    tab.page = lv.page;
    return `<div class="dochead"><h2>Colaboradores</h2><span class="sub">${DB.d.fichas.length} fichas registradas</span><span class="r">${puede("contrataciones.editar") ? `<button class="btn pri" id="cNew">Nueva ficha…</button>` : ""}<button class="btn" id="cOpen">Abrir ficha</button>${puede("capacitaciones") ? `<button class="btn" id="cCap" title="Asignar una capacitación al colaborador seleccionado">Asignar capacitación…</button>` : ""}</span></div>
    <div class="filters"><label>Buscar <input type="text" id="cQ" value="${E(tab.f.q)}" placeholder="RUT, nombre o N° de ficha" style="width:240px" maxlength="60"></label>
      <label>Estado <select id="cE">${opts(["Todos", ...CAT.estadosFicha, "Incompleta"], tab.f.estado)}</select></label>
      <label>Departamento <select id="cD">${opts(["Todos", ...CAT.departamentos], tab.f.depto)}</select></label>
      <label>Especialidad <select id="cS">${opts(["Todas", ...CAT.especialidades], tab.f.esp)}</select></label>
      <button class="btn" id="cClr">Limpiar</button></div>${lv.html}${pager(lv)}`;
  },
  mount(w, tab) {
    bindBuscador($("#cQ"), tab, "q");
    $("#cE").onchange = e => { tab.f.estado = e.target.value; tab.page = 0; pintar(); };
    $("#cD").onchange = e => { tab.f.depto = e.target.value; tab.page = 0; pintar(); };
    $("#cS").onchange = e => { tab.f.esp = e.target.value; tab.page = 0; pintar(); };
    $("#cClr").onclick = () => { tab.f = { q: "", estado: "Todos", depto: "Todos", esp: "Todas" }; tab.page = 0; pintar(); };
    const n = $("#cNew"); if (n) n.onclick = () => abrir("nueva");
    const cc = $("#cCap"); if (cc) cc.onclick = () => abrir("asignar", tab.sel && DB.ficha(tab.sel) ? { ficha: tab.sel } : {});
    $("#cOpen").onclick = () => tab.sel && DB.ficha(tab.sel) ? abrir(tab.sel) : aviso("Seleccione un colaborador", "<p>Haga clic en una fila de la lista y luego en «Abrir ficha», o haga doble clic sobre la fila.</p>");
    bindList(w, tab, { onOpen: id => abrir(id) }); bindPager(w, tab);
  },
};
HELP.colaboradores = { t: "Buscar colaboradores", html: "<p>Busque por <b>RUT</b> (con o sin puntos y guion), por <b>nombre</b> o por <b>N° de ficha</b>. Los resultados se actualizan mientras escribe.</p><ul><li>Filtre por estado, departamento o especialidad. «Limpiar» quita todos los filtros.</li><li>Haga doble clic (o Enter) sobre una fila para abrir la ficha.</li><li>Haga clic en el encabezado de una columna para ordenar.</li><li>«Exportar» de la barra de herramientas genera Excel o PDF con los filtros aplicados.</li></ul>" };

/* ---------- Fichas incompletas ---------- */
const secPendiente = f => (FICHA.secciones.find(s => FICHA.faltantes(f, s).length) || {}).k || "personales";
VIEWS.incompletas = {
  mod: () => "Contrataciones", title: () => "Fichas incompletas", hu: () => "RF-CON-01 · Registrar ficha de colaborador · RF-CON-09 · Gestionar el estado", permiso: "contrataciones",
  tools() { return { buscar: () => abrir("colaboradores"), nuevo: puede("contrataciones.editar") && (() => abrir("nueva")) }; },
  render(tab) {
    const rows = DB.d.fichas.filter(f => f.estado === "Incompleta").map(f => ({ _id: f.id, id: f.id, nombre: FICHA.nombre(f), creada: f.creada, falta: FICHA.secciones.filter(s => FICHA.faltantes(f, s).length).map(s => s.t).join(" · "), por: f.creadaPor }));
    const lv = listview({ cols: [{ k: "id", t: "N° ficha", w: 105 }, { k: "nombre", t: "Colaborador" }, { k: "creada", t: "Registrada", f: r => U.fecha(r.creada), w: 95 }, { k: "falta", t: "Secciones pendientes" }, { k: "por", t: "Registrada por", w: 120 }], rows, sel: tab.sel, sort: tab.sort, empty: "No hay fichas incompletas." });
    return `<div class="dochead"><h2>Fichas incompletas</h2><span class="sub">${rows.length} ficha(s) con datos pendientes</span></div>
      <div class="bar warn"><b class="ic">⚠</b><span>Una ficha incompleta no puede pasar a estado Activo hasta completar los datos obligatorios de sus cinco secciones.</span></div>
      ${lv.html}<div class="actions"><button class="btn pri" id="iGo" ${puede("contrataciones.editar") ? "" : "disabled"}>Completar ficha</button></div>`;
  },
  mount(w, tab) {
    const open = id => { const f = DB.ficha(id); if (f) abrir(id, { edit: true, sec: secPendiente(f) }); };
    bindList(w, tab, { onOpen: open });
    $("#iGo").onclick = () => tab.sel ? open(tab.sel) : aviso("Seleccione una ficha", "<p>Haga clic en una fila de la lista y luego en «Completar ficha».</p>");
  },
};
HELP.incompletas = { t: "Fichas incompletas", html: "<p>Lista las fichas guardadas como borrador. Seleccione una y pulse <b>Completar ficha</b>: se abrirá en la primera sección pendiente.</p><p>Cuando se completan las cinco secciones y se pulsa <b>Registrar ficha</b>, el colaborador pasa a estado <b>Activo</b>.</p>" };

/* ---------- Ficha del colaborador (RF-CON-01 a 06 y 08 a 11) ---------- */
const CAMPOS = {
  personales: [["rut", "RUT", "rut", "", "12.345.678-5"], ["nombres", "Nombres", "text"], ["apPat", "Apellido paterno", "text"], ["apMat", "Apellido materno", "text"], ["fnac", "Fecha de nacimiento", "date"], ["nacionalidad", "Nacionalidad", CAT.nacionalidades], ["estadoCivil", "Estado civil", CAT.estadoCivil]],
  contacto: [["direccion", "Dirección", "text", "", "Calle, número, depto."], ["comuna", "Comuna", CAT.comunas], ["telefono", "Teléfono", "tel", "", "+56 9 1234 5678"], ["correo", "Correo personal", "email", "", "nombre@correo.cl"]],
  emergencia: [["emergencia.nombre", "Nombre del contacto", "text"], ["emergencia.parentesco", "Parentesco", CAT.parentesco], ["emergencia.telefono", "Teléfono del contacto", "tel", "", "+56 9 1234 5678"], ["emergencia.rut", "RUT del contacto", "rut", "", "Opcional"], ["emergencia.correo", "Correo del contacto", "email", "", "Opcional"]],
  cargo: [["cargo.cargo", "Cargo", CAT.cargos], ["cargo.departamento", "Departamento", CAT.departamentos], ["cargo.especialidad", "Especialidad", CAT.especialidades], ["cargo.jefatura", "Jefatura directa", "text"], ["cargo.contrato", "Tipo de contrato", CAT.contratos], ["cargo.jornada", "Jornada", CAT.jornadas], ["cargo.ingreso", "Fecha de ingreso", "date"], ["cargo.sueldo", "Sueldo base ($)", "number", "sensibles", "Ej.: 720000"], ["cargo.correoInst", "Correo institucional", "email", "", "nombre@instalum.cl"]],
  prevision: [["prevision.afp", "AFP", CAT.afp], ["prevision.salud", "Sistema de salud", CAT.salud], ["prevision.plan", "Plan de salud (UF)", "text", "", "Solo Isapre · Ej.: 3,2"], ["prevision.anioInicio", "Año inicio cotización", "text", "", "Ej.: 2015"], ["prevision.seguro", "Seguro complementario", ["No", "Sí"]], ["prevision.alergias", "Alergias o condiciones", "text", "", "Opcional"]],
};
const SENSIBLES = new Set(["cargo.sueldo", "prevision.afp", "prevision.salud", "prevision.plan", "prevision.anioInicio", "prevision.seguro", "prevision.alergias"]);
const CAMPO_TXT = p => (Object.values(CAMPOS).flat().find(c => c[0] === p) || [p, p])[1];
const setPath = (o, p, v) => { const k = p.split("."); let x = o; while (k.length > 1) x = x[k.shift()]; x[k[0]] = v; };
const esReq = (d, p) => FICHA.secciones.some(s => s.req.some(r => r[0] === p)) && FICHA.requerido(d, p);
const fonoFormato = v => { const n = String(v || "").replace(/\D/g, ""); if (/^9\d{8}$/.test(n)) return `+56 9 ${n.slice(1, 5)} ${n.slice(5)}`; if (/^569\d{8}$/.test(n)) return `+56 9 ${n.slice(3, 7)} ${n.slice(7)}`; if (/^2\d{8}$/.test(n)) return `+56 2 ${n.slice(1, 5)} ${n.slice(5)}`; if (/^562\d{8}$/.test(n)) return `+56 2 ${n.slice(3, 7)} ${n.slice(7)}`; return v; };
const desvinculadoConRut = (rut, idActual) => rut && U.rutValido(rut) ? DB.d.fichas.find(x => x.id !== idActual && x.estado === "Desvinculado" && U.rutLimpio(x.rut) === U.rutLimpio(rut)) : null;

VIEWS.ficha = {
  mod: () => "Contrataciones", permiso: t => (t.params && t.params.nueva ? "contrataciones.editar" : "contrataciones"),
  init(tab) {
    const p = tab.params;
    if (p.nueva) { tab.data = FICHA.vacia(); tab.mode = "nueva"; }
    else { const f = DB.ficha(p.id); if (!f) throw new Error("La ficha " + p.id + " no existe."); tab.data = U.clon(f); tab.mode = p.edit && puede("contrataciones.editar") && f.estado !== "Desvinculado" ? "editar" : "ver"; }
    tab.sec = p.sec || "personales"; tab.err = {}; tab.miss = new Set(); tab.dirty = false; p.edit = false; p.sec = null;
  },
  reparam(tab) {
    const p = tab.params;
    if (!tab.dirty && !p.nueva) { const f = DB.ficha(p.id); tab.data = U.clon(f); if (p.edit && puede("contrataciones.editar") && f.estado !== "Desvinculado") tab.mode = "editar"; }
    if (p.sec) tab.sec = p.sec; p.edit = false; p.sec = null;
  },
  title(tab) { return tab.mode === "nueva" ? (tab.data.id ? tab.data.id : "Nueva ficha") : `${tab.data.id} · ${String(tab.data.nombres).split(" ")[0]} ${tab.data.apPat}`; },
  hu(tab) { return { personales: "RF-CON-01 · Registrar ficha · RF-CON-02 · Validar el RUT · RF-CON-03 · Controlar duplicados · RF-CON-11 · ID automático", contacto: "RF-CON-01 · Registrar ficha de colaborador", emergencia: "RF-CON-04 · Registrar el contacto de emergencia", cargo: "RF-CON-05 · Registrar los datos del cargo", prevision: "RF-CON-06 · Registrar previsión y salud", capacitaciones: "RF-CON-10 · Consultar capacitaciones desde la ficha", historial: "RF-CON-08 · Modificar la ficha · RF-CON-09 · Gestionar el estado · RF-SEG-04 · Bitácora" }[tab.sec]; },
  tools(tab) {
    const ed = tab.mode !== "ver";
    return { nuevo: puede("contrataciones.editar") && (() => abrir("nueva")), guardar: ed && (() => this.registrar(tab)), deshacer: ed && tab.dirty && (() => this.deshacer(tab)), buscar: () => abrir("colaboradores") };
  },
  async deshacer(tab) {
    if (!await confirmar("¿Deshacer los cambios?", "<p>Se descartarán los cambios no guardados de este documento.</p>")) return;
    if (tab.mode === "nueva") tab.data = FICHA.vacia(); else tab.data = U.clon(DB.ficha(tab.data.id));
    tab.err = {}; tab.miss = new Set(); marcarSucio(tab, false); pintar();
  },
  campo(tab, [path, label, type, perm, ph]) {
    const d = tab.data, ro = tab.mode === "ver";
    if ((perm === "sensibles" || SENSIBLES.has(path)) && !puede("sensibles")) return `<div class="row"><label class="l">${E(label)}</label><div class="ctl"><input type="text" readonly value="Dato restringido por perfil"></div></div>`;
    let v = FICHA.get(d, path) ?? "";
    const req = !ro && esReq(d, path), bad = tab.err[path] || tab.miss.has(path);
    let dis = ro;
    let extra = "";
    if (path === "cargo.especialidad" && d.cargo.departamento !== "Construcción") { dis = true; v = ""; extra = `<span class="note muted">Solo aplica a Construcción</span>`; }
    if (path === "prevision.plan" && !/^Isapre/.test(d.prevision.salud || "")) { dis = true; extra = `<span class="note muted">Solo para Isapre</span>`; }
    const id = "f_" + path.replace(/\./g, "_");
    let ctl;
    if (Array.isArray(type)) ctl = `<select id="${id}" data-f="${path}" ${dis ? "disabled" : ""} class="${req ? "req" : ""} ${bad ? "err" : ""}"><option value="">${ro ? "" : "Seleccione…"}</option>${type.map(o => `<option ${o === v ? "selected" : ""}>${E(o)}</option>`).join("")}</select>`;
    else ctl = `<input id="${id}" type="${type === "rut" ? "text" : type === "number" ? "number" : type}" data-f="${path}" value="${E(v)}" ${dis ? (ro ? "readonly" : "disabled") : ""} placeholder="${E(ro ? "" : ph || "")}" class="${req ? "req" : ""} ${bad ? "err" : ""}" ${type === "rut" ? 'maxlength="12" style="flex:0 0 140px" data-rut="1"' : ""} ${type === "number" ? 'min="0" step="1000"' : ""} ${type === "date" ? `max="${U.hoy()}"` : ""} maxlength="${type === "rut" ? 12 : 80}">`;
    let note = extra;
    if (tab.err[path]) note = `<span class="note bad">✕ ${E(tab.err[path])}</span>`;
    else if (tab.miss.has(path)) note = `<span class="note bad">✕ Obligatorio</span>`;
    else if (path === "rut" && v && !ro && U.rutValido(v)) note = `<span class="note ok">✓ RUT válido · sin fichas duplicadas</span>`;
    return `<div class="row"><label class="l" for="${id}">${E(label)}</label><div class="ctl">${ctl}<span data-n="${path}">${note}</span></div></div>`;
  },
  render(tab) {
    if (tab.mode === "ver") { const f = DB.ficha(tab.data.id); if (f) tab.data = U.clon(f); }
    const d = tab.data, nueva = tab.mode === "nueva", ver = tab.mode === "ver";
    const secs = FICHA.secciones.map(s => [s.k, s.t, FICHA.faltantes(d, s).length === 0]);
    if (!nueva) secs.push(["capacitaciones", "Capacitaciones", null], ["historial", "Historial de cambios", null]);
    if (!secs.some(s => s[0] === tab.sec)) tab.sec = "personales";
    let body;
    if (tab.sec === "historial") body = `<div style="padding-top:10px">${listview({ cols: [{ k: "fecha", t: "Fecha y hora", w: 140, nosort: true }, { k: "usuario", t: "Usuario", w: 110, nosort: true }, { k: "accion", t: "Acción", w: 170, nosort: true }, { k: "detalle", t: "Detalle", nosort: true }], rows: [...d.historial].reverse().map((h, i) => ({ _id: "h" + i, ...h })), empty: "Sin cambios registrados." }).html}<p class="muted small">Los datos sensibles modificados se registran sin mostrar su valor.</p></div>`;
    else if (tab.sec === "capacitaciones") body = this.capacitaciones(d);
    else if (tab.sec === "prevision" && !puede("sensibles")) body = `<div class="bar warn" style="margin-top:12px"><b class="ic">⚠</b><span>La información de previsión y salud es un dato sensible. Su perfil no tiene permiso para verla.</span></div>`;
    else {
      const campos = CAMPOS[tab.sec], half = Math.ceil(campos.length / 2);
      body = `<div class="grid2" style="--lw:150px"><div>${campos.slice(0, half).map(c => this.campo(tab, c)).join("")}</div><div>${campos.slice(half).map(c => this.campo(tab, c)).join("")}</div></div>
        ${!ver ? `<p class="muted small" style="margin:6px 0 0">Los campos con fondo amarillo son obligatorios. ${tab.sec === "personales" ? "Los datos personales son necesarios para guardar el borrador." : "Puede guardar un borrador y completar esta sección después: la ficha quedará «Incompleta»."}</p>` : ""}`;
    }
    const aviso = !nueva && d.estado === "Incompleta" ? `<div class="bar warn"><b class="ic">⚠</b><span>Ficha incompleta. Pendiente: ${E(FICHA.secciones.filter(s => FICHA.faltantes(d, s).length).map(s => s.t).join(", "))}.</span></div>`
      : (!nueva && d.estado === "Desvinculado" ? `<div class="bar info"><b class="ic">i</b><span>Desvinculado: ${E(d.motivoEstado)}. La ficha se conserva solo para consulta; para modificarla, cambie su estado a Activo (reactivación).</span></div>`
        : (!nueva && d.motivoEstado && d.estado !== "Activo" ? `<div class="bar info"><b class="ic">i</b><span>${E(d.estado)}: ${E(d.motivoEstado)}</span></div>` : ""));
    const errG = Object.keys(tab.err).length || tab.miss.size ? `<div class="bar err"><b class="ic">✕</b><span>Revise los campos marcados en rojo.</span></div>` : "";
    const ed = puede("contrataciones.editar"), orden = FICHA.secciones.map(s => s.k), sig = orden.indexOf(tab.sec) >= 0 && orden.indexOf(tab.sec) < orden.length - 1;
    const borr = nueva || d.estado === "Incompleta";
    const btns = ver ? `${ed && d.estado !== "Desvinculado" ? `<button class="btn pri" data-a="editar">Editar</button>` : ""}${ed ? `<button class="btn" data-a="estado">Cambiar estado…</button><button class="btn" data-a="eliminar">Eliminar ficha…</button>` : ""}<button class="btn" data-a="cerrar">Cerrar</button>`
      : `<button class="btn pri" data-a="registrar">${borr ? "Registrar ficha (F2)" : "Guardar cambios (F2)"}</button>${borr ? `<button class="btn" data-a="borrador">Guardar borrador</button>` : ""}${sig ? `<button class="btn" data-a="sig">Siguiente sección ›</button>` : ""}<button class="btn" data-a="${nueva ? "cancelar" : "cancelarEd"}">${nueva ? "Cancelar" : "Cancelar edición"}</button>`;
    return `<div class="dochead"><h2>${nueva ? "Ficha del colaborador" : E(FICHA.nombre(d))}</h2><span class="sub">${nueva ? (d.id ? `Borrador ${E(d.id)}` : "Registro nuevo · sin guardar") : `${E(d.id)} · RUT ${E(d.rut)} · ${E(d.cargo.cargo || "Sin cargo")}${tab.mode === "editar" ? " · <b>modo edición</b>" : ""}`}</span>
      <span class="r"><label class="muted small" for="fId">N° de ficha</label><input type="text" id="fId" readonly value="${d.id ? E(d.id) : "(automático)"}" style="width:120px;cursor:not-allowed" title="El identificador es generado por el sistema">${nueva ? "" : pill(d.estado)}</span></div>
      ${aviso}${errG}
      <div class="itabs">${secs.map(([k, t, ok]) => `<button class="itab ${k === tab.sec ? "on" : ""}" data-sec="${k}">${t}${ok === null ? "" : `<span class="dot ${ok ? "ok" : "bad"}" title="${ok ? "Completa" : "Pendiente"}"></span>`}</button>`).join("")}</div>
      <div class="ipane">${body}</div>
      <div class="actions" style="flex-wrap:wrap">${btns}</div>`;
  },
  /* RF-CON-10: últimas 5 capacitaciones desde la ficha */
  capacitaciones(d) {
    const ins = DB.d.inscripciones.filter(i => i.ficha === d.id).map(i => { const c = DB.cap(i.cap) || {}, v = DB.version(i.version); const ce = DB.d.certificaciones.find(x => x.ficha === d.id && x.cap === i.cap && (!v || x.emision === v.fecha)); return { _id: i.id, nombre: c.nombre || i.cap, fecha: v ? v.fecha : i.fecha, estado: i.estado, nota: CAPR.notaTxt(i), cert: ce ? `${CAPR.certEstado(ce)}${ce.vence ? " · vence " + U.fecha(ce.vence) : ""}` : "—", certE: ce ? CAPR.certEstado(ce) : "" }; })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 5);
    const h = CAPR.habilitacion(d);
    const hab = !h.aplica ? "" : h.habilitado ? `<div class="bar ok"><b class="ic">✓</b><span>Habilitado para trabajar en obra: cumple las capacitaciones obligatorias de ${E(d.cargo.especialidad)}.</span></div>` : `<div class="bar warn"><b class="ic">⚠</b><span>No habilitado para obra. Le falta: ${E(h.faltan.join(", "))}.</span></div>`;
    const lv = ins.length ? listview({ cols: [{ k: "nombre", t: "Capacitación", nosort: true }, { k: "fecha", t: "Fecha", f: r => U.fecha(r.fecha), w: 95, nosort: true }, { k: "estado", t: "Resultado", f: r => pill(r.estado), w: 150, nosort: true }, { k: "nota", t: "Nota prueba", w: 85, nosort: true }, { k: "cert", t: "Certificación", f: r => r.certE ? `${pill(r.certE)} <span class="muted small">${E(r.cert.replace(/^[^·]*·?\s?/, ""))}</span>` : "—", nosort: true }], rows: ins }).html : `<div class="empty" style="border:1px solid #DDD">Sin capacitaciones registradas.</div>`;
    return `<div style="padding-top:10px">${hab}<p class="muted small" style="margin:4px 0 8px">Últimas 5 capacitaciones del colaborador.</p>${lv}
      <div class="actions">${puede("capacitaciones") ? `${d.estado === "Activo" ? `<button class="btn pri" data-a="addcap">Añadir capacitación…</button>` : ""}<button class="btn" data-a="histcap">Ver historial completo…</button>` : `<span class="muted small">Para asignar capacitaciones se requiere el permiso del módulo de Capacitaciones.</span>`}</div></div>`;
  },
  mount(w, tab) {
    $$("[data-sec]", w).forEach(b => b.onclick = () => { guardarScroll(); tab.sec = b.dataset.sec; tab.focused = false; pintar(); });
    $("#fId").onclick = $("#fId").onfocus = () => setStatus("El identificador es generado por el sistema.");
    $("#fId").onclick = () => { setStatus("El identificador es generado por el sistema."); aviso("N° de ficha", "<p>El identificador es generado por el sistema de forma automática y correlativa al guardar la ficha. No se puede ingresar ni modificar.</p>"); };
    $$("[data-f]", w).forEach(el => {
      const path = el.dataset.f;
      if (el.dataset.rut) filtroRut(el);
      const upd = () => {
        if (!el.isConnected || tab.mode === "ver" || !ST.tabs.includes(tab)) return;
        let v = el.value; if (el.type === "number" && v !== "") v = +v;
        setPath(tab.data, path, v); marcarSucio(tab);
        if (tab.miss.has(path) && String(v).trim()) { tab.miss.delete(path); el.classList.remove("err"); const n = $(`[data-n="${path}"]`, w); if (n) n.innerHTML = ""; }
      };
      el.oninput = upd;
      el.onchange = () => {
        if (!el.isConnected || tab.mode === "ver") return;
        upd();
        if (path === "cargo.departamento") { if (tab.data.cargo.departamento !== "Construcción") tab.data.cargo.especialidad = ""; this.repintar(tab, path); }
        else if (path === "prevision.salud") { if (!/^Isapre/.test(tab.data.prevision.salud)) tab.data.prevision.plan = ""; this.repintar(tab, path); }
        else if (el.tagName === "SELECT") this.validarCampo(tab, el, w);
      };
      if (el.tagName !== "SELECT") el.onblur = () => {
        if (!el.isConnected || tab.mode === "ver") return;
        if (el.dataset.rut && el.value.trim()) { el.value = U.rutFormato(el.value); setPath(tab.data, path, el.value); }
        if (el.type === "tel" && el.value.trim()) { el.value = fonoFormato(el.value.trim()); setPath(tab.data, path, el.value); }
        if (el.type === "text" && !el.dataset.rut) { const t = el.value.replace(/\s+/g, " ").trim(); if (t !== el.value) { el.value = t; setPath(tab.data, path, t); } }
        this.validarCampo(tab, el, w);
        if (path === "rut") { const dv = desvinculadoConRut(el.value, tab.data.id); if (dv && !tab.avisoDv) { tab.avisoDv = true; this.ofrecerReactivar(tab, dv); } }
      };
    });
    $$("[data-a]", w).forEach(b => b.onclick = () => this.accion(tab, b.dataset.a));
    if (tab.mode !== "ver" && !tab.focused) { const first = $("[data-f]:not([readonly]):not(:disabled)", w); if (first) first.focus({ preventScroll: true }); tab.focused = true; }
  },
  repintar(tab, path) { guardarScroll(); pintar(); const el = $(`[data-f="${path}"]`); if (el) el.focus({ preventScroll: true }); },
  validarCampo(tab, el, w) {
    const path = el.dataset.f, e = FICHA.validar(tab.data, tab.data.id || null)[path];
    const n = $(`[data-n="${path}"]`, w); if (!n) return;
    if (e) { tab.err[path] = e; el.classList.add("err"); n.innerHTML = `<span class="note bad">✕ ${E(e)}</span>`; }
    else {
      delete tab.err[path]; if (!tab.miss.has(path)) el.classList.remove("err");
      n.innerHTML = path === "rut" && el.value && U.rutValido(el.value) ? `<span class="note ok">✓ RUT válido · sin fichas duplicadas</span>` : (tab.miss.has(path) ? n.innerHTML : "");
    }
  },
  async ofrecerReactivar(tab, dv) {
    const r = await dialog({ icon: "warn", head: "El RUT pertenece a un colaborador desvinculado", html: `<p>Existe la ficha <b>${E(dv.id)}</b> de <b>${E(FICHA.nombre(dv))}</b> en estado ${pill("Desvinculado")}.</p><p>No se crea una ficha nueva para el mismo RUT: puede reactivar la ficha existente y actualizar sus datos.</p>`,
      buttons: [{ label: "Abrir ficha para reactivar", pri: true, value: "r" }, { label: "Volver" }] });
    if (r === "r") { if (tab.mode === "nueva" && !tab.data.id) { tab.dirty = false; cerrarTabSinPreguntar(tab); } abrir(dv.id); setTimeout(() => this.cambiarEstado(ST.tabs.find(t => t.key === dv.id), "Activo"), 0); }
  },
  async accion(tab, a) {
    const orden = FICHA.secciones.map(s => s.k);
    if (a === "registrar") return this.registrar(tab);
    if (a === "borrador") return this.borrador(tab);
    if (a === "sig") { tab.sec = orden[Math.min(orden.length - 1, orden.indexOf(tab.sec) + 1)]; tab.focused = false; $("#work").scrollTop = 0; tab.scroll = 0; return pintar(); }
    if (a === "cancelar" || a === "cerrar") return cerrarTab(tab.key);
    if (a === "histcap") return abrir("histcap:" + tab.data.id);
    if (a === "addcap") return abrir("asignar", { ficha: tab.data.id });
    if (a === "editar") { tab.mode = "editar"; tab.focused = false; if (tab.sec === "historial" || tab.sec === "capacitaciones") tab.sec = "personales"; return pintar(); }
    if (a === "cancelarEd") {
      if (tab.dirty && !await confirmar("¿Cancelar la edición?", "<p>Se descartarán los cambios no guardados.</p>", "Descartar cambios", "Seguir editando")) return;
      tab.data = U.clon(DB.ficha(tab.data.id)); tab.mode = "ver"; tab.err = {}; tab.miss = new Set(); marcarSucio(tab, false); return pintar();
    }
    if (a === "estado") return this.cambiarEstado(tab);
    if (a === "eliminar") {
      DB.log(ST.user.user, "Contrataciones", "Intento de eliminación bloqueado", `${tab.data.id} · las fichas no se eliminan (baja lógica)`);
      return aviso("Las fichas no se eliminan", `<p>Por trazabilidad, la ficha <b>${E(tab.data.id)}</b> no se puede eliminar del sistema.</p><p>Para dar de baja al colaborador use <b>Cambiar estado › Desvinculado</b>: la ficha y su historial se conservan para consulta.</p><p class="muted small">El intento quedó registrado en la bitácora.</p>`, "warn");
    }
  },
  normalizar(d) {
    d.rut = d.rut ? U.rutFormato(d.rut) : "";
    if (d.emergencia.rut) d.emergencia.rut = U.rutFormato(d.emergencia.rut);
    ["nombres", "apPat", "apMat", "direccion"].forEach(k => d[k] = String(d[k] || "").trim().replace(/\s+/g, " "));
    ["telefono"].forEach(k => d[k] = fonoFormato(String(d[k] || "").trim())); d.emergencia.telefono = fonoFormato(String(d.emergencia.telefono || "").trim());
    d.correo = String(d.correo || "").trim(); d.cargo.correoInst = String(d.cargo.correoInst || "").trim();
    if (d.cargo.departamento !== "Construcción") d.cargo.especialidad = "";
    if (!/^Isapre/.test(d.prevision.salud || "")) d.prevision.plan = "";
  },
  /* valida: errores de formato en cualquier campo + obligatorios de las secciones indicadas */
  async validar(tab, secciones) {
    const d = tab.data; this.normalizar(d);
    tab.err = FICHA.validar(d, d.id || null); tab.miss = new Set(); const faltan = [];
    for (const s of FICHA.secciones.filter(s => secciones.includes(s.k))) for (const [p, t] of s.req) if (FICHA.requerido(d, p) && !String(FICHA.get(d, p) ?? "").trim()) { tab.miss.add(p); faltan.push(`${s.t}: ${t}`); }
    const errs = Object.entries(tab.err);
    if (!faltan.length && !errs.length) return true;
    const sec = FICHA.secciones.find(s => s.req.some(([p]) => tab.miss.has(p)) || (CAMPOS[s.k] || []).some(c => tab.err[c[0]]));
    if (sec) { tab.sec = sec.k; tab.focused = false; } pintar();
    await dialog({ icon: "err", head: "No se puede guardar la ficha", html: `${faltan.length ? `<p>Complete los campos obligatorios:</p><ul>${faltan.slice(0, 12).map(f => `<li>${E(f)}</li>`).join("")}${faltan.length > 12 ? `<li>… y ${faltan.length - 12} más</li>` : ""}</ul>` : ""}${errs.length ? `<p>Corrija los siguientes datos:</p><ul>${errs.map(([k, m]) => `<li>${E(CAMPO_TXT(k))}: ${E(m)}</li>`).join("")}</ul>` : ""}` });
    return false;
  },
  async bloqueoDesvinculado(tab) {
    const dv = desvinculadoConRut(tab.data.rut, tab.data.id);
    if (dv) { await this.ofrecerReactivar(tab, dv); return true; }
    return false;
  },
  /* Guardar borrador: exige los datos personales válidos, asigna el ID y deja la ficha Incompleta (RF-CON-01 y RF-CON-11) */
  async borrador(tab) {
    if (!await this.validar(tab, ["personales"])) return;
    if (await this.bloqueoDesvinculado(tab)) return;
    const d = tab.data;
    if (FICHA.completa(d)) {
      const r = await dialog({ icon: "info", head: "La ficha está completa", html: "<p>Todas las secciones obligatorias tienen datos. ¿Desea registrarla como <b>Activa</b> en lugar de guardarla como borrador?</p>", buttons: [{ label: "Registrar ficha", pri: true, value: "r" }, { label: "Guardar como borrador", value: "b" }, { label: "Cancelar" }] });
      if (r === "r") return this.registrar(tab); if (r !== "b") return;
    }
    this.persistir(tab, "Incompleta");
  },
  /* Registrar ficha (F2): exige las cinco secciones completas y válidas; queda Activo */
  async registrar(tab) {
    const d = tab.data, borr = tab.mode === "nueva" || d.estado === "Incompleta";
    if (!borr) return this.guardarCambios(tab);
    if (!puede("sensibles")) { const r = await dialog({ icon: "warn", head: "Se requiere permiso de datos sensibles", html: "<p>Para registrar la ficha como activa se deben completar el sueldo y la previsión, que son datos sensibles. Su perfil puede guardarla como borrador.</p>", buttons: [{ label: "Guardar borrador", pri: true, value: "b" }, { label: "Cancelar" }] }); if (r === "b") this.borrador(tab); return; }
    if (!await this.validar(tab, FICHA.secciones.map(s => s.k))) return;
    if (await this.bloqueoDesvinculado(tab)) return;
    this.persistir(tab, "Activo");
  },
  async persistir(tab, estado) {
    const d = tab.data, u = ST.user.user, nuevo = !d.id || !DB.ficha(d.id);
    if (nuevo) {
      d.id = DB.nuevoId(); d.estado = estado; d.creada = U.hoy(); d.creadaPor = u;
      d.historial = [{ fecha: U.ahora(), usuario: u, accion: "Registro de ficha", detalle: estado === "Activo" ? "Ficha registrada completa (Activo)" : "Ficha guardada como borrador (Incompleta)" }];
      DB.d.fichas.push(U.clon(d));
      DB.log(u, "Contrataciones", "Registro de ficha", `${d.id} · ${FICHA.nombre(d)}${estado === "Activo" ? "" : " (borrador incompleto)"}`);
    } else {
      const orig = DB.ficha(d.id), cambios = this.diferencias(orig, d);
      const ant = orig.estado; d.estado = estado; if (estado === "Activo") d.motivoEstado = "";
      if (ant !== estado) cambios.push(`Estado: «${ant}» → «${estado}»${estado === "Activo" ? " (ficha completada)" : ""}`);
      d.historial = orig.historial.concat(cambios.map(c => ({ fecha: U.ahora(), usuario: u, accion: c.startsWith("Estado") ? "Cambio de estado" : "Modificación de ficha", detalle: c })));
      Object.assign(orig, U.clon(d));
      DB.log(u, "Contrataciones", estado === "Activo" && ant !== "Activo" ? "Registro de ficha" : "Modificación de ficha", `${d.id} · ${cambios.length} cambio(s)${estado === "Activo" && ant !== "Activo" ? " · ficha completada (Activo)" : ""}`);
    }
    const asign = estado === "Activo" ? asignarObligatoriasFicha(d.id) : [];
    marcarSucio(tab, false);
    const pend = FICHA.secciones.filter(s => FICHA.faltantes(d, s).length).map(s => s.t);
    const r = await dialog({ icon: "ok", head: estado === "Activo" ? "Ficha registrada correctamente" : "Borrador guardado", html: `<p>N° de ficha: <b>${E(d.id)}</b> <span class="muted small">(generado por el sistema)</span><br>Colaborador: ${E(FICHA.nombre(d))}<br>Estado: ${pill(d.estado)}<br>Registrada por: ${E(u)} · ${U.ahora()}</p>
      ${pend.length ? `<div class="bar warn"><b class="ic">⚠</b><span>Pendiente: ${E(pend.join(", "))}. Puede completarla desde «Fichas incompletas».</span></div>` : ""}
      ${asign.length ? `<div class="bar info"><b class="ic">i</b><span>Capacitaciones obligatorias asignadas automáticamente: ${E(asign.join("; "))}.</span></div>` : ""}`,
      buttons: [{ label: "Abrir ficha", pri: true, value: "a" }, ...(puede("contrataciones.editar") ? [{ label: "Nueva ficha", value: "n" }] : [])] });
    cerrarTabSinPreguntar(tab);
    if (r === "n") abrir("nueva"); else abrir(d.id);
  },
  diferencias(orig, d) {
    const cambios = [];
    for (const c of Object.values(CAMPOS).flat()) {
      const a = FICHA.get(orig, c[0]) ?? "", b = FICHA.get(d, c[0]) ?? "";
      if (String(a) !== String(b)) cambios.push(SENSIBLES.has(c[0]) ? `${c[1]}: dato sensible modificado` : `${c[1]}: «${c[2] === "date" ? U.fecha(a) : a || "vacío"}» → «${c[2] === "date" ? U.fecha(b) : b || "vacío"}»`);
    }
    return cambios;
  },
  /* RF-CON-08: modificar una ficha activa o con licencia (debe quedar completa) */
  async guardarCambios(tab) {
    if (!await this.validar(tab, FICHA.secciones.map(s => s.k))) return;
    const d = tab.data, orig = DB.ficha(d.id), cambios = this.diferencias(orig, d);
    if (!cambios.length) { tab.mode = "ver"; marcarSucio(tab, false); tab.msg = "No hubo cambios que guardar."; return pintar(); }
    const espCambio = orig.cargo.especialidad !== d.cargo.especialidad || orig.cargo.departamento !== d.cargo.departamento;
    d.historial = orig.historial.concat(cambios.map(c => ({ fecha: U.ahora(), usuario: ST.user.user, accion: "Modificación de ficha", detalle: c })));
    Object.assign(orig, U.clon(d));
    DB.log(ST.user.user, "Contrataciones", "Modificación de ficha", `${d.id} · ${cambios.length} cambio(s)`);
    const asign = espCambio && orig.estado === "Activo" ? asignarObligatoriasFicha(d.id) : [];
    tab.mode = "ver"; marcarSucio(tab, false); pintar();
    await dialog({ icon: "ok", head: "Cambios guardados", html: `<p>Se guardaron ${cambios.length} cambio(s) en la ficha ${E(d.id)}:</p><ul>${cambios.slice(0, 8).map(c => `<li>${E(c)}</li>`).join("")}</ul>${cambios.length > 8 ? "<p>…</p>" : ""}<p class="muted small">Quedaron en la pestaña «Historial de cambios».</p>${asign.length ? `<div class="bar info"><b class="ic">i</b><span>Por el cambio de especialidad se asignaron: ${E(asign.join("; "))}.</span></div>` : ""}` });
  },
  /* RF-CON-09: Activo, Licencia o Desvinculado con fecha y motivo */
  async cambiarEstado(tab, pre) {
    if (!tab) return;
    if (tab.dirty) return aviso("Guarde o cancele la edición", "<p>Antes de cambiar el estado, guarde o cancele los cambios en curso de la ficha.</p>", "warn");
    const f = DB.ficha(tab.data.id), completa = FICHA.completa(f);
    const ops = CAT.estadosFicha.filter(e => e !== f.estado);
    const r = await dialog({ icon: "info", title: "Cambiar estado — " + f.id, head: "Cambiar estado del colaborador",
      html: `<p>${E(FICHA.nombre(f))} · estado actual: ${pill(f.estado)}</p><div id="ceMsg"></div>
      <div class="row" style="--lw:110px"><label class="l" for="ceE">Nuevo estado</label><div class="ctl"><select id="ceE" class="req">${opts(ops, pre || "")}</select></div></div>
      <div class="row" style="--lw:110px"><label class="l" for="ceF">Desde</label><div class="ctl"><input type="date" id="ceF" class="req" value="${U.hoy()}"></div></div>
      <div class="row" style="--lw:110px;align-items:flex-start"><label class="l" for="ceM">Motivo</label><div class="ctl"><textarea id="ceM" rows="3" class="req" maxlength="200" placeholder="Ej.: Licencia médica, término de contrato, reincorporación"></textarea></div></div>
      <p class="muted small">Desvinculado es una baja lógica: la ficha y su historial se conservan. Con Licencia, el colaborador no se puede inscribir en capacitaciones.</p>`,
      buttons: [{ label: "Aceptar", pri: true, value: "ok", onClick: v => {
        const e = $("#ceE", v).value, fe = $("#ceF", v).value, m = $("#ceM", v).value.trim(), err = t => barErr($("#ceMsg", v), t);
        if (e === "Activo" && !completa) return err("No se puede activar: la ficha está incompleta. Complete primero sus datos.");
        if (e === "Activo" && f.estado === "Desvinculado") { const dup = DB.d.fichas.find(x => x.id !== f.id && x.estado !== "Desvinculado" && U.rutLimpio(x.rut) === U.rutLimpio(f.rut)); if (dup) return err(`No se puede reactivar: el RUT ya está en la ficha ${dup.id}.`); }
        if (!fe) return err("Indique la fecha desde la que rige el estado.");
        if (fe < f.cargo.ingreso) return err("La fecha no puede ser anterior al ingreso del colaborador (" + U.fecha(f.cargo.ingreso) + ").");
        if (!m) return err("Indique el motivo del cambio de estado.");
        const ant = f.estado; f.estado = e; f.motivoEstado = `${m} (desde ${U.fecha(fe)})`;
        f.historial.push({ fecha: U.ahora(), usuario: ST.user.user, accion: e === "Activo" && ant === "Desvinculado" ? "Reactivación" : "Cambio de estado", detalle: `«${ant}» → «${e}» desde ${U.fecha(fe)} · ${m}` });
        let extra = "";
        if (e === "Desvinculado") {
          const canc = DB.d.inscripciones.filter(i => i.ficha === f.id && ["Inscrito", "Pendiente (sin cupo)"].includes(i.estado));
          canc.forEach(i => i.estado = "Cancelada"); if (canc.length) extra = ` · ${canc.length} inscripción(es) cancelada(s)`;
        }
        DB.log(ST.user.user, "Contrataciones", "Cambio de estado", `${f.id} · ${ant} → ${e}${extra}`); return true;
      } }, { label: "Cancelar" }] });
    if (r === "ok") {
      const asign = f.estado === "Activo" ? asignarObligatoriasFicha(f.id) : [];
      tab.data = U.clon(f); tab.msg = `Estado actualizado a ${f.estado}.`; pintar();
      if (asign.length) aviso("Capacitaciones obligatorias asignadas", `<p>${E(asign.join("; "))}.</p>`);
    }
  },
};
/* asigna las obligatorias de su especialidad a una ficha activa (RF-CAP-10 · RF-CAP-02) */
function asignarObligatoriasFicha(id) {
  const f = DB.ficha(id), out = [];
  if (!f || f.estado !== "Activo" || f.cargo.departamento !== "Construcción") return out;
  for (const c of CAPR.obligatoriasPara(f.cargo.especialidad)) {
    const r = CAPR.asignarObligatoria(c, ST.user.user, id);
    if (r.asignados.length) out.push(c.nombre); if (r.pendientes.length) out.push(c.nombre + " (pendiente: sin cupos)");
  }
  if (out.length) DB.log(ST.user.user, "Capacitaciones", "Asignación automática", `${id} · ${out.join("; ")}`);
  return out;
}
HELP.ficha = { t: "Ficha del colaborador", html: `<p>La ficha tiene cinco secciones: <b>Datos personales</b>, <b>Contacto</b>, <b>Contacto de emergencia</b>, <b>Cargo y contrato</b> y <b>Previsión y salud</b>. El punto verde indica una sección completa; el amarillo, pendiente.</p>
<ul><li><b>Guardar borrador</b>: requiere los datos personales válidos. Asigna el N° de ficha y la deja «Incompleta».</li><li><b>Registrar ficha (F2)</b>: requiere las cinco secciones completas. El colaborador queda «Activo» y se le asignan las capacitaciones obligatorias de su especialidad.</li>
<li>El <b>RUT</b> se valida con el dígito verificador y solo acepta números, puntos, guion y K. No se permiten dos fichas con el mismo RUT; si pertenece a un desvinculado, se ofrece reactivarlo.</li><li>El <b>N° de ficha</b> lo genera el sistema y no se puede modificar.</li>
<li>La <b>especialidad</b> es obligatoria solo para el departamento de Construcción. El <b>plan de salud</b> solo aplica a Isapre.</li><li>Los datos de sueldo y previsión solo los ven los perfiles con permiso de datos sensibles.</li>
<li>Las fichas no se eliminan: use <b>Cambiar estado › Desvinculado</b>. Todos los cambios quedan en «Historial de cambios».</li></ul>` };
