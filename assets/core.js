/* SGRH Instalum · núcleo de la interfaz: diálogos, inicio de sesión, ventana principal, listas y exportación */
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const E = U.esc;
const VIEWS = {};
const HELP = {};
const ST = { user: null, tabs: [], active: null, timer: null, base: "INSTALUM_RRHH", modCerrados: new Set() };
const ICON = {
  nuevo: "M5 3h9l5 5v13H5z M14 3v5h5", guardar: "M5 3h12l3 3v15H5z M8 3v6h8V3 M8 21v-7h8v7", deshacer: "M9 7 5 11l4 4 M5 11h10a5 5 0 0 1 0 10h-4",
  buscar: "M10 4a6 6 0 1 0 0 12 6 6 0 1 0 0-12 M14.5 14.5 20 20", imprimir: "M7 9V3h10v6 M5 9h14v8H5z M7 14h10v7H7z", exportar: "M12 4v11 M7 10l5 5 5-5 M4 19h16",
  ayuda: "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18 M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14 M12 17.2v.1", cerrar: "M6 6l12 12 M18 6 6 18", inicio: "M3 11.5 12 4l9 7.5 M5.5 9.5V20h5v-6h3v6h5V9.5",
};

/* ====================================================================== */
/*  Diálogos                                                              */
/* ====================================================================== */
function dialog({ title = "SGRH Instalum", icon = "info", head = "", html = "", buttons = [{ label: "Aceptar", pri: true }], wide = false, mount } = {}) {
  return new Promise(resolve => {
    const v = document.createElement("div");
    v.className = "veil";
    const sym = { err: "✕", ok: "✓", info: "i", warn: "!" }[icon];
    v.innerHTML = `<div class="dlg ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${E(title)}">
      <div class="win-title"><span class="logo"></span><span class="t">${E(title)}</span><button class="xbtn" data-x aria-label="Cerrar">✕</button></div>
      <div class="dbody">${icon ? `<div class="ico ${icon}">${sym}</div>` : ""}<div class="dtext">${head ? `<h3>${E(head)}</h3>` : ""}${html}</div></div>
      <div class="dfoot">${buttons.map((b, i) => `<button class="btn ${b.pri ? "pri" : ""}" data-b="${i}">${E(b.label)}</button>`).join("")}</div></div>`;
    document.body.appendChild(v);
    let cerrado = false;
    const close = val => { if (cerrado) return; cerrado = true; v.remove(); document.removeEventListener("keydown", key, true); resolve(val); };
    const press = async i => {
      const b = buttons[i];
      if (b.onClick) { let r; try { r = await b.onClick(v); } catch (e) { console.error(e); r = false; } if (r === false) return; }
      close(b.value ?? b.label);
    };
    const key = e => {
      if (cerrado || $$(".veil").pop() !== v) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(null); }
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON") {
        const i = buttons.findIndex(b => b.pri); if (i >= 0) { e.preventDefault(); e.stopPropagation(); press(i); }
      }
    };
    document.addEventListener("keydown", key, true);
    v.querySelector("[data-x]").onclick = () => close(null);
    $$("[data-b]", v).forEach(b => b.onclick = () => press(+b.dataset.b));
    v._close = close;
    if (mount) mount(v);
    const f = v.querySelector(".dtext input:not([type=checkbox]):not([type=radio]):not([readonly]),.dtext select,.dtext textarea") || v.querySelector(".btn.pri");
    if (f) setTimeout(() => f.focus(), 0);
  });
}
const confirmar = (head, html, si = "Sí", no = "No", icon = "warn") =>
  dialog({ icon, head, html, buttons: [{ label: si, pri: true, value: true }, { label: no, value: false }] });
const aviso = (head, html, icon = "info") => dialog({ icon, head, html });
const barErr = (el, t, k = "err") => { el.innerHTML = t ? `<div class="bar ${k}"><b class="ic">${{ err: "✕", ok: "✓", warn: "⚠", info: "i" }[k]}</b><span>${E(t)}</span></div>` : ""; return false; };
const TONO = { ok: ["Activo", "Habilitada", "Vigente", "Aprobado", "Finalizada", "Permanente", "Registrado para pago", "Funcional", "Publicada", "Cerrada", "Aceptada", "Con bonificación", "Habilitado"],
  warn: ["Licencia", "Incompleta", "Por vencer", "Pendiente de aprobación", "Pendiente (sin cupo)", "Pendiente de resultados", "En ejecución", "Bajo umbral", "No habilitado"],
  err: ["Vencida", "Reprobado", "Rechazado", "Bloqueada", "Desvinculado", "Dada de baja", "Inasistente", "No ejecutada", "Rechazada", "Excluido"],
  mut: ["Deshabilitada", "Cancelada", "Inactivo", "Sin bonificación", "Sin datos"], info: ["Planificada", "Inscrito", "Programada", "Calculado"] };
const tono = t => Object.keys(TONO).find(k => TONO[k].includes(t)) || "info";
const pill = (t, cls) => `<span class="pill ${E(cls || tono(t))}">${E(t)}</span>`;

