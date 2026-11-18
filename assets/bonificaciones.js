/* SGRH Instalum · módulo de Bonificaciones (RF-BON-01 a RF-BON-13) */
"use strict";
const periodosBon = () => Object.keys(DB.d.fuente).sort();
const optsPer = (sel, lista = periodosBon()) => opts(lista.map(p => [p, U.mes(p)]), sel);
const cerrado = per => { const c = BON.calculo(DB.d, per); return !!c && ["Aprobado", "Registrado para pago"].includes(c.estado); };
const perDefecto = () => { const ps = periodosBon(); return ps.find(p => !cerrado(p)) || ps[ps.length - 1]; };
const bonView = o => Object.assign({ mod: () => "Bonificaciones", permiso: "bonificaciones" }, o);

/* ---------- Importar encuestas (RF-BON-01, 02 y 10) ---------- */
VIEWS.importar = bonView({
  title: () => "Importar encuestas", hu: () => "RF-BON-01 · Importar las encuestas · RF-BON-02 · Registrar los rechazos · RF-BON-10 · Controlar fallas y duplicidades",
  init(tab) { tab.per = U.periodo(-1); if (!DB.d.fuente[tab.per]) tab.per = perDefecto(); tab.ult = null; },
  tools(tab) { return { nuevo: () => this.importar(tab), exportar: () => { const imp = this.ultima(tab); if (!imp || !imp.rechazadas.length) return aviso("Sin rechazos", "<p>No hay rechazos que exportar para este período.</p>"); pedirFormato({ titulo: `Rechazos de importación ${U.mes(tab.per)}`, modulo: "Bonificaciones", lineas: [`Lote ${imp.lote} · importado el ${imp.fecha} por ${imp.usuario}`], columnas: [{ t: "Encuesta" }, { t: "Proyecto" }, { t: "Cliente" }, { t: "Calificación" }, { t: "Motivo del rechazo" }], filas: imp.rechazadas.map(r => [r.id, r.proyecto, r.cliente, U.num1(r.calificacion), r.motivo]) }); } }; },
  ultima(tab) { const l = DB.d.importaciones.filter(i => i.periodo === tab.per); return l[l.length - 1]; },
  render(tab) {
    const src = DB.d.fuente[tab.per], imps = DB.d.importaciones.filter(i => i.periodo === tab.per), imp = imps[imps.length - 1];
    const acept = DB.d.encuestas.filter(e => e.periodo === tab.per).length;
    const r = tab.ult && tab.ult.periodo === tab.per ? tab.ult : null;
    const corr = src.encuestas.filter(e => e.corregible && !DB.d.encuestas.some(x => x.id === e.id)).length;
    const res = r ? (r.error ? `<div class="bar err"><b class="ic">✕</b><span>${E(r.error)}</span></div>` : `<div class="bar ${r.rechazadas.length ? "warn" : "ok"}"><b class="ic">${r.rechazadas.length ? "⚠" : "✓"}</b><span>Importación de ${E(r.lote)}: ${r.recibidas} recibidas · <b>${r.aceptadas} aceptadas</b> · ${r.rechazadas.length} rechazadas${r.omitidas ? ` · ${r.omitidas} ya importadas (omitidas)` : ""}.</span></div>`) : "";
    const lvR = imp ? listview({ cols: [{ k: "id", t: "Encuesta", w: 100, nosort: true }, { k: "proyecto", t: "Proyecto", w: 90, nosort: true }, { k: "cliente", t: "Cliente", nosort: true }, { k: "cal", t: "Calificación", num: true, w: 90, nosort: true }, { k: "motivo", t: "Motivo del rechazo", nosort: true }], rows: imp.rechazadas.map((x, i) => ({ _id: "r" + i, ...x, cal: U.num1(x.calificacion) })), empty: "La última importación no tuvo rechazos." }) : null;
    const lvH = listview({ cols: [{ k: "fecha", t: "Fecha", w: 130, nosort: true }, { k: "usuario", t: "Usuario", w: 100, nosort: true }, { k: "recibidas", t: "Recibidas", num: true, nosort: true }, { k: "aceptadas", t: "Aceptadas", num: true, nosort: true }, { k: "rech", t: "Rechazadas", num: true, nosort: true }, { k: "omitidas", t: "Omitidas", num: true, nosort: true }],
      rows: imps.map((x, i) => ({ _id: "h" + i, ...x, rech: x.rechazadas.length })).reverse(), empty: "El lote de este período aún no se importa." });
    return `<div class="dochead"><h2>Importar encuestas de servicio</h2><span class="sub">Desde el sistema informático actual de Instalum</span></div>
    <div class="filters"><label>Período <select id="bP">${optsPer(tab.per)}</select></label><button class="btn pri" id="bImp" ${cerrado(tab.per) ? "disabled" : ""}>${imps.length ? "Volver a importar el lote" : "Importar lote"}</button></div>
    <p class="muted">Lote <b>${E(src.lote)}</b> · ${src.encuestas.length} encuesta(s) en el sistema de origen · ${acept} aceptada(s) en SGRH${cerrado(tab.per) ? " · <b>período cerrado (cálculo aprobado)</b>" : ""}</p>
    <div class="sim"><b>Simulador del sistema informático actual</b> (solo para la demostración) · Servicio: ${DB.d.config.servicio ? pill("Disponible", "ok") : pill("No disponible", "err")} <button class="link" id="simTog">${DB.d.config.servicio ? "Simular caída" : "Restablecer"}</button>
      ${corr ? ` · <button class="link" id="simCorr">Corregir ${corr} encuesta(s) rechazada(s) en el origen</button>` : ""}${src.tardia ? ` · <button class="link" id="simTard">Agregar una encuesta tardía al lote</button>` : ""}</div>
    ${res}
    ${imp ? `<h3 style="font-size:14px;margin:14px 0 6px">Rechazos de la última importación (${imp.rechazadas.length})</h3>${lvR.html}` : ""}
    <h3 style="font-size:14px;margin:14px 0 6px">Historial de importaciones del período</h3>${lvH.html}`;
  },
  mount(w, tab) {
    $("#bP").onchange = e => { tab.per = e.target.value; tab.ult = null; pintar(); };
    $("#bImp").onclick = () => this.importar(tab);
    bindSimulador(w);
    const src = DB.d.fuente[tab.per];
    const c = $("#simCorr"); if (c) c.onclick = () => {
      const ids = new Set();
      src.encuestas = src.encuestas.filter(e => { if (ids.has(e.id)) return false; ids.add(e.id); return true; });
      src.encuestas.forEach(e => { if (e.corregible && !DB.d.encuestas.some(x => x.id === e.id)) { Object.assign(e, e.corregible); delete e.corregible; } });
      DB.guardar(); tab.msg = "Se corrigieron las encuestas en el sistema de origen. Vuelva a importar el lote."; pintar();
    };
    const t = $("#simTard"); if (t) t.onclick = () => { src.encuestas.push(src.tardia); delete src.tardia; DB.guardar(); tab.msg = "Se agregó una encuesta tardía al lote de origen. Vuelva a importar."; pintar(); };
  },
  importar(tab) {
    const per = tab.per, src = DB.d.fuente[per];
    if (cerrado(per)) { tab.ult = { periodo: per, error: `El período ${U.mes(per)} está cerrado: su cálculo ya fue aprobado. No se pueden importar más encuestas.` }; return pintar(); }
    const r = BON.importar(DB.d, per, ST.user.user);
    if (r.error === "servicio") { DB.log(ST.user.user, "Bonificaciones", "Falla de importación", `Lote ${src.lote} · sistema de origen no disponible`); tab.ult = { periodo: per, error: "El sistema informático actual no está disponible. No se importó ninguna encuesta; reintente más tarde. La falla quedó registrada en la bitácora." }; return pintar(); }
    if (r.error === "procesado") { DB.log(ST.user.user, "Bonificaciones", "Importación duplicada evitada", `Lote ${src.lote} ya procesado · ${r.res.omitidas} omitidas`); tab.ult = { periodo: per, error: `El lote ${src.lote} ya fue procesado: no hay encuestas nuevas. Las ${r.res.omitidas} encuestas ya importadas no se duplicaron.` }; return pintar(); }
    const res = r.res; tab.ult = res;
    const c = BON.calculo(DB.d, per); if (c && c.estado !== "Aprobado" && res.aceptadas) c.desactualizado = true;
    DB.log(ST.user.user, "Bonificaciones", "Importación de encuestas", `Lote ${res.lote} · ${res.aceptadas} aceptadas · ${res.rechazadas.length} rechazadas${res.omitidas ? ` · ${res.omitidas} omitidas` : ""}`);
    pintar();
  },
});
HELP.importar = { t: "Importar encuestas", html: "<ul><li>Elija el período y pulse <b>Importar lote</b>. El sistema trae las encuestas del sistema informático actual.</li><li>Se rechazan y listan con su motivo: encuestas sin proyecto, de proyectos no registrados, con calificación fuera de la escala 1 a 7 o duplicadas en el lote.</li><li>Si vuelve a importar, las encuestas ya importadas se omiten (no se duplican). Si no hay nada nuevo, se informa que el lote ya fue procesado.</li><li>Si el sistema de origen no responde, no se importa nada y la falla queda en la bitácora.</li><li>El <b>simulador</b> permite demostrar la caída del servicio, la corrección de rechazos y una encuesta tardía.</li></ul>" };

