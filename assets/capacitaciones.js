/* SGRH Instalum · módulo de Capacitaciones (RF-CAP-01 a RF-CAP-17) */
"use strict";

/* ---------- formulario genérico en diálogo ---------- */
function campoForm(c, v) {
  const id = "fm_" + c.k, req = c.req ? "req" : "";
  v = v ?? (c.def ?? "");
  let ctl;
  if (c.type === "select") ctl = `<select id="${id}" data-k="${c.k}" class="${req}" ${c.dis ? "disabled" : ""}>${opts(c.opts, v, c.vacio === false ? null : "Seleccione…")}</select>`;
  else if (c.type === "check") ctl = `<label class="chk"><input type="checkbox" id="${id}" data-k="${c.k}" ${v ? "checked" : ""} ${c.dis ? "disabled" : ""}> ${E(c.lbl || "")}</label>`;
  else if (c.type === "checks") ctl = c.opts.map(o => `<label class="chk" style="margin-right:12px"><input type="checkbox" data-k="${c.k}" data-v="${E(o)}" ${(v || []).includes(o) ? "checked" : ""} ${c.dis ? "disabled" : ""}> ${E(o)}</label>`).join("");
  else if (c.type === "textarea") ctl = `<textarea id="${id}" data-k="${c.k}" rows="3" class="${req}" maxlength="${c.max || 300}" placeholder="${E(c.ph || "")}">${E(v)}</textarea>`;
  else ctl = `<input type="${c.type === "rut" ? "text" : c.type || "text"}" id="${id}" data-k="${c.k}" class="${req}" value="${E(v)}" placeholder="${E(c.ph || "")}" ${c.ro ? "readonly" : ""} ${c.dis ? "disabled" : ""} ${c.type === "rut" ? 'data-rut="1" maxlength="12"' : `maxlength="${c.max || 80}"`} ${c.min != null ? `min="${c.min}"` : ""} ${c.maxv != null ? `max="${c.maxv}"` : ""} ${c.step ? `step="${c.step}"` : ""}>`;
  return `<div class="row" ${c.type === "textarea" || c.type === "checks" ? 'style="align-items:flex-start"' : ""} data-row="${c.k}"><label class="l" for="${id}">${E(c.t)}</label><div class="ctl">${ctl}${c.nota ? `<span class="note muted">${E(c.nota)}</span>` : ""}</div></div>`;
}
function leerForm(v) {
  const o = {};
  $$("[data-k]", v).forEach(el => {
    const k = el.dataset.k;
    if (el.type === "checkbox" && el.dataset.v != null) { o[k] = o[k] || []; if (el.checked) o[k].push(el.dataset.v); }
    else if (el.type === "checkbox") o[k] = el.checked;
    else o[k] = el.tagName === "TEXTAREA" || el.type === "text" || el.type === "email" ? el.value.trim().replace(/[ \t]+/g, " ") : el.value;
  });
  return o;
}
function formulario({ title = "SGRH Instalum", head, intro = "", campos, valores = {}, guardar, wide = true, lw = 150, onMount, label = "Guardar" }) {
  return dialog({ title, icon: null, head, wide,
    html: `${intro}<div id="fmMsg"></div><div style="--lw:${lw}px">${campos.map(c => campoForm(c, valores[c.k])).join("")}</div><p class="muted small">Los campos con fondo amarillo son obligatorios.</p>`,
    mount: v => { $$("[data-rut]", v).forEach(i => { filtroRut(i); i.addEventListener("blur", () => { if (i.value.trim()) i.value = U.rutFormato(i.value); }); }); onMount && onMount(v); },
    buttons: [{ label, pri: true, value: "ok", onClick: v => { const vals = leerForm(v); const err = guardar(vals, v); if (err) { barErr($("#fmMsg", v), err); $(".dbody", v).scrollTop = 0; return false; } return true; } }, { label: "Cancelar" }] });
}
const nombreEmpresa = rut => (DB.empresa(rut) || { razon: "—" }).razon;
const capsVigentes = () => DB.d.capacitaciones.filter(c => c.anio === U.anio() && c.estado === "Publicada");
const optsCaps = (sel, lista = capsVigentes()) => opts(lista.map(c => [c.id, `${c.id} · ${c.nombre}${c.obligatoria ? " (obligatoria)" : ""}`]), sel, "Seleccione una capacitación…");

/* alerta de certificaciones al ingresar al módulo (RF-CAP-06) */
function certsAlerta() {
  const ult = new Map();
  for (const c of DB.d.certificaciones) { const k = c.ficha + "|" + c.tipo; if (!ult.has(k) || ult.get(k).emision < c.emision) ult.set(k, c); }
  return [...ult.values()].filter(c => { const f = DB.ficha(c.ficha); return f && f.estado !== "Desvinculado" && ["Vencida", "Por vencer"].includes(CAPR.certEstado(c)); })
    .sort((a, b) => (a.vence < b.vence ? -1 : 1));
}
/* aviso no bloqueante en las pantallas de Capacitaciones; el detalle se abre a pedido */
function alertaCap() {
  const l = certsAlerta();
  if (!l.length || ST.alertaOculta) return "";
  if (ST.alertaLog !== ST.user.user + ST.base) { ST.alertaLog = ST.user.user + ST.base; DB.log(ST.user.user, "Capacitaciones", "Alerta de certificaciones", `${l.length} vencida(s) o por vencer`); }
  const v = l.filter(c => CAPR.certEstado(c) === "Vencida").length;
  return `<div class="bar warn alerta-cert"><b class="ic">⚠</b><span>Atención: ${v ? `${v} certificación(es) vencida(s) y ` : ""}${l.length - v} por vencer en los próximos 30 días.</span><button class="link" data-alerta="ver">Ver detalle</button><button class="link" data-alerta="ocultar">Ocultar</button></div>`;
}
function bindAlertaCap(w) {
  $$("[data-alerta]", w).forEach(b => b.onclick = async () => {
    if (b.dataset.alerta === "ocultar") { ST.alertaOculta = true; guardarScroll(); return pintar(); }
    const l = certsAlerta();
    const r = await dialog({ icon: "warn", wide: true, head: `Certificaciones que requieren atención (${l.length})`,
      html: `<p>Las siguientes certificaciones están vencidas o vencen en los próximos 30 días:</p><div class="lv-wrap" style="max-height:220px"><table class="lv"><thead><tr><th>Colaborador</th><th>Certificación</th><th>Vence</th><th>Estado</th></tr></thead><tbody>${l.map(c => `<tr><td>${E(FICHA.nombre(DB.ficha(c.ficha)))}</td><td>${E(c.nombre)}</td><td>${U.fecha(c.vence)}</td><td>${pill(CAPR.certEstado(c))}</td></tr>`).join("")}</tbody></table></div>`,
      buttons: [{ label: "Ir a certificaciones", pri: true, value: "v" }, { label: "Cerrar" }] });
    if (r === "v") abrir("certificaciones");
  });
}
const capView = (o) => Object.assign({ mod: () => "Capacitaciones", permiso: "capacitaciones" }, o, {
  render(tab) { const h = o.render.call(this, tab); if (tab.view === "certificaciones") return h; const i = h.indexOf("</div>"); return i > 0 && h.startsWith("<div class=\"dochead\">") ? h.slice(0, i + 6) + alertaCap() + h.slice(i + 6) : alertaCap() + h; },
  mount(w, tab) { bindAlertaCap(w); o.mount && o.mount.call(this, w, tab); } });

/* ---------- Empresas capacitadoras (RF-CAP-13) ---------- */
VIEWS.empresas = capView({
  title: () => "Empresas capacitadoras", hu: () => "RF-CAP-13 · Registrar empresas capacitadoras",
  tools(tab) { return { nuevo: () => this.form(tab), exportar: () => pedirFormato({ titulo: "Empresas capacitadoras", modulo: "Capacitaciones", columnas: [{ t: "RUT" }, { t: "Razón social" }, { t: "Giro" }, { t: "Contacto" }, { t: "Teléfono" }, { t: "Correo" }], filas: DB.d.empresas.map(e => [e.rut, e.razon, e.giro, e.contacto, e.telefono, e.correo]) }) }; },
  render(tab) {
    const lv = listview({ cols: [{ k: "rut", t: "RUT", w: 110 }, { k: "razon", t: "Razón social" }, { k: "giro", t: "Giro" }, { k: "contacto", t: "Contacto" }, { k: "telefono", t: "Teléfono" }, { k: "correo", t: "Correo" }, { k: "n", t: "Capacitaciones", num: true, w: 90 }],
      rows: DB.d.empresas.map(e => ({ _id: e.rut, ...e, n: DB.d.capacitaciones.filter(c => U.rutLimpio(c.empresa) === U.rutLimpio(e.rut)).length })), sel: tab.sel, sort: tab.sort });
    return `<div class="dochead"><h2>Empresas capacitadoras</h2><span class="sub">${DB.d.empresas.length} registradas</span><span class="r"><button class="btn pri" id="eNew">Nueva empresa…</button><button class="btn" id="eEd">Modificar…</button></span></div>${lv.html}${pager(lv, "Doble clic para modificar")}`;
  },
  mount(w, tab) { $("#eNew").onclick = () => this.form(tab); $("#eEd").onclick = () => tab.sel ? this.form(tab, DB.empresa(tab.sel)) : aviso("Seleccione una empresa", "<p>Haga clic en una fila y luego en «Modificar».</p>"); bindList(w, tab, { onOpen: id => this.form(tab, DB.empresa(id)) }); },
  form(tab, e) {
    formulario({ head: e ? "Modificar empresa capacitadora" : "Nueva empresa capacitadora", valores: e || {},
      campos: [{ k: "rut", t: "RUT", type: "rut", req: true, ro: !!e, ph: "76.123.456-7", nota: e ? "No modificable" : "" }, { k: "razon", t: "Razón social", req: true }, { k: "giro", t: "Giro" }, { k: "contacto", t: "Persona de contacto", req: true }, { k: "telefono", t: "Teléfono", type: "tel", req: true, ph: "+56 2 2345 6789" }, { k: "correo", t: "Correo", type: "email", req: true, ph: "contacto@empresa.cl" }],
      guardar: x => {
        x.telefono = fonoFormato(x.telefono);
        if (!x.rut || !x.razon || !x.contacto || !x.telefono || !x.correo) return "Complete los campos obligatorios.";
        if (!U.rutValido(x.rut)) return "El RUT de la empresa no es válido.";
        x.rut = U.rutFormato(x.rut);
        if (!e && DB.empresa(x.rut)) return `Ya existe una empresa con el RUT ${x.rut}: ${DB.empresa(x.rut).razon}.`;
        if (DB.d.empresas.some(o => o !== e && U.norm(o.razon) === U.norm(x.razon))) return "Ya existe una empresa con esa razón social.";
        if (!U.fonoValido(x.telefono)) return "Teléfono inválido. Use el formato +56 2 2345 6789 o +56 9 1234 5678.";
        if (!U.correoValido(x.correo)) return "El correo no tiene un formato válido.";
        if (e) { Object.assign(e, x); DB.log(ST.user.user, "Capacitaciones", "Modificación de empresa", `${x.rut} · ${x.razon}`); }
        else { DB.d.empresas.push(x); DB.log(ST.user.user, "Capacitaciones", "Registro de empresa", `${x.rut} · ${x.razon}`); }
        tab.sel = x.rut; setTimeout(() => { tab.msg = e ? "Empresa modificada." : "Empresa registrada."; pintar(); }, 0);
      } });
  },
});
HELP.empresas = { t: "Empresas capacitadoras", html: "<p>Registre las empresas u OTEC que dictan capacitaciones. El RUT se valida y no puede repetirse. Las empresas se usan en el catálogo anual y en los capacitadores.</p>" };

