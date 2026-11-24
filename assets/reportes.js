/* SGRH Instalum · Reportes (RF-REP-01 a RF-REP-05) */
"use strict";
const REP = {
  contratacion: { t: "Colaboradores nuevos", hu: "RF-REP-01 · Generar el reporte de colaboradores nuevos", per: "fecha" },
  bonificacion: { t: "Bonificaciones", hu: "RF-REP-02 · Generar el reporte de bonificaciones", per: "mes" },
  capacitacion: { t: "Capacitaciones", hu: "RF-REP-03 · Generar el reporte de capacitaciones", per: "fecha" },
};
const filtrosRep = tipo => {
  const ps = Object.keys(DB.d.fuente).sort();
  return tipo === "bonificacion" ? { d: ps[0], h: ps[ps.length - 1], depto: "", cargo: "", esp: "" } : { d: `${U.anio()}-01-01`, h: U.hoy(), depto: "", cargo: "", esp: "" };
};
VIEWS.reporte = {
  mod: () => "Reportes", permiso: "reportes",
  title: tab => "Reporte · " + REP[tab.params.tipo].t, hu: tab => REP[tab.params.tipo].hu + " · RF-REP-04 · Exportar a PDF y Excel · RF-REP-05 · Filtrar",
  init(tab) { tab.f = filtrosRep(tab.params.tipo); tab.gen = null; },
  tools(tab) { return { nuevo: () => this.generar(tab), exportar: tab.gen && !tab.gen.error && (() => pedirFormato(this.datosExport(tab))) }; },
  validar(tab) {
    const f = tab.f, mes = REP[tab.params.tipo].per === "mes";
    if (!f.d || !f.h) return "Indique el período completo (desde y hasta).";
    if (f.d > f.h) return "La fecha «Desde» no puede ser posterior a «Hasta».";
    if (!mes && f.h > U.hoy()) return "La fecha «Hasta» no puede ser posterior a hoy.";
    return "";
  },
  generar(tab) {
    const err = this.validar(tab);
    if (err) { tab.gen = { error: err }; return pintar(); }
    tab.gen = this[tab.params.tipo](tab.f); tab.gen.fecha = U.ahora();
    DB.log(ST.user.user, "Reportes", "Generación de reporte", `${REP[tab.params.tipo].t} · ${this.lineaFiltros(tab)} · ${tab.gen.filas.length} registros`);
    pintar();
  },
  lineaFiltros(tab) { const f = tab.f, mes = REP[tab.params.tipo].per === "mes"; return `Período: ${mes ? U.mes(f.d) + " a " + U.mes(f.h) : U.fecha(f.d) + " a " + U.fecha(f.h)} · Departamento: ${f.depto || "Todos"} · Cargo: ${f.cargo || "Todos"} · Especialidad: ${f.esp || "Todas"}`; },
  pasa(f, x) { return (!f.depto || x.cargo.departamento === f.depto) && (!f.cargo || x.cargo.cargo === f.cargo) && (!f.esp || x.cargo.especialidad === f.esp); },
  /* RF-REP-01 */
  contratacion(f) {
    const fichas = DB.d.fichas.filter(x => x.cargo.ingreso && x.cargo.ingreso >= f.d && x.cargo.ingreso <= f.h && this.pasa(f, x)).sort((a, b) => (a.cargo.ingreso < b.cargo.ingreso ? -1 : 1));
    const porDep = {}; fichas.forEach(x => { const k = x.cargo.departamento || "Sin departamento"; porDep[k] = (porDep[k] || 0) + 1; });
    return { columnas: [{ t: "N° ficha" }, { t: "Nombre" }, { t: "Cargo" }, { t: "Departamento" }, { t: "Especialidad" }, { t: "Fecha de ingreso" }, { t: "Estado" }],
      filas: fichas.map(x => [x.id, FICHA.nombre(x), x.cargo.cargo || "—", x.cargo.departamento || "—", x.cargo.especialidad || "—", U.fecha(x.cargo.ingreso), x.estado]),
      resumen: [["Colaboradores nuevos", fichas.length], ...Object.entries(porDep).map(([k, v]) => [k, v])], vacio: "No se registran colaboradores nuevos en el período y filtros seleccionados." };
  },
  /* RF-REP-02: solo aprobados, subtotales por departamento */
  bonificacion(f) {
    const cs = DB.d.calculos.filter(c => c.periodo >= f.d && c.periodo <= f.h), ok = cs.filter(c => ["Aprobado", "Registrado para pago"].includes(c.estado)), pend = cs.filter(c => !ok.includes(c));
    const items = [];
    for (const c of ok) for (const r of c.filas.filter(r => r.monto > 0)) { const x = DB.ficha(r.ficha); if (x && this.pasa(f, x)) items.push({ per: c.periodo, x, r, estado: c.estado }); }
    const deps = [...new Set(items.map(i => i.x.cargo.departamento || "Sin departamento"))].sort();
    const filas = [], sub = [];
    for (const d of deps) {
      const its = items.filter(i => (i.x.cargo.departamento || "Sin departamento") === d).sort((a, b) => (a.per < b.per ? -1 : a.per > b.per ? 1 : FICHA.nombre(a.x).localeCompare(FICHA.nombre(b.x))));
      its.forEach(i => filas.push([U.mes(i.per), FICHA.nombre(i.x), d, i.x.cargo.cargo, i.x.cargo.especialidad || "—", U.num1(i.r.calif), i.r.monto]));
      const s = its.reduce((a, i) => a + i.r.monto, 0); sub.push([d, s]); filas.push(["", `Subtotal ${d}`, "", "", "", "", s, "sub"]);
    }
    const total = items.reduce((a, i) => a + i.r.monto, 0);
    return { columnas: [{ t: "Período" }, { t: "Colaborador" }, { t: "Departamento" }, { t: "Cargo" }, { t: "Especialidad" }, { t: "Calificación" }, { t: "Monto", money: true }], filas, total: ["", "Total general", "", "", "", "", total],
      resumen: [["Períodos aprobados incluidos", ok.length], ["Colaboradores bonificados", new Set(items.map(i => i.x.id)).size], ...sub.map(([d, s]) => [d, U.pesos(s)]), ["Total general", U.pesos(total)]],
      nota: (() => { const sin = Object.keys(DB.d.fuente).filter(p => p >= f.d && p <= f.h && !cs.some(c => c.periodo === p)); const t = [...pend.map(c => `${U.mes(c.periodo)} (${c.estado.toLowerCase()})`), ...sin.map(p => `${U.mes(p)} (sin cálculo)`)]; return t.length ? `No se incluyen ${t.length} período(s) sin bonificación aprobada: ${t.join(", ")}.` : ""; })(), vacio: "No hay bonificaciones aprobadas en el período y filtros seleccionados." };
  },
  /* RF-REP-03: realizadas vs ofertadas */
  capacitacion(f) {
    const anios = new Set(); for (let y = +f.d.slice(0, 4); y <= +f.h.slice(0, 4); y++) anios.add(y);
    const caps = DB.d.capacitaciones.filter(c => anios.has(c.anio) && c.estado !== "Dada de baja" && (!f.esp || c.competencia === f.esp || c.especialidades.includes(f.esp)));
    const filas = caps.map(c => {
      const vs = DB.d.versiones.filter(v => v.cap === c.id && v.cerrada && v.fecha >= f.d && v.fecha <= f.h);
      const ins = DB.d.inscripciones.filter(i => vs.some(v => v.id === i.version) && ["Aprobado", "Reprobado", "Inasistente"].includes(i.estado) && (() => { const x = DB.ficha(i.ficha); return x && this.pasa(f, x); })());
      const apr = ins.filter(i => i.estado === "Aprobado").length, asis = ins.filter(i => i.estado !== "Inasistente").length;
      const ns = ins.filter(i => i.nota != null).map(i => i.nota);
      return [c.id, c.nombre, c.tipo, nombreEmpresa(c.empresa), vs.length ? "Realizada" : "No realizada", vs.length, ins.length, asis, apr, ins.length ? Math.round(apr / ins.length * 100) + "%" : "—", ns.length ? U.num1(ns.reduce((x, y) => x + y, 0) / ns.length) : "—", ns];
    });
    const real = filas.filter(r => r[4] === "Realizada").length, pct = caps.length ? Math.round(real / caps.length * 100) : 0;
    const totIns = filas.reduce((s, r) => s + r[6], 0), totApr = filas.reduce((s, r) => s + r[8], 0);
    return { columnas: [{ t: "Código" }, { t: "Capacitación" }, { t: "Tipo" }, { t: "Empresa" }, { t: "Situación" }, { t: "Sesiones", num: true }, { t: "Participantes", num: true }, { t: "Asistentes", num: true }, { t: "Aprobados", num: true }, { t: "% aprobación" }, { t: "Nota promedio" }], filas: filas.map(r => r.slice(0, 11)),
      total: ["", "Total", "", "", `${real} de ${caps.length}`, filas.reduce((s, r) => s + r[5], 0), totIns, filas.reduce((s, r) => s + r[7], 0), totApr, totIns ? Math.round(totApr / totIns * 100) + "%" : "—", (() => { const ns = filas.flatMap(r => r[11]); return ns.length ? U.num1(ns.reduce((x, y) => x + y, 0) / ns.length) : "—"; })()],
      resumen: [["Capacitaciones ofertadas", caps.length], ["Capacitaciones realizadas", real], ["% de ejecución del plan", pct + "%"], ["Participantes", totIns], ["Aprobados", totApr]], vacio: "No hay capacitaciones ofertadas en el período y filtros seleccionados." };
  },
  datosExport(tab) {
    const g = tab.gen, R = REP[tab.params.tipo];
    return { titulo: "Reporte de " + R.t.toLowerCase(), modulo: "Reportes", sensible: tab.params.tipo !== "capacitacion", lineas: [this.lineaFiltros(tab), ...g.resumen.map(r => `${r[0]}: ${r[1]}`).slice(0, 6), ...(g.nota ? [g.nota] : [])], columnas: g.columnas, filas: g.filas.map(r => r.slice(0, g.columnas.length)), total: g.total };
  },
  render(tab) {
    const tipo = tab.params.tipo, R = REP[tipo], f = tab.f, mes = R.per === "mes", g = tab.gen;
    const ps = Object.keys(DB.d.fuente).sort();
    const per = mes ? `<label>Desde <select id="rpD">${opts(ps.map(p => [p, U.mes(p)]), f.d)}</select></label><label>Hasta <select id="rpH">${opts(ps.map(p => [p, U.mes(p)]), f.h)}</select></label>`
      : `<label>Desde <input type="date" id="rpD" value="${E(f.d)}" max="${U.hoy()}"></label><label>Hasta <input type="date" id="rpH" value="${E(f.h)}" max="${U.hoy()}"></label>`;
    let body = `<div class="bar info"><b class="ic">i</b><span>Defina los filtros y pulse <b>Generar reporte</b>.</span></div>`;
    if (g && g.error) body = `<div class="bar err"><b class="ic">✕</b><span>${E(g.error)}</span></div>`;
    else if (g) {
      const cols = g.columnas;
      body = `<div class="rep-head"><div><b>SGRH Instalum · Reporte de ${E(R.t.toLowerCase())}</b><br><span class="muted small">${E(this.lineaFiltros(tab))} · generado el ${E(g.fecha)} por ${E(ST.user.user)}</span></div><div class="r"><button class="btn pri" id="rpX">Exportar a Excel</button><button class="btn" id="rpP">Exportar a PDF</button></div></div>
      ${g.nota ? `<div class="bar info"><b class="ic">i</b><span>${E(g.nota)}</span></div>` : ""}
      <div class="summary" style="max-width:460px;margin:8px 0 12px">${g.resumen.map(r => `<div>${E(r[0])}</div><div class="v">${E(r[1])}</div>`).join("")}</div>
      ${g.filas.length ? `<div class="lv-wrap"><table class="lv"><thead><tr>${cols.map(c => `<th class="${c.num || c.money ? "num" : ""}">${E(c.t)}</th>`).join("")}</tr></thead><tbody>${g.filas.map(r => `<tr class="${r[cols.length] === "sub" ? "subtot" : ""}">${cols.map((c, i) => `<td class="${c.num || c.money ? "num" : ""}">${c.money ? U.pesos(r[i]) : E(r[i])}</td>`).join("")}</tr>`).join("")}</tbody>${g.total ? `<tfoot><tr class="tot">${cols.map((c, i) => `<td class="${c.num || c.money ? "num" : ""}">${c.money ? U.pesos(g.total[i]) : E(g.total[i])}</td>`).join("")}</tr></tfoot>` : ""}</table></div>` : `<div class="empty" style="border:1px solid #DDD">${E(g.vacio)}</div>`}`;
    }
    return `<div class="dochead"><h2>Reporte de ${E(R.t.toLowerCase())}</h2><span class="sub">${E(R.hu.split(" · ")[0])}</span></div>
    <fieldset class="fs"><legend>Filtros</legend><div class="filters" style="margin:4px 0">${per}
      <label>Departamento <select id="rpDe">${opts(CAT.departamentos, f.depto, "Todos")}</select></label>
      <label>Cargo <select id="rpC">${opts([...new Set(DB.d.fichas.map(x => x.cargo.cargo).filter(Boolean))].sort(), f.cargo, "Todos")}</select></label>
      <label>Especialidad <select id="rpE">${opts(CAT.especialidades, f.esp, "Todas")}</select></label>
      <button class="btn pri" id="rpG">Generar reporte</button><button class="btn" id="rpL">Limpiar filtros</button></div></fieldset>${body}`;
  },
  mount(w, tab) {
    [["#rpD", "d"], ["#rpH", "h"], ["#rpDe", "depto"], ["#rpC", "cargo"], ["#rpE", "esp"]].forEach(([s, k]) => $(s).onchange = e => { tab.f[k] = e.target.value; if (tab.gen) this.generar(tab); });
    $("#rpG").onclick = () => this.generar(tab);
    $("#rpL").onclick = () => { tab.f = filtrosRep(tab.params.tipo); tab.gen = null; pintar(); };
    const x = $("#rpX"); if (x) x.onclick = () => exportar("excel", this.datosExport(tab));
    const p = $("#rpP"); if (p) p.onclick = () => exportar("pdf", this.datosExport(tab));
  },
};
HELP.reporte = { t: "Reportes", html: "<ul><li>Defina el <b>período</b> y, si quiere, el departamento, cargo y especialidad. Pulse <b>Generar reporte</b>. Al cambiar un filtro el reporte se actualiza; <b>Limpiar filtros</b> vuelve a los valores iniciales.</li><li><b>Colaboradores nuevos</b>: ingresos en el período con nombre, cargo, departamento y fecha de ingreso.</li><li><b>Bonificaciones</b>: solo períodos aprobados, con subtotales por departamento y total general. Se avisa qué períodos pendientes no se incluyen.</li><li><b>Capacitaciones</b>: capacitaciones realizadas versus ofertadas, participantes, aprobados y % de ejecución del plan.</li><li><b>Exportar a Excel o PDF</b> genera el archivo con los mismos datos y filtros que se ven en pantalla, con el formato corporativo. Cada exportación queda en la bitácora.</li></ul>" };