/* ---------- Calificaciones de un trabajador (RF-BON-12) ---------- */
VIEWS.calificaciones = bonView({
  title: () => "Calificaciones del trabajador", hu: () => "RF-BON-12 · Buscar las calificaciones de servicio de un trabajador",
  init(tab) { const ps = periodosBon(); tab.f = { ficha: "", d: ps[0], h: ps[ps.length - 1] }; tab.res = null; },
  tools(tab) { return { buscar: () => this.buscar(tab), exportar: tab.res && tab.res.servicios && tab.res.servicios.length && (() => { const f = DB.ficha(tab.f.ficha); pedirFormato({ titulo: "Calificaciones de servicio", modulo: "Bonificaciones", lineas: [`Trabajador: ${FICHA.nombre(f)} · ${f.id}`, `Período: ${U.mes(tab.f.d)} a ${U.mes(tab.f.h)}`], columnas: [{ t: "Fecha" }, { t: "Proyecto" }, { t: "Cliente" }, { t: "Encuesta" }, { t: "Calificación" }], filas: tab.res.servicios.map(s => [U.fecha(s.fecha), `${s.proyecto} · ${s.nombre}`, s.cliente, s.encuesta, U.num1(s.calificacion)]) }); }) }; },
  buscar(tab) {
    if (!tab.f.ficha) return aviso("Seleccione un trabajador", "<p>Elija el trabajador cuyas calificaciones desea consultar.</p>");
    if (tab.f.d > tab.f.h) return aviso("Período inválido", "<p>El período «Desde» no puede ser posterior a «Hasta».</p>", "err");
    tab.res = { cargando: true }; pintar();
    setTimeout(() => {
      const pers = periodosBon().filter(p => p >= tab.f.d && p <= tab.f.h);
      const r = BON.servicioCalificaciones(DB.d, tab.f.ficha, pers);
      if (r.error) DB.log(ST.user.user, "Bonificaciones", "Servicio de calificaciones no disponible", `Consulta de ${tab.f.ficha}`);
      else DB.log(ST.user.user, "Bonificaciones", "Consulta de calificaciones", `${tab.f.ficha} · ${U.mes(tab.f.d)} a ${U.mes(tab.f.h)} · ${r.servicios.length} resultado(s)`);
      tab.res = r; pintar();
    }, 400);
  },
  render(tab) {
    const fichas = DB.d.fichas.filter(f => f.cargo.departamento === "Construcción").sort((a, b) => FICHA.nombre(a).localeCompare(FICHA.nombre(b)));
    let body = "";
    if (tab.res && tab.res.cargando) body = `<div class="bar info"><b class="ic">i</b><span>Consultando el sistema informático actual…</span></div>`;
    else if (tab.res && tab.res.error) body = `<div class="bar err"><b class="ic">✕</b><span>El servicio de calificaciones no está disponible. Intente nuevamente más tarde; el evento quedó registrado en la bitácora.</span></div>`;
    else if (tab.res) {
      const s = tab.res.servicios;
      if (!s.length) body = `<div class="bar info"><b class="ic">i</b><span>El trabajador no registra calificaciones de servicio en el período consultado.</span></div>`;
      else { const prom = s.reduce((a, b) => a + b.calificacion, 0) / s.length; body = `<p>${s.length} calificación(es) · promedio <b>${U.num1(prom)}</b> · mínima ${U.num1(Math.min(...s.map(x => x.calificacion)))} · máxima ${U.num1(Math.max(...s.map(x => x.calificacion)))}</p>` + listview({ cols: [{ k: "fecha", t: "Fecha", f: r => U.fecha(r.fecha), w: 90, nosort: true }, { k: "per", t: "Período", f: r => U.mes(r.periodo), nosort: true }, { k: "p", t: "Proyecto", f: r => `${E(r.proyecto)} · ${E(r.nombre)}`, nosort: true }, { k: "cliente", t: "Cliente", nosort: true }, { k: "encuesta", t: "Encuesta", nosort: true }, { k: "c", t: "Calificación", num: true, f: r => `<b>${U.num1(r.calificacion)}</b>`, nosort: true }], rows: s.map((x, i) => ({ _id: "s" + i, ...x })) }).html; }
    }
    return `<div class="dochead"><h2>Calificaciones de servicio de un trabajador</h2><span class="sub">Consulta en línea al sistema informático actual</span></div>
    <div class="filters"><label>Trabajador <select id="qF" style="max-width:320px">${opts(fichas.map(f => [f.id, `${FICHA.nombre(f)} · ${f.id}`]), tab.f.ficha, "Seleccione…")}</select></label>
      <label>Desde <select id="qD">${optsPer(tab.f.d)}</select></label><label>Hasta <select id="qH">${optsPer(tab.f.h)}</select></label><button class="btn pri" id="qGo">Buscar</button></div>
    ${simuladorServicio()}${body}`;
  },
  mount(w, tab) {
    [["#qF", "ficha"], ["#qD", "d"], ["#qH", "h"]].forEach(([s, k]) => $(s).onchange = e => { tab.f[k] = e.target.value; tab.res = null; pintar(); });
    $("#qGo").onclick = () => this.buscar(tab); bindSimulador(w);
  },
});
HELP.calificaciones = { t: "Calificaciones del trabajador", html: "<p>Elija un trabajador y un rango de períodos y pulse <b>Buscar</b>. El sistema consulta las encuestas de los proyectos en que participó y muestra cada calificación con su proyecto y cliente, más el promedio.</p><p>Si el servicio no está disponible se informa y queda registrado.</p>" };