/* ---------- Capacitadores (RF-CAP-14) ---------- */
VIEWS.capacitadores = capView({
  title: () => "Capacitadores", hu: () => "RF-CAP-14 · Registrar capacitadores",
  tools(tab) { return { nuevo: () => this.form(tab) }; },
  render(tab) {
    const lv = listview({ cols: [{ k: "rut", t: "RUT", w: 110 }, { k: "nombre", t: "Nombre" }, { k: "especialidad", t: "Especialidad" }, { k: "emp", t: "Empresa" }, { k: "n", t: "Sesiones", num: true, w: 80 }],
      rows: DB.d.capacitadores.map(c => ({ _id: c.rut, ...c, emp: nombreEmpresa(c.empresa), n: DB.d.versiones.filter(v => U.rutLimpio(v.capacitador) === U.rutLimpio(c.rut)).length })), sel: tab.sel, sort: tab.sort });
    return `<div class="dochead"><h2>Capacitadores</h2><span class="sub">${DB.d.capacitadores.length} registrados</span><span class="r"><button class="btn pri" id="kNew">Nuevo capacitador…</button><button class="btn" id="kEd">Modificar…</button></span></div>${lv.html}${pager(lv, "Doble clic para modificar")}`;
  },
  mount(w, tab) { $("#kNew").onclick = () => this.form(tab); $("#kEd").onclick = () => tab.sel ? this.form(tab, DB.capacitador(tab.sel)) : aviso("Seleccione un capacitador", "<p>Haga clic en una fila y luego en «Modificar».</p>"); bindList(w, tab, { onOpen: id => this.form(tab, DB.capacitador(id)) }); },
  form(tab, k) {
    if (!DB.d.empresas.length) return aviso("Registre una empresa primero", "<p>Cada capacitador pertenece a una empresa capacitadora.</p>", "warn");
    formulario({ head: k ? "Modificar capacitador" : "Nuevo capacitador", valores: k || {},
      campos: [{ k: "rut", t: "RUT", type: "rut", req: true, ro: !!k }, { k: "nombre", t: "Nombre completo", req: true }, { k: "especialidad", t: "Especialidad", req: true, ph: "Ej.: Trabajo en altura" }, { k: "empresa", t: "Empresa", type: "select", req: true, opts: DB.d.empresas.map(e => [e.rut, e.razon]) }],
      guardar: x => {
        if (!x.rut || !x.nombre || !x.especialidad || !x.empresa) return "Complete los campos obligatorios.";
        if (!U.rutValido(x.rut)) return "El RUT del capacitador no es válido.";
        x.rut = U.rutFormato(x.rut);
        if (!k && DB.capacitador(x.rut)) return `Ya existe el capacitador ${DB.capacitador(x.rut).nombre} con ese RUT.`;
        if (k) { Object.assign(k, x); DB.log(ST.user.user, "Capacitaciones", "Modificación de capacitador", `${x.rut} · ${x.nombre}`); }
        else { DB.d.capacitadores.push(x); DB.log(ST.user.user, "Capacitaciones", "Registro de capacitador", `${x.rut} · ${x.nombre}`); }
        tab.sel = x.rut; setTimeout(() => pintar(), 0);
      } });
  },
});
HELP.capacitadores = { t: "Capacitadores", html: "<p>Registre los relatores con su RUT, especialidad y empresa. Al programar una sesión se verifica que el capacitador no tenga otra sesión en el mismo horario.</p>" };

/* ---------- Tipos de capacitación (RF-CAP-15) ---------- */
VIEWS.tipos = capView({
  title: () => "Tipos de capacitación", hu: () => "RF-CAP-15 · Registrar tipos de capacitación",
  tools(tab) { return { nuevo: () => this.form(tab) }; },
  render(tab) {
    const lv = listview({ cols: [{ k: "nombre", t: "Tipo" }, { k: "descripcion", t: "Descripción" }, { k: "n", t: "Capacitaciones", num: true, w: 100 }],
      rows: DB.d.tipos.map(t => ({ _id: t.nombre, ...t, n: DB.d.capacitaciones.filter(c => c.tipo === t.nombre).length })), sel: tab.sel, sort: tab.sort });
    return `<div class="dochead"><h2>Tipos de capacitación</h2><span class="sub">${DB.d.tipos.length} tipos</span><span class="r"><button class="btn pri" id="tNew">Nuevo tipo…</button><button class="btn" id="tEd">Modificar…</button><button class="btn" id="tDel">Eliminar</button></span></div>${lv.html}${pager(lv, "Doble clic para modificar")}`;
  },
  mount(w, tab) {
    const t = () => DB.d.tipos.find(x => x.nombre === tab.sel);
    $("#tNew").onclick = () => this.form(tab);
    $("#tEd").onclick = () => t() ? this.form(tab, t()) : aviso("Seleccione un tipo", "<p>Haga clic en una fila.</p>");
    $("#tDel").onclick = async () => {
      const x = t(); if (!x) return aviso("Seleccione un tipo", "<p>Haga clic en una fila.</p>");
      const n = DB.d.capacitaciones.filter(c => c.tipo === x.nombre).length;
      if (n) return aviso("No se puede eliminar", `<p>El tipo «${E(x.nombre)}» está asociado a ${n} capacitación(es) del catálogo.</p>`, "warn");
      if (!await confirmar(`¿Eliminar el tipo «${x.nombre}»?`, "<p>No está asociado a ninguna capacitación.</p>")) return;
      DB.d.tipos.splice(DB.d.tipos.indexOf(x), 1); DB.log(ST.user.user, "Capacitaciones", "Eliminación de tipo", x.nombre); tab.sel = null; pintar();
    };
    bindList(w, tab, { onOpen: id => this.form(tab, DB.d.tipos.find(x => x.nombre === id)) });
  },
  form(tab, t) {
    formulario({ head: t ? "Modificar tipo de capacitación" : "Nuevo tipo de capacitación", valores: t || {}, campos: [{ k: "nombre", t: "Nombre", req: true, max: 60 }, { k: "descripcion", t: "Descripción", type: "textarea", max: 200 }],
      guardar: x => {
        if (!x.nombre) return "Ingrese el nombre del tipo.";
        if (DB.d.tipos.some(o => o !== t && U.norm(o.nombre) === U.norm(x.nombre))) return `Ya existe el tipo «${x.nombre}».`;
        if (t) { const ant = t.nombre; DB.d.capacitaciones.forEach(c => { if (c.tipo === ant) c.tipo = x.nombre; }); DB.d.certificaciones.forEach(c => { if (c.tipo === ant) c.tipo = x.nombre; }); Object.assign(t, x); DB.log(ST.user.user, "Capacitaciones", "Modificación de tipo", ant === x.nombre ? x.nombre : `${ant} → ${x.nombre}`); }
        else { DB.d.tipos.push(x); DB.log(ST.user.user, "Capacitaciones", "Registro de tipo", x.nombre); }
        tab.sel = x.nombre; setTimeout(() => pintar(), 0);
      } });
  },
});
HELP.tipos = { t: "Tipos de capacitación", html: "<p>Clasifican las capacitaciones del catálogo (por ejemplo, Trabajo en altura). El nombre no puede repetirse. Un tipo asociado a capacitaciones no se puede eliminar.</p>" };

