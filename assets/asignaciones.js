/* SGRH Instalum · asignación de capacitaciones: individual por área con prueba y masiva (RF-CAP-03 y RF-CAP-10) */
"use strict";
const proxSesion = c => DB.d.versiones.filter(v => v.cap === c.id && !v.cerrada && v.fecha >= U.hoy()).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
const txtSesion = c => { const v = proxSesion(c); return v ? `${U.fecha(v.fecha)} ${v.inicio}` : "Por programar"; };
const txtPrueba = c => (c.prueba ? `Sí · mín. ${U.num1(c.notaMin || 4)}` : "No");
const fichasAsignables = () => DB.d.fichas.filter(f => ["Activo", "Licencia"].includes(f.estado)).sort((a, b) => FICHA.nombre(a).localeCompare(FICHA.nombre(b)));
/* situación de un trabajador frente a una capacitación */
function situacion(f, c) {
  if (CAPR.inscritos(c.id).some(i => i.ficha === f.id && ["Inscrito", "Pendiente (sin cupo)"].includes(i.estado))) return { t: "Ya inscrito", bloq: true };
  if (f.estado === "Licencia") return { t: "Con licencia", bloq: true };
  if (CAPR.cuposLibres(c) <= 0) return { t: "Sin cupos", bloq: true };
  const ce = certsUltimas().find(x => x.ficha === f.id && x.tipo === c.tipo && CAPR.certVigente(x));
  if (ce) return { t: ce.vence ? `Certificado hasta ${U.fecha(ce.vence)}` : "Certificado (permanente)", aviso: true };
  return { t: "Disponible" };
}