/* ---------- Regla de cálculo (RF-BON-03) ---------- */
VIEWS.regla = bonView({
  title: () => "Regla de cálculo", hu: () => "RF-BON-03 · Parametrizar la regla de cálculo de la bonificación",
  init(tab) { const r = DB.d.reglas[DB.d.reglas.length - 1]; tab.tr = U.clon(r.tramos); tab.desde = perDefecto(); tab.verSel = r.version; },
  tools(tab) { return { guardar: puede("bonificaciones.aprobar") && (() => this.guardar(tab)), deshacer: tab.dirty && (() => { this.init(tab); marcarSucio(tab, false); pintar(); }) }; },
  render(tab) {
    const R = DB.d.reglas, sel = R.find(r => r.version === +tab.verSel) || R[R.length - 1], edit = puede("bonificaciones.aprobar");
    const abiertos = periodosBon().filter(p => !cerrado(p));
    const err = BON.validarTramos(tab.tr.map(t => ({ ...t, desde: +t.desde, hasta: +t.hasta, monto: +t.monto })));
    return `<div class="dochead"><h2>Regla de cálculo de la bonificación</h2><span class="sub">Tramos de calificación (escala 1,0 a 7,0) y monto por proyecto</span></div>
    <div class="grid2" style="grid-template-columns:1fr 1.2fr"><fieldset class="fs"><legend>Versiones de la regla</legend>
      ${listview({ cols: [{ k: "version", t: "Versión", w: 60, nosort: true }, { k: "desde", t: "Vigente desde", f: r => U.mes(r.desde), nosort: true }, { k: "por", t: "Creada por", nosort: true }, { k: "creada", t: "Fecha", nosort: true }], rows: R.map(r => ({ _id: String(r.version), ...r })).reverse(), sel: String(sel.version) }).html}
      <p class="small"><b>Versión ${sel.version}</b> · ${E(sel.distribucion)}</p>${listview({ cols: [{ k: "t", t: "Tramo", nosort: true }, { k: "r", t: "Calificación", f: x => `${U.num1(x.desde)} a ${U.num1(x.hasta)}`, nosort: true }, { k: "m", t: "Monto por proyecto", num: true, f: x => U.pesos(x.monto), nosort: true }], rows: sel.tramos.map((x, i) => ({ _id: "t" + i, ...x })) }).html}
      <p class="muted small">Cada cálculo guarda la versión de regla que usó; los períodos ya calculados no cambian.</p></fieldset>
    <fieldset class="fs"><legend>Nueva versión</legend>${edit ? `
      <div class="row" style="--lw:110px"><label class="l" for="rD">Vigente desde</label><div class="ctl"><select id="rD" class="req">${optsPer(tab.desde, abiertos)}</select></div></div>
      <table class="lv tramos"><thead><tr><th>Tramo</th><th>Desde</th><th>Hasta</th><th>Monto ($)</th><th></th></tr></thead><tbody>
      ${tab.tr.map((t, i) => `<tr><td><input type="text" data-t="${i}" data-c="t" value="${E(t.t)}" maxlength="30" aria-label="Nombre del tramo ${i + 1}"></td><td><input type="number" step="0.1" min="1" max="7" data-t="${i}" data-c="desde" value="${t.desde}" aria-label="Desde"></td><td><input type="number" step="0.1" min="1" max="7" data-t="${i}" data-c="hasta" value="${t.hasta}" aria-label="Hasta"></td><td><input type="number" step="1000" min="0" data-t="${i}" data-c="monto" value="${t.monto}" aria-label="Monto"></td><td><button class="btn" data-del="${i}" style="min-width:0;padding:0 8px" title="Quitar tramo" ${tab.tr.length <= 1 ? "disabled" : ""}>✕</button></td></tr>`).join("")}</tbody></table>
      <div id="rMsg">${err ? `<div class="bar warn"><b class="ic">⚠</b><span>${E(err)}</span></div>` : `<div class="bar ok"><b class="ic">✓</b><span>Los tramos cubren la escala 1,0 a 7,0 sin solaparse.</span></div>`}</div>
      <div class="actions"><button class="btn" id="rAdd">Agregar tramo</button><button class="btn pri" id="rSave">Guardar nueva versión (F2)</button></div>` : `<div class="bar info"><b class="ic">i</b><span>Solo el Jefe de Recursos Humanos (permiso de aprobación) puede modificar la regla.</span></div>`}</fieldset></div>`;
  },
  mount(w, tab) {
    bindList(w, tab, { onSelect: id => { if (/^\d+$/.test(id)) { tab.verSel = +id; pintar(); } } });
    const d = $("#rD"); if (!d) return;
    d.onchange = e => { tab.desde = e.target.value; marcarSucio(tab); };
    $$("[data-t]", w).forEach(i => { i.oninput = () => { tab.tr[+i.dataset.t][i.dataset.c] = i.dataset.c === "t" ? i.value : i.value === "" ? NaN : +i.value; marcarSucio(tab); }; i.onchange = () => { const c = i.dataset.c; guardarScroll(); pintar(); const n = $(`[data-t="${i.dataset.t}"][data-c="${c}"]`); if (n) n.focus(); }; });
    $$("[data-del]", w).forEach(b => b.onclick = () => { tab.tr.splice(+b.dataset.del, 1); marcarSucio(tab); pintar(); });
    $("#rAdd").onclick = () => { tab.tr.push({ t: "Nuevo", desde: 7, hasta: 7, monto: 0 }); marcarSucio(tab); pintar(); };
    $("#rSave").onclick = () => this.guardar(tab);
  },
  async guardar(tab) {
    const tr = tab.tr.map(t => ({ t: String(t.t).trim(), desde: Math.round(+t.desde * 10) / 10, hasta: Math.round(+t.hasta * 10) / 10, monto: Math.round(+t.monto) }));
    const err = BON.validarTramos(tr);
    if (err) return aviso("No se puede guardar la regla", `<p>${E(err)}</p>`, "err");
    if (cerrado(tab.desde)) return aviso("Período cerrado", "<p>No se puede aplicar una regla a un período con cálculo aprobado.</p>", "err");
    const af = DB.d.calculos.filter(c => c.periodo >= tab.desde && !["Aprobado", "Registrado para pago"].includes(c.estado));
    if (!await confirmar("¿Guardar la nueva versión de la regla?", `<p>Se aplicará desde ${U.mes(tab.desde)}.${af.length ? ` Los cálculos pendientes de ${af.map(c => U.mes(c.periodo)).join(", ")} deberán recalcularse.` : ""}</p>`)) return;
    const v = Math.max(...DB.d.reglas.map(r => r.version)) + 1;
    DB.d.reglas.push({ version: v, desde: tab.desde, creada: U.ahora(), por: ST.user.user, distribucion: "Partes iguales entre los colaboradores asignados al proyecto", tramos: tr.sort((a, b) => a.desde - b.desde) });
    af.forEach(c => c.desactualizado = true);
    DB.log(ST.user.user, "Bonificaciones", "Nueva versión de regla", `Versión ${v} desde ${U.mes(tab.desde)} · ${tr.map(t => `${t.t} ${U.num1(t.desde)}-${U.num1(t.hasta)} ${U.pesos(t.monto)}`).join("; ")}`);
    tab.verSel = v; marcarSucio(tab, false); tab.msg = `Regla versión ${v} guardada.`; pintar();
  },
});
HELP.regla = { t: "Regla de cálculo", html: "<p>Define los tramos de calificación y el monto que entrega cada proyecto según su calificación promedio. Los tramos deben cubrir toda la escala de 1,0 a 7,0 sin solaparse ni dejar vacíos; el sistema lo valida mientras edita.</p><p>Cada cambio crea una <b>nueva versión</b> vigente desde el período elegido. Los períodos ya aprobados conservan su versión.</p>" };