/* ---------- Catálogo anual (RF-CAP-01, 02, 09, 11 y 12) ---------- */
VIEWS.catalogo = capView({
  title: () => "Catálogo anual", hu: () => "RF-CAP-01 · Crear capacitaciones · RF-CAP-02 · Obligatorias por especialidad · RF-CAP-09 · Plan anual · RF-CAP-11 · Modificar y dar de baja · RF-CAP-12 · Por empresa",
  init(tab) { tab.f = { anio: U.anio(), emp: "", tipo: "", est: "" }; tab.sort = { k: "id", dir: 1 }; },
  filas(tab) {
    const f = tab.f;
    return DB.d.capacitaciones.filter(c => c.anio === +f.anio && (!f.emp || U.rutLimpio(c.empresa) === U.rutLimpio(f.emp)) && (!f.tipo || c.tipo === f.tipo) && (!f.est || CAPR.estadoPlan(c) === f.est))
      .map(c => ({ _id: c.id, id: c.id, nombre: c.nombre, tipo: c.tipo, emp: nombreEmpresa(c.empresa), dias: c.dias, cupos: `${CAPR.cuposUsados(c.id)} / ${c.cupos}`, obl: c.obligatoria ? c.especialidades.join(", ") : "No", vig: c.vigenciaMeses ? c.vigenciaMeses + " meses" : "Permanente", est: CAPR.estadoPlan(c), _cls: c.estado === "Dada de baja" ? "mut" : "" }));
  },
  cols: [{ k: "id", t: "Código", w: 110 }, { k: "nombre", t: "Capacitación" }, { k: "emp", t: "Empresa" }, { k: "dias", t: "Días", num: true, w: 50 }, { k: "cupos", t: "Inscritos", w: 80 }, { k: "obl", t: "Obligatoria" }, { k: "vig", t: "Vigencia" }, { k: "est", t: "Estado del plan", f: r => pill(r.est), w: 120 }],
  editable: tab => +tab.f.anio >= U.anio(),
  tools(tab) {
    return { nuevo: this.editable(tab) && (() => this.form(tab)), exportar: () => { const r = listview({ cols: this.cols, rows: this.filas(tab), sort: tab.sort }).rows; pedirFormato({ titulo: `Plan anual de capacitaciones ${tab.f.anio}`, modulo: "Capacitaciones", lineas: [`Empresa: ${tab.f.emp ? nombreEmpresa(tab.f.emp) : "Todas"} · Tipo: ${tab.f.tipo || "Todos"} · Estado: ${tab.f.est || "Todos"}`], columnas: [{ t: "Código" }, { t: "Capacitación" }, { t: "Tipo" }, { t: "Empresa" }, { t: "Días", num: true }, { t: "Inscritos / cupos" }, { t: "Obligatoria" }, { t: "Vigencia" }, { t: "Estado" }], filas: r.map(x => [x.id, x.nombre, x.tipo, x.emp, x.dias, x.cupos, x.obl, x.vig, x.est]) }); } };
  },
  render(tab) {
    const anios = [...new Set([U.anio() - 1, U.anio(), U.anio() + 1, ...DB.d.capacitaciones.map(c => c.anio)])].sort();
    const rows = this.filas(tab), lv = listview({ cols: this.cols, rows, sel: tab.sel, sort: tab.sort, empty: tab.f.emp ? "La empresa seleccionada no tiene capacitaciones en este año." : "No hay capacitaciones en el plan con esos filtros." });
    const todas = DB.d.capacitaciones.filter(c => c.anio === +tab.f.anio), cnt = e => todas.filter(c => CAPR.estadoPlan(c) === e).length;
    const c = DB.cap(tab.sel), ed = this.editable(tab);
    let det = "";
    if (c && c.anio === +tab.f.anio) {
      const vs = DB.d.versiones.filter(v => v.cap === c.id).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      det = `<fieldset class="fs"><legend>${E(c.id)} · ${E(c.nombre)}</legend><div class="grid2"><div>
        <p><b>Tipo:</b> ${E(c.tipo)} · <b>Empresa:</b> ${E(nombreEmpresa(c.empresa))}<br><b>Duración:</b> ${c.dias} día(s) · <b>Cupos:</b> ${c.cupos} (${CAPR.cuposLibres(c)} libres)<br><b>Obligatoria:</b> ${c.obligatoria ? "Sí, para " + E(c.especialidades.join(", ")) : "No"}<br><b>Competencia que acredita:</b> ${E(c.competencia || "—")} · <b>Vigencia:</b> ${c.vigenciaMeses ? c.vigenciaMeses + " meses" : "permanente"}<br><b>Prueba de evaluación:</b> ${c.prueba ? `Sí · nota mínima ${U.num1(c.notaMin || 4)}` : "No"}${c.estado === "Dada de baja" ? `<br><b>Baja:</b> ${E(c.motivoBaja || "")}` : ""}</p>
        <p><b>Sesiones programadas:</b></p><ul>${vs.length ? vs.map(v => `<li>${U.fecha(v.fecha)} ${v.inicio}–${v.termino} · ${E(v.lugar)}${v.cerrada ? " · realizada" : ""}</li>`).join("") : "<li>Sin fecha programada</li>"}</ul></div>
        <div><p><b>Historial de modificaciones:</b></p><ul>${c.historial.slice().reverse().slice(0, 6).map(h => `<li>${E(h.fecha)} · ${E(h.usuario)} · ${E(h.detalle)}</li>`).join("")}</ul></div></div></fieldset>`;
    }
    return `<div class="dochead"><h2>Plan anual de capacitaciones ${E(tab.f.anio)}</h2><span class="sub">${todas.length} capacitaciones · ${cnt("Planificada")} planificadas · ${cnt("En ejecución")} en ejecución · ${cnt("Finalizada")} finalizadas${cnt("Dada de baja") ? ` · ${cnt("Dada de baja")} dadas de baja` : ""}</span>
      <span class="r">${ed ? `<button class="btn pri" id="kNew">Nueva capacitación…</button><button class="btn" id="kEd">Modificar…</button><button class="btn" id="kBaja">Dar de baja…</button>` : ""}<button class="btn" id="kProg">Programar…</button><button class="btn" id="kIns">Inscribir…</button></span></div>
    <div class="filters"><label>Año <select id="kA">${opts(anios, tab.f.anio)}</select></label>
      <label>Empresa capacitadora <select id="kE">${opts(DB.d.empresas.map(e => [e.rut, e.razon]), tab.f.emp, "Todas")}</select></label>
      <label>Tipo <select id="kT">${opts(DB.d.tipos.map(t => t.nombre), tab.f.tipo, "Todos")}</select></label>
      <label>Estado <select id="kS">${opts(["Planificada", "En ejecución", "Finalizada", "No ejecutada", "Dada de baja"], tab.f.est, "Todos")}</select></label><button class="btn" id="kClr">Limpiar</button></div>
    ${ed ? "" : `<div class="bar info"><b class="ic">i</b><span>El plan de ${E(tab.f.anio)} corresponde a un año anterior: se muestra solo para consulta.</span></div>`}
    ${lv.html}${pager(lv, "Seleccione una fila para ver el detalle · doble clic para modificar")}${det}`;
  },
  mount(w, tab) {
    [["#kA", "anio"], ["#kE", "emp"], ["#kT", "tipo"], ["#kS", "est"]].forEach(([s, k]) => $(s).onchange = e => { tab.f[k] = k === "anio" ? +e.target.value : e.target.value; tab.sel = null; pintar(); });
    $("#kClr").onclick = () => { tab.f = { anio: U.anio(), emp: "", tipo: "", est: "" }; pintar(); };
    const sel = () => DB.cap(tab.sel);
    const need = fn => () => sel() ? fn(sel()) : aviso("Seleccione una capacitación", "<p>Haga clic en una fila de la lista.</p>");
    if ($("#kNew")) { $("#kNew").onclick = () => this.form(tab); $("#kEd").onclick = need(c => this.form(tab, c)); $("#kBaja").onclick = need(c => this.baja(tab, c)); }
    $("#kProg").onclick = () => abrir("programacion", sel() ? { cap: sel().id } : {});
    $("#kIns").onclick = () => abrir("inscripciones", sel() ? { cap: sel().id } : {});
    bindList(w, tab, { onSelect: () => { guardarScroll(); pintar(); }, onOpen: id => { const c = DB.cap(id); if (this.editable(tab) && c.estado !== "Dada de baja") this.form(tab, c); } });
  },
  form(tab, c) {
    if (c && c.estado === "Dada de baja") return aviso("Capacitación dada de baja", "<p>Una capacitación dada de baja no se puede modificar.</p>", "warn");
    if (!DB.d.empresas.length || !DB.d.tipos.length) return aviso("Faltan datos maestros", "<p>Registre primero empresas capacitadoras y tipos de capacitación.</p>", "warn");
    const usados = c ? CAPR.cuposUsados(c.id) : 0;
    const v = c ? { ...c, vigenciaMeses: String(c.vigenciaMeses), cupos: String(c.cupos), dias: String(c.dias), notaMin: U.num1(c.notaMin || 4) } : { anio: String(tab.f.anio >= U.anio() ? tab.f.anio : U.anio()), vigenciaMeses: "12", obligatoria: false, especialidades: [], prueba: true, notaMin: "4,0" };
    formulario({ head: c ? `Modificar ${c.id}` : "Nueva capacitación del catálogo anual",
      campos: [{ k: "nombre", t: "Nombre", req: true, max: 80 }, { k: "tipo", t: "Tipo", type: "select", req: true, opts: DB.d.tipos.map(t => t.nombre) }, { k: "empresa", t: "Empresa capacitadora", type: "select", req: true, opts: DB.d.empresas.map(e => [e.rut, e.razon]) },
        { k: "anio", t: "Año del plan", type: "select", req: true, opts: [U.anio(), U.anio() + 1].map(String), vacio: false, dis: !!c }, { k: "dias", t: "Duración (días)", type: "number", req: true, min: 1, maxv: 30 }, { k: "cupos", t: "Cupos", type: "number", req: true, min: 1, maxv: 200, nota: c ? `${usados} ocupados` : "" },
        { k: "competencia", t: "Competencia que acredita", type: "select", opts: CAT.especialidades, vacio: "Ninguna" }, { k: "vigenciaMeses", t: "Vigencia del certificado", type: "select", req: true, vacio: false, opts: [["0", "Permanente"], ["6", "6 meses"], ["12", "12 meses"], ["24", "24 meses"], ["36", "36 meses"]] },
        { k: "obligatoria", t: "Obligatoria", type: "check", lbl: "Obligatoria para trabajar en obra" }, { k: "especialidades", t: "Especialidades", type: "checks", opts: CAT.especialidades },
        { k: "prueba", t: "Prueba de evaluación", type: "check", lbl: "Los participantes rinden una prueba con nota (1,0 a 7,0)" }, { k: "notaMin", t: "Nota mínima para aprobar", ph: "4,0", max: 3 }],
      valores: v,
      onMount: d => { const sync = () => { const on = $("#fm_obligatoria", d).checked; $$('[data-k="especialidades"]', d).forEach(x => { x.disabled = !on; if (!on) x.checked = false; }); }; $("#fm_obligatoria", d).onchange = sync; sync(); const sp = () => { $("#fm_notaMin", d).disabled = !$("#fm_prueba", d).checked; }; $("#fm_prueba", d).onchange = sp; sp(); },
      guardar: x => {
        x.anio = c ? c.anio : +x.anio; x.dias = +x.dias; x.cupos = +x.cupos; x.vigenciaMeses = +x.vigenciaMeses;
        const nm = leerNota(x.notaMin || "4"); if (x.prueba && nm == null) return "La nota mínima debe estar entre 1,0 y 7,0."; x.notaMin = x.prueba ? nm : (c ? c.notaMin || 4 : 4);
        if (!x.nombre || !x.tipo || !x.empresa) return "Complete nombre, tipo y empresa capacitadora.";
        if (!Number.isInteger(x.dias) || x.dias < 1 || x.dias > 30) return "La duración debe ser un número entero de días entre 1 y 30.";
        if (!Number.isInteger(x.cupos) || x.cupos < 1 || x.cupos > 200) return "Los cupos deben ser un número entero entre 1 y 200.";
        if (c && x.cupos < usados) return `No puede dejar menos cupos (${x.cupos}) que inscritos (${usados}).`;
        if (x.obligatoria && !x.especialidades.length) return "Indique al menos una especialidad para la capacitación obligatoria.";
        if (DB.d.capacitaciones.some(o => o !== c && o.anio === x.anio && o.estado !== "Dada de baja" && U.norm(o.nombre) === U.norm(x.nombre))) return `Ya existe «${x.nombre}» en el catálogo ${x.anio}.`;
        if (!x.obligatoria) x.especialidades = [];
        const u = ST.user.user;
        if (c) {
          const L = { nombre: "Nombre", tipo: "Tipo", empresa: "Empresa", dias: "Duración", cupos: "Cupos", competencia: "Competencia", vigenciaMeses: "Vigencia", obligatoria: "Obligatoria", especialidades: "Especialidades", prueba: "Prueba", notaMin: "Nota mínima" };
          const camb = Object.keys(L).filter(k => String(c[k]) !== String(x[k])).map(k => `${L[k]}: «${k === "empresa" ? nombreEmpresa(c[k]) : String(c[k]) || "—"}» → «${k === "empresa" ? nombreEmpresa(x[k]) : String(x[k]) || "—"}»`);
          if (!camb.length) { setTimeout(() => { tab.msg = "No hubo cambios."; pintar(); }, 0); return; }
          Object.assign(c, { nombre: x.nombre, tipo: x.tipo, empresa: x.empresa, dias: x.dias, cupos: x.cupos, competencia: x.competencia, vigenciaMeses: x.vigenciaMeses, obligatoria: x.obligatoria, especialidades: x.especialidades, prueba: x.prueba, notaMin: x.notaMin });
          camb.forEach(t => c.historial.push({ fecha: U.ahora(), usuario: u, detalle: t }));
          DB.log(u, "Capacitaciones", "Modificación de capacitación", `${c.id} · ${camb.join(" · ")}`);
          setTimeout(() => this.trasGuardar(tab, c, "Capacitación modificada"), 0);
        } else {
          const n = { id: CAPR.nuevoCapId(x.anio), nombre: x.nombre, tipo: x.tipo, empresa: x.empresa, dias: x.dias, anio: x.anio, cupos: x.cupos, obligatoria: x.obligatoria, especialidades: x.especialidades, competencia: x.competencia, vigenciaMeses: x.vigenciaMeses, prueba: x.prueba, notaMin: x.notaMin, requiereCert: true, estado: "Publicada", creada: U.hoy(), historial: [{ fecha: U.ahora(), usuario: u, detalle: "Creación en el catálogo" }] };
          DB.d.capacitaciones.push(n); DB.log(u, "Capacitaciones", "Creación de capacitación", `${n.id} · ${n.nombre}${n.obligatoria ? " (obligatoria: " + n.especialidades.join(", ") + ")" : ""}`);
          tab.f.anio = n.anio; setTimeout(() => this.trasGuardar(tab, n, "Capacitación creada"), 0);
        }
      } });
  },
  trasGuardar(tab, c, titulo) {
    tab.sel = c.id;
    const r = CAPR.asignarObligatoria(c, ST.user.user);
    if (r.asignados.length || r.pendientes.length) DB.log(ST.user.user, "Capacitaciones", "Asignación automática", `${c.id} · ${r.asignados.length} asignados · ${r.pendientes.length} sin cupo`);
    pintar();
    const lst = a => a.map(f => E(FICHA.nombre(f))).join(", ");
    aviso(titulo, `<p><b>${E(c.id)}</b> · ${E(c.nombre)}</p>${c.obligatoria && c.anio === U.anio() ? `<p>Asignación automática a ${E(c.especialidades.join(", "))}:</p><ul><li>Asignados: ${r.asignados.length ? lst(r.asignados) : "ninguno"}</li><li>Ya cumplen (certificación vigente): ${r.cumplidos.length}</li><li>Ya inscritos: ${r.yaInscritos.length}</li>${r.pendientes.length ? `<li><b>Pendientes por falta de cupos:</b> ${lst(r.pendientes)}</li>` : ""}</ul>` : ""}<p class="muted small">Programe la fecha y el horario desde «Programación».</p>`, "ok");
  },
  async baja(tab, c) {
    if (c.estado === "Dada de baja") return aviso("Ya está dada de baja", `<p>${E(c.motivoBaja || "")}</p>`);
    const act = CAPR.inscritos(c.id).filter(i => ["Inscrito", "Pendiente (sin cupo)"].includes(i.estado));
    const r = await formulario({ head: `Dar de baja ${c.id} · ${c.nombre}`, label: "Dar de baja",
      intro: act.length ? `<div class="bar warn"><b class="ic">⚠</b><span>Tiene ${act.length} colaborador(es) inscrito(s): sus inscripciones se cancelarán.</span></div>` : `<p>La capacitación no tiene inscritos pendientes.</p>`,
      campos: [{ k: "motivo", t: "Motivo de la baja", type: "textarea", req: true }],
      guardar: x => {
        if (!x.motivo) return "Indique el motivo de la baja.";
        c.estado = "Dada de baja"; c.motivoBaja = `${x.motivo} (${U.ahora()}, ${ST.user.user})`;
        act.forEach(i => i.estado = "Cancelada");
        c.historial.push({ fecha: U.ahora(), usuario: ST.user.user, detalle: "Baja: " + x.motivo });
        DB.log(ST.user.user, "Capacitaciones", "Baja de capacitación", `${c.id} · ${x.motivo} · ${act.length} inscripción(es) cancelada(s)`);
      } });
    if (r === "ok") { tab.msg = "Capacitación dada de baja. Se conserva en el catálogo para consulta."; pintar(); }
  },
});
HELP.catalogo = { t: "Catálogo y plan anual", html: "<ul><li><b>Nueva capacitación</b>: nombre, tipo, empresa, duración, cupos, competencia y vigencia del certificado. No se repiten nombres en el mismo año.</li><li>Si es <b>obligatoria</b>, indique las especialidades: se asigna automáticamente a los colaboradores activos de esas especialidades que no tengan la certificación vigente. Si faltan cupos, quedan «Pendientes (sin cupo)».</li><li><b>Modificar</b> registra cada cambio en el historial; los cupos no pueden ser menos que los inscritos.</li><li><b>Dar de baja</b> pide motivo, avisa si hay inscritos y cancela sus inscripciones. La capacitación se conserva para consulta.</li><li>Filtre por <b>empresa capacitadora</b>, tipo y estado. Los años anteriores son solo de consulta.</li></ul>" };