/* ====================================================================== */
/*  Exportación a Excel (.xlsx) y PDF (RF-REP-04)                         */
/* ====================================================================== */
const XLSX = (() => {
  const T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder();
  function zip(files) {
    const parts = [], central = []; let off = 0;
    const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const [name, txt] of files) {
      const nb = enc.encode(name), data = enc.encode(txt), c = crc(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
      h.setUint32(14, c, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nb, data);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true); cd.setUint16(12, time, true); cd.setUint16(14, date, true);
      cd.setUint32(16, c, true); cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, nb.length, true); cd.setUint32(42, off, true);
      central.push(new Uint8Array(cd.buffer), nb);
      off += 30 + nb.length + data.length;
    }
    const csize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  const x = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const col = i => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  function libro({ hoja = "Reporte", titulo, lineas = [], columnas, filas, total }) {
    let r = 0; const rows = [];
    const cell = (c, v, st, num) => num && v !== "" && v != null && isFinite(v) ? `<c r="${col(c)}${r}" s="${st}"><v>${+v}</v></c>` : `<c r="${col(c)}${r}" t="inlineStr" s="${st}"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
    r++; rows.push(`<row r="${r}">${cell(0, titulo, 1)}</row>`);
    for (const l of lineas) { r++; rows.push(`<row r="${r}">${cell(0, l, 5)}</row>`); }
    r++; r++; rows.push(`<row r="${r}">${columnas.map((c, i) => cell(i, c.t, 2)).join("")}</row>`);
    for (const f of filas) { r++; const sb = /^Subtotal/.test(String(f[1] ?? "")); rows.push(`<row r="${r}">${columnas.map((c, i) => cell(i, f[i], c.num || c.money ? (sb ? 6 : 4) : (sb ? 7 : 3), c.num || c.money)).join("")}</row>`); }
    if (total) { r++; rows.push(`<row r="${r}">${columnas.map((c, i) => cell(i, total[i] ?? "", c.num || c.money ? 6 : 7, c.num || c.money)).join("")}</row>`); }
    const widths = columnas.map((c, i) => Math.min(60, Math.max(10, String(c.t).length + 2, ...filas.slice(0, 300).map(f => String(f[i] ?? "").length + 2))));
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.join("")}</sheetData></worksheet>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF0067C0"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0067C0"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const nombre = x(hoja.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Reporte");
    return zip([
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nombre}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["xl/worksheets/sheet1.xml", sheet], ["xl/styles.xml", styles],
    ]);
  }
  return { libro };
})();
function bajar(blob, nombre) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
const archivoSeguro = s => U.norm(s).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
/* exporta los mismos datos y filtros que se ven en pantalla; registra la operación en la bitácora */
function exportar(formato, { titulo, lineas = [], columnas, filas, total, modulo = "Reportes", sensible = false }) {
  const nombre = `${archivoSeguro(titulo)}_${U.hoy()}`;
  const filasTxt = filas.map(f => columnas.map((c, i) => c.money ? f[i] : f[i]));
  if (formato === "excel") {
    bajar(XLSX.libro({ hoja: titulo.slice(0, 31), titulo: "SGRH Instalum · " + titulo, lineas: [...lineas, `Generado por ${ST.user.user} el ${U.ahora()}`], columnas, filas: filasTxt, total }), nombre + ".xlsx");
  } else {
    if (!window.jspdf || !window.jspdf.jsPDF) { aviso("No se pudo generar el PDF", "<p>No se cargó el componente de PDF. Recargue la página e intente nuevamente.</p>", "err"); return false; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: columnas.length > 5 ? "landscape" : "portrait", unit: "mm", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const txt = v => String(v ?? "").replace(/[✓✕⚠ⓘ▸▾]/g, "");
    const fmt = (c, v) => (c.money ? U.pesos(v) : c.num && v !== "" && v != null ? (+v).toLocaleString("es-CL") : txt(v));
    doc.autoTable({
      head: [columnas.map(c => c.t)], body: filas.map(f => columnas.map((c, i) => fmt(c, f[i]))),
      foot: total ? [columnas.map((c, i) => fmt(c, total[i] ?? ""))] : undefined,
      startY: 30 + lineas.length * 4.5, margin: { top: 24, bottom: 14, left: 12, right: 12 },
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [210, 210, 210], lineWidth: 0.1 }, headStyles: { fillColor: [0, 103, 192], textColor: 255 },
      footStyles: { fillColor: [243, 243, 243], textColor: 20, fontStyle: "bold" }, alternateRowStyles: { fillColor: [247, 250, 253] },
      didParseCell: d => { if (d.section === "body" && /^Subtotal/.test(String(d.row.raw[1] ?? ""))) { d.cell.styles.fontStyle = "bold"; d.cell.styles.fillColor = [238, 243, 248]; } },
      columnStyles: Object.fromEntries(columnas.map((c, i) => [i, c.num || c.money ? { halign: "right" } : {}])),
      didDrawPage: () => {
        doc.setFillColor(0, 103, 192); doc.rect(0, 0, W, 18, "F");
        doc.setTextColor(255); doc.setFontSize(13); doc.text("SGRH Instalum", 12, 8); doc.setFontSize(9); doc.text("Sistema de Gestión de Recursos Humanos · Instalum", 12, 13.5);
        doc.setFontSize(12); doc.text(titulo, W - 12, 11, { align: "right" });
        doc.setTextColor(60); doc.setFontSize(8);
        doc.text(`Generado por ${ST.user.user} el ${U.ahora()} · Página ${doc.internal.getCurrentPageInfo().pageNumber} de {total}`, 12, doc.internal.pageSize.getHeight() - 6);
      },
    });
    doc.setPage(1); doc.setTextColor(40); doc.setFontSize(9); lineas.forEach((l, i) => doc.text(txt(l), 12, 25 + i * 4.5));
    if (typeof doc.putTotalPages === "function") doc.putTotalPages("{total}");
    doc.save(nombre + ".pdf");
  }
  DB.log(ST.user.user, modulo, "Exportación a " + (formato === "excel" ? "Excel" : "PDF"), `${titulo} · ${filas.length} registros${sensible ? " · contiene datos de colaboradores" : ""}`);
  setStatus(`Se exportó «${titulo}» a ${formato === "excel" ? "Excel" : "PDF"} (${filas.length} registros).`);
  return true;
}
async function pedirFormato(datos) {
  const r = await dialog({ head: "Exportar", html: `<p>${E(datos.titulo)} · ${datos.filas.length} registros con los filtros aplicados.</p><p>¿En qué formato desea exportar?</p>`,
    buttons: [{ label: "Excel (.xlsx)", pri: true, value: "excel" }, { label: "PDF", value: "pdf" }, { label: "Cancelar" }] });
  if (r === "excel" || r === "pdf") exportar(r, datos);
}

/* ====================================================================== */
/*  Inicio de sesión (RF-SEG-01) y restablecimiento de contraseña         */
/* ====================================================================== */
function reloj() {
  const f = () => { const t = U.ahora(); const a = $("#sClock"), b = $("#tbClock"); if (a) a.textContent = t; if (b) b.textContent = t.split(" ").reverse().join("   "); };
  f(); clearInterval(ST.clock); ST.clock = setInterval(f, 20000);
}
function pantallaLogin(msg) {
  ST.user = null; ST.tabs = []; ST.active = null; clearTimeout(ST.timer);
  $$(".veil").forEach(v => v._close ? v._close(null) : v.remove());
  $("#app").classList.add("hidden"); $("#app").innerHTML = "";
  const L = $("#login"); L.classList.remove("hidden");
  const rec = DB.d.recordar || "";
  L.innerHTML = `
  <div class="desk">
    <form class="win" id="fLogin" autocomplete="off" novalidate>
      <div class="win-title"><span class="logo"></span><span class="t">Iniciar sesión — SGRH Instalum</span><button type="button" class="xbtn" id="lgX" aria-label="Cerrar">✕</button></div>
      <div class="win-head"><span class="logo big w"></span><div><h1>SGRH Instalum</h1><p>Sistema de Gestión de Recursos Humanos · v1.0</p></div></div>
      <div class="win-body">
        <div id="lgMsg">${msg ? `<div class="bar info"><b class="ic">i</b><span>${E(msg)}</span></div>` : `<p class="muted" style="margin:0 0 6px">Ingrese su usuario y contraseña habilitados por Recursos Humanos.</p>`}</div>
        <div class="row" style="--lw:110px"><label class="l" for="lgU">Usuario</label><div class="ctl"><input type="text" id="lgU" value="${E(rec)}" placeholder="Ingrese su usuario" autocomplete="username" maxlength="40"></div></div>
        <div class="row" style="--lw:110px"><label class="l" for="lgP">Contraseña</label><div class="ctl"><input type="password" id="lgP" placeholder="Ingrese su contraseña" autocomplete="current-password" maxlength="40"><button type="button" class="btn" id="lgVer" style="min-width:0;padding:0 8px;flex:none" title="Mostrar u ocultar la contraseña">Ver</button></div></div>
        <div class="row" style="--lw:110px"><label class="l" for="lgB">Base de datos</label><div class="ctl"><select id="lgB"><option>INSTALUM_RRHH</option><option>INSTALUM_RRHH_PRUEBAS</option></select></div></div>
        <div class="row" style="--lw:110px"><span style="width:110px;flex:none"></span><label class="chk"><input type="checkbox" id="lgR" ${rec ? "checked" : ""}> Recordar usuario en este equipo</label></div>
        <div class="row" style="--lw:110px"><span style="width:110px;flex:none"></span><button type="button" class="link" id="lgOlv">¿Olvidó su contraseña?</button></div>
        <p class="muted small" style="margin:14px 0 0">La sesión se cierra tras 15 minutos de inactividad. Tras 3 intentos fallidos la cuenta se bloquea.</p>
      </div>
      <div class="win-foot"><button class="btn pri" type="submit">Ingresar</button><button class="btn" type="button" id="lgSalir">Salir</button></div>
    </form>
  </div>
  <div class="desk-hint"><b>Datos de prueba</b> · Jefe de RR.HH.: <b>User_Prueba</b> / <b>12344</b><br>Contrataciones: prios / Contrata2026 · Capacitaciones: cvaldes / Capacita2026<br>Bonificación: brojas / Bonifica2026 · Gerencia: gerencia / Gerencia2026 · Bloqueada: jmora</div>
  <div class="taskbar"><span class="logo w"></span><span>SGRH Instalum</span><button class="link" style="color:#fff;margin-left:16px" id="tbMail">✉ Correo (simulado)</button><span class="sp"></span><span id="tbClock"></span></div>`;
  reloj();
  const u = $("#lgU"), p = $("#lgP");
  (rec ? p : u).focus();
  $("#lgVer").onclick = () => { p.type = p.type === "password" ? "text" : "password"; p.focus(); };
  $("#lgOlv").onclick = () => recuperar(u.value.trim());
  $("#tbMail").onclick = () => bandeja();
  $("#lgSalir").onclick = $("#lgX").onclick = async () => { if (await confirmar("¿Desea salir de SGRH Instalum?", "<p>Se cerrará la aplicación.</p>")) apagado(); };
  $("#fLogin").onsubmit = e => { e.preventDefault(); ingresar(); };
}
function lgError(t, campo) {
  barErr($("#lgMsg"), t);
  ["#lgU", "#lgP"].forEach(s => $(s).classList.remove("err"));
  if (campo) { $(campo).classList.add("err"); $(campo).focus(); }
}
async function ingresar() {
  const uTxt = $("#lgU").value.trim(), pTxt = $("#lgP").value;
  if (!uTxt) return lgError("Ingrese su usuario.", "#lgU");
  if (!pTxt) return lgError("Ingrese su contraseña.", "#lgP");
  const u = DB.usuario(uTxt);
  if (!u) { DB.log(uTxt.slice(0, 40), "Seguridad", "Intento de acceso fallido", "Usuario no registrado"); $("#lgP").value = ""; return lgError("Usuario o contraseña incorrectos.", "#lgP"); }
  if (u.estado === "Deshabilitada") { DB.log(u.user, "Seguridad", "Intento de acceso rechazado", "Cuenta deshabilitada"); $("#lgP").value = ""; return lgError("La cuenta no se encuentra habilitada. Contacte a Recursos Humanos."); }
  if (u.estado === "Bloqueada") { $("#lgP").value = ""; return avisoBloqueo(u); }
  if (pTxt !== u.clave) {
    u.intentos = (u.intentos || 0) + 1; $("#lgP").value = "";
    if (u.intentos >= 3) {
      u.estado = "Bloqueada"; DB.log(u.user, "Seguridad", "Cuenta bloqueada", "3 intentos fallidos consecutivos de contraseña");
      lgError("Usuario o contraseña incorrectos.", "#lgP"); return avisoBloqueo(u);
    }
    DB.log(u.user, "Seguridad", "Intento de acceso fallido", `Contraseña incorrecta (intento ${u.intentos} de 3)`);
    const q = 3 - u.intentos;
    return lgError(`Usuario o contraseña incorrectos. Le ${q === 1 ? "queda 1 intento" : `quedan ${q} intentos`} antes del bloqueo.`, "#lgP");
  }
  u.intentos = 0;
  if (u.debeCambiar) {
    DB.guardar();
    const ok = await cambiarClave(u, "Primer ingreso: cambie su contraseña temporal", "La contraseña temporal es de un solo uso. Defina una contraseña personal para continuar.");
    if (!ok) { $("#lgP").value = ""; return lgError("Debe cambiar la contraseña temporal para ingresar."); }
  }
  DB.d.recordar = $("#lgR").checked ? u.user : "";
  DB.log(u.user, "Seguridad", "Inicio de sesión", `Perfil ${u.perfil} · base ${$("#lgB").value}`);
  ST.user = u; ST.base = $("#lgB").value; ST.tabs = []; ST.active = null;
  abrirApp();
}
async function avisoBloqueo(u) {
  const r = await dialog({ icon: "err", head: "Cuenta bloqueada temporalmente", html: `<p>Se registraron 3 intentos fallidos de contraseña para <b>${E(u.user)}</b>.</p><p>El evento quedó en la bitácora. Restablezca su contraseña por correo o solicite el desbloqueo a Recursos Humanos.</p>`,
    buttons: [{ label: "Restablecer contraseña", value: "r" }, { label: "Aceptar", pri: true }] });
  if (r === "r") recuperar(u.user);
}
function apagado() {
  ST.user = null; clearTimeout(ST.timer);
  $("#app").classList.add("hidden"); $("#app").innerHTML = ""; $("#login").classList.remove("hidden");
  $("#login").innerHTML = `<div class="desk"><div style="text-align:center;color:#C9D6E3"><p>SGRH Instalum se cerró correctamente.</p><button class="btn pri" id="reabrir">Abrir SGRH Instalum</button></div></div><div class="taskbar"><span class="logo w"></span><span>Escritorio</span><span class="sp"></span><span id="tbClock"></span></div>`;
  reloj(); $("#reabrir").onclick = () => pantallaLogin();
}
const reglasClave = (u, c) => [
  [c.length >= 8, "Mínimo 8 caracteres"], [/[A-ZÁÉÍÓÚÑ]/.test(c), "Al menos una letra mayúscula"], [/\d/.test(c), "Al menos un número"],
  [!!c && c !== u.clave && c !== u.claveAnterior, "Distinta a la contraseña actual y a la anterior"]];
async function cambiarClave(u, head, intro, correo) {
  const r = await dialog({ title: "Crear nueva contraseña — SGRH Instalum", icon: "info", head,
    html: `<p>${E(intro)}</p><div id="ncMsg"></div>
      <div class="row" style="--lw:130px"><label class="l" for="nc1">Nueva contraseña</label><div class="ctl"><input type="password" id="nc1" class="req" maxlength="40"></div></div>
      <div class="row" style="--lw:130px"><label class="l" for="nc2">Confirmar</label><div class="ctl"><input type="password" id="nc2" class="req" maxlength="40"></div></div>
      <ul class="reqs" id="ncReq"></ul><p class="small" id="ncCoinc"></p><p class="muted small">Sugerencia para la demostración: Nueva2026</p>`,
    mount: v => {
      const upd = () => {
        const a = $("#nc1", v).value, b = $("#nc2", v).value;
        $("#ncReq", v).innerHTML = reglasClave(u, a).map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
        $("#ncCoinc", v).innerHTML = b ? (a === b ? `<span class="note ok">✓ Las contraseñas coinciden</span>` : `<span class="note bad">✕ Las contraseñas no coinciden</span>`) : "";
      };
      $("#nc1", v).oninput = $("#nc2", v).oninput = upd; upd();
    },
    buttons: [{ label: "Guardar contraseña", pri: true, value: "ok", onClick: v => {
      const a = $("#nc1", v).value, b = $("#nc2", v).value, m = t => barErr($("#ncMsg", v), t);
      if (!a || !b) return m("Complete ambos campos.");
      if (!reglasClave(u, a).every(x => x[0])) return m("La contraseña no cumple todos los requisitos.");
      if (a !== b) return m("Las contraseñas no coinciden.");
      if (correo && (correo.usado || Date.now() > correo.vence)) return m("El enlace venció o ya fue utilizado. Solicite uno nuevo.");
      u.claveAnterior = u.clave; u.clave = a; u.estado = "Habilitada"; u.intentos = 0; u.debeCambiar = false; if (correo) correo.usado = true;
      DB.log(u.user, "Seguridad", "Cambio de contraseña", correo ? "Restablecida mediante enlace de correo" : "Cambio de contraseña temporal en el primer ingreso"); return true;
    } }, { label: "Cancelar" }],
  });
  return r === "ok";
}
async function recuperar(pre = "") {
  let usuario = null;
  const r = await dialog({
    title: "Restablecer contraseña — SGRH Instalum", icon: "info", head: "Restablecer contraseña · Paso 1 de 3",
    html: `<p>Ingrese su usuario y el correo registrado en su cuenta. Le enviaremos un enlace para crear una nueva contraseña.</p>
      <div id="rcMsg"></div>
      <div class="row" style="--lw:80px"><label class="l" for="rcU">Usuario</label><div class="ctl"><input type="text" id="rcU" value="${E(pre)}" maxlength="40"></div></div>
      <div class="row" style="--lw:80px"><label class="l" for="rcC">Correo</label><div class="ctl"><input type="email" id="rcC" class="req" placeholder="nombre@instalum.cl" maxlength="80"></div></div>
      <p class="muted small">Correo del usuario de prueba: user.prueba@instalum.cl · de jmora: jose.mora@instalum.cl</p>`,
    buttons: [{ label: "Enviar correo", pri: true, value: "ok", onClick: v => {
      const us = DB.usuario($("#rcU", v).value), c = $("#rcC", v).value.trim().toLowerCase(), m = t => barErr($("#rcMsg", v), t);
      if (!$("#rcU", v).value.trim()) return m("Ingrese su usuario.");
      if (!U.correoValido(c)) return m("Ingrese un correo válido.");
      if (!us || us.correo.toLowerCase() !== c) return m("El usuario y el correo no coinciden con una cuenta registrada.");
      if (us.estado === "Deshabilitada") return m("La cuenta no se encuentra habilitada. Contacte a Recursos Humanos.");
      usuario = us; return true;
    } }, { label: "Cancelar" }],
  });
  if (r !== "ok") return;
  DB.d.correos.forEach(c => { if (c.user === usuario.user) c.usado = true; });
  const token = Math.random().toString(36).slice(2, 10).toUpperCase();
  DB.d.correos.unshift({ id: token, para: usuario.correo, user: usuario.user, fecha: U.ahora(), vence: Date.now() + 30 * 60000, usado: false, asunto: "Restablecer su contraseña de SGRH Instalum" });
  DB.log(usuario.user, "Seguridad", "Solicitud de restablecimiento", "Enlace enviado a " + U.enmascarar(usuario.correo));
  const r2 = await dialog({ icon: "ok", head: "Correo enviado · Paso 2 de 3", html: `<p>Se envió un enlace a <b>${E(U.enmascarar(usuario.correo))}</b>.</p><p>Revise su bandeja de entrada. El enlace vence en 30 minutos y solo se puede usar una vez.</p>`,
    buttons: [{ label: "Abrir correo", pri: true, value: "m" }, { label: "Volver al inicio" }] });
  if (r2 === "m") bandeja();
}
async function bandeja() {
  const lista = DB.d.correos;
  let sel = lista[0];
  const pinta = v => {
    $("#mbList", v).innerHTML = lista.length ? lista.map((c, i) => `<tr data-i="${i}" class="${c === sel ? "sel" : ""}"><td><b>SGRH Instalum</b><br><span class="muted">${E(c.asunto)}</span></td><td class="muted">${E(c.para)}<br>${E(c.fecha)}</td></tr>`).join("") : `<tr><td class="empty">No hay correos. Use «¿Olvidó su contraseña?» en el inicio de sesión.</td></tr>`;
    $$("#mbList tr[data-i]", v).forEach(tr => tr.onclick = () => { sel = lista[+tr.dataset.i]; pinta(v); });
    const vencido = sel && (sel.usado || Date.now() > sel.vence);
    $("#mbBody", v).innerHTML = sel ? `<div class="mail"><div class="mh"><b>${E(sel.asunto)}</b><br>De: SGRH Instalum &lt;no-responder@instalum.cl&gt; · Para: ${E(sel.para)} · ${E(sel.fecha)}</div>
      <div class="mb"><p>Hola, <b>${E(sel.user)}</b>:</p><p>Recibimos una solicitud para restablecer la contraseña de su cuenta en SGRH Instalum. Haga clic en el botón para crear una nueva contraseña. El enlace vence en 30 minutos.</p>
      ${vencido ? `<div class="bar warn"><b class="ic">⚠</b><span>Este enlace ya fue utilizado o venció. Solicite uno nuevo.</span></div>` : `<button class="cta" id="mbGo">Crear nueva contraseña</button>`}
      <p class="muted small">Si usted no hizo esta solicitud, ignore este correo y avise a Recursos Humanos.</p></div></div>` : "";
    const g = $("#mbGo", v); if (g) g.onclick = async () => {
      v._close(null);
      const u = DB.usuario(sel.user);
      if (await cambiarClave(u, `Nueva contraseña · Paso 3 de 3 · ${u.user}`, "Defina su nueva contraseña.", sel)) {
        await dialog({ icon: "ok", head: "Contraseña actualizada", html: "<p>Ya puede ingresar con su nueva contraseña. El cambio quedó registrado en la bitácora.</p>", buttons: [{ label: "Ir al inicio de sesión", pri: true }] });
        pantallaLogin(); $("#lgU").value = u.user; $("#lgP").focus();
      }
    };
  };
  await dialog({ title: "Correo — Bandeja de entrada (simulación del prototipo)", icon: null, wide: true,
    html: `<div class="lv-wrap" style="max-height:150px"><table class="lv"><tbody id="mbList"></tbody></table></div><div id="mbBody" style="margin-top:10px"></div>`,
    buttons: [{ label: "Cerrar", pri: true }], mount: pinta });
}

/* ====================================================================== */
/*  Ventana principal                                                     */
/* ====================================================================== */
const puede = p => !!ST.user && DB.puede(ST.user.perfil, p);
/* Catálogo de acciones: alimenta el inicio, el navegador, el menú y el buscador «¿Qué desea hacer?» */
const MODS = [
  { k: "contrataciones", t: "Contrataciones", c: "#0067C0" }, { k: "capacitaciones", t: "Capacitaciones", c: "#107C10" },
  { k: "bonificaciones", t: "Bonificaciones", c: "#B4580A" }, { k: "reportes", t: "Reportes", c: "#6B3FA0" }, { k: "admin", t: "Administración", c: "#5F5F5F" },
];
const ACC = [
  { m: "contrataciones", k: "nueva", t: "Registrar nuevo colaborador", d: "Crear la ficha de un trabajador que ingresa a la empresa.", perm: "contrataciones.editar", kw: "nueva ficha contratar contratacion ingreso agregar trabajador colaborador registrar crear" },
  { m: "contrataciones", k: "colaboradores", t: "Buscar colaborador", d: "Ver o modificar una ficha y cambiar su estado (licencia, desvinculado).", kw: "buscar ficha rut nombre editar modificar estado licencia desvincular reactivar trabajador ver" },
  { m: "contrataciones", k: "incompletas", t: "Fichas por completar", d: "Fichas guardadas como borrador a las que les faltan datos.", kw: "incompleta borrador pendiente completar" },
  { m: "capacitaciones", k: "asignar", t: "Asignar capacitación a un trabajador", d: "Elegir un trabajador y el área en que se debe capacitar, con prueba de evaluación.", kw: "anadir agregar otra nueva prueba evaluacion examen area trabajador capacitar inscribir asignar individual" },
  { m: "capacitaciones", k: "masiva", t: "Asignación masiva", d: "Asignar una o varias capacitaciones a muchos trabajadores a la vez.", kw: "masivo masiva grupo grupos varios todos cuadrilla especialidad departamento inscribir asignar" },
  { m: "capacitaciones", k: "resultados", t: "Registrar asistencia y notas", d: "Al terminar una capacitación: asistencia, nota de la prueba y aprobación.", kw: "prueba nota notas aprobado reprobado asistencia resultado evaluacion examen terminar" },
  { m: "capacitaciones", k: "historialcap", t: "Capacitaciones de un trabajador", d: "Todo lo que ha realizado un trabajador, con notas y certificaciones.", kw: "historial trabajador ver capacitaciones notas tiene realizado" },
  { m: "capacitaciones", k: "certificaciones", t: "Certificaciones y vencimientos", d: "Vigentes, por vencer y vencidas; inscribir para renovar.", kw: "certificado certificacion vence vencida alerta renovar vigencia" },
  { m: "capacitaciones", k: "matriz", t: "Matriz de competencias", d: "Quién está habilitado para trabajar en obra según su especialidad.", kw: "competencias habilitado habilitacion obra matriz" },
  { m: "capacitaciones", k: "necesidades", t: "Necesidades según clientes", d: "Trabajadores con calificaciones de servicio bajas.", kw: "calificacion cliente encuesta umbral necesidad detectar baja" },
  { m: "capacitaciones", g: "Planificación", k: "catalogo", t: "Plan anual (catálogo)", d: "Crear, modificar o dar de baja capacitaciones del año.", kw: "catalogo plan anual crear nueva capacitacion modificar baja empresa obligatoria" },
  { m: "capacitaciones", g: "Planificación", k: "programacion", t: "Fechas y horarios", d: "Programar sesiones y ver el calendario.", kw: "programar fecha horario calendario sesion lugar capacitador" },
  { m: "capacitaciones", g: "Planificación", k: "inscripciones", t: "Inscritos por capacitación", d: "Inscritos y cupos de una capacitación; anular inscripciones.", kw: "inscritos cupos anular inscripcion lista" },
  { m: "capacitaciones", g: "Configuración", k: "empresas", t: "Empresas capacitadoras", d: "Empresas u OTEC que dictan las capacitaciones.", kw: "empresa otec proveedor" },
  { m: "capacitaciones", g: "Configuración", k: "capacitadores", t: "Capacitadores", d: "Relatores que dictan las sesiones.", kw: "capacitador relator profesor instructor" },
  { m: "capacitaciones", g: "Configuración", k: "tipos", t: "Áreas de capacitación", d: "Tipos o áreas: altura, PVC, aluminio, seguridad…", kw: "tipo tipos area areas" },
  { m: "bonificaciones", k: "importar", t: "1. Importar encuestas", d: "Traer las encuestas de servicio del mes desde el sistema actual.", kw: "importar encuestas lote cargar paso" },
  { m: "bonificaciones", k: "calculo", t: "2. Calcular bonificación", d: "Calcular el monto de cada trabajador según la calificación del cliente.", kw: "calcular calculo bonificacion bono monto paso" },
  { m: "bonificaciones", k: "aprobacion", t: "3. Aprobar y registrar pago", d: "Aprobar o rechazar el cálculo y registrarlo para pago.", kw: "aprobar rechazar pago pagar registrar paso bono bonificacion remuneraciones" },
  { m: "bonificaciones", g: "Consultas", k: "calificaciones", t: "Calificaciones de un trabajador", d: "Notas de los clientes en los proyectos de un trabajador.", kw: "calificaciones notas cliente trabajador encuesta" },
  { m: "bonificaciones", g: "Consultas", k: "historicobon", t: "Histórico de bonificaciones", d: "Bonificaciones aprobadas por trabajador y período.", kw: "historico historial bonificaciones pagadas" },
  { m: "bonificaciones", g: "Configuración", k: "regla", t: "Regla de cálculo (tramos)", d: "Tramos de calificación y monto por proyecto.", kw: "regla tramos montos parametrizar" },
  { m: "reportes", k: "rep:contratacion", t: "Reporte de colaboradores nuevos", d: "Ingresos de un período, exportable a Excel o PDF.", kw: "reporte informe colaboradores nuevos contratacion ingresos excel pdf" },
  { m: "reportes", k: "rep:bonificacion", t: "Reporte de bonificaciones", d: "Bonificaciones aprobadas con subtotales por departamento.", kw: "reporte informe bonificaciones excel pdf" },
  { m: "reportes", k: "rep:capacitacion", t: "Reporte de capacitaciones", d: "Realizadas versus ofertadas, aprobados y notas.", kw: "reporte informe capacitaciones ejecucion excel pdf" },
  { m: "reportes", k: "matriz", t: "Matriz de competencias", d: "Habilitación de los trabajadores de obra.", kw: "matriz competencias" },
  { m: "admin", k: "cuentas", t: "Cuentas de usuario", d: "Crear, desbloquear o deshabilitar cuentas.", kw: "cuenta usuario clave contrasena desbloquear crear" },
  { m: "admin", k: "perfiles", t: "Perfiles y permisos", d: "Qué puede hacer cada perfil.", kw: "perfil permisos acceso rol" },
  { m: "admin", k: "bitacora", t: "Bitácora de auditoría", d: "Registro de accesos y cambios.", kw: "bitacora auditoria registro log" },
];
const vistaDe = k => (k === "nueva" ? "ficha" : k.startsWith("rep:") ? "reporte" : k);
const accionOk = a => !!VIEWS[vistaDe(a.k)] && permisoVista(vistaDe(a.k), { key: a.k, params: { nueva: a.k === "nueva", tipo: a.k.slice(4) } }) && (!a.perm || puede(a.perm));
const accionesDe = m => ACC.filter(a => a.m === m && accionOk(a));
/* búsqueda de acciones por palabras (sin tildes, por prefijo) */
function buscarAcciones(q) {
  const ws = U.norm(q).split(/[^a-z0-9ñ]+/).filter(w => w.length > 1);
  if (!ws.length) return [];
  const vistos = new Set();
  return ACC.filter(a => accionOk(a)).map(a => {
    const tt = U.norm(a.t), txt = (tt + " " + U.norm(a.d) + " " + a.kw).split(/[^a-z0-9ñ]+/);
    let sc = 0, n = 0; for (const w of ws) { const hit = txt.some(x => x.startsWith(w) || (w.length > 3 && x.startsWith(w.slice(0, -1)))); if (!hit) continue; n++; sc += tt.includes(w.slice(0, 4)) ? 2 : 1; }
    return n && n >= Math.max(1, ws.length - 1) ? { a, sc: n * 10 + sc } : null;
  }).filter(Boolean).sort((x, y) => y.sc - x.sc).map(x => x.a).filter(a => !vistos.has(a.k) && vistos.add(a.k)).slice(0, 8);
}
const accHtml = (a, on) => `<button class="acc ${on ? "on" : ""}" data-acc="${E(a.k)}"><b>${E(a.t)}</b><span>${E(MODS.find(m => m.k === a.m).t)} · ${E(a.d)}</span></button>`;
const sinAcciones = `<p class="muted" style="margin:6px 2px">No se encontró una función con esas palabras. Pruebe con otra, por ejemplo «capacitación», «ficha» o «pago».</p>`;
function paleta() {
  if (!ST.user || $(".veil")) return;
  let res = [], sel = 0;
  dialog({ title: "¿Qué desea hacer? — SGRH Instalum", icon: null, wide: true, buttons: [{ label: "Cerrar" }],
    html: `<input type="text" id="paQ" placeholder="Escriba lo que necesita: asignar capacitación, prueba, nueva ficha, pago…" style="height:32px;font-size:14px" maxlength="60"><div id="paR" class="acc-res" style="margin-top:8px"></div>`,
    mount: v => {
      const q = $("#paQ", v), r = $("#paR", v);
      const go = a => { v._close(null); abrir(a.k); };
      const pinta = () => {
        res = q.value.trim() ? buscarAcciones(q.value) : ACC.filter(accionOk).filter((a, i, l) => l.findIndex(x => x.k === a.k) === i).slice(0, 8);
        sel = Math.min(sel, Math.max(0, res.length - 1));
        r.innerHTML = res.length ? res.map((a, i) => accHtml(a, i === sel)).join("") : sinAcciones;
        $$("[data-acc]", r).forEach((b, i) => b.onclick = () => go(res[i]));
      };
      q.oninput = () => { sel = 0; pinta(); };
      q.onkeydown = e => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, Math.min(res.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); pinta(); }
        if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (res[sel]) go(res[sel]); }
      };
      pinta(); setTimeout(() => q.focus(), 0);
    } });
}
function abrirApp() {
  $("#login").classList.add("hidden"); $("#login").innerHTML = "";
  const A = $("#app"); A.classList.remove("hidden");
  A.innerHTML = `
  <div class="titlebar"><span class="logo"></span><span class="t" id="tTitle"></span><button class="wb" title="Minimizar" tabindex="-1">—</button><button class="wb" title="Maximizar" tabindex="-1">☐</button><button class="wb x" id="wClose" title="Cerrar sesión">✕</button></div>
  <nav class="menubar" id="menubar"></nav>
  <div class="toolbar" id="toolbar"></div>
  <div class="main"><aside class="navpane"><div class="hd">Navegación</div><ul class="tree" id="tree"></ul></aside>
    <section class="right"><div class="doctabs" id="doctabs"></div><div class="work" id="work"></div></section></div>
  <footer class="statusbar"><span id="sMsg">Listo</span><span id="sUser"></span><span>Base: ${E(ST.base)}</span><span>${DB.persistente ? "Conectado" : "Conectado · datos solo en memoria"}</span><span id="sClock"></span></footer>`;
  $("#wClose").onclick = () => cerrarSesion();
  ST.modCerrados = new Set();
  buildToolbar(); reloj(); actividad();
  abrir("panel");
}
async function cerrarSesion(porInactividad) {
  if (!ST.user) return;
  if (porInactividad !== true) {
    const sucios = ST.tabs.filter(t => t.dirty);
    if (!await confirmar("¿Cerrar la sesión?", sucios.length ? `<p>Hay ${sucios.length} documento(s) con cambios sin guardar que se perderán.</p>` : "<p>Volverá a la pantalla de inicio de sesión.</p>")) return;
  }
  DB.log(ST.user.user, "Seguridad", "Cierre de sesión", porInactividad === true ? "Automático por 15 minutos de inactividad" : "Manual");
  pantallaLogin(porInactividad === true ? "La sesión se cerró automáticamente por 15 minutos de inactividad." : "");
}
let actividadLista = false;
function actividad() {
  const reset = () => { clearTimeout(ST.timer); if (ST.user) ST.timer = setTimeout(() => cerrarSesion(true), (window.SGRH_INACTIVIDAD_MS || 15 * 60000)); };
  if (!actividadLista) { ["mousedown", "keydown", "wheel", "touchstart"].forEach(ev => document.addEventListener(ev, reset, { passive: true })); actividadLista = true; }
  reset();
}
function setStatus(t) { const s = $("#sMsg"); if (s) s.textContent = t; }

/* ---------- menú superior (se reconstruye en cada acción: permisos vigentes, RF-SEG-03) ---------- */
function buildMenu() {
  const M = [
    ["Archivo", [["Inicio", () => abrir("panel")], ["¿Qué desea hacer?…", paleta, "Ctrl+K"], ["Cerrar documento", () => cerrarTab(ST.active), "Ctrl+Q"], null, ["Imprimir…", () => window.print(), "Ctrl+P"], null, ["Cerrar sesión", () => cerrarSesion()],
      ["Salir", async () => { if (await confirmar("¿Desea salir de SGRH Instalum?", "<p>Se cerrará la sesión y la aplicación.</p>")) { DB.log(ST.user.user, "Seguridad", "Cierre de sesión", "Salida de la aplicación"); apagado(); } }]]],
    ["Edición", [["Guardar", () => tool("guardar"), "F2"], ["Deshacer cambios", () => tool("deshacer")]]],
    ...MODS.map(m => [m.k === "contrataciones" ? "Colaboradores" : m.t, (() => { const its = []; let g; for (const a of ACC.filter(a => a.m === m.k)) { if (a.g !== g && its.length) its.push(null); g = a.g; its.push([a.t, () => abrir(a.k), a.k === "nueva" ? "Ctrl+Alt+N" : "", null, !accionOk(a)]); } return its; })()]),
    ["Ventana", [["Cerrar todos los documentos", async () => { for (const t of [...ST.tabs]) if (t.key !== "panel") { if (!await cerrarTab(t.key)) break; } }]]],
    ["Ayuda", [["Ayuda de esta pantalla", ayudaPantalla, "F1"], ["Trazabilidad de requisitos", () => abrir("trazabilidad")], ["Atajos de teclado", atajos], null, ["Restablecer datos de demostración", reiniciarDemo], ["Acerca de SGRH Instalum", acerca]]],
  ];
  const ok = p => !p || (Array.isArray(p) ? p.some(puede) : puede(p));
  const mb = $("#menubar"); if (!mb) return;
  mb.innerHTML = M.map(([t, its], i) => `<div class="mi" data-m="${i}"><button tabindex="-1">${t}</button><div class="drop">${its.map((x, j) => x ? `<button data-j="${j}" ${(x[3] && !ok(x[3])) || x[4] ? "disabled" : ""}>${x[0]}<span class="k">${x[2] || ""}</span></button>` : "<hr>").join("")}</div></div>`).join("");
  let abierto = null;
  const cerrar = () => { $$(".mi", mb).forEach(m => m.classList.remove("open")); abierto = null; };
  $$(".mi", mb).forEach(mi => {
    const b = mi.querySelector("button");
    b.onclick = e => { e.stopPropagation(); const o = mi.classList.contains("open"); cerrar(); if (!o) { mi.classList.add("open"); abierto = mi; } };
    b.onmouseenter = () => { if (abierto && abierto !== mi) { cerrar(); mi.classList.add("open"); abierto = mi; } };
    $$(".drop button", mi).forEach(x => x.onclick = e => { e.stopPropagation(); cerrar(); M[+mi.dataset.m][1][+x.dataset.j][1](); });
  });
  document.onclick = cerrar;
}
function atajos() { dialog({ head: "Atajos de teclado", html: "<ul><li><b>F1</b> · Ayuda de la pantalla actual</li><li><b>F2</b> · Guardar el documento activo</li><li><b>Ctrl + K</b> · Buscar una función («¿Qué desea hacer?»)</li><li><b>Ctrl + Alt + N</b> · Nueva ficha de colaborador</li><li><b>Ctrl + Q</b> · Cerrar el documento activo</li><li><b>Enter</b> · Abrir el registro seleccionado o confirmar un mensaje</li><li><b>Esc</b> · Cerrar un mensaje</li><li><b>↑ ↓</b> · Moverse en las listas</li></ul>" }); }
function acerca() { dialog({ head: "SGRH Instalum · versión 1.0 (prototipo funcional)", html: "<p>Sistema de Gestión de Recursos Humanos para Instalum.</p><p>Grupo 1 · Ingeniería de Requisitos (RQY1101) · Duoc UC.<br>Product Owner: Carolina Vial Martín · Scrum Master: Benjamín Parra.<br>Development Team: David Martínez, Rafael Cornejo y Benjamín Rojas.</p><p class='muted small'>Los datos se guardan en este navegador. Nombres, RUT, proyectos y montos son ficticios. El sistema informático actual de Instalum (encuestas de servicio) y el correo se simulan dentro del prototipo.</p>" }); }
async function reiniciarDemo() {
  if (!await confirmar("¿Restablecer los datos de demostración?", "<p>Se borrarán las fichas, capacitaciones, cálculos, cuentas y bitácora creadas en este navegador y se cargarán los datos iniciales. Se cerrará la sesión.</p>")) return;
  DB.reiniciar(); pantallaLogin("Se restablecieron los datos de demostración.");
}
function ayudaPantalla() {
  const tab = ST.tabs.find(t => t.key === ST.active); if (!tab) return;
  const h = HELP[tab.view === "modulo" ? tab.params.mod : tab.view] || HELP.general;
  DB.log(ST.user.user, "Ayuda", "Consulta de ayuda", h.t);
  dialog({ title: "Ayuda — SGRH Instalum", icon: "info", wide: true, head: "Ayuda · " + h.t, html: h.html + `<p class="muted small" style="margin-top:12px">Los datos ingresados en la pantalla se conservan al cerrar la ayuda. RF-SEG-05.</p>` });
}

/* ---------- barra de herramientas ---------- */
const TOOLS = [["inicio", "Inicio"], null, ["nuevo", "Nuevo"], ["guardar", "Guardar"], ["deshacer", "Deshacer"], null, ["buscar", "Buscar"], ["imprimir", "Imprimir"], ["exportar", "Exportar"], null, ["ayuda", "Ayuda"], ["cerrar", "Cerrar"]];
function buildToolbar() {
  const tb = $("#toolbar");
  tb.innerHTML = TOOLS.map(t => t ? `<button class="tool ${t[0] === "cerrar" ? "red" : ""}" data-t="${t[0]}" title="${t[1]}${t[0] === "ayuda" ? " (F1)" : t[0] === "guardar" ? " (F2)" : ""}" tabindex="-1"><svg viewBox="0 0 24 24"><path d="${ICON[t[0]]}"/></svg>${t[1]}</button>` : `<span class="tsep"></span>`).join("");
  tb.insertAdjacentHTML("beforeend", `<button class="tsearch" id="tbQ" title="Buscar una función (Ctrl+K)"><svg viewBox="0 0 24 24"><path d="${ICON.buscar}"/></svg><span>¿Qué desea hacer?</span><kbd>Ctrl+K</kbd></button>`);
  $("#tbQ").onclick = paleta;
  $$(".tool", tb).forEach(b => b.onclick = () => tool(b.dataset.t));
}
function toolsDe(tab) { const v = tab && VIEWS[tab.view]; let T = {}; try { T = (v && v.tools ? v.tools(tab) : {}) || {}; } catch (e) { console.error(e); } return T; }
function syncTools() {
  const tab = ST.tabs.find(t => t.key === ST.active), T = toolsDe(tab);
  $$(".tool").forEach(b => { const k = b.dataset.t; b.disabled = !(k === "inicio" || k === "cerrar" || k === "imprimir" || k === "ayuda" || T[k]); });
}
function tool(k) {
  const tab = ST.tabs.find(t => t.key === ST.active); if (!tab) return;
  const T = toolsDe(tab);
  if (k === "inicio") return abrir("panel");
  if (k === "cerrar") return cerrarTab(tab.key);
  if (k === "ayuda") return ayudaPantalla();
  if (k === "imprimir" && !T.imprimir) return window.print();
  if (k === "guardar" && document.activeElement && document.activeElement.blur && $("#work").contains(document.activeElement)) document.activeElement.blur();
  if (T[k]) T[k]();
}
document.addEventListener("keydown", e => {
  if (!ST.user || $(".veil")) return;
  if (e.key === "F1") { e.preventDefault(); ayudaPantalla(); }
  if (e.key === "F2") { e.preventDefault(); tool("guardar"); }
  if (e.ctrlKey && e.altKey && (e.key === "n" || e.key === "N")) { e.preventDefault(); if (puede("contrataciones.editar")) abrir("nueva"); }
  if (e.ctrlKey && !e.altKey && (e.key === "q" || e.key === "Q")) { e.preventDefault(); cerrarTab(ST.active); }
  if (e.ctrlKey && !e.altKey && (e.key === "k" || e.key === "K")) { e.preventDefault(); paleta(); }
});
window.addEventListener("beforeunload", e => { if (ST.user && ST.tabs.some(t => t.dirty)) { e.preventDefault(); e.returnValue = ""; } });

/* ---------- navegador, pestañas y despacho de vistas ---------- */
function permisoVista(view, tab) {
  const v = VIEWS[view]; if (!v || !v.permiso) return true;
  const p = typeof v.permiso === "function" ? v.permiso(tab) : v.permiso;
  return Array.isArray(p) ? p.some(puede) : puede(p);
}
function itemOn(tab, k) {
  if (!tab) return false;
  if (tab.key === k) return true;
  if (k === "nueva") return tab.key.startsWith("nueva-");
  if (k === "colaboradores") return tab.view === "ficha" && !tab.key.startsWith("nueva-");
  if (k === "historialcap") return tab.view === "historialcap";
  return false;
}
function arbol() {
  const tab = ST.tabs.find(t => t.key === ST.active);
  let h = `<li><button class="${itemOn(tab, "panel") ? "on" : ""}" data-k="panel">⌂&nbsp; Inicio</button></li>`;
  for (const m of MODS) {
    const items = accionesDe(m.k);
    if (!items.length) continue;
    const abiertoMod = !ST.modCerrados.has(m.k);
    h += `<li><button class="mod" data-mod="${m.k}" style="--mc:${m.c}">${abiertoMod ? "▾" : "▸"}&nbsp; ${m.t}</button>`;
    if (abiertoMod) { let g; h += `<ul class="tree sub">${items.map(a => { const hd = a.g && a.g !== g ? `<li class="tg">${E(a.g)}</li>` : ""; g = a.g; return hd + `<li><button class="${itemOn(tab, a.k) ? "on" : ""}" data-k="${a.k}" title="${E(a.d)}">${E(a.t)}</button></li>`; }).join("")}</ul>`; }
    h += "</li>";
  }
  $("#tree").innerHTML = h;
  $$("#tree [data-k]").forEach(b => b.onclick = () => abrir(b.dataset.k));
  $$("#tree [data-mod]").forEach(b => b.onclick = () => { const k = b.dataset.mod; if (ST.modCerrados.has(k)) ST.modCerrados.delete(k); else ST.modCerrados.add(k); arbol(); });
}
function abrir(key, params = {}) {
  if (!ST.user) return;
  let tab = ST.tabs.find(t => t.key === key);
  if (!tab) {
    let view = key;
    if (key === "nueva") { key = "nueva-" + Date.now(); view = "ficha"; params = { nueva: true }; }
    else if (/^COL-\d{6}$/.test(key)) { view = "ficha"; params = Object.assign({ id: key }, params); }
    else if (key.startsWith("rep:")) { view = "reporte"; params = { tipo: key.slice(4) }; }
    else if (key.startsWith("histcap:")) { view = "historialcap"; params = { ficha: key.slice(8) }; }
    const v = VIEWS[view];
    if (!v) return;
    const tmp = { key, view, params };
    if (!permisoVista(view, tmp)) { aviso("Acceso no permitido", "<p>Su perfil no tiene permiso para esta función.</p>", "warn"); return; }
    tab = { key, view, params, title: "", dirty: false };
    try { v.init && v.init(tab); } catch (e) { console.error(e); aviso("No se pudo abrir", `<p>${E(e.message)}</p>`, "err"); return; }
    ST.tabs.push(tab);
  } else if (params && Object.keys(params).length) { Object.assign(tab.params, params); const vv = VIEWS[tab.view]; if (vv.reparam) vv.reparam(tab); else if (vv.init) vv.init(tab, true); }
  ST.active = tab.key;
  const ac = ACC.find(a => accionOk(a) && itemOn(tab, a.k)); if (ac) ST.modCerrados.delete(ac.m);
  pintar();
}
async function cerrarTab(key) {
  const i = ST.tabs.findIndex(t => t.key === key); if (i < 0) return true;
  const t = ST.tabs[i];
  if (t.dirty && !await confirmar("¿Cerrar sin guardar?", `<p>«${E(t.title)}» tiene cambios sin guardar que se perderán.</p>`, "Cerrar sin guardar", "Volver")) return false;
  ST.tabs.splice(i, 1);
  if (ST.active === key) ST.active = (ST.tabs[i - 1] || ST.tabs[0] || {}).key || null;
  if (!ST.tabs.length) { abrir("panel"); return true; }
  pintar(); return true;
}
function pintar() {
  if (!ST.user) return;
  DB.guardar();
  /* el perfil o la cuenta pudieron cambiar con la sesión abierta (RF-SEG-02 y RF-SEG-03) */
  const u = DB.usuario(ST.user.user);
  if (!u || u.estado !== "Habilitada") { DB.log(ST.user.user, "Seguridad", "Cierre de sesión", "Cuenta deshabilitada o bloqueada durante la sesión"); return pantallaLogin("Su cuenta fue deshabilitada. Contacte a Recursos Humanos."); }
  ST.user = u;
  const sUser = $("#sUser"); if (sUser) sUser.textContent = `Usuario: ${u.user} (${u.perfil})`;
  ST.tabs = ST.tabs.filter(t => t.key === "panel" || permisoVista(t.view, t));
  if (!ST.tabs.find(t => t.key === ST.active)) { ST.active = (ST.tabs[0] || {}).key; if (!ST.active) return abrir("panel"); }
  const tab = ST.tabs.find(t => t.key === ST.active), v = VIEWS[tab.view];
  buildMenu();
  try { tab.title = v.title(tab); } catch (e) { tab.title = tab.key; }
  $("#tTitle").textContent = `SGRH Instalum  —  ${v.mod ? v.mod(tab) + "  —  " : ""}[${tab.title}]`;
  $("#doctabs").innerHTML = ST.tabs.map(t => `<div class="dtab ${t.key === ST.active ? "on" : ""}" data-k="${E(t.key)}"><span>${E(t.title || "…")}${t.dirty ? " *" : ""}</span><button class="cx" data-c="${E(t.key)}" title="Cerrar" tabindex="-1">×</button></div>`).join("");
  $$("#doctabs .dtab").forEach(d => d.onclick = e => { if (e.target.dataset.c) return; guardarScroll(); ST.active = d.dataset.k; pintar(); });
  $$("#doctabs [data-c]").forEach(b => b.onclick = () => cerrarTab(b.dataset.c));
  const w = $("#work");
  let html;
  try { html = v.render(tab); } catch (e) { console.error(e); html = `<div class="bar err"><b class="ic">✕</b><span>Error al mostrar la pantalla: ${E(e.message)}</span></div>`; }
  w.innerHTML = html + `<div class="trace">${E(v.hu ? v.hu(tab) : "")}</div>`;
  w.scrollTop = tab.scroll || 0;
  try { v.mount && v.mount(w, tab); } catch (e) { console.error(e); }
  arbol(); syncTools(); setStatus(tab.msg || "Listo"); tab.msg = "";
}
function guardarScroll() { const t = ST.tabs.find(t => t.key === ST.active), w = $("#work"); if (t && w) t.scroll = w.scrollTop; }
function marcarSucio(tab, s = true) { if (tab.dirty !== s) { tab.dirty = s; $$("#doctabs .dtab").forEach(d => { if (d.dataset.k === tab.key) d.firstElementChild.textContent = tab.title + (s ? " *" : ""); }); } syncTools(); }
function cerrarTabSinPreguntar(tab) { const i = ST.tabs.indexOf(tab); if (i >= 0) ST.tabs.splice(i, 1); }

/* ---------- lista genérica con orden y paginación ---------- */
function listview({ cols, rows, sel, sort, pageSize = 0, page = 0, empty = "Sin resultados.", cls = "" }) {
  let rs = rows.slice();
  if (sort && sort.k != null) { const c = cols.find(c => c.k === sort.k); if (c) { const val = r => { const x = c.sortv ? c.sortv(r) : r[c.k]; return x == null ? "" : typeof x === "string" ? U.norm(x) : x; }; rs.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * (sort.dir || 1)); } }
  const total = rs.length, pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1; page = Math.max(0, Math.min(page || 0, pages - 1));
  const vis = pageSize ? rs.slice(page * pageSize, page * pageSize + pageSize) : rs;
  const html = `<div class="lv-wrap"><table class="lv ${cls}"><thead><tr>${cols.map(c => `<th class="${c.nosort ? "" : "sort"} ${c.num ? "num" : ""}" data-s="${c.k}" style="${c.w ? "width:" + c.w + "px" : ""}">${E(c.t)}${sort && sort.k === c.k ? (sort.dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead>
    <tbody>${vis.length ? vis.map(r => `<tr data-id="${E(r._id)}" class="${r._id === sel ? "sel" : ""} ${r._cls || ""}">${cols.map(c => `<td class="${c.num ? "num" : ""}">${c.f ? c.f(r) : E(r[c.k])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cols.length}" class="empty">${E(empty)}</td></tr>`}</tbody></table></div>`;
  return { html, total, pages, page, from: total ? page * (pageSize || total) + 1 : 0, to: pageSize ? Math.min(total, page * pageSize + pageSize) : total, rows: rs };
}
function bindList(root, tab, { onOpen, onSelect } = {}) {
  $$("th.sort", root).forEach(th => th.onclick = () => { const k = th.dataset.s; tab.sort = { k, dir: tab.sort && tab.sort.k === k ? -tab.sort.dir : 1 }; guardarScroll(); pintar(); });
  $$("tbody tr[data-id]", root).forEach(tr => {
    tr.onclick = e => { if (e.target.closest("input,button,select,a")) return; tab.sel = tr.dataset.id; $$("tbody tr", tr.closest("tbody")).forEach(x => x.classList.toggle("sel", x === tr)); syncTools(); onSelect && onSelect(tr.dataset.id); };
    tr.ondblclick = e => { if (e.target.closest("input,button,select,a")) return; onOpen && onOpen(tr.dataset.id); };
  });
  $$(".lv-wrap", root).forEach(wrap => { wrap.tabIndex = 0; wrap.onkeydown = e => {
    if (!["ArrowDown", "ArrowUp", "Enter"].includes(e.key) || e.target !== wrap) return; e.preventDefault();
    if (e.key === "Enter") return tab.sel && onOpen && onOpen(tab.sel);
    const trs = $$("tbody tr[data-id]", wrap); let i = trs.findIndex(t => t.dataset.id === tab.sel); i = Math.max(0, Math.min(trs.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    if (trs[i]) { trs[i].click(); trs[i].scrollIntoView({ block: "nearest" }); }
  }; });
}
const pager = (lv, extra = "Doble clic o Enter para abrir") => `<div class="pager"><span>${lv.total ? `Mostrando ${lv.from} a ${lv.to} de ${lv.total}` : "Sin resultados"}${extra ? " · " + extra : ""}</span>${lv.pages > 1 ? `<span class="pg"><button data-p="0" ${lv.page === 0 ? "disabled" : ""}>|◂</button><button data-p="${lv.page - 1}" ${lv.page === 0 ? "disabled" : ""}>◂</button><span>&nbsp;Página ${lv.page + 1} de ${lv.pages}&nbsp;</span><button data-p="${lv.page + 1}" ${lv.page >= lv.pages - 1 ? "disabled" : ""}>▸</button><button data-p="${lv.pages - 1}" ${lv.page >= lv.pages - 1 ? "disabled" : ""}>▸|</button></span>` : ""}</div>`;
const bindPager = (root, tab) => $$(".pg [data-p]", root).forEach(b => b.onclick = () => { tab.page = +b.dataset.p; pintar(); });
const opts = (arr, sel, vacio) => (vacio != null ? `<option value="">${E(vacio)}</option>` : "") + arr.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${E(v)}" ${String(v) === String(sel) ? "selected" : ""}>${E(t)}</option>`; }).join("");
/* buscador con foco persistente tras repintar */
function bindBuscador(input, tab, campo, delay = 250) {
  let t; input.oninput = e => { tab.f[campo] = e.target.value; clearTimeout(t); t = setTimeout(() => { tab.page = 0; pintar(); const q = $(`#${input.id}`); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, delay); };
}
/* filtro de RUT: solo números, puntos, guion y K (RF-CON-02 criterio 3) */
function filtroRut(inp) {
  inp.addEventListener("beforeinput", e => { if (e.data && /[^0-9kK.\-]/.test(e.data)) e.preventDefault(); });
  inp.addEventListener("input", () => { const v = inp.value.replace(/[^0-9kK.\-]/g, ""); if (v !== inp.value) inp.value = v; });
}
const selFicha = (id, fichas, vacio = "Seleccione…") => `<select id="${id}">${opts(fichas.map(f => [f.id, `${f.id} · ${FICHA.nombre(f)}`]), "", vacio)}</select>`;