/* ---------- Cálculo del período (RF-BON-04, 05, 07, 09 y 11) ---------- */
VIEWS.calculo = bonView({
  title: () => "Cálculo del período", hu: () => "RF-BON-04 · Calcular · RF-BON-05 · Distribuir por proyecto · RF-BON-07 · Trazabilidad · RF-BON-09 · Proyectos sin evaluación · RF-BON-11 · Condiciones previas",
  init(tab) { tab.per = perDefecto(); tab.vista = "colab"; },
  reparam(tab) { if (tab.params.per) tab.per = tab.params.per; tab.params.per = ""; },
  tools(tab) { const c = BON.calculo(DB.d, tab.per); return { nuevo: () => this.calcular(tab), exportar: c && (() => pedirFormato({ titulo: `Cálculo de bonificaciones ${U.mes(tab.per)}`, modulo: "Bonificaciones", sensible: true, lineas: [`Estado: ${c.estado} · regla versión ${c.regla} · calculado el ${c.fecha} por ${c.por}`], columnas: [{ t: "N° ficha" }, { t: "Colaborador" }, { t: "Departamento" }, { t: "Calificación" }, { t: "Tramos" }, { t: "Monto", money: true }, { t: "Observación" }], filas: c.filas.map(f => [f.ficha, f.nombre, f.departamento, f.calif == null ? "—" : U.num1(f.calif), f.tramos, f.monto, f.motivo]), total: ["", "Total", "", "", "", c.total, ""] })) }; },
  condiciones(per) {
    const enc = DB.d.encuestas.filter(e => e.periodo === per).length, imp = DB.d.importaciones.filter(i => i.periodo === per), rech = imp.length ? imp[imp.length - 1].rechazadas.length : 0, regla = BON.reglaVigente(DB.d, per);
    return [[imp.length > 0 && enc > 0, imp.length ? `Encuestas importadas: ${enc}` : "No hay encuestas importadas para el período", true],
      [!!regla && !BON.validarTramos(regla.tramos), regla ? `Regla vigente: versión ${regla.version} (desde ${U.mes(regla.desde)})` : "No hay regla vigente", true],
      [!cerrado(per), cerrado(per) ? "El período está cerrado (cálculo aprobado)" : "Período abierto", true],
      [DB.d.proyectos.some(p => p.periodo === per), `${DB.d.proyectos.filter(p => p.periodo === per).length} proyecto(s) del período`, true],
      [rech === 0, rech ? `${rech} encuesta(s) rechazada(s) en la última importación (no se consideran)` : "Sin rechazos pendientes", false]];
  },
  render(tab) {
    const c = BON.calculo(DB.d, tab.per), cond = this.condiciones(tab.per), bloq = cond.some(x => x[2] && !x[0]);
    const ro = c && ["Aprobado", "Registrado para pago"].includes(c.estado);
    let body = "";
    if (c) {
      const vs = { colab: "Por colaborador", proy: "Por proyecto", excl: `Proyectos excluidos (${c.excluidos.length})` };
      let tabla;
      if (tab.vista === "colab") tabla = listview({ cols: [{ k: "ficha", t: "N° ficha", w: 100 }, { k: "nombre", t: "Colaborador" }, { k: "departamento", t: "Departamento" }, { k: "calif", t: "Calificación", num: true, f: r => (r.calif == null ? "—" : U.num1(r.calif)) }, { k: "tramos", t: "Tramo" }, { k: "monto", t: "Monto", num: true, f: r => `<b>${U.pesos(r.monto)}</b>` }, { k: "motivo", t: "Observación", f: r => E(r.motivo || `${r.proyectos.length} proyecto(s)`) }],
        rows: c.filas.map(f => ({ _id: f.ficha, ...f, _cls: f.monto ? "" : "mut" })), sel: tab.sel, sort: tab.sort, empty: "Sin colaboradores en el período." });
      else if (tab.vista === "proy") tabla = listview({ cols: [{ k: "id", t: "Proyecto", w: 90 }, { k: "nombre", t: "Nombre" }, { k: "prom", t: "Calificación", num: true, f: r => U.num1(r.prom) }, { k: "tramo", t: "Tramo" }, { k: "monto", t: "Monto del proyecto", num: true, f: r => U.pesos(r.monto) }, { k: "n", t: "Colaboradores", num: true }, { k: "parte", t: "Por colaborador", num: true, f: r => U.pesos(Math.floor(r.monto / r.n)) + (r.monto % r.n ? " *" : "") }],
        rows: c.proyectos.map(p => ({ _id: p.id, ...p, nombre: (DB.d.proyectos.find(x => x.id === p.id) || {}).nombre })), sort: tab.sort, empty: "Sin proyectos calculados." });
      else tabla = listview({ cols: [{ k: "id", t: "Proyecto", w: 90, nosort: true }, { k: "nombre", t: "Nombre", nosort: true }, { k: "motivo", t: "Motivo de exclusión", f: r => pill("Excluido") + " " + E(r.motivo), nosort: true }], rows: c.excluidos.map(x => ({ _id: x.id, ...x })), empty: "Todos los proyectos del período tienen evaluación y colaboradores." });
      body = `<div class="bar ${ro ? "ok" : c.estado === "Rechazado" ? "err" : "info"}"><b class="ic">${ro ? "✓" : "i"}</b><span>Estado: <b>${E(c.estado)}</b> · regla versión ${c.regla} · ${c.encuestas} encuestas · calculado el ${E(c.fecha)} por ${E(c.por)}${c.aprobado ? ` · aprobado el ${E(c.aprobado.fecha)} por ${E(c.aprobado.por)}` : ""}${c.rechazo ? ` · rechazado: ${E(c.rechazo.motivo)}` : ""}${ro ? " · solo consulta" : ""}</span></div>
      ${c.desactualizado && !ro ? `<div class="bar warn"><b class="ic">⚠</b><span>Hubo cambios (nuevas encuestas o nueva regla) después del cálculo. Recalcule antes de enviar a aprobación.</span></div>` : ""}
      ${c.excluidos.length ? `<div class="bar warn"><b class="ic">⚠</b><span>${c.excluidos.length} proyecto(s) excluido(s): ${E(c.excluidos.map(x => `${x.id} (${x.motivo.split(" ·")[0].toLowerCase()})`).join("; "))}.</span></div>` : ""}
      <div class="summary" style="max-width:420px;margin:8px 0"><div>Colaboradores con bonificación</div><div class="v">${c.filas.filter(f => f.monto > 0).length} de ${c.filas.length}</div><div>Proyectos bonificados</div><div class="v">${c.proyectos.filter(p => p.monto > 0).length} de ${c.proyectos.length + c.excluidos.length}</div><div>Total del período</div><div class="v">${U.pesos(c.total)}</div></div>
      <div class="itabs">${Object.entries(vs).map(([k, t]) => `<button class="itab ${tab.vista === k ? "on" : ""}" data-v="${k}">${t}</button>`).join("")}</div><div class="ipane" style="padding-top:10px">${tabla.html}
      ${tab.vista === "colab" ? `<div class="actions"><button class="btn" id="cTr">Ver trazabilidad del colaborador…</button></div>` : tab.vista === "proy" ? `<p class="muted small">* El monto se reparte en partes iguales; el resto de la división (pesos) se asigna al primer colaborador del proyecto.</p>` : ""}</div>`;
    }
    return `<div class="dochead"><h2>Cálculo de bonificaciones</h2><span class="sub">Bonificación por proyecto según la calificación del cliente</span></div>
    <div class="filters"><label>Período <select id="kP">${optsPer(tab.per)}</select></label>${!ro ? `<button class="btn pri" id="kCalc" ${bloq ? "disabled" : ""}>${c ? "Recalcular" : "Calcular"}</button>` : ""}${c && !ro && c.estado !== "Rechazado" && puede("bonificaciones.aprobar") ? `<button class="btn" id="kApr">Ir a aprobación</button>` : ""}</div>
    ${!ro ? `<fieldset class="fs"><legend>Condiciones previas al cálculo</legend><ul class="reqs">${cond.map(([ok, t, oblig]) => `<li class="${ok ? "ok" : ""}" style="${!ok && oblig ? "color:var(--err);font-weight:600" : ""}">${E(t)}${!ok && !oblig ? " · advertencia" : ""}</li>`).join("")}</ul>${bloq ? `<div class="bar err"><b class="ic">✕</b><span>No se puede calcular hasta cumplir las condiciones marcadas en rojo.</span></div>` : ""}</fieldset>` : ""}
    ${body}`;
  },
  mount(w, tab) {
    $("#kP").onchange = e => { tab.per = e.target.value; tab.sel = null; pintar(); };
    const k = $("#kCalc"); if (k) k.onclick = () => this.calcular(tab);
    const a = $("#kApr"); if (a) a.onclick = () => abrir("aprobacion", { per: tab.per });
    $$("[data-v]", w).forEach(b => b.onclick = () => { tab.vista = b.dataset.v; tab.sort = null; pintar(); });
    bindList(w, tab, { onOpen: id => tab.vista === "colab" && this.traza(tab, id) });
    const t = $("#cTr"); if (t) t.onclick = () => tab.sel ? this.traza(tab, tab.sel) : aviso("Seleccione un colaborador", "<p>Haga clic en una fila y luego en «Ver trazabilidad».</p>");
  },
  async calcular(tab) {
    const per = tab.per, err = BON.validarPrevio(DB.d, per);
    if (err) { DB.log(ST.user.user, "Bonificaciones", "Cálculo rechazado", `${U.mes(per)} · ${err}`); return aviso("No se puede calcular", `<p>${E(err)}</p>`, "err"); }
    const prev = BON.calculo(DB.d, per);
    if (prev && !await confirmar("¿Recalcular el período?", `<p>Se reemplazará el cálculo de ${U.mes(per)} (${E(prev.estado)}, ${U.pesos(prev.total)}) por uno nuevo con las encuestas y la regla vigentes.</p>`)) return;
    const c = BON.calcular(DB.d, per, ST.user.user); c.desactualizado = false; c.rechazo = null;
    DB.log(ST.user.user, "Bonificaciones", prev ? "Recálculo de bonificaciones" : "Cálculo de bonificaciones", `${U.mes(per)} · ${c.filas.filter(f => f.monto).length} colaboradores · ${U.pesos(c.total)} · ${c.excluidos.length} proyecto(s) excluido(s)`);
    tab.vista = "colab"; tab.msg = "Cálculo realizado: queda pendiente de aprobación."; pintar();
  },
  traza(tab, fid) {
    const c = BON.calculo(DB.d, tab.per), r = c.filas.find(f => f.ficha === fid); if (!r) return;
    const regla = DB.d.reglas.find(x => x.version === c.regla);
    DB.log(ST.user.user, "Bonificaciones", "Consulta de trazabilidad", `${U.mes(tab.per)} · ${fid}`);
    dialog({ wide: true, head: `Trazabilidad · ${r.nombre} · ${U.mes(tab.per)}`, html: `${r.proyectos.length ? r.proyectos.map(p => `<fieldset class="fs"><legend>${E(p.id)} · ${E(p.nombre)} · ${E(p.cliente)}</legend>
      <p class="small">Encuestas: ${p.encuestas.map(e => `${E(e.id)} (${U.fecha(e.fecha)}): <b>${U.num1(e.calificacion)}</b>`).join(" · ")}</p>
      <p class="small">Promedio del proyecto <b>${U.num1(p.prom)}</b> → tramo <b>${E(p.tramo)}</b> (regla v${c.regla}) → monto del proyecto ${U.pesos(p.montoProyecto)} ÷ ${p.n} colaborador(es) = <b>${U.pesos(p.parte)}</b></p></fieldset>`).join("") : `<p>${E(r.motivo)}</p>`}
      <p><b>Total del colaborador: ${U.pesos(r.monto)}</b></p><p class="muted small">Tramos de la regla v${c.regla}: ${regla ? regla.tramos.map(t => `${E(t.t)} ${U.num1(t.desde)}–${U.num1(t.hasta)}: ${U.pesos(t.monto)}`).join(" · ") : ""}</p>` });
  },
});
HELP.calculo = { t: "Cálculo del período", html: "<ul><li>Antes de calcular se verifican las <b>condiciones previas</b>: encuestas importadas, regla vigente válida y período abierto.</li><li>Por cada proyecto se promedia su calificación, se busca el tramo de la regla y el monto se reparte <b>en partes iguales</b> entre los colaboradores asignados.</li><li>Los proyectos sin encuesta o sin colaboradores quedan <b>excluidos</b> y se listan con su motivo.</li><li>Doble clic sobre un colaborador muestra la <b>trazabilidad</b>: encuestas → promedio → tramo → monto.</li><li>Un cálculo aprobado queda en modo solo consulta.</li></ul>" };