/* ---------- Programación de fecha y horario (RF-CAP-16) ---------- */
VIEWS.programacion = capView({
  title: () => "Programación", hu: () => "RF-CAP-16 · Programar la fecha y el horario de una capacitación",
  init(tab) { tab.cap = tab.params.cap || ""; tab.mes = U.hoy().slice(0, 7); },
  reparam(tab) { if (tab.params.cap) tab.cap = tab.params.cap; tab.params.cap = ""; },
  tools(tab) { return { nuevo: () => this.form(tab) }; },
  render(tab) {
    const c = DB.cap(tab.cap);
    const vs = DB.d.versiones.filter(v => v.cap === tab.cap).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    const lv = listview({ cols: [{ k: "id", t: "Sesión", w: 90 }, { k: "fecha", t: "Fecha", f: r => U.fecha(r.fecha), w: 95 }, { k: "hor", t: "Horario", w: 100 }, { k: "lugar", t: "Lugar" }, { k: "cap", t: "Capacitador" }, { k: "ins", t: "Inscritos", num: true, w: 70 }, { k: "est", t: "Estado", f: r => pill(r.est), w: 150 }],
      rows: vs.map(v => ({ _id: v.id, id: v.id, fecha: v.fecha, hor: `${v.inicio} – ${v.termino}`, lugar: v.lugar, cap: (DB.capacitador(v.capacitador) || { nombre: "—" }).nombre, ins: DB.d.inscripciones.filter(i => i.version === v.id && CAPR.ocupaCupo(i)).length, est: v.cerrada ? "Cerrada" : v.fecha < U.hoy() ? "Pendiente de resultados" : "Programada" })), sel: tab.sel, empty: "Esta capacitación aún no tiene sesiones programadas." });
    return `<div class="dochead"><h2>Programación de capacitaciones</h2><span class="sub">Fecha, horario, lugar y capacitador</span></div>
    <div class="filters"><label>Capacitación <select id="pC" style="max-width:420px">${optsCaps(tab.cap)}</select></label>${c ? `<button class="btn pri" id="pNew">Programar sesión…</button><button class="btn" id="pEd">Reprogramar…</button>` : ""}</div>
    ${c ? `<p class="muted">${E(c.nombre)} · ${c.dias} día(s) · ${E(nombreEmpresa(c.empresa))} · ${CAPR.cuposUsados(c.id)} de ${c.cupos} cupos ocupados</p>${lv.html}` : `<div class="bar info"><b class="ic">i</b><span>Seleccione una capacitación del plan ${U.anio()} para ver y programar sus sesiones.</span></div>`}
    ${this.calendario(tab)}`;
  },
  calendario(tab) {
    const [y, m] = tab.mes.split("-").map(Number), first = new Date(y, m - 1, 1), dias = new Date(y, m, 0).getDate(), off = (first.getDay() + 6) % 7;
    const vs = DB.d.versiones.filter(v => v.fecha.startsWith(tab.mes));
    let cells = ""; for (let i = 0; i < off; i++) cells += `<div class="cal-d vac"></div>`;
    for (let d = 1; d <= dias; d++) { const iso = `${tab.mes}-${U.pad(d)}`, ev = vs.filter(v => v.fecha === iso); cells += `<div class="cal-d ${iso === U.hoy() ? "hoy" : ""}"><b>${d}</b>${ev.map(v => `<span class="cal-e ${v.cap === tab.cap ? "on" : ""}" title="${E(DB.cap(v.cap).nombre)} · ${v.inicio}–${v.termino}">${v.inicio} ${E(DB.cap(v.cap).nombre)}</span>`).join("")}</div>`; }
    return `<fieldset class="fs"><legend>Calendario de capacitaciones</legend><div class="filters" style="margin-top:0"><button class="btn" id="calP">◂</button><b>${U.mes(tab.mes)}</b><button class="btn" id="calN">▸</button><button class="btn" id="calH">Hoy</button></div>
      <div class="cal"><div class="cal-h">Lun</div><div class="cal-h">Mar</div><div class="cal-h">Mié</div><div class="cal-h">Jue</div><div class="cal-h">Vie</div><div class="cal-h">Sáb</div><div class="cal-h">Dom</div>${cells}</div></fieldset>`;
  },
  mount(w, tab) {
    $("#pC").onchange = e => { tab.cap = e.target.value; tab.sel = null; pintar(); };
    const mv = n => { const d = new Date(tab.mes + "-01T12:00"); d.setMonth(d.getMonth() + n); tab.mes = U.iso(d).slice(0, 7); guardarScroll(); pintar(); };
    $("#calP").onclick = () => mv(-1); $("#calN").onclick = () => mv(1); $("#calH").onclick = () => { tab.mes = U.hoy().slice(0, 7); pintar(); };
    if ($("#pNew")) { $("#pNew").onclick = () => this.form(tab); $("#pEd").onclick = () => { const v = DB.version(tab.sel); v ? this.form(tab, v) : aviso("Seleccione una sesión", "<p>Haga clic en una sesión de la lista.</p>"); }; }
    bindList(w, tab, { onOpen: id => this.form(tab, DB.version(id)) });
  },
  form(tab, v) {
    const c = DB.cap(tab.cap);
    if (!c) return aviso("Seleccione una capacitación", "<p>Elija primero la capacitación que desea programar.</p>");
    if (c.estado === "Dada de baja") return aviso("Capacitación dada de baja", "<p>No se pueden programar sesiones.</p>", "warn");
    if (v && (v.cerrada || v.fecha < U.hoy())) return aviso("No se puede reprogramar", "<p>La sesión ya se realizó. Solo se pueden reprogramar sesiones futuras.</p>", "warn");
    if (!DB.d.capacitadores.length) return aviso("Registre un capacitador", "<p>Cada sesión requiere un capacitador.</p>", "warn");
    formulario({ head: v ? `Reprogramar ${v.id}` : `Programar sesión · ${c.nombre}`, valores: v || { inicio: "09:00", termino: "17:00" },
      campos: [{ k: "fecha", t: "Fecha", type: "date", req: true, min: U.hoy(), maxv: `${c.anio}-12-31` }, { k: "inicio", t: "Hora de inicio", type: "time", req: true }, { k: "termino", t: "Hora de término", type: "time", req: true },
        { k: "lugar", t: "Lugar", type: "select", req: true, opts: CAT.lugares }, { k: "capacitador", t: "Capacitador", type: "select", req: true, opts: DB.d.capacitadores.map(k => [k.rut, `${k.nombre} · ${k.especialidad}`]) }],
      guardar: x => {
        if (!x.fecha || !x.inicio || !x.termino || !x.lugar || !x.capacitador) return "Complete fecha, horario, lugar y capacitador.";
        if (x.fecha < U.hoy()) return "La fecha no puede ser anterior a hoy.";
        if (+x.fecha.slice(0, 4) !== c.anio) return `La fecha debe estar dentro del año del plan (${c.anio}).`;
        if (U.hm(x.termino) <= U.hm(x.inicio)) return "La hora de término debe ser posterior a la hora de inicio.";
        if (U.hm(x.inicio) < U.hm("07:00") || U.hm(x.termino) > U.hm("21:00")) return "El horario debe estar entre las 07:00 y las 21:00.";
        const t = CAPR.tope({ ...x }, v && v.id);
        if (t) return `Tope de horario: el capacitador ya tiene «${DB.cap(t.cap).nombre}» el ${U.fecha(t.fecha)} de ${t.inicio} a ${t.termino}.`;
        const tl = DB.d.versiones.find(o => o.id !== (v && v.id) && o.lugar === x.lugar && o.fecha === x.fecha && U.hm(o.inicio) < U.hm(x.termino) && U.hm(x.inicio) < U.hm(o.termino));
        if (tl) return `El lugar ya está ocupado por «${DB.cap(tl.cap).nombre}» de ${tl.inicio} a ${tl.termino}.`;
        if (v) {
          const det = `${U.fecha(v.fecha)} ${v.inicio}–${v.termino} → ${U.fecha(x.fecha)} ${x.inicio}–${x.termino}`;
          Object.assign(v, x); c.historial.push({ fecha: U.ahora(), usuario: ST.user.user, detalle: `Reprogramación ${v.id}: ${det}` });
          DB.log(ST.user.user, "Capacitaciones", "Reprogramación", `${c.id} · ${v.id} · ${det}`);
        } else {
          const n = { id: CAPR.nuevoId("ver"), cap: c.id, ...x, cerrada: false }; DB.d.versiones.push(n);
          const sinV = DB.d.inscripciones.filter(i => i.cap === c.id && !i.version && i.estado === "Inscrito"); sinV.forEach(i => i.version = n.id);
          c.historial.push({ fecha: U.ahora(), usuario: ST.user.user, detalle: `Programación ${n.id}: ${U.fecha(n.fecha)} ${n.inicio}–${n.termino}` });
          DB.log(ST.user.user, "Capacitaciones", "Programación de sesión", `${c.id} · ${n.id} · ${U.fecha(n.fecha)} ${n.inicio}–${n.termino}${sinV.length ? ` · ${sinV.length} inscrito(s) asignados a la sesión` : ""}`);
          tab.sel = n.id;
        }
        tab.mes = x.fecha.slice(0, 7); setTimeout(() => { tab.msg = "Sesión guardada."; pintar(); }, 0);
      } });
  },
});
HELP.programacion = { t: "Programación", html: "<p>Seleccione la capacitación y pulse <b>Programar sesión</b>. La fecha no puede ser anterior a hoy y la hora de término debe ser posterior a la de inicio. El sistema impide topes de horario del capacitador y del lugar.</p><p>Los inscritos sin sesión quedan asignados a la nueva sesión. El calendario muestra todas las sesiones del mes.</p>" };