/* ---------- Asignar capacitación a un trabajador (por área, con prueba) ---------- */
VIEWS.asignar = capView({
  title: tab => (tab.ficha && DB.ficha(tab.ficha) ? "Asignar · " + DB.ficha(tab.ficha).nombres.split(" ")[0] + " " + DB.ficha(tab.ficha).apPat : "Asignar capacitación"),
  hu: () => "RF-CAP-03 · Inscribir colaboradores · RF-CAP-02 · Obligatorias por especialidad · RF-CAP-04 · Prueba y resultado · RF-CON-10 · Capacitaciones del trabajador",
  init(tab) { tab.ficha = tab.params.ficha || ""; this.limpiar(tab); },
  reparam(tab) { if (tab.params.ficha && tab.params.ficha !== tab.ficha) { tab.ficha = tab.params.ficha; this.limpiar(tab); } tab.params.ficha = ""; },
  limpiar(tab) { tab.area = ""; tab.cap = ""; tab.prueba = null; tab.notaMin = ""; tab.obs = ""; },
  tools(tab) { return { guardar: tab.ficha && tab.cap && (() => this.asignar(tab)) }; },
  render(tab) {
    const f = DB.ficha(tab.ficha), lista = fichasAsignables();
    let h = `<div class="dochead"><h2>Asignar capacitación a un trabajador</h2><span class="sub">Elija el trabajador, el área en que lo quiere capacitar y la capacitación</span></div>
    <fieldset class="fs paso"><legend><b>1</b> Trabajador</legend><div class="filters" style="margin:4px 0"><label>Trabajador <select id="aF" style="max-width:460px">${opts(lista.map(x => [x.id, `${FICHA.nombre(x)} · ${x.cargo.cargo || "sin cargo"}${x.cargo.especialidad ? " · " + x.cargo.especialidad : ""}${x.estado === "Licencia" ? " (con licencia)" : ""}`]), tab.ficha, "Seleccione el trabajador…")}</select></label>${f ? `<button class="btn" id="aVer">Ver ficha</button>` : ""}</div>`;
    if (!f) return h + `<p class="muted">Solo aparecen trabajadores activos o con licencia. Si no encuentra a alguien, revise que su ficha esté completa.</p></fieldset>`;
    const hab = CAPR.habilitacion(f);
    const tiene = DB.d.inscripciones.filter(i => i.ficha === f.id && i.estado !== "Cancelada").map(i => { const c = DB.cap(i.cap) || {}, v = DB.version(i.version); const ce = DB.d.certificaciones.find(x => x.ficha === f.id && x.cap === i.cap && v && x.emision === v.fecha); return { _id: i.id, cap: c.nombre || i.cap, area: c.tipo || "", fecha: v ? v.fecha : i.fecha, estado: i.estado, nota: CAPR.notaTxt(i), cert: ce ? (ce.vence ? `${CAPR.certEstado(ce)} · vence ${U.fecha(ce.vence)}` : "Permanente") : "—" }; }).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    h += `${f.estado === "Licencia" ? `<div class="bar warn"><b class="ic">⚠</b><span>${E(FICHA.nombre(f))} está con licencia: no se le pueden asignar capacitaciones hasta que vuelva a estar Activo.</span></div>` : ""}
      ${hab.aplica ? (hab.habilitado ? `<div class="bar ok"><b class="ic">✓</b><span>Habilitado para obra: cumple las capacitaciones obligatorias de ${E(f.cargo.especialidad)}.</span></div>` : `<div class="bar warn"><b class="ic">⚠</b><span>Le faltan capacitaciones obligatorias de ${E(f.cargo.especialidad)}: ${E(hab.faltan.join(", "))}.</span></div>`) : ""}
      <p class="small" style="margin:6px 0"><b>Capacitaciones que ya tiene (${tiene.length})</b></p>
      ${listview({ cols: [{ k: "cap", t: "Capacitación", nosort: true }, { k: "area", t: "Área", nosort: true }, { k: "fecha", t: "Fecha", f: r => U.fecha(r.fecha), w: 90, nosort: true }, { k: "estado", t: "Resultado", f: r => pill(r.estado), w: 150, nosort: true }, { k: "nota", t: "Nota", w: 70, nosort: true }, { k: "cert", t: "Certificación", nosort: true }], rows: tiene, empty: "Todavía no tiene capacitaciones." }).html}</fieldset>`;
    if (f.estado !== "Activo") return h;
    /* paso 2: área */
    const obligPend = new Set(CAPR.obligatoriasPara(f.cargo.especialidad).filter(c => !CAPR.tieneVigente(f.id, c.tipo)).map(c => c.tipo));
    const areas = DB.d.tipos.map(t => ({ t: t.nombre, d: t.descripcion, n: capsVigentes().filter(c => c.tipo === t.nombre).length, oblig: obligPend.has(t.nombre), cert: CAPR.tieneVigente(f.id, t.nombre) }));
    h += `<fieldset class="fs paso"><legend><b>2</b> Área en que lo quiere capacitar</legend><div class="chips">${areas.map(a => `<button class="chip ${tab.area === a.t ? "on" : ""} ${a.oblig ? "oblig" : ""}" data-area="${E(a.t)}" title="${E(a.d || "")}">${E(a.t)}<small>${a.n} capacitación(es)${a.oblig ? " · obligatoria pendiente" : a.cert ? " · ya certificado" : ""}</small></button>`).join("")}</div>
      ${obligPend.size ? `<p class="muted small">Las áreas marcadas en amarillo son obligatorias para su especialidad y aún no las cumple.</p>` : ""}</fieldset>`;
    if (!tab.area) return h;
    /* paso 3: capacitación */
    const caps = capsVigentes().filter(c => c.tipo === tab.area);
    h += `<fieldset class="fs paso"><legend><b>3</b> Capacitación de ${E(tab.area)} · plan ${U.anio()}</legend>`;
    if (!caps.length) h += `<div class="bar warn"><b class="ic">⚠</b><span>No hay capacitaciones de esta área en el plan ${U.anio()}.</span></div>${puede("capacitaciones") ? `<button class="btn" id="aCat">Crear una en el plan anual…</button>` : ""}`;
    else h += `<div class="lv-wrap"><table class="lv"><thead><tr><th style="width:30px"></th><th>Capacitación</th><th>Empresa</th><th>Próxima sesión</th><th class="num">Cupos libres</th><th>Prueba</th><th>Situación del trabajador</th></tr></thead><tbody>${caps.map(c => { const s = situacion(f, c); return `<tr class="${s.bloq ? "mut" : ""}"><td><input type="radio" name="aCap" value="${c.id}" ${tab.cap === c.id ? "checked" : ""} ${s.bloq ? "disabled" : ""} aria-label="Elegir ${E(c.nombre)}"></td><td>${E(c.nombre)}${c.obligatoria ? ' <span class="muted small">(obligatoria)</span>' : ""}</td><td>${E(nombreEmpresa(c.empresa))}</td><td>${txtSesion(c)}</td><td class="num">${CAPR.cuposLibres(c)}</td><td>${txtPrueba(c)}</td><td>${s.bloq ? pill(s.t, "mut") : s.aviso ? pill(s.t, "warn") : pill(s.t, "ok")}</td></tr>`; }).join("")}</tbody></table></div>`;
    h += `</fieldset>`;
    const c = DB.cap(tab.cap);
    if (!c || c.tipo !== tab.area) return h;
    /* paso 4: prueba y confirmación */
    const prueba = tab.prueba == null ? !!c.prueba : tab.prueba, nm = tab.notaMin || U.num1(c.notaMin || 4);
    h += `<fieldset class="fs paso"><legend><b>4</b> Prueba de evaluación y confirmación</legend>
      <label class="chk" style="margin:6px 0"><input type="checkbox" id="aP" ${prueba ? "checked" : ""}> Al terminar la capacitación, el trabajador rinde una <b>prueba</b> con nota de 1,0 a 7,0</label>
      <div class="row" style="--lw:170px"><label class="l" for="aN">Nota mínima para aprobar</label><div class="ctl"><input type="text" id="aN" value="${E(nm)}" maxlength="3" style="flex:0 0 70px" ${prueba ? "" : "disabled"}><span class="note muted">Con esta nota o más queda Aprobado y recibe su certificación.</span></div></div>
      <div class="row" style="--lw:170px;align-items:flex-start"><label class="l" for="aO">Motivo (opcional)</label><div class="ctl"><textarea id="aO" rows="2" maxlength="200" placeholder="Ej.: reforzar instalación de PVC por reclamos de clientes">${E(tab.obs)}</textarea></div></div>
      <div class="bar info"><b class="ic">i</b><span>Se asignará <b>${E(c.nombre)}</b> a <b>${E(FICHA.nombre(f))}</b> · sesión: ${txtSesion(c)} · ${prueba ? `con prueba (nota mínima ${E(nm)})` : "sin prueba"}.</span></div>
      <div class="actions"><button class="btn" id="aLimpiar">Elegir otra área</button><button class="btn pri" id="aGo">Asignar capacitación (F2)</button></div></fieldset>`;
    return h;
  },
  mount(w, tab) {
    $("#aF").onchange = e => { tab.ficha = e.target.value; this.limpiar(tab); pintar(); };
    const v = $("#aVer"); if (v) v.onclick = () => puede("contrataciones") ? abrir(tab.ficha, { sec: "capacitaciones" }) : aviso("Sin permiso", "<p>Su perfil no permite consultar fichas.</p>", "warn");
    $$("[data-area]", w).forEach(b => b.onclick = () => { tab.area = b.dataset.area; tab.cap = ""; tab.prueba = null; tab.notaMin = ""; guardarScroll(); pintar(); });
    $$('input[name="aCap"]', w).forEach(r => r.onchange = () => { tab.cap = r.value; tab.prueba = null; tab.notaMin = ""; guardarScroll(); pintar(); const g = $("#aGo"); if (g) g.scrollIntoView({ block: "nearest" }); });
    const cat = $("#aCat"); if (cat) cat.onclick = () => abrir("catalogo");
    const p = $("#aP"); if (p) p.onchange = () => { tab.prueba = p.checked; guardarScroll(); pintar(); };
    const n = $("#aN"); if (n) n.oninput = () => { tab.notaMin = n.value; n.classList.toggle("err", leerNota(n.value) == null); };
    const o = $("#aO"); if (o) o.oninput = () => { tab.obs = o.value; };
    const l = $("#aLimpiar"); if (l) l.onclick = () => { this.limpiar(tab); pintar(); };
    const g = $("#aGo"); if (g) g.onclick = () => this.asignar(tab);
  },
  async asignar(tab) {
    const f = DB.ficha(tab.ficha), c = DB.cap(tab.cap);
    if (!f || !c) return aviso("Faltan datos", "<p>Elija el trabajador, el área y la capacitación.</p>", "warn");
    const prueba = tab.prueba == null ? !!c.prueba : tab.prueba, nm = leerNota(tab.notaMin || String(c.notaMin || 4));
    if (prueba && nm == null) return aviso("Nota mínima inválida", "<p>La nota mínima debe ser un número entre 1,0 y 7,0.</p>", "err");
    const s = situacion(f, c);
    if (s.bloq) return aviso("No se puede asignar", `<p>${E(FICHA.nombre(f))}: ${E(s.t.toLowerCase())}.</p>`, "warn");
    if (s.aviso && !await confirmar("El trabajador ya está certificado en esta área", `<p>${E(FICHA.nombre(f))} tiene una certificación vigente de ${E(c.tipo)} (${E(s.t.toLowerCase())}).</p><p>¿Desea asignarle la capacitación de todas formas?</p>`, "Asignar igual", "Cancelar")) return;
    const r = CAPR.inscribir(c, f.id, "Asignación individual", ST.user.user, { prueba, notaMin: prueba ? nm : (c.notaMin || 4), obs: tab.obs.trim() });
    if (!r.ok) return aviso("No se pudo asignar", `<p>${E(r.motivo)}.</p>`, "err");
    DB.log(ST.user.user, "Capacitaciones", "Asignación individual", `${f.id} · ${c.id} ${c.nombre} · ${prueba ? "con prueba, nota mínima " + U.num1(nm) : "sin prueba"}${tab.obs.trim() ? " · " + tab.obs.trim() : ""}`);
    const resumen = `<p><b>${E(c.nombre)}</b> quedó asignada a <b>${E(FICHA.nombre(f))}</b>.</p><ul><li>Área: ${E(c.tipo)}</li><li>Sesión: ${txtSesion(c)}${proxSesion(c) ? ` · ${E(proxSesion(c).lugar)}` : " (se le asignará cuando se programe la fecha)"}</li><li>Prueba: ${prueba ? `sí, nota mínima ${U.num1(nm)}` : "no"}</li><li>Cupos libres que quedan: ${CAPR.cuposLibres(c)}</li></ul>`;
    this.limpiar(tab); pintar();
    const x = await dialog({ icon: "ok", head: "Capacitación asignada", html: resumen, buttons: [{ label: "Asignar otra a este trabajador", pri: true, value: "otra" }, { label: "Asignar a otro trabajador", value: "nuevo" }, { label: "Cerrar" }] });
    if (x === "nuevo") { tab.ficha = ""; pintar(); }
  },
});
HELP.asignar = { t: "Asignar capacitación a un trabajador", html: "<ol><li><b>Trabajador</b>: elíjalo de la lista. Verá las capacitaciones que ya tiene, sus notas y certificaciones, y si le falta alguna obligatoria.</li><li><b>Área</b>: elija en qué lo quiere capacitar (por ejemplo Instalación de PVC o Trabajo en altura). Las áreas en amarillo son obligatorias para su especialidad y aún no las cumple.</li><li><b>Capacitación</b>: elija una de esa área. Se ven la próxima sesión, los cupos y si el trabajador ya está inscrito o certificado.</li><li><b>Prueba</b>: indique si al terminar rinde una prueba y la nota mínima para aprobar (por defecto 4,0). La nota se ingresa después en «Registrar asistencia y notas».</li></ol><p>Para asignar a muchos trabajadores a la vez use <b>Asignación masiva</b>. También puede llegar aquí desde la ficha del trabajador (pestaña Capacitaciones › Añadir capacitación).</p>" };