/* ---------- Aprobación y registro para pago (RF-BON-06 y RF-BON-13) ---------- */
VIEWS.aprobacion = bonView({
  title: () => "Aprobación y pago", hu: () => "RF-BON-06 · Aprobar el cálculo de bonificaciones · RF-BON-13 · Registrar la bonificación aprobada para pago",
  init(tab) { const p = DB.d.calculos.find(c => c.estado === "Pendiente de aprobación"); tab.sel = tab.params.per || (p ? p.periodo : (DB.d.calculos[DB.d.calculos.length - 1] || {}).periodo); },
  reparam(tab) { if (tab.params.per) tab.sel = tab.params.per; tab.params.per = ""; },
  tools(tab) { const c = BON.calculo(DB.d, tab.sel); return { exportar: c && c.pago && (() => pedirFormato({ titulo: `Registro para pago ${U.mes(c.periodo)}`, modulo: "Bonificaciones", sensible: true, lineas: [`Registrado el ${c.pago.fecha} por ${c.pago.por} · aprobado por ${c.aprobado.por}`], columnas: [{ t: "N° registro" }, { t: "N° ficha" }, { t: "Colaborador" }, { t: "Monto", money: true }], filas: c.pago.registros.map(r => [r.nro, r.ficha, r.nombre, r.monto]), total: ["", "", "Total", c.pago.registros.reduce((s, r) => s + r.monto, 0)] })) }; },
  render(tab) {
    const lv = listview({ cols: [{ k: "periodo", t: "Período", f: r => U.mes(r.periodo) }, { k: "total", t: "Total", num: true, f: r => U.pesos(r.total) }, { k: "n", t: "Colaboradores", num: true }, { k: "fecha", t: "Calculado" }, { k: "estado", t: "Estado", f: r => pill(r.estado) + (r.desactualizado && r.estado === "Pendiente de aprobación" ? ' <span class="muted small">(desactualizado)</span>' : ""), w: 220 }],
      rows: DB.d.calculos.map(c => ({ _id: c.periodo, ...c, n: c.filas.filter(f => f.monto).length })), sel: tab.sel, sort: tab.sort || { k: "periodo", dir: -1 }, empty: "No hay cálculos. Realice el cálculo del período en «Cálculo del período»." });
    const c = BON.calculo(DB.d, tab.sel), apr = puede("bonificaciones.aprobar");
    let det = "";
    if (c) {
      det = `<fieldset class="fs"><legend>${U.mes(c.periodo)} · ${E(c.estado)}</legend>
        <p>Total ${U.pesos(c.total)} · ${c.filas.filter(f => f.monto).length} colaborador(es) con bonificación · regla v${c.regla} · calculado por ${E(c.por)} el ${E(c.fecha)}${c.aprobado ? `<br>Aprobado por ${E(c.aprobado.por)} el ${E(c.aprobado.fecha)}` : ""}${c.rechazo ? `<br>Rechazado por ${E(c.rechazo.por)} el ${E(c.rechazo.fecha)}: ${E(c.rechazo.motivo)}` : ""}</p>
        ${!apr ? `<div class="bar info"><b class="ic">i</b><span>Su perfil puede consultar, pero solo el Jefe de Recursos Humanos aprueba y registra para pago.</span></div>` : ""}
        <div class="actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn" id="aVer">Ver detalle del cálculo</button>
        ${apr && c.estado === "Pendiente de aprobación" ? `<button class="btn pri" id="aOk">Aprobar…</button><button class="btn" id="aNo">Rechazar…</button>` : ""}
        ${apr && c.estado === "Aprobado" ? `<button class="btn pri" id="aPag">Registrar para pago…</button>` : ""}</div>
        ${c.pago ? `<h3 style="font-size:13px;margin:12px 0 6px">Registros para pago (${c.pago.registros.length}) · ${E(c.pago.fecha)} · ${E(c.pago.por)}</h3>${listview({ cols: [{ k: "nro", t: "N° registro", nosort: true }, { k: "ficha", t: "N° ficha", nosort: true }, { k: "nombre", t: "Colaborador", nosort: true }, { k: "monto", t: "Monto", num: true, f: r => U.pesos(r.monto), nosort: true }], rows: c.pago.registros.map(r => ({ _id: r.nro, ...r })) }).html}` : ""}</fieldset>`;
    }
    return `<div class="dochead"><h2>Aprobación y registro para pago</h2><span class="sub">Cálculos de bonificación por período</span></div>${lv.html}${det}`;
  },
  mount(w, tab) {
    bindList(w, tab, { onSelect: () => pintar() });
    const c = BON.calculo(DB.d, tab.sel); if (!c) return;
    $("#aVer").onclick = () => abrir("calculo", { per: c.periodo });
    const ok = $("#aOk"); if (ok) ok.onclick = async () => {
      if (c.desactualizado) return aviso("Cálculo desactualizado", "<p>Hubo nuevas encuestas o una nueva regla después del cálculo. Recalcule el período antes de aprobar.</p>", "warn");
      if (!await confirmar(`¿Aprobar el cálculo de ${U.mes(c.periodo)}?`, `<p>Total: <b>${U.pesos(c.total)}</b> para ${c.filas.filter(f => f.monto).length} colaborador(es).</p><p>Una vez aprobado, el período queda cerrado y el cálculo no se puede modificar.</p>`, "Aprobar", "Cancelar")) return;
      c.estado = "Aprobado"; c.aprobado = { fecha: U.ahora(), por: ST.user.user };
      DB.log(ST.user.user, "Bonificaciones", "Aprobación de cálculo", `${U.mes(c.periodo)} · ${U.pesos(c.total)}`); tab.msg = "Cálculo aprobado. Ya puede registrarlo para pago."; pintar();
    };
    const no = $("#aNo"); if (no) no.onclick = async () => {
      const r = await formulario({ head: `Rechazar el cálculo de ${U.mes(c.periodo)}`, label: "Rechazar", campos: [{ k: "motivo", t: "Motivo del rechazo", type: "textarea", req: true }], guardar: x => {
        if (!x.motivo) return "Indique el motivo del rechazo.";
        c.estado = "Rechazado"; c.rechazo = { fecha: U.ahora(), por: ST.user.user, motivo: x.motivo };
        DB.log(ST.user.user, "Bonificaciones", "Rechazo de cálculo", `${U.mes(c.periodo)} · ${x.motivo}`);
      } });
      if (r === "ok") { tab.msg = "Cálculo rechazado: debe corregirse y recalcularse."; pintar(); }
    };
    const pg = $("#aPag"); if (pg) pg.onclick = async () => {
      if (c.pago) return aviso("Ya registrado", "<p>Este período ya fue registrado para pago; no se generan registros duplicados.</p>", "warn");
      if (!await confirmar(`¿Registrar para pago ${U.mes(c.periodo)}?`, `<p>Se generarán ${c.filas.filter(f => f.monto).length} registros por ${U.pesos(c.total)} para remuneraciones.</p>`)) return;
      BON.registrarPago(DB.d, c, ST.user.user);
      DB.log(ST.user.user, "Bonificaciones", "Registro para pago", `${U.mes(c.periodo)} · ${c.pago.registros.length} registros · ${U.pesos(c.total)}`); tab.msg = "Bonificaciones registradas para pago."; pintar();
    };
  },
});
HELP.aprobacion = { t: "Aprobación y pago", html: "<ul><li>Seleccione un período. Si está <b>Pendiente de aprobación</b>, el Jefe de RR.HH. puede <b>Aprobar</b> (cierra el período) o <b>Rechazar</b> indicando el motivo (se debe recalcular).</li><li>Un cálculo desactualizado no se puede aprobar hasta recalcularlo.</li><li><b>Registrar para pago</b> genera un registro por colaborador con su número correlativo. Un período no se registra dos veces.</li></ul>" };