/* ---------- Inscripciones y asignación a grupos (RF-CAP-03 y RF-CAP-10) ---------- */
VIEWS.inscripciones = capView({
  title: () => "Inscripciones", hu: () => "RF-CAP-03 · Inscribir colaboradores · RF-CAP-10 · Asignar capacitaciones a grupos de colaboradores",
  init(tab) { tab.cap = tab.params.cap || ""; tab.marc = new Set(tab.params.ficha ? [tab.params.ficha] : []); tab.f = { depto: "", esp: "", q: "" }; tab.origen = tab.params.origen || ""; },
  reparam(tab) { const p = tab.params; if (p.cap !== undefined && p.cap !== "") tab.cap = p.cap; if (p.ficha) { tab.marc = new Set([p.ficha]); } if (p.origen) tab.origen = p.origen; p.cap = ""; p.ficha = ""; p.origen = ""; },
  candidatos(tab) {
    const q = U.norm(tab.f.q);
    return DB.d.fichas.filter(f => f.estado !== "Desvinculado" && f.estado !== "Incompleta" && (!tab.f.depto || f.cargo.departamento === tab.f.depto) && (!tab.f.esp || f.cargo.especialidad === tab.f.esp) && (!q || U.norm(FICHA.nombre(f) + " " + f.rut + " " + f.id).includes(q)));
  },
  render(tab) {
    const c = DB.cap(tab.cap);
    let body = `<div class="bar info"><b class="ic">i</b><span>Seleccione una capacitación vigente del plan ${U.anio()}.</span></div>`;
    if (c) {
      const ins = CAPR.inscritos(c.id), libre = CAPR.cuposLibres(c), prox = DB.d.versiones.filter(v => v.cap === c.id && !v.cerrada && v.fecha >= U.hoy()).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
      const estadoDe = f => { const i = ins.find(i => i.ficha === f.id && ["Inscrito", "Pendiente (sin cupo)"].includes(i.estado)); if (i) return i.estado; if (f.estado === "Licencia") return "No disponible (licencia)"; if (CAPR.tieneVigente(f.id, c.tipo)) return "Ya certificado"; return ""; };
      const cand = this.candidatos(tab);
      const filas = cand.map(f => { const st = estadoDe(f), bloq = st === "Inscrito" || st === "Pendiente (sin cupo)" || st.startsWith("No disponible"); return `<tr class="${bloq ? "mut" : ""}"><td><input type="checkbox" data-m="${f.id}" ${tab.marc.has(f.id) && !bloq ? "checked" : ""} ${bloq ? "disabled" : ""} aria-label="Seleccionar ${E(FICHA.nombre(f))}"></td><td>${E(f.id)}</td><td>${E(FICHA.nombre(f))}</td><td>${E(f.cargo.cargo || "—")}</td><td>${E(f.cargo.departamento || "—")}</td><td>${E(f.cargo.especialidad || "—")}</td><td>${st ? (st === "Ya certificado" ? `<span class="muted">${st}</span>` : pill(st.startsWith("No disponible") ? "Licencia" : st).replace(">Licencia<", ">" + st + "<")) : ""}</td></tr>`; }).join("");
      const lvIns = listview({ cols: [{ k: "id", t: "Inscripción", w: 95 }, { k: "nom", t: "Colaborador" }, { k: "ver", t: "Sesión" }, { k: "origen", t: "Origen" }, { k: "prueba", t: "Prueba", w: 90 }, { k: "fecha", t: "Fecha", f: r => U.fecha(r.fecha), w: 90 }, { k: "estado", t: "Estado", f: r => pill(r.estado), w: 150 }],
        rows: ins.map(i => { const v = DB.version(i.version), f = DB.ficha(i.ficha); return { _id: i.id, id: i.id, nom: f ? FICHA.nombre(f) : i.ficha, ver: v ? `${U.fecha(v.fecha)} ${v.inicio}` : "Sin sesión programada", origen: i.origen, prueba: i.prueba ? (i.nota != null ? "Nota " + U.num1(i.nota) : "Sí · mín. " + U.num1(i.notaMin || 4)) : "No", fecha: i.fecha, estado: i.estado }; }).sort((a, b) => (a.id < b.id ? 1 : -1)), sel: tab.selIns, empty: "Aún no hay inscritos." });
      body = `<div class="bar ${libre ? "info" : "warn"}"><b class="ic">${libre ? "i" : "⚠"}</b><span>${E(c.nombre)} · cupos: ${c.cupos} · ocupados: ${c.cupos - libre} · <b>libres: ${libre}</b> · próxima sesión: ${prox ? U.fecha(prox.fecha) + " " + prox.inicio : "sin programar"}${c.obligatoria ? " · obligatoria para " + E(c.especialidades.join(", ")) : ""}</span></div>
      ${tab.origen ? `<div class="bar info"><b class="ic">i</b><span>${E(tab.origen)}</span></div>` : ""}
      <div class="filters"><label>Buscar <input type="text" id="iQ" value="${E(tab.f.q)}" placeholder="Nombre, RUT o N° ficha" style="width:180px"></label><label>Departamento <select id="iD">${opts(CAT.departamentos, tab.f.depto, "Todos")}</select></label><label>Especialidad <select id="iE">${opts(CAT.especialidades, tab.f.esp, "Todas")}</select></label>
        <button class="btn" id="iAll">Marcar grupo filtrado</button><button class="btn" id="iNone">Desmarcar</button></div>
      <div class="lv-wrap" style="max-height:300px"><table class="lv"><thead><tr><th style="width:30px"></th><th>N° ficha</th><th>Colaborador</th><th>Cargo</th><th>Departamento</th><th>Especialidad</th><th>Situación</th></tr></thead><tbody>${filas || `<tr><td colspan="7" class="empty">No hay colaboradores con esos filtros.</td></tr>`}</tbody></table></div>
      <div class="actions" style="flex-wrap:wrap">${c.obligatoria ? `<button class="btn" id="iAuto">Asignar obligatoria a ${E(c.especialidades.join(", "))}</button>` : ""}<button class="btn pri" id="iGo">Inscribir seleccionados (${[...tab.marc].length})</button></div>
      <h3 style="font-size:14px;margin:16px 0 6px">Inscritos en la capacitación</h3>${lvIns.html}<div class="actions"><button class="btn" id="iAnu">Anular inscripción…</button></div>`;
    }
    return `<div class="dochead"><h2>Inscripciones</h2><span class="sub">Inscripción individual o por grupos</span></div>
      <div class="filters"><label>Capacitación <select id="iC" style="max-width:440px">${optsCaps(tab.cap)}</select></label></div>${body}`;
  },
  mount(w, tab) {
    $("#iC").onchange = e => { tab.cap = e.target.value; tab.origen = ""; pintar(); };
    const c = DB.cap(tab.cap); if (!c) return;
    bindBuscador($("#iQ"), tab, "q");
    $("#iD").onchange = e => { tab.f.depto = e.target.value; pintar(); };
    $("#iE").onchange = e => { tab.f.esp = e.target.value; pintar(); };
    $$("[data-m]", w).forEach(ch => ch.onchange = () => { if (ch.checked) tab.marc.add(ch.dataset.m); else tab.marc.delete(ch.dataset.m); $("#iGo").textContent = `Inscribir seleccionados (${tab.marc.size})`; });
    $("#iAll").onclick = () => { $$("[data-m]:not(:disabled)", w).forEach(ch => tab.marc.add(ch.dataset.m)); guardarScroll(); pintar(); };
    $("#iNone").onclick = () => { tab.marc.clear(); guardarScroll(); pintar(); };
    $("#iGo").onclick = () => this.inscribir(tab, c);
    const au = $("#iAuto"); if (au) au.onclick = () => {
      if (c.estado !== "Publicada" || c.anio !== U.anio()) return aviso("No disponible", "<p>Solo se asignan capacitaciones vigentes del plan del año.</p>");
      const r = CAPR.asignarObligatoria(c, ST.user.user);
      DB.log(ST.user.user, "Capacitaciones", "Asignación a grupo", `${c.id} · ${r.asignados.length} asignados · ${r.pendientes.length} sin cupo`);
      pintar();
      aviso("Asignación al grupo de " + c.especialidades.join(", "), `<ul><li>Asignados: ${r.asignados.length ? E(r.asignados.map(FICHA.nombre).join(", ")) : "ninguno"}</li><li>Ya tienen certificación vigente: ${r.cumplidos.length}</li><li>Ya inscritos: ${r.yaInscritos.length}</li><li>Pendientes por falta de cupos: ${r.pendientes.length ? E(r.pendientes.map(FICHA.nombre).join(", ")) : "ninguno"}</li></ul>`, "ok");
    };
    bindList($("#iAnu").closest(".work") || w, tab, {});
    $$("tbody tr[data-id]", w).forEach(tr => tr.addEventListener("click", () => { tab.selIns = tr.dataset.id; }));
    $("#iAnu").onclick = async () => {
      const i = DB.d.inscripciones.find(x => x.id === tab.selIns);
      if (!i) return aviso("Seleccione una inscripción", "<p>Haga clic en una fila de «Inscritos en la capacitación».</p>");
      if (!["Inscrito", "Pendiente (sin cupo)"].includes(i.estado)) return aviso("No se puede anular", `<p>La inscripción está en estado «${E(i.estado)}».</p>`, "warn");
      if (!await confirmar("¿Anular la inscripción?", `<p>${E(FICHA.nombre(DB.ficha(i.ficha)))} dejará de estar inscrito y se liberará el cupo.</p>`)) return;
      i.estado = "Cancelada"; DB.log(ST.user.user, "Capacitaciones", "Anulación de inscripción", `${i.id} · ${c.id} · ${i.ficha}`);
      const pend = CAPR.inscritos(c.id).find(x => x.estado === "Pendiente (sin cupo)");
      if (pend && CAPR.cuposLibres(c) > 0) { pend.estado = "Inscrito"; const prox = DB.d.versiones.filter(v => v.cap === c.id && !v.cerrada && v.fecha >= U.hoy()).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0]; pend.version = prox ? prox.id : ""; DB.log(ST.user.user, "Capacitaciones", "Asignación automática", `${pend.ficha} · cupo liberado en ${c.id}`); }
      pintar();
    };
  },
  inscribir(tab, c) {
    const ids = [...tab.marc].filter(id => DB.ficha(id));
    if (!ids.length) return aviso("Seleccione colaboradores", "<p>Marque al menos un colaborador en la lista o use «Marcar grupo filtrado».</p>");
    if (c.estado !== "Publicada") return aviso("Capacitación dada de baja", "<p>No admite inscripciones.</p>", "warn");
    const ok = [], no = [];
    for (const id of ids) { const r = CAPR.inscribir(c, id, tab.origen ? "Necesidad detectada por calificación" : ids.length > 1 ? "Asignación a grupo" : "Manual", ST.user.user); (r.ok ? ok : no).push([DB.ficha(id), r.motivo]); }
    if (ok.length) DB.log(ST.user.user, "Capacitaciones", ids.length > 1 ? "Asignación a grupo" : "Inscripción", `${c.id} · ${ok.length} inscrito(s): ${ok.map(x => x[0].id).join(", ")}${no.length ? ` · ${no.length} no inscrito(s)` : ""}`);
    tab.marc.clear(); tab.origen = ""; pintar();
    aviso(ok.length ? "Inscripción realizada" : "No se inscribió a nadie", `${ok.length ? `<p>Inscritos (${ok.length}): ${E(ok.map(x => FICHA.nombre(x[0])).join(", "))}.</p>` : ""}${no.length ? `<p>No se pudo inscribir a:</p><ul>${no.map(([f, m]) => `<li>${E(FICHA.nombre(f))}: ${E(m)}</li>`).join("")}</ul>` : ""}<p class="muted small">Cupos libres: ${CAPR.cuposLibres(c)} de ${c.cupos}.</p>`, ok.length ? (no.length ? "warn" : "ok") : "err");
  },
});
HELP.inscripciones = { t: "Inscripciones", html: "<ul><li>Elija la capacitación: se muestran cupos libres y la próxima sesión.</li><li>Marque colaboradores uno a uno, o filtre por departamento o especialidad y pulse <b>Marcar grupo filtrado</b> para asignar a un grupo.</li><li>Al inscribir, el sistema informa quién quedó inscrito y quién no, con el motivo (sin cupos, ya inscrito, licencia).</li><li>Los colaboradores con licencia aparecen como no disponibles. Los desvinculados no aparecen.</li><li><b>Anular inscripción</b> libera el cupo; si hay pendientes por falta de cupo, el primero se inscribe automáticamente.</li></ul>" };