/* ---------- Asignación masiva (RF-CAP-10) ---------- */
VIEWS.masiva = capView({
  title: () => "Asignación masiva", hu: () => "RF-CAP-10 · Asignar capacitaciones a grupos de colaboradores · RF-CAP-03 · Inscribir con control de cupos",
  init(tab) { tab.caps = new Set(tab.params.cap ? [tab.params.cap] : []); tab.marc = new Set(); tab.f = { area: "", depto: "", esp: "", cargo: "", q: "" }; tab.modo = "cap"; tab.notaMin = "4,0"; },
  trabajadores(tab) {
    const f = tab.f, q = U.norm(f.q);
    return fichasAsignables().filter(x => (!f.depto || x.cargo.departamento === f.depto) && (!f.esp || x.cargo.especialidad === f.esp) && (!f.cargo || x.cargo.cargo === f.cargo) && (!q || U.norm(FICHA.nombre(x) + " " + x.rut + " " + x.id).includes(q)));
  },
  tools(tab) { return { guardar: tab.caps.size && tab.marc.size && (() => this.asignar(tab)) }; },
  render(tab) {
    const caps = capsVigentes().filter(c => !tab.f.area || c.tipo === tab.f.area);
    const tr = this.trabajadores(tab), selOk = [...tab.marc].filter(id => DB.ficha(id) && DB.ficha(id).estado === "Activo");
    const nC = [...tab.caps].filter(id => DB.cap(id)).length, nT = selOk.length;
    const cargos = [...new Set(DB.d.fichas.map(x => x.cargo.cargo).filter(Boolean))].sort();
    return `<div class="dochead"><h2>Asignación masiva de capacitaciones</h2><span class="sub">Varias capacitaciones a muchos trabajadores en un solo paso</span></div>
    <fieldset class="fs paso"><legend><b>1</b> Capacitaciones a asignar (${nC} elegida${nC === 1 ? "" : "s"})</legend>
      <div class="filters" style="margin:4px 0"><label>Área <select id="mA">${opts(DB.d.tipos.map(t => t.nombre), tab.f.area, "Todas")}</select></label></div>
      <div class="lv-wrap" style="max-height:220px"><table class="lv"><thead><tr><th style="width:30px"></th><th>Capacitación</th><th>Área</th><th>Próxima sesión</th><th class="num">Cupos libres</th><th>Prueba</th></tr></thead><tbody>
      ${caps.length ? caps.map(c => `<tr><td><input type="checkbox" data-c="${c.id}" ${tab.caps.has(c.id) ? "checked" : ""} aria-label="Elegir ${E(c.nombre)}"></td><td>${E(c.nombre)}${c.obligatoria ? ' <span class="muted small">(obligatoria)</span>' : ""}</td><td>${E(c.tipo)}</td><td>${txtSesion(c)}</td><td class="num">${CAPR.cuposLibres(c)}</td><td>${txtPrueba(c)}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">No hay capacitaciones de esta área en el plan ${U.anio()}.</td></tr>`}</tbody></table></div></fieldset>
    <fieldset class="fs paso"><legend><b>2</b> Trabajadores (${nT} elegido${nT === 1 ? "" : "s"})</legend>
      <div class="filters" style="margin:4px 0"><label>Buscar <input type="text" id="mQ" value="${E(tab.f.q)}" placeholder="Nombre, RUT o N° ficha" style="width:170px"></label><label>Departamento <select id="mD">${opts(CAT.departamentos, tab.f.depto, "Todos")}</select></label><label>Especialidad <select id="mE">${opts(CAT.especialidades, tab.f.esp, "Todas")}</select></label><label>Cargo <select id="mC">${opts(cargos, tab.f.cargo, "Todos")}</select></label></div>
      <div class="filters" style="margin:4px 0"><button class="btn" id="mAll">Seleccionar los ${tr.filter(x => x.estado === "Activo").length} filtrados</button><button class="btn" id="mNone">Quitar selección</button></div>
      <div class="lv-wrap" style="max-height:260px"><table class="lv"><thead><tr><th style="width:30px"></th><th>N° ficha</th><th>Trabajador</th><th>Cargo</th><th>Departamento</th><th>Especialidad</th><th>Estado</th></tr></thead><tbody>
      ${tr.length ? tr.map(x => `<tr class="${x.estado !== "Activo" ? "mut" : ""}"><td><input type="checkbox" data-m="${x.id}" ${tab.marc.has(x.id) && x.estado === "Activo" ? "checked" : ""} ${x.estado !== "Activo" ? "disabled" : ""} aria-label="Elegir ${E(FICHA.nombre(x))}"></td><td>${E(x.id)}</td><td>${E(FICHA.nombre(x))}</td><td>${E(x.cargo.cargo || "—")}</td><td>${E(x.cargo.departamento || "—")}</td><td>${E(x.cargo.especialidad || "—")}</td><td>${pill(x.estado)}</td></tr>`).join("") : `<tr><td colspan="7" class="empty">No hay trabajadores con esos filtros.</td></tr>`}</tbody></table></div></fieldset>
    <fieldset class="fs paso"><legend><b>3</b> Prueba de evaluación</legend>
      <label class="chk" style="display:flex;margin:4px 0"><input type="radio" name="mP" value="cap" ${tab.modo === "cap" ? "checked" : ""}> Según lo definido en cada capacitación (columna «Prueba»)</label>
      <label class="chk" style="display:flex;margin:4px 0"><input type="radio" name="mP" value="si" ${tab.modo === "si" ? "checked" : ""}> Todas con prueba · nota mínima <input type="text" id="mN" value="${E(tab.notaMin)}" maxlength="3" style="width:60px;margin-left:6px" ${tab.modo === "si" ? "" : "disabled"}></label>
      <label class="chk" style="display:flex;margin:4px 0"><input type="radio" name="mP" value="no" ${tab.modo === "no" ? "checked" : ""}> Sin prueba</label></fieldset>
    <div class="bar ${nC && nT ? "info" : "warn"}"><b class="ic">${nC && nT ? "i" : "!"}</b><span>${nC && nT ? `Se asignarán <b>${nC}</b> capacitación(es) a <b>${nT}</b> trabajador(es): hasta <b>${nC * nT}</b> asignaciones. Quienes ya estén inscritos o sin cupo se informan al final.` : "Elija al menos una capacitación (paso 1) y un trabajador (paso 2)."}</span></div>
    <div class="actions"><button class="btn pri" id="mGo" ${nC && nT ? "" : "disabled"}>Asignar a todos (F2)</button></div>`;
  },
  mount(w, tab) {
    const rep = () => { guardarScroll(); pintar(); };
    $("#mA").onchange = e => { tab.f.area = e.target.value; rep(); };
    $$("[data-c]", w).forEach(ch => ch.onchange = () => { if (ch.checked) tab.caps.add(ch.dataset.c); else tab.caps.delete(ch.dataset.c); rep(); });
    bindBuscador($("#mQ"), tab, "q");
    [["#mD", "depto"], ["#mE", "esp"], ["#mC", "cargo"]].forEach(([s, k]) => $(s).onchange = e => { tab.f[k] = e.target.value; rep(); });
    $$("[data-m]", w).forEach(ch => ch.onchange = () => { if (ch.checked) tab.marc.add(ch.dataset.m); else tab.marc.delete(ch.dataset.m); rep(); });
    $("#mAll").onclick = () => { this.trabajadores(tab).filter(x => x.estado === "Activo").forEach(x => tab.marc.add(x.id)); rep(); };
    $("#mNone").onclick = () => { tab.marc.clear(); rep(); };
    $$('input[name="mP"]', w).forEach(r => r.onchange = () => { tab.modo = r.value; rep(); });
    const n = $("#mN"); if (n) n.oninput = () => { tab.notaMin = n.value; n.classList.toggle("err", leerNota(n.value) == null); };
    $("#mGo").onclick = () => this.asignar(tab);
  },
  async asignar(tab) {
    const caps = [...tab.caps].map(id => DB.cap(id)).filter(Boolean), fichas = [...tab.marc].map(id => DB.ficha(id)).filter(f => f && f.estado === "Activo");
    if (!caps.length || !fichas.length) return aviso("Faltan datos", "<p>Elija al menos una capacitación y un trabajador.</p>", "warn");
    const nm = leerNota(tab.notaMin);
    if (tab.modo === "si" && nm == null) return aviso("Nota mínima inválida", "<p>La nota mínima debe ser un número entre 1,0 y 7,0.</p>", "err");
    if (!await confirmar("¿Confirmar la asignación masiva?", `<p>${caps.length} capacitación(es) × ${fichas.length} trabajador(es) = hasta ${caps.length * fichas.length} asignaciones.</p><p>Capacitaciones: ${E(caps.map(c => c.nombre).join(", "))}.</p>`, "Asignar", "Cancelar")) return;
    const out = caps.map(c => {
      const ok = [], no = [];
      for (const f of fichas) {
        const opc = tab.modo === "si" ? { prueba: true, notaMin: nm } : tab.modo === "no" ? { prueba: false } : {};
        const r = CAPR.inscribir(c, f.id, "Asignación masiva", ST.user.user, opc);
        (r.ok ? ok : no).push([f, r.motivo]);
      }
      DB.log(ST.user.user, "Capacitaciones", "Asignación masiva", `${c.id} ${c.nombre} · ${ok.length} asignado(s)${no.length ? ` · ${no.length} no asignado(s)` : ""} · prueba: ${tab.modo === "si" ? "sí, mínima " + U.num1(nm) : tab.modo === "no" ? "no" : "según capacitación"}`);
      return { c, ok, no };
    });
    const total = out.reduce((s, x) => s + x.ok.length, 0);
    tab.marc.clear(); tab.caps.clear(); pintar();
    aviso(total ? `Asignación masiva realizada: ${total} asignación(es)` : "No se realizó ninguna asignación", `<div class="lv-wrap" style="max-height:340px"><table class="lv"><thead><tr><th>Capacitación</th><th class="num">Asignados</th><th>No asignados (motivo)</th></tr></thead><tbody>${out.map(x => `<tr><td>${E(x.c.nombre)}</td><td class="num">${x.ok.length}</td><td style="white-space:normal">${x.no.length ? x.no.map(([f, m]) => `${E(FICHA.nombre(f))}: ${E(m)}`).join("<br>") : "—"}</td></tr>`).join("")}</tbody></table></div>`, total ? (out.some(x => x.no.length) ? "warn" : "ok") : "err");
  },
});
HELP.masiva = { t: "Asignación masiva", html: "<ol><li>Marque una o varias <b>capacitaciones</b>. Puede filtrarlas por área.</li><li>Marque los <b>trabajadores</b>: filtre por departamento, especialidad o cargo y pulse «Seleccionar los filtrados» para tomar a todo el grupo de una vez.</li><li>Indique si rinden <b>prueba</b>: según cada capacitación, todas con prueba (con la nota mínima que defina) o sin prueba.</li><li>Pulse <b>Asignar a todos</b>. Al final verá cuántos quedaron asignados en cada capacitación y quiénes no, con el motivo (ya inscrito, sin cupos).</li></ol><p>Los trabajadores con licencia aparecen pero no se pueden elegir.</p>" };