/* ---------- Histórico de bonificaciones (RF-BON-08) ---------- */
VIEWS.historicobon = bonView({
  title: () => "Histórico", hu: () => "RF-BON-08 · Consultar el histórico de bonificaciones",
  init(tab) { const ps = periodosBon(); tab.f = { ficha: "", d: ps[0], h: ps[ps.length - 1] }; },
  filas(tab) {
    const out = [];
    for (const c of DB.d.calculos.filter(c => c.periodo >= tab.f.d && c.periodo <= tab.f.h && ["Aprobado", "Registrado para pago"].includes(c.estado)).sort((a, b) => (a.periodo < b.periodo ? 1 : -1)))
      for (const f of c.filas.filter(f => !tab.f.ficha || f.ficha === tab.f.ficha)) { const pg = c.pago && c.pago.registros.find(r => r.ficha === f.ficha); out.push({ _id: c.periodo + f.ficha, per: c.periodo, nombre: f.nombre, ficha: f.ficha, proy: f.proyectos.map(p => p.id).join(", ") || "—", calif: f.calif, monto: f.monto, estado: f.monto ? c.estado : "Sin bonificación", nro: pg ? pg.nro : "" }); }
    return out;
  },
  tools(tab) { return { exportar: () => { const r = this.filas(tab); pedirFormato({ titulo: "Histórico de bonificaciones", modulo: "Bonificaciones", sensible: true, lineas: [`Colaborador: ${tab.f.ficha ? FICHA.nombre(DB.ficha(tab.f.ficha)) : "Todos"} · ${U.mes(tab.f.d)} a ${U.mes(tab.f.h)}`], columnas: [{ t: "Período" }, { t: "Colaborador" }, { t: "Proyectos" }, { t: "Calificación" }, { t: "Monto", money: true }, { t: "Estado" }, { t: "N° registro" }], filas: r.map(x => [U.mes(x.per), x.nombre, x.proy, x.calif == null ? "—" : U.num1(x.calif), x.monto, x.estado, x.nro]), total: ["", "Total", "", "", r.reduce((s, x) => s + x.monto, 0), "", ""] }); } }; },
  render(tab) {
    const fichas = [...new Set(DB.d.calculos.flatMap(c => c.filas.map(f => f.ficha)))].map(id => DB.ficha(id)).filter(Boolean).sort((a, b) => FICHA.nombre(a).localeCompare(FICHA.nombre(b)));
    const rows = tab.f.d > tab.f.h ? [] : this.filas(tab), tot = rows.reduce((s, x) => s + x.monto, 0);
    const pend = DB.d.calculos.filter(c => c.periodo >= tab.f.d && c.periodo <= tab.f.h && !["Aprobado", "Registrado para pago"].includes(c.estado));
    const lv = listview({ cols: [{ k: "per", t: "Período", f: r => U.mes(r.per), w: 120 }, { k: "nombre", t: "Colaborador" }, { k: "proy", t: "Proyectos" }, { k: "calif", t: "Calificación", num: true, f: r => (r.calif == null ? "—" : U.num1(r.calif)) }, { k: "monto", t: "Monto", num: true, f: r => U.pesos(r.monto) }, { k: "estado", t: "Estado", f: r => pill(r.estado), w: 170 }, { k: "nro", t: "N° registro" }],
      rows, sort: tab.sort, pageSize: 15, page: tab.page, empty: tab.f.d > tab.f.h ? "El período «Desde» es posterior a «Hasta»." : "No hay bonificaciones aprobadas para los filtros elegidos." }); tab.page = lv.page;
    return `<div class="dochead"><h2>Histórico de bonificaciones</h2><span class="sub">Solo cálculos aprobados</span></div>
    <div class="filters"><label>Colaborador <select id="hC" style="max-width:300px">${opts(fichas.map(f => [f.id, FICHA.nombre(f)]), tab.f.ficha, "Todos")}</select></label><label>Desde <select id="hD">${optsPer(tab.f.d)}</select></label><label>Hasta <select id="hH">${optsPer(tab.f.h)}</select></label><button class="btn" id="hClr">Limpiar</button></div>
    ${pend.length ? `<div class="bar info"><b class="ic">i</b><span>No se incluyen ${pend.length} período(s) aún no aprobados: ${E(pend.map(c => U.mes(c.periodo) + " (" + c.estado.toLowerCase() + ")").join(", "))}.</span></div>` : ""}
    ${lv.html}${pager(lv, "")}<p><b>Total: ${U.pesos(tot)}</b></p>`;
  },
  mount(w, tab) {
    [["#hC", "ficha"], ["#hD", "d"], ["#hH", "h"]].forEach(([s, k]) => $(s).onchange = e => { tab.f[k] = e.target.value; tab.page = 0; pintar(); });
    $("#hClr").onclick = () => { this.init(tab); pintar(); }; bindList(w, tab, {}); bindPager(w, tab);
  },
});
HELP.historicobon = { t: "Histórico de bonificaciones", html: "<p>Consulte las bonificaciones aprobadas por colaborador y rango de períodos, con los proyectos, la calificación, el monto y el número de registro para pago. Los períodos pendientes o rechazados no se incluyen y se avisa.</p>" };