/* ---------- Asistencia, prueba y resultados (RF-CAP-04 y RF-CAP-05) ---------- */
const leerNota = t => { const v = Number(String(t ?? "").trim().replace(",", ".")); return String(t ?? "").trim() !== "" && isFinite(v) && v >= 1 && v <= 7 ? Math.round(v * 10) / 10 : null; };
VIEWS.resultados = capView({
  title: () => "Asistencia y notas", hu: () => "RF-CAP-04 · Registrar la asistencia, la prueba y el resultado · RF-CAP-05 · Registrar certificaciones con vigencia",
  init(tab) { tab.ver = ""; tab.res = {}; const p = this.sesiones().find(s => !s.cerrada); if (p) tab.ver = p.id; },
  sesiones() { return DB.d.versiones.filter(v => v.fecha <= U.hoy() && DB.cap(v.cap)).sort((a, b) => (a.cerrada - b.cerrada) || (a.fecha < b.fecha ? 1 : -1)); },
  /* resultado que se obtendrá con lo ingresado en la fila */
  calc(i, r) {
    if (!r || !r.asis) return "";
    if (r.asis === "No") return "Inasistente";
    if (i.prueba) { const n = leerNota(r.nota); return n == null ? "" : n >= (i.notaMin || 4) ? "Aprobado" : "Reprobado"; }
    return r.res || "";
  },
  render(tab) {
    const ss = this.sesiones(), v = DB.version(tab.ver), c = v && DB.cap(v.cap);
    const pend = ss.filter(s => !s.cerrada).length;
    let body = `<div class="bar info"><b class="ic">i</b><span>Seleccione una sesión ya realizada. Hay ${pend} sesión(es) con notas pendientes. Las sesiones futuras no aparecen porque aún no se realizan.</span></div>`;
    if (v) {
      const ins = DB.d.inscripciones.filter(i => i.version === v.id && (v.cerrada ? ["Aprobado", "Reprobado", "Inasistente"].includes(i.estado) : i.estado === "Inscrito"));
      const conPrueba = ins.some(i => i.prueba);
      const fila = i => {
        const f = DB.ficha(i.ficha), r = tab.res[i.id] || {}, out = this.calc(i, r);
        const nombre = `${E(FICHA.nombre(f))}${f.estado !== "Activo" ? ` <span class="muted small">(${E(f.estado)})</span>` : ""}`;
        if (v.cerrada) return `<tr><td>${E(i.ficha)}</td><td>${nombre}</td><td>${i.estado === "Inasistente" ? "No" : "Sí"}</td><td>${i.prueba ? `${CAPR.notaTxt(i)} <span class="muted small">(mín. ${U.num1(i.notaMin || 4)})</span>` : "Sin prueba"}</td><td>${pill(i.estado)}</td></tr>`;
        const asis = `<select data-a="${i.id}" class="req" aria-label="Asistencia de ${E(FICHA.nombre(f))}">${opts([["Sí", "Asistió"], ["No", "No asistió"]], r.asis || "", "Seleccione…")}</select>`;
        const ev = r.asis === "No" ? `<span class="muted">—</span>` : i.prueba ? `<input type="text" data-n="${i.id}" class="req nota" value="${E(r.nota || "")}" placeholder="1,0 a 7,0" maxlength="3" ${r.asis === "Sí" ? "" : "disabled"} aria-label="Nota de ${E(FICHA.nombre(f))}"> <span class="muted small">mín. ${U.num1(i.notaMin || 4)}</span>`
          : `<select data-r="${i.id}" class="req" ${r.asis === "Sí" ? "" : "disabled"} aria-label="Resultado de ${E(FICHA.nombre(f))}">${opts(["Aprobado", "Reprobado"], r.res || "", "Sin prueba: indique…")}</select>`;
        return `<tr><td>${E(i.ficha)}</td><td>${nombre}</td><td>${asis}</td><td>${ev}</td><td data-o="${i.id}">${out ? pill(out) : '<span class="muted">Pendiente</span>'}</td></tr>`;
      };
      body = `<p class="muted">${E(c.nombre)} · ${U.fecha(v.fecha)} ${v.inicio}–${v.termino} · ${E(v.lugar)} · certificado ${c.vigenciaMeses ? `vigente por ${c.vigenciaMeses} meses` : "permanente"}</p>
      ${v.cerrada ? `<div class="bar ok"><b class="ic">✓</b><span>Notas registradas. La sesión está cerrada.</span></div>` : conPrueba ? `<div class="bar info"><b class="ic">i</b><span>1) Marque la asistencia. 2) Ingrese la nota de la prueba de quienes asistieron: con la nota mínima o más quedan <b>Aprobados</b> y reciben su certificación.</span></div>` : ""}
      <div class="lv-wrap"><table class="lv"><thead><tr><th style="width:100px">N° ficha</th><th>Colaborador</th><th style="width:150px">Asistencia</th><th style="width:220px">Prueba de evaluación</th><th style="width:130px">Resultado</th></tr></thead><tbody>
      ${ins.length ? ins.map(fila).join("") : `<tr><td colspan="5" class="empty">La sesión no tiene inscritos.</td></tr>`}</tbody></table></div>
      ${!v.cerrada && ins.length ? `<div class="actions"><button class="btn" id="rAll">Marcar que todos asistieron</button><button class="btn pri" id="rSave">Registrar notas y resultados (F2)</button></div>` : ""}`;
    }
    return `<div class="dochead"><h2>Asistencia y notas</h2><span class="sub">Aprobado genera la certificación · No asistió libera el cupo</span></div>
      <div class="filters"><label>Sesión <select id="rV" style="max-width:520px">${opts(ss.map(s => [s.id, `${U.fecha(s.fecha)} · ${DB.cap(s.cap).nombre}${s.cerrada ? " · cerrada" : " · pendiente"}`]), tab.ver, "Seleccione una sesión realizada…")}</select></label></div>${body}`;
  },
  tools(tab) { const v = DB.version(tab.ver); return { guardar: v && !v.cerrada && (() => this.guardar(tab)) }; },
  mount(w, tab) {
    $("#rV").onchange = async e => {
      if (tab.dirty && !await confirmar("¿Cambiar de sesión?", "<p>Se perderán las notas ingresadas que no se han registrado.</p>")) { e.target.value = tab.ver; return; }
      tab.ver = e.target.value; tab.res = {}; marcarSucio(tab, false); pintar();
    };
    const row = id => (tab.res[id] = tab.res[id] || {});
    const out = id => { const i = DB.d.inscripciones.find(x => x.id === id), o = this.calc(i, tab.res[id]), td = $(`[data-o="${id}"]`, w); if (td) td.innerHTML = o ? pill(o) : '<span class="muted">Pendiente</span>'; };
    $$("[data-a]", w).forEach(s => s.onchange = () => { row(s.dataset.a).asis = s.value; marcarSucio(tab); guardarScroll(); pintar(); const n = $(`[data-n="${s.dataset.a}"]`); if (n && s.value === "Sí") n.focus(); });
    $$("[data-n]", w).forEach(s => s.oninput = () => { row(s.dataset.n).nota = s.value; s.classList.toggle("err", !!s.value.trim() && leerNota(s.value) == null); marcarSucio(tab); out(s.dataset.n); });
    $$("[data-r]", w).forEach(s => s.onchange = () => { row(s.dataset.r).res = s.value; s.classList.remove("err"); marcarSucio(tab); out(s.dataset.r); });
    const a = $("#rAll"); if (a) a.onclick = () => { $$("[data-a]", w).forEach(s => { row(s.dataset.a).asis = "Sí"; }); marcarSucio(tab); pintar(); };
    const g = $("#rSave"); if (g) g.onclick = () => this.guardar(tab);
  },
  async guardar(tab) {
    const v = DB.version(tab.ver), c = DB.cap(v.cap);
    if (v.fecha > U.hoy()) return aviso("La capacitación aún no se realiza", "<p>Solo se registran notas de sesiones realizadas.</p>", "warn");
    const ins = DB.d.inscripciones.filter(i => i.version === v.id && i.estado === "Inscrito");
    const falt = [];
    for (const i of ins) {
      const r = tab.res[i.id] || {}, n = FICHA.nombre(DB.ficha(i.ficha));
      if (!r.asis) falt.push(`${n}: indique si asistió`);
      else if (r.asis === "Sí" && i.prueba && leerNota(r.nota) == null) falt.push(`${n}: ingrese una nota válida entre 1,0 y 7,0`);
      else if (r.asis === "Sí" && !i.prueba && !r.res) falt.push(`${n}: indique si aprobó o reprobó`);
    }
    if (falt.length) { pintar(); falt.length && $$(".work select.req, .work input.nota").forEach(el => { if (!el.value && !el.disabled) el.classList.add("err"); }); return aviso("Faltan datos", `<ul>${falt.map(t => `<li>${E(t)}</li>`).join("")}</ul>`, "err"); }
    if (!await confirmar("¿Registrar las notas y resultados?", `<p>Se cerrará la sesión del ${U.fecha(v.fecha)}. Los aprobados recibirán su certificación${c.vigenciaMeses ? ` con vencimiento el ${U.fecha(U.sumarMeses(v.fecha, c.vigenciaMeses))}` : " permanente"}.</p>`)) return;
    const n = { Aprobado: 0, Reprobado: 0, Inasistente: 0 };
    for (const i of ins) {
      const r = tab.res[i.id]; i.estado = this.calc(i, r); n[i.estado]++;
      if (i.prueba && r.asis === "Sí") i.nota = leerNota(r.nota);
      i.registro = { fecha: U.ahora(), por: ST.user.user };
      if (i.estado === "Aprobado" && c.requiereCert !== false) DB.d.certificaciones.push({ id: CAPR.nuevoId("cert"), ficha: i.ficha, cap: c.id, tipo: c.tipo, competencia: c.competencia, nombre: c.nombre, emision: v.fecha, vence: c.vigenciaMeses ? U.sumarMeses(v.fecha, c.vigenciaMeses) : "" });
    }
    v.cerrada = true;
    const notas = ins.filter(i => i.nota != null && i.estado !== "Inasistente").map(i => i.nota);
    DB.log(ST.user.user, "Capacitaciones", "Registro de notas y resultados", `${c.id} · ${v.id} · ${n.Aprobado} aprobado(s), ${n.Reprobado} reprobado(s), ${n.Inasistente} inasistente(s)${notas.length ? ` · nota promedio ${U.num1(notas.reduce((a, b) => a + b, 0) / notas.length)}` : ""}`);
    marcarSucio(tab, false); tab.res = {}; pintar();
    aviso("Notas y resultados registrados", `<ul><li>Aprobados: ${n.Aprobado} (certificación emitida)</li><li>Reprobados: ${n.Reprobado}</li><li>No asistieron: ${n.Inasistente} (cupo liberado)</li>${notas.length ? `<li>Nota promedio de la prueba: ${U.num1(notas.reduce((a, b) => a + b, 0) / notas.length)}</li>` : ""}</ul><p class="muted small">A los reprobados se les puede asignar nuevamente desde «Asignar capacitación a un trabajador».</p>`, "ok");
  },
});
HELP.resultados = { t: "Asistencia y notas", html: "<ol><li>Elija una sesión ya realizada (las pendientes aparecen primero).</li><li>Marque si cada trabajador <b>asistió</b>. Puede usar «Marcar que todos asistieron».</li><li>Si la capacitación tiene <b>prueba de evaluación</b>, ingrese la nota de 1,0 a 7,0. El resultado se calcula solo: con la nota mínima o más queda <b>Aprobado</b>; bajo la mínima, <b>Reprobado</b>.</li><li>Si no tiene prueba, indique Aprobado o Reprobado.</li><li>Pulse <b>Registrar notas y resultados</b>: los aprobados reciben su certificación con fecha de vencimiento, los que no asistieron liberan el cupo y la sesión queda cerrada.</li></ol>" };

/* ---------- Certificaciones (RF-CAP-05 y RF-CAP-06) ---------- */
VIEWS.certificaciones = capView({
  title: () => "Certificaciones", hu: () => "RF-CAP-05 · Registrar certificaciones con vigencia · RF-CAP-06 · Alertar certificaciones por vencer",
  init(tab) { tab.f = { est: "", esp: "", q: "", hist: false }; tab.sort = { k: "vence", dir: 1 }; tab.page = 0; },
  filas(tab) {
    const q = U.norm(tab.f.q), ult = new Set(certsUltimas().map(c => c.id));
    return DB.d.certificaciones.filter(c => { const f = DB.ficha(c.ficha); return f && (tab.f.hist || ult.has(c.id)) && (!tab.f.est || CAPR.certEstado(c) === tab.f.est) && (!tab.f.esp || f.cargo.especialidad === tab.f.esp) && (!q || U.norm(FICHA.nombre(f) + " " + c.nombre + " " + f.id).includes(q)); })
      .map(c => { const f = DB.ficha(c.ficha), e = CAPR.certEstado(c); return { _id: c.id, id: c.id, ficha: f.id, nom: FICHA.nombre(f), est_f: f.estado, esp: f.cargo.especialidad || "—", cert: c.nombre, tipo: c.tipo, emision: c.emision, vence: c.vence || "9999", dias: c.vence ? U.dias(U.hoy(), c.vence) : null, estado: ult.has(c.id) ? e : "Renovada", _cls: ult.has(c.id) ? "" : "mut" }; });
  },
  cols: [{ k: "id", t: "Certificado", w: 95 }, { k: "nom", t: "Colaborador" }, { k: "esp", t: "Especialidad" }, { k: "cert", t: "Capacitación" }, { k: "emision", t: "Emisión", f: r => U.fecha(r.emision), w: 90 }, { k: "vence", t: "Vence", f: r => (r.vence === "9999" ? "—" : U.fecha(r.vence)), w: 90 }, { k: "dias", t: "Días", num: true, w: 60, f: r => (r.dias == null ? "—" : r.dias), sortv: r => (r.dias == null ? 99999 : r.dias) }, { k: "estado", t: "Estado", f: r => pill(r.estado, r.estado === "Renovada" ? "mut" : ""), w: 100 }],
  tools(tab) { return { exportar: () => { const r = listview({ cols: this.cols, rows: this.filas(tab), sort: tab.sort }).rows; pedirFormato({ titulo: "Certificaciones", modulo: "Capacitaciones", sensible: true, lineas: [`Estado: ${tab.f.est || "Todos"} · Especialidad: ${tab.f.esp || "Todas"}`], columnas: [{ t: "Certificado" }, { t: "Colaborador" }, { t: "Especialidad" }, { t: "Capacitación" }, { t: "Emisión" }, { t: "Vence" }, { t: "Estado" }], filas: r.map(x => [x.id, x.nom, x.esp, x.cert, U.fecha(x.emision), x.vence === "9999" ? "Permanente" : U.fecha(x.vence), x.estado]) }); } }; },
  render(tab) {
    const al = certsAlerta(), lv = listview({ cols: this.cols, rows: this.filas(tab), sel: tab.sel, sort: tab.sort, pageSize: 15, page: tab.page, empty: "No hay certificaciones con esos filtros." }); tab.page = lv.page;
    return `<div class="dochead"><h2>Certificaciones</h2><span class="sub">${DB.d.certificaciones.length} certificaciones emitidas</span><span class="r"><button class="btn" id="cRen">Inscribir para renovar…</button></span></div>
    ${al.length ? `<div class="bar warn"><b class="ic">⚠</b><span>${al.filter(c => CAPR.certEstado(c) === "Vencida").length} vencida(s) y ${al.filter(c => CAPR.certEstado(c) === "Por vencer").length} por vencer en los próximos 30 días.</span></div>` : `<div class="bar ok"><b class="ic">✓</b><span>No hay certificaciones vencidas ni por vencer.</span></div>`}
    <div class="filters"><label>Buscar <input type="text" id="cQ2" value="${E(tab.f.q)}" style="width:180px" placeholder="Colaborador o capacitación"></label><label>Estado <select id="cE2">${opts(["Vigente", "Por vencer", "Vencida", "Permanente"], tab.f.est, "Todos")}</select></label><label>Especialidad <select id="cS2">${opts(CAT.especialidades, tab.f.esp, "Todas")}</select></label><label class="chk"><input type="checkbox" id="cH2" ${tab.f.hist ? "checked" : ""}> Incluir certificaciones renovadas</label></div>
    ${lv.html}${pager(lv, "")}`;
  },
  mount(w, tab) {
    bindBuscador($("#cQ2"), tab, "q");
    $("#cE2").onchange = e => { tab.f.est = e.target.value; tab.page = 0; pintar(); };
    $("#cS2").onchange = e => { tab.f.esp = e.target.value; tab.page = 0; pintar(); };
    $("#cH2").onchange = e => { tab.f.hist = e.target.checked; tab.page = 0; pintar(); };
    bindList(w, tab, {}); bindPager(w, tab);
    $("#cRen").onclick = () => {
      const c = DB.d.certificaciones.find(x => x.id === tab.sel); if (!c) return aviso("Seleccione una certificación", "<p>Haga clic en una fila.</p>");
      const cap = capsVigentes().find(k => k.tipo === c.tipo);
      if (!cap) return aviso("Sin capacitación disponible", `<p>No hay una capacitación del tipo «${E(c.tipo)}» en el plan ${U.anio()}. Créela en el catálogo anual.</p>`, "warn");
      abrir("inscripciones", { cap: cap.id, ficha: c.ficha, origen: `Renovación de la certificación ${c.id} de ${FICHA.nombre(DB.ficha(c.ficha))}` });
    };
  },
});
function certsUltimas() { const m = new Map(); for (const c of DB.d.certificaciones) { const k = c.ficha + "|" + c.tipo; if (!m.has(k) || m.get(k).emision < c.emision) m.set(k, c); } return [...m.values()]; }
HELP.certificaciones = { t: "Certificaciones", html: "<p>Lista la certificación vigente más reciente de cada colaborador por tipo, con su emisión y vencimiento. <b>Por vencer</b> = vence en 30 días o menos.</p><p>Al entrar al módulo, el sistema avisa las certificaciones vencidas o por vencer. Seleccione una y pulse <b>Inscribir para renovar</b> para inscribir al colaborador en una capacitación del mismo tipo.</p>" };

/* ---------- Matriz de competencias (RF-CAP-07) ---------- */
VIEWS.matriz = {
  mod: () => "Capacitaciones", permiso: ["capacitaciones", "reportes"], title: () => "Matriz de competencias", hu: () => "RF-CAP-07 · Consultar la matriz de competencias · RF-CAP-02 · Habilitación por especialidad",
  init(tab) { tab.f = { esp: "" }; },
  datos(tab) {
    const tipos = DB.d.tipos.map(t => t.nombre).filter(t => DB.d.capacitaciones.some(c => c.tipo === t));
    const ult = certsUltimas();
    const fichas = DB.d.fichas.filter(f => ["Activo", "Licencia"].includes(f.estado) && f.cargo.departamento === "Construcción" && (!tab.f.esp || f.cargo.especialidad === tab.f.esp)).sort((a, b) => FICHA.nombre(a).localeCompare(FICHA.nombre(b)));
    const filas = fichas.map(f => ({ f, h: CAPR.habilitacion(f), celdas: tipos.map(t => { const c = ult.find(x => x.ficha === f.id && x.tipo === t); return c ? CAPR.certEstado(c) : ""; }) }));
    const vencidas = ult.filter(c => CAPR.certEstado(c) === "Vencida" && fichas.some(f => f.id === c.ficha));
    return { tipos, filas, vencidas };
  },
  tools(tab) {
    return { exportar: () => { const d = this.datos(tab); pedirFormato({ titulo: "Matriz de competencias", modulo: "Capacitaciones", lineas: [`Especialidad: ${tab.f.esp || "Todas"} · V = vigente, PV = por vencer, X = vencida, P = permanente, — = sin certificación`], columnas: [{ t: "Colaborador" }, { t: "Especialidad" }, ...d.tipos.map(t => ({ t })), { t: "Habilitado para obra" }], filas: d.filas.map(r => [FICHA.nombre(r.f), r.f.cargo.especialidad, ...r.celdas.map(c => ({ Vigente: "V", "Por vencer": "PV", Vencida: "X", Permanente: "P" })[c] || "—"), r.h.habilitado ? "Sí" : "No: falta " + r.h.faltan.join(", ")]) }); } };
  },
  render(tab) {
    const d = this.datos(tab), sym = { Vigente: ["✓", "ok"], "Por vencer": ["!", "warn"], Vencida: ["✕", "err"], Permanente: ["✓", "ok"] };
    return `<div class="dochead"><h2>Matriz de competencias</h2><span class="sub">Colaboradores de Construcción × certificaciones por tipo</span></div>
    <div class="filters"><label>Especialidad <select id="mE">${opts(CAT.especialidades, tab.f.esp, "Todas")}</select></label><span class="muted small"><span class="mx ok">✓</span> vigente · <span class="mx warn">!</span> por vencer · <span class="mx err">✕</span> vencida · — sin certificación</span></div>
    <div class="lv-wrap"><table class="lv perm"><thead><tr><th style="text-align:left">Colaborador</th><th style="text-align:left">Especialidad</th>${d.tipos.map(t => `<th>${E(t)}</th>`).join("")}<th>Habilitado</th></tr></thead><tbody>
    ${d.filas.length ? d.filas.map(r => `<tr><td style="text-align:left">${E(FICHA.nombre(r.f))}${r.f.estado === "Licencia" ? ' <span class="muted small">(licencia)</span>' : ""}</td><td style="text-align:left">${E(r.f.cargo.especialidad)}</td>${r.celdas.map(c => `<td title="${E(c || "Sin certificación")}">${c ? `<span class="mx ${sym[c][1]}">${sym[c][0]}</span>` : '<span class="muted">—</span>'}</td>`).join("")}<td>${pill(r.h.habilitado ? "Habilitado" : "No habilitado")}</td></tr>`).join("") : `<tr><td colspan="${d.tipos.length + 3}" class="empty">Sin colaboradores para la especialidad.</td></tr>`}</tbody></table></div>
    <h3 style="font-size:14px;margin:16px 0 6px">Certificaciones vencidas (${d.vencidas.length})</h3>
    ${d.vencidas.length ? `<div class="lv-wrap"><table class="lv"><thead><tr><th>Colaborador</th><th>Certificación</th><th>Venció</th></tr></thead><tbody>${d.vencidas.map(c => `<tr><td>${E(FICHA.nombre(DB.ficha(c.ficha)))}</td><td>${E(c.nombre)}</td><td>${U.fecha(c.vence)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">No hay certificaciones vencidas.</p>`}`;
  },
  mount(w, tab) { $("#mE").onchange = e => { tab.f.esp = e.target.value; pintar(); }; },
};
HELP.matriz = { t: "Matriz de competencias", html: "<p>Cruza a los colaboradores de Construcción con las certificaciones por tipo. Filtre por especialidad. La columna <b>Habilitado</b> indica si cumple todas las capacitaciones obligatorias de su especialidad con certificación vigente. Las vencidas se listan aparte. Exporte a Excel o PDF desde la barra de herramientas.</p>" };

/* ---------- Historial de capacitaciones por colaborador (RF-CAP-08) ---------- */
VIEWS.historialcap = capView({
  title: tab => (tab.ficha && DB.ficha(tab.ficha) ? "Historial · " + DB.ficha(tab.ficha).nombres.split(" ")[0] + " " + DB.ficha(tab.ficha).apPat : "Historial de capacitaciones"), hu: () => "RF-CAP-08 · Consultar el historial de capacitaciones",
  init(tab) { tab.ficha = tab.params.ficha || ""; tab.f = { anio: "" }; },
  reparam(tab) { if (tab.params.ficha) tab.ficha = tab.params.ficha; },
  filas(tab) {
    return DB.d.inscripciones.filter(i => i.ficha === tab.ficha).map(i => { const c = DB.cap(i.cap) || {}, v = DB.version(i.version); const fe = v ? v.fecha : i.fecha; const ce = DB.d.certificaciones.find(x => x.ficha === i.ficha && x.cap === i.cap && v && x.emision === v.fecha); return { _id: i.id, fecha: fe, cap: c.nombre || i.cap, tipo: c.tipo || "", emp: nombreEmpresa(c.empresa), horas: c.dias ? c.dias * 8 : "", estado: i.estado, nota: CAPR.notaTxt(i), cert: ce ? (ce.vence ? `${CAPR.certEstado(ce)} · vence ${U.fecha(ce.vence)}` : "Permanente") : "—" }; })
      .filter(r => !tab.f.anio || r.fecha.startsWith(tab.f.anio)).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  },
  tools(tab) { return { exportar: tab.ficha && (() => { const f = DB.ficha(tab.ficha); pedirFormato({ titulo: "Historial de capacitaciones", modulo: "Capacitaciones", sensible: true, lineas: [`Colaborador: ${FICHA.nombre(f)} · ${f.id} · RUT ${f.rut}`, `Año: ${tab.f.anio || "Todos"}`], columnas: [{ t: "Fecha" }, { t: "Capacitación" }, { t: "Tipo" }, { t: "Empresa" }, { t: "Horas", num: true }, { t: "Resultado" }, { t: "Nota prueba" }, { t: "Certificación" }], filas: this.filas(tab).map(r => [U.fecha(r.fecha), r.cap, r.tipo, r.emp, r.horas, r.estado, r.nota, r.cert]) }); }) }; },
  render(tab) {
    const f = DB.ficha(tab.ficha), fichas = DB.d.fichas.slice().sort((a, b) => FICHA.nombre(a).localeCompare(FICHA.nombre(b)));
    let body = `<div class="bar info"><b class="ic">i</b><span>Seleccione un colaborador para ver todas sus capacitaciones.</span></div>`;
    if (f) {
      const rows = this.filas(tab), apr = rows.filter(r => r.estado === "Aprobado");
      const lv = listview({ cols: [{ k: "fecha", t: "Fecha", f: r => U.fecha(r.fecha), w: 90, nosort: true }, { k: "cap", t: "Capacitación", nosort: true }, { k: "tipo", t: "Tipo", nosort: true }, { k: "emp", t: "Empresa", nosort: true }, { k: "horas", t: "Horas", num: true, w: 60, nosort: true }, { k: "estado", t: "Resultado", f: r => pill(r.estado), w: 150, nosort: true }, { k: "nota", t: "Nota prueba", w: 85, nosort: true }, { k: "cert", t: "Certificación", nosort: true }], rows, empty: "Sin capacitaciones registradas." });
      const h = CAPR.habilitacion(f);
      body = `<p class="muted">${E(f.id)} · RUT ${E(f.rut)} · ${E(f.cargo.cargo || "—")} · ${E(f.cargo.especialidad || "sin especialidad")} · ${pill(f.estado)}</p>
      ${h.aplica ? (h.habilitado ? `<div class="bar ok"><b class="ic">✓</b><span>Habilitado para obra.</span></div>` : `<div class="bar warn"><b class="ic">⚠</b><span>No habilitado para obra: falta ${E(h.faltan.join(", "))}.</span></div>`) : ""}
      <p>${rows.length} capacitación(es) · ${apr.length} aprobada(s) · ${apr.reduce((s, r) => s + (+r.horas || 0), 0)} horas aprobadas</p>${lv.html}`;
    }
    const anios = [...new Set(DB.d.inscripciones.filter(i => i.ficha === tab.ficha).map(i => { const v = DB.version(i.version); return (v ? v.fecha : i.fecha).slice(0, 4); }))].sort().reverse();
    return `<div class="dochead"><h2>Historial de capacitaciones</h2>${f ? `<span class="r">${f.estado === "Activo" ? `<button class="btn pri" id="hAdd">Añadir capacitación…</button>` : ""}<button class="btn" id="hFicha">Ver ficha</button></span>` : ""}</div>
      <div class="filters"><label>Colaborador <select id="hF" style="max-width:360px">${opts(fichas.map(x => [x.id, `${FICHA.nombre(x)} · ${x.id}${x.estado === "Desvinculado" ? " (desvinculado)" : ""}`]), tab.ficha, "Seleccione…")}</select></label>${f ? `<label>Año <select id="hA">${opts(anios, tab.f.anio, "Todos")}</select></label>` : ""}</div>${body}`;
  },
  mount(w, tab) {
    $("#hF").onchange = e => { tab.ficha = e.target.value; tab.f.anio = ""; pintar(); };
    const a = $("#hA"); if (a) a.onchange = e => { tab.f.anio = e.target.value; pintar(); };
    const ad = $("#hAdd"); if (ad) ad.onclick = () => abrir("asignar", { ficha: tab.ficha });
    const b = $("#hFicha"); if (b) b.onclick = () => puede("contrataciones") ? abrir(tab.ficha, { sec: "capacitaciones" }) : aviso("Sin permiso", "<p>Su perfil no permite consultar fichas.</p>", "warn");
  },
});
HELP.historialcap = { t: "Historial de capacitaciones", html: "<p>Muestra todas las capacitaciones de un colaborador, con fecha, empresa, horas, resultado y certificación. Filtre por año y exporte a Excel o PDF.</p>" };

/* ---------- Necesidades detectadas por calificación (RF-CAP-17) ---------- */
VIEWS.necesidades = capView({
  title: () => "Necesidades por calificación", hu: () => "RF-CAP-17 · Buscar las calificaciones de servicio para detectar necesidades de capacitación",
  init(tab) { tab.f = { meses: "3", esp: "" }; tab.res = null; tab.cargando = false; },
  tools(tab) { return { buscar: () => this.consultar(tab), exportar: tab.res && !tab.res.error && (() => pedirFormato({ titulo: "Necesidades de capacitación por calificación", modulo: "Capacitaciones", sensible: true, lineas: [`Umbral: ${U.num1(DB.d.config.umbral)} · Período: últimos ${tab.f.meses} meses · Especialidad: ${tab.f.esp || "Todas"}`], columnas: [{ t: "Colaborador" }, { t: "Especialidad" }, { t: "Encuestas", num: true }, { t: "Promedio" }, { t: "Mínima" }, { t: "Situación" }], filas: tab.res.filas.map(r => [r.nom, r.esp, r.n, r.n ? U.num1(r.prom) : "—", r.n ? U.num1(r.min) : "—", r.sit]) })) }; },
  consultar(tab) {
    tab.cargando = true; tab.res = null; pintar();
    setTimeout(() => {
      tab.cargando = false;
      const pers = Array.from({ length: +tab.f.meses }, (_, i) => U.periodo(-i));
      const fichas = DB.d.fichas.filter(f => ["Activo", "Licencia"].includes(f.estado) && f.cargo.departamento === "Construcción" && (!tab.f.esp || f.cargo.especialidad === tab.f.esp));
      if (!DB.d.config.servicio) { tab.res = { error: true }; DB.log(ST.user.user, "Capacitaciones", "Servicio de calificaciones no disponible", "Consulta de necesidades sin respuesta del sistema informático actual"); return pintar(); }
      const u = DB.d.config.umbral;
      const filas = fichas.map(f => { const s = BON.servicioCalificaciones(DB.d, f.id, pers).servicios; const cs = s.map(x => x.calificacion); const prom = cs.length ? Math.round(cs.reduce((a, b) => a + b, 0) / cs.length * 10) / 10 : null; return { _id: f.id, nom: FICHA.nombre(f), esp: f.cargo.especialidad, n: cs.length, prom, min: cs.length ? Math.min(...cs) : null, det: s, sit: !cs.length ? "Sin datos" : prom < u ? "Bajo umbral" : "Sobre umbral", _cls: cs.length && prom < u ? "alerta" : "" }; })
        .sort((a, b) => (a.prom ?? 99) - (b.prom ?? 99));
      tab.res = { filas, pers }; DB.log(ST.user.user, "Capacitaciones", "Consulta de calificaciones", `${filas.length} colaboradores · ${filas.filter(r => r.sit === "Bajo umbral").length} bajo el umbral ${U.num1(u)}`); pintar();
    }, 450);
  },
  render(tab) {
    const u = DB.d.config.umbral;
    let body = `<div class="bar info"><b class="ic">i</b><span>Pulse <b>Consultar calificaciones</b> para obtener las encuestas de servicio desde el sistema informático actual.</span></div>`;
    if (tab.cargando) body = `<div class="bar info"><b class="ic">i</b><span>Consultando el sistema informático actual…</span></div>`;
    else if (tab.res && tab.res.error) body = `<div class="bar err"><b class="ic">✕</b><span>El servicio de calificaciones no está disponible en este momento. Intente más tarde; el evento quedó registrado en la bitácora.</span></div>`;
    else if (tab.res) {
      const lv = listview({ cols: [{ k: "nom", t: "Colaborador", nosort: true }, { k: "esp", t: "Especialidad", nosort: true }, { k: "n", t: "Encuestas", num: true, w: 80, nosort: true }, { k: "prom", t: "Promedio", num: true, w: 80, f: r => (r.n ? `<b>${U.num1(r.prom)}</b>` : "—"), nosort: true }, { k: "min", t: "Mínima", num: true, w: 70, f: r => (r.n ? U.num1(r.min) : "—"), nosort: true }, { k: "sit", t: "Situación", f: r => pill(r.sit === "Sobre umbral" ? "Vigente" : r.sit).replace(">Vigente<", ">Sobre umbral<"), w: 120, nosort: true }], rows: tab.res.filas, sel: tab.sel, empty: "Sin colaboradores." });
      const bajo = tab.res.filas.filter(r => r.sit === "Bajo umbral").length;
      body = `<div class="bar ${bajo ? "warn" : "ok"}"><b class="ic">${bajo ? "⚠" : "✓"}</b><span>${bajo} colaborador(es) con promedio bajo el umbral de ${U.num1(u)} en ${tab.res.pers.map(U.mes).reverse().join(", ")}.</span></div>${lv.html}
      <div class="actions"><button class="btn" id="nDet">Ver encuestas…</button><button class="btn pri" id="nAsig">Asignar capacitación…</button></div>`;
    }
    return `<div class="dochead"><h2>Necesidades de capacitación por calificación</h2><span class="sub">Encuestas de servicio de los proyectos en que participó cada colaborador</span></div>
    <div class="filters"><label>Umbral de calificación <input type="text" id="nU" value="${U.num1(u)}" style="width:60px" maxlength="3"></label><button class="btn" id="nUS">Guardar umbral</button>
      <label>Período <select id="nM">${opts([["1", "Último mes"], ["3", "Últimos 3 meses"], ["4", "Últimos 4 meses"]], tab.f.meses)}</select></label><label>Especialidad <select id="nE">${opts(CAT.especialidades, tab.f.esp, "Todas")}</select></label><button class="btn pri" id="nGo">Consultar calificaciones</button></div>
    ${simuladorServicio()}${body}`;
  },
  mount(w, tab) {
    $("#nM").onchange = e => { tab.f.meses = e.target.value; tab.res = null; pintar(); };
    $("#nE").onchange = e => { tab.f.esp = e.target.value; tab.res = null; pintar(); };
    $("#nGo").onclick = () => this.consultar(tab);
    $("#nUS").onclick = () => { const v = Number($("#nU").value.replace(",", ".")); if (!isFinite(v) || v < 1 || v > 7) return aviso("Umbral inválido", "<p>El umbral debe ser un número entre 1,0 y 7,0.</p>", "err"); const ant = DB.d.config.umbral; DB.d.config.umbral = Math.round(v * 10) / 10; DB.log(ST.user.user, "Capacitaciones", "Cambio de umbral", `${U.num1(ant)} → ${U.num1(DB.d.config.umbral)}`); tab.res = null; tab.msg = "Umbral guardado."; pintar(); };
    bindSimulador(w);
    if (!tab.res || tab.res.error) return;
    bindList(w, tab, { onOpen: id => this.detalle(tab, id) });
    $("#nDet").onclick = () => tab.sel ? this.detalle(tab, tab.sel) : aviso("Seleccione un colaborador", "<p>Haga clic en una fila.</p>");
    $("#nAsig").onclick = () => {
      const r = tab.res.filas.find(x => x._id === tab.sel); if (!r) return aviso("Seleccione un colaborador", "<p>Haga clic en la fila del colaborador al que desea asignar una capacitación.</p>");
      const f = DB.ficha(r._id), cap = capsVigentes().find(c => c.competencia === f.cargo.especialidad && CAPR.cuposLibres(c) > 0) || capsVigentes().find(c => c.competencia === f.cargo.especialidad);
      abrir("inscripciones", { cap: cap ? cap.id : "", ficha: f.id, origen: `Necesidad detectada: ${FICHA.nombre(f)} tiene promedio ${r.n ? U.num1(r.prom) : "sin datos"} (umbral ${U.num1(DB.d.config.umbral)}). Elija la capacitación y pulse «Inscribir seleccionados».` });
    };
  },
  detalle(tab, id) {
    const r = tab.res.filas.find(x => x._id === id);
    dialog({ wide: true, head: `Encuestas de ${r.nom}`, html: r.det.length ? `<div class="lv-wrap" style="max-height:260px"><table class="lv"><thead><tr><th>Fecha</th><th>Proyecto</th><th>Cliente</th><th>Encuesta</th><th class="num">Calificación</th></tr></thead><tbody>${r.det.map(s => `<tr><td>${U.fecha(s.fecha)}</td><td>${E(s.proyecto)} · ${E(s.nombre)}</td><td>${E(s.cliente)}</td><td>${E(s.encuesta)}</td><td class="num">${U.num1(s.calificacion)}</td></tr>`).join("")}</tbody></table></div>` : "<p>Sin encuestas en el período.</p>" });
  },
});
HELP.necesidades = { t: "Necesidades por calificación", html: "<p>Consulta al sistema informático actual las calificaciones de servicio de los proyectos de cada colaborador de Construcción y calcula su promedio en el período. Los que están <b>bajo el umbral</b> se destacan.</p><p>Seleccione uno y pulse <b>Asignar capacitación</b>: se abre Inscripciones con el colaborador ya marcado. Si el servicio no responde, se informa y queda en la bitácora.</p>" };

/* simulador del sistema informático actual (compartido con Bonificaciones) */
function simuladorServicio() {
  return `<div class="sim"><b>Simulador del sistema informático actual</b> · Servicio de calificaciones: ${DB.d.config.servicio ? pill("Disponible", "ok") : pill("No disponible", "err")} <button class="link" id="simTog">${DB.d.config.servicio ? "Simular caída del servicio" : "Restablecer el servicio"}</button></div>`;
}
function bindSimulador(w) { const b = $("#simTog", w); if (b) b.onclick = () => { DB.d.config.servicio = !DB.d.config.servicio; DB.guardar(); guardarScroll(); pintar(); }; }
