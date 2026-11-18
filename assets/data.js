/* SGRH Instalum · datos de demostración, reglas de negocio y almacenamiento local */
"use strict";

/* ====================================================================== */
/*  Utilidades                                                            */
/* ====================================================================== */
const U = {
  esc: s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  pad: (n, l = 2) => String(n).padStart(l, "0"),
  iso(d) { return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`; },
  hoy() { return U.iso(new Date()); },
  anio() { return new Date().getFullYear(); },
  ahora() { const d = new Date(); return `${U.pad(d.getDate())}-${U.pad(d.getMonth() + 1)}-${d.getFullYear()} ${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`; },
  fecha(iso) { if (!iso) return ""; const [y, m, d] = String(iso).slice(0, 10).split("-"); return d ? `${d}-${m}-${y}` : iso; },
  sumarDias(iso, n) { const d = new Date(iso + "T12:00"); d.setDate(d.getDate() + n); return U.iso(d); },
  sumarMeses(iso, n) { const d = new Date(iso + "T12:00"), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return U.iso(d); },
  dias(a, b) { return Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / 86400000); },
  edad(iso) { if (!iso) return 0; const n = new Date(iso + "T00:00"), h = new Date(); let e = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) e--; return e; },
  periodo(offset = 0) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}`; },
  MESES: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  mes(p) { if (!p) return ""; const [y, m] = p.split("-"); const t = U.MESES[+m - 1] + " " + y; return t[0].toUpperCase() + t.slice(1); },
  norm: s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
  pesos: n => "$ " + Math.round(+n || 0).toLocaleString("es-CL"),
  num1: n => (Math.round(n * 10) / 10).toFixed(1).replace(".", ","),
  /* RUT chileno: módulo 11 */
  rutLimpio: r => String(r || "").replace(/[^0-9kK]/g, "").toUpperCase(),
  dv(cuerpo) { let s = 0, m = 2; const c = String(cuerpo); for (let i = c.length - 1; i >= 0; i--) { s += +c[i] * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? "0" : r === 10 ? "K" : String(r); },
  rutFormato(r) { const c = U.rutLimpio(r); if (c.length < 2) return String(r || ""); const b = c.slice(0, -1).replace(/^0+/, ""), d = c.slice(-1); return b.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + d; },
  rutValido(r) { const c = U.rutLimpio(r); if (!/^\d{7,8}[0-9K]$/.test(c)) return false; return U.dv(c.slice(0, -1)) === c.slice(-1); },
  rutDe(cuerpo) { return U.rutFormato(String(cuerpo) + U.dv(cuerpo)); },
  correoValido: c => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(c || "").trim()),
  fonoValido: f => /^\+?56\s?[29]\s?\d{4}\s?\d{4}$/.test(String(f || "").trim()),
  enmascarar(c) { const [u, d] = String(c).split("@"); return u.slice(0, 1) + "*".repeat(Math.max(3, u.length - 1)) + "@" + d; },
  hm: t => { const [h, m] = String(t || "0:0").split(":"); return +h * 60 + +m; },
  rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  clon: o => JSON.parse(JSON.stringify(o)),
};

/* ====================================================================== */
/*  Catálogos                                                             */
/* ====================================================================== */
const CAT = {
  perfiles: ["Jefe de Recursos Humanos", "Colaborador de Contrataciones", "Colaborador de Capacitaciones", "Colaborador de Bonificación", "Gerente y Subgerente"],
  estadosFicha: ["Activo", "Licencia", "Desvinculado"],
  departamentos: ["Construcción", "Administración y Finanzas", "Logística y Bodega", "Comercial", "Recursos Humanos"],
  especialidades: ["Aluminio", "PVC", "Instalación"],
  cargos: ["Instalador", "Instaladora", "Maestro aluminio", "Maestro PVC", "Operaria PVC", "Operaria aluminio", "Operario aluminio", "Ayudante", "Supervisora de obra", "Supervisor de obra", "Bodeguero", "Jefe de bodega", "Administrativa", "Administrativo", "Ejecutivo comercial", "Analista de RR.HH."],
  contratos: ["Indefinido", "Plazo fijo", "Por obra o faena"],
  jornadas: ["Completa · 44 horas", "Parcial · 30 horas", "Part time · 20 horas"],
  nacionalidades: ["Chilena", "Peruana", "Venezolana", "Colombiana", "Haitiana", "Argentina", "Boliviana", "Otra"],
  estadoCivil: ["Soltero/a", "Casado/a", "Conviviente civil", "Divorciado/a", "Viudo/a"],
  comunas: ["Cerrillos", "Estación Central", "La Florida", "Maipú", "Ñuñoa", "Peñalolén", "Providencia", "Pudahuel", "Puente Alto", "Quilicura", "San Bernardo", "Santiago"],
  afp: ["Capital", "Cuprum", "Habitat", "Modelo", "PlanVital", "ProVida", "Uno"],
  salud: ["Fonasa", "Isapre Banmédica", "Isapre Colmena", "Isapre Consalud", "Isapre Cruz Blanca", "Isapre Esencial", "Isapre Nueva Masvida", "Isapre Vida Tres"],
  parentesco: ["Cónyuge", "Pareja", "Padre", "Madre", "Hijo/a", "Hermano/a", "Otro"],
  lugares: ["Planta Maipú · Sala de capacitación 1", "Planta Maipú · Sala de capacitación 2", "Planta Maipú · Patio de maniobras", "Oficina central · Sala de reuniones", "Instalaciones de la empresa capacitadora"],
};

/* Permisos por perfil (RF-SEG-03) */
const PERMISOS = [
  ["contrataciones", "Contrataciones: consultar fichas"],
  ["contrataciones.editar", "Contrataciones: registrar y modificar fichas"],
  ["sensibles", "Ver datos sensibles (sueldo, previsión y salud)"],
  ["capacitaciones", "Capacitaciones: gestionar"],
  ["bonificaciones", "Bonificaciones: importar y calcular"],
  ["bonificaciones.aprobar", "Bonificaciones: aprobar y registrar para pago"],
  ["reportes", "Reportes"],
  ["admin", "Administración: cuentas, perfiles y bitácora"],
];
const PERMISOS_BASE = {
  "Jefe de Recursos Humanos": PERMISOS.map(p => p[0]),
  "Colaborador de Contrataciones": ["contrataciones", "contrataciones.editar", "sensibles"],
  "Colaborador de Capacitaciones": ["contrataciones", "capacitaciones"],
  "Colaborador de Bonificación": ["contrataciones", "bonificaciones", "reportes"],
  "Gerente y Subgerente": ["contrataciones", "reportes"],
};

/* ====================================================================== */
/*  Datos de demostración                                                 */
/* ====================================================================== */
function semilla() {
  const HOY = U.hoy(), Y = U.anio(), R = U.rng(20261110);
  const pick = a => a[Math.floor(R() * a.length)];

  /* ---------- fichas de colaboradores ---------- */
  const F = (n, cuerpo, nombres, apPat, apMat, fnac, cargo, depto, esp, ingreso, estado, x = {}) => ({
    id: "COL-" + U.pad(n, 6), rut: U.rutDe(cuerpo), nombres, apPat, apMat, fnac, nacionalidad: x.nac || "Chilena", estadoCivil: x.ec || "Soltero/a",
    direccion: x.dir || pick(["Av. Pajaritos 2450", "Calle Los Pinos 118", "Pasaje El Roble 77", "Av. Américo Vespucio 3301", "Calle Santa Elena 905"]),
    comuna: x.com || "Maipú", telefono: "+56 9 " + String(cuerpo).slice(1, 5) + " " + String(cuerpo).slice(-4),
    correo: U.norm(nombres.split(" ")[0]) + "." + U.norm(apPat) + "@correo.cl",
    emergencia: x.sinEmerg ? { nombre: "", rut: "", telefono: "", parentesco: "", correo: "" } :
      { nombre: (x.emNom || pick(["María", "Juan", "Rosa", "Pedro", "Carmen"])) + " " + apMat, rut: "", telefono: "+56 9 " + String(cuerpo).slice(-4) + " " + String(cuerpo).slice(2, 6), parentesco: x.emPar || pick(["Madre", "Padre", "Cónyuge", "Hermano/a"]), correo: "" },
    cargo: x.sinCargo ? { cargo: "", departamento: "", especialidad: "", jefatura: "", contrato: "", jornada: "", ingreso, sueldo: "", correoInst: "" } :
      { cargo, departamento: depto, especialidad: esp, jefatura: x.jef || (depto === "Construcción" ? "Andrea Pérez Lagos" : "María González"), contrato: x.contrato || "Indefinido", jornada: "Completa · 44 horas", ingreso, sueldo: x.sueldo || 720000,
        correoInst: U.norm(nombres.split(" ")[0]) + "." + U.norm(apPat) + "@instalum.cl" },
    prevision: x.sinPrev ? { afp: "", salud: "", plan: "", anioInicio: "", seguro: "No", alergias: "" } :
      { afp: x.afp || pick(CAT.afp), salud: x.salud || "Fonasa", plan: x.salud && x.salud !== "Fonasa" ? 3.2 : "", anioInicio: x.ini || String(+fnac.slice(0, 4) + 20), seguro: "No", alergias: "Ninguna declarada" },
    estado, motivoEstado: x.motivo || "", creada: ingreso, creadaPor: x.por || "mgonzalez",
    historial: [{ fecha: U.fecha(ingreso) + " 09:00", usuario: x.por || "mgonzalez", accion: "Registro de ficha", detalle: estado === "Incompleta" ? "Ficha guardada como borrador (incompleta)" : "Ficha creada" }],
  });
  const fichas = [
    F(201, 20336957, "Daniela", "Morales", "Sáez", "2001-04-12", "Ayudante", "Construcción", "Instalación", `${Y}-01-19`, "Activo", { com: "Pudahuel" }),
    F(202, 15443218, "Pablo", "Navarro", "Gil", "1983-09-02", "Jefe de bodega", "Logística y Bodega", "", `${Y}-02-02`, "Activo", { ec: "Casado/a", com: "Quilicura", sueldo: 1150000 }),
    F(203, 19880146, "Carla", "Espinoza", "Ruiz", "1997-01-23", "Operaria aluminio", "Construcción", "Aluminio", `${Y}-03-16`, "Activo", {}),
    F(204, 17556320, "Ignacio", "Vidal", "Pino", "1990-11-30", "Maestro PVC", "Construcción", "PVC", `${Y}-03-30`, "Activo", { ec: "Casado/a", sueldo: 980000, salud: "Isapre Colmena" }),
    F(205, 18777405, "Felipe", "Ramírez", "Toro", "1993-07-08", "Instalador", "Construcción", "Instalación", `${Y}-04-14`, "Activo", { com: "La Florida" }),
    F(206, 16009712, "Rosa", "Contreras", "Lillo", "1986-03-17", "Administrativa", "Administración y Finanzas", "", `${Y}-04-29`, "Activo", { com: "Santiago", sueldo: 850000 }),
    F(207, 14876550, "Luis", "Fernández", "Mora", "1979-12-05", "Bodeguero", "Logística y Bodega", "", `${Y}-05-05`, "Activo", { ec: "Casado/a", com: "Cerrillos" }),
    F(208, 20114365, "Matías", "Herrera", "Silva", "2002-02-19", "Ayudante", "Construcción", "Aluminio", `${Y}-05-20`, "Desvinculado", { motivo: `Término de faena (desde ${U.fecha(U.sumarMeses(HOY, -1))})` }),
    F(209, 15987442, "Andrea", "Pérez", "Lagos", "1985-05-21", "Supervisora de obra", "Construcción", "Instalación", `${Y}-06-03`, "Activo", { jef: "María González", sueldo: 1350000, salud: "Isapre Banmédica" }),
    F(210, 18330774, "Jorge", "Castillo", "Díaz", "1992-10-14", "Instalador", "Construcción", "Instalación", `${Y}-06-18`, "Activo", { com: "San Bernardo" }),
    F(211, 19204118, "Diego", "Soto", "Paredes", "1996-06-27", "Maestro aluminio", "Construcción", "Aluminio", `${Y}-07-01`, "Activo", { sueldo: 940000 }),
    F(212, 16552901, "Patricia", "Muñoz", "Vera", "1988-08-09", "Operaria PVC", "Construcción", "PVC", `${Y}-07-15`, "Licencia", { motivo: `Licencia médica (desde ${U.fecha(U.sumarDias(HOY, -6))})` }),
    F(213, 17221093, "Javiera", "Muñoz", "Soto", "1999-03-03", "", "", "", U.sumarDias(HOY, -8), "Incompleta", { sinCargo: true, por: "prios" }),
    F(214, 18902334, "Tomás", "Fuentes", "Vera", "1995-12-11", "Instalador", "Construcción", "Instalación", U.sumarDias(HOY, -8), "Incompleta", { sinEmerg: true, sinPrev: true, por: "prios" }),
  ];
  const fid = n => "COL-" + U.pad(n, 6);
  const construccion = [201, 203, 204, 205, 209, 210, 211, 212].map(fid);

  /* ---------- usuarios ---------- */
  const usuarios = [
    { user: "User_Prueba", nombre: "María González (usuario de prueba)", correo: "user.prueba@instalum.cl", perfil: "Jefe de Recursos Humanos", clave: "12344", estado: "Habilitada", intentos: 0, claveAnterior: "", debeCambiar: false },
    { user: "prios", nombre: "Pedro Ríos", correo: "pedro.rios@instalum.cl", perfil: "Colaborador de Contrataciones", clave: "Contrata2026", estado: "Habilitada", intentos: 0, claveAnterior: "", debeCambiar: false },
    { user: "cvaldes", nombre: "Carla Valdés", correo: "carla.valdes@instalum.cl", perfil: "Colaborador de Capacitaciones", clave: "Capacita2026", estado: "Habilitada", intentos: 0, claveAnterior: "", debeCambiar: false },
    { user: "brojas", nombre: "Bruno Rojas", correo: "bruno.rojas@instalum.cl", perfil: "Colaborador de Bonificación", clave: "Bonifica2026", estado: "Habilitada", intentos: 0, claveAnterior: "", debeCambiar: false },
    { user: "jmora", nombre: "José Mora", correo: "jose.mora@instalum.cl", perfil: "Colaborador de Bonificación", clave: "Bonifica2025", estado: "Bloqueada", intentos: 3, claveAnterior: "", debeCambiar: false },
    { user: "gerencia", nombre: "Ricardo Lagos", correo: "gerencia@instalum.cl", perfil: "Gerente y Subgerente", clave: "Gerencia2026", estado: "Habilitada", intentos: 0, claveAnterior: "", debeCambiar: false },
    { user: "tnavarro", nombre: "Tamara Navarro", correo: "tamara.navarro@instalum.cl", perfil: "Colaborador de Contrataciones", clave: "Navarro2025", estado: "Deshabilitada", intentos: 0, claveAnterior: "", debeCambiar: false },
  ];

  /* ---------- capacitaciones ---------- */
  const empresas = [
    { rut: U.rutDe(76452118), razon: "Capacita Chile SpA", giro: "Capacitación laboral (OTEC)", contacto: "Paula Vega", telefono: "+56 2 2655 4100", correo: "contacto@capacitachile.cl" },
    { rut: U.rutDe(77210554), razon: "Altura Segura Ltda.", giro: "Capacitación en trabajo en altura", contacto: "Rodrigo Saez", telefono: "+56 2 2731 8800", correo: "cursos@alturasegura.cl" },
    { rut: U.rutDe(76998302), razon: "Instituto Técnico Andes", giro: "Educación técnica", contacto: "Carla Núñez", telefono: "+56 2 2480 1200", correo: "empresas@itandes.cl" },
    { rut: U.rutDe(78115640), razon: "PVC Training S.A.", giro: "Capacitación en sistemas de PVC", contacto: "Felipe Araya", telefono: "+56 2 2911 3030", correo: "info@pvctraining.cl" },
    { rut: U.rutDe(76300927), razon: "Prevención Total Ltda.", giro: "Prevención de riesgos", contacto: "Ignacia Lobos", telefono: "+56 2 2544 7070", correo: "ventas@prevenciontotal.cl" },
  ];
  const E_ = i => empresas[i].rut;
  const capacitadores = [
    { rut: U.rutDe(12884201), nombre: "Rodrigo Saez Lara", especialidad: "Trabajo en altura", empresa: E_(1) },
    { rut: U.rutDe(13552019), nombre: "Paula Vega Ortiz", especialidad: "Prevención de riesgos", empresa: E_(0) },
    { rut: U.rutDe(15020774), nombre: "Felipe Araya Mella", especialidad: "Instalación de PVC", empresa: E_(3) },
    { rut: U.rutDe(14338660), nombre: "Carla Núñez Rivas", especialidad: "Corte y armado de aluminio", empresa: E_(2) },
    { rut: U.rutDe(15664210), nombre: "Javiera Molina Díaz", especialidad: "Primeros auxilios", empresa: E_(0) },
  ];
  const tipos = [
    { nombre: "Seguridad y prevención", descripcion: "Inducción y prevención de riesgos en obra" },
    { nombre: "Trabajo en altura", descripcion: "Uso de arnés, andamios y líneas de vida" },
    { nombre: "Instalación de PVC", descripcion: "Armado, instalación y sellado de ventanas de PVC" },
    { nombre: "Corte y armado de aluminio", descripcion: "Corte de perfiles y armado de ventanas de aluminio" },
    { nombre: "Instalación de ventanas", descripcion: "Instalación de ventanas y puertas en obra" },
    { nombre: "Primeros auxilios", descripcion: "Atención básica de emergencias" },
  ];
  let capN = 0, verN = 0, insN = 0, certN = 0;
  const caps = [], versiones = [], inscripciones = [], certificaciones = [];
  const cap = (anio, nombre, tipo, emp, dias, cupos, obligatoria, especialidades, competencia, vigencia, extra = {}) => {
    capN++; const c = { id: `CAP-${anio}-${U.pad(caps.filter(x => x.anio === anio).length + 1, 3)}`, nombre, tipo, empresa: E_(emp), dias, anio, cupos, obligatoria, especialidades, competencia, vigenciaMeses: vigencia, requiereCert: true, estado: "Publicada", creada: `${anio}-01-10`, historial: [{ fecha: `10-01-${anio} 10:00`, usuario: "cvaldes", detalle: "Creación en el catálogo" }], ...extra };
    caps.push(c); return c;
  };
  const ver = (c, fecha, ini, fin, lugar, capRut, cerrada) => { if (cerrada && fecha >= HOY) fecha = U.sumarDias(HOY, -(12 + verN * 3)); const v = { id: "VER-" + U.pad(++verN, 4), cap: c.id, fecha, inicio: ini, termino: fin, lugar, capacitador: capRut, cerrada: !!cerrada }; versiones.push(v); return v; };
  const ins = (c, v, fichaId, origen, estado, fecha) => { const i = { id: "INS-" + U.pad(++insN, 5), cap: c.id, version: v ? v.id : "", ficha: fichaId, origen, estado, fecha: fecha || (v ? v.fecha : c.creada) }; inscripciones.push(i); return i; };
  const cert = (c, fichaId, emision) => { certificaciones.push({ id: "CER-" + U.pad(++certN, 5), ficha: fichaId, cap: c.id, tipo: c.tipo, competencia: c.competencia, nombre: c.nombre, emision, vence: c.vigenciaMeses ? U.sumarMeses(emision, c.vigenciaMeses) : "" }); };
  const T = (v, lista) => lista.forEach(([n, r]) => { const i = ins(caps.find(c => c.id === v.cap), v, fid(n), "Manual", r); if (r === "Aprobado") cert(caps.find(c => c.id === v.cap), fid(n), v.fecha); });

  /* catálogo del año anterior (certificaciones que vencen o vencieron) */
  const vPvc = U.sumarMeses(U.sumarDias(HOY, 20), -12), vAlu = U.sumarMeses(U.sumarDias(HOY, -6), -12);
  const a1 = Math.min(Y - 1, +U.sumarDias(vPvc, -11).slice(0, 4)), a2 = Math.min(Y - 1, +vAlu.slice(0, 4));
  const k1 = cap(a1, "Instalación de PVC básico", "Instalación de PVC", 3, 2, 12, false, [], "PVC", 12, { creada: `${a1}-01-15` });
  const k2 = cap(a2, "Armado de ventanas de aluminio", "Corte y armado de aluminio", 2, 2, 12, false, [], "Aluminio", 12, { creada: `${a2}-01-15` });
  const k3 = cap(Y - 1, "Instalación de ventanas en obra", "Instalación de ventanas", 2, 3, 15, false, [], "Instalación", 0, { creada: `${Y - 1}-01-15` });
  [k1, k2, k3].forEach(k => k.historial[0].fecha = `15-01-${k.anio} 10:00`);
  const kv1 = ver(k1, vPvc, "09:00", "17:00", CAT.lugares[0], capacitadores[2].rut, true);
  const kv1b = ver(k1, U.sumarDias(vPvc, -11), "09:00", "17:00", CAT.lugares[0], capacitadores[2].rut, true);
  const kv2 = ver(k2, vAlu, "09:00", "17:00", CAT.lugares[2], capacitadores[3].rut, true);
  const kv3 = ver(k3, `${Y - 1}-10-08`, "08:30", "17:30", CAT.lugares[2], capacitadores[3].rut, true);
  T(kv1, [[204, "Aprobado"]]); T(kv1b, [[212, "Aprobado"]]);
  certificaciones.find(c => c.ficha === fid(212)).vence = U.sumarDias(HOY, 9); certificaciones.find(c => c.ficha === fid(212)).emision = U.sumarMeses(U.sumarDias(HOY, 9), -12);
  T(kv2, [[203, "Aprobado"], [211, "Reprobado"]]);
  T(kv3, [[205, "Aprobado"], [210, "Aprobado"], [209, "Aprobado"]]);

  /* catálogo del año en curso */
  const c1 = cap(Y, "Trabajo en altura", "Trabajo en altura", 1, 2, 12, true, ["Instalación"], "Instalación", 24);
  const c2 = cap(Y, "Inducción de seguridad", "Seguridad y prevención", 0, 1, 40, true, ["Aluminio", "PVC", "Instalación"], "", 12);
  const c3 = cap(Y, "Instalación de PVC nivel 1", "Instalación de PVC", 3, 3, 15, true, ["PVC"], "PVC", 36);
  const c4 = cap(Y, "Corte de perfiles de aluminio", "Corte y armado de aluminio", 2, 2, 10, true, ["Aluminio"], "Aluminio", 36);
  const c5 = cap(Y, "Primeros auxilios", "Primeros auxilios", 0, 1, 30, false, [], "", 24);
  const c6 = cap(Y, "Sellado de termopaneles", "Instalación de ventanas", 3, 1, 12, false, [], "PVC", 0);
  const c7 = cap(Y, "Lectura de planos", "Instalación de ventanas", 2, 2, 20, false, [], "", 0);
  const c8 = cap(Y, "Manejo de extintores", "Seguridad y prevención", 4, 1, 25, false, [], "", 0);
  const vd = (m, d) => `${Y}-${U.pad(m)}-${U.pad(d)}`;
  const v2a = ver(c2, vd(3, 10), "09:00", "13:00", CAT.lugares[0], capacitadores[1].rut, true);
  T(v2a, [[201, "Aprobado"], [203, "Aprobado"], [204, "Aprobado"], [205, "Aprobado"], [209, "Aprobado"], [210, "Aprobado"], [211, "Aprobado"], [212, "Aprobado"], [208, "Aprobado"]]);
  const v1a = ver(c1, vd(6, 15), "08:30", "17:30", CAT.lugares[2], capacitadores[0].rut, true);
  T(v1a, [[205, "Aprobado"], [209, "Aprobado"], [210, "Aprobado"], [201, "Reprobado"]]);
  const v3a = ver(c3, vd(7, 20), "09:00", "17:00", CAT.lugares[0], capacitadores[2].rut, true);
  T(v3a, [[204, "Inasistente"], [212, "Reprobado"], [209, "Aprobado"]]);
  const v4a = ver(c4, vd(8, 12), "09:00", "17:00", CAT.lugares[2], capacitadores[3].rut, true);
  T(v4a, [[211, "Aprobado"], [203, "Reprobado"], [208, "Aprobado"]]);
  const v5a = ver(c5, vd(9, 5), "09:00", "14:00", CAT.lugares[3], capacitadores[4].rut, true);
  T(v5a, [[206, "Aprobado"], [202, "Aprobado"], [209, "Aprobado"], [207, "Inasistente"]]);
  /* versiones próximas y una con resultados pendientes */
  const v1b = ver(c1, U.sumarDias(HOY, 7), "08:30", "17:30", CAT.lugares[2], capacitadores[0].rut, false);
  ins(c1, v1b, fid(201), "Asignada automáticamente (obligatoria)", "Inscrito", U.sumarDias(HOY, -2));
  const v4b = ver(c4, U.sumarDias(HOY, 14), "09:00", "17:00", CAT.lugares[2], capacitadores[3].rut, false);
  ins(c4, v4b, fid(203), "Necesidad detectada por calificación", "Inscrito", U.sumarDias(HOY, -1));
  const v6a = ver(c6, U.sumarDias(HOY, -3), "09:00", "13:00", CAT.lugares[1], capacitadores[2].rut, false);
  ins(c6, v6a, fid(204), "Manual", "Inscrito", U.sumarDias(HOY, -10)); ins(c6, v6a, fid(212), "Manual", "Inscrito", U.sumarDias(HOY, -10));
  ver(c5, U.sumarDias(HOY, 21), "09:00", "14:00", CAT.lugares[3], capacitadores[4].rut, false);

  /* ---------- bonificaciones: proyectos y encuestas del sistema de origen ---------- */
  const P = [-3, -2, -1, 0].map(o => U.periodo(o));
  const base = [["Edificio Los Aromos · ventanas PVC", "Inmobiliaria Sur", "PVC"], ["Casa Peñalolén · puertas de aluminio", "Cliente particular", "Aluminio"], ["Oficinas Centro · termopaneles", "Constructora Andes", "PVC"],
    ["Colegio San José · ventanas", "Fundación Educa", "Instalación"], ["Bodega Quilicura · cierres de aluminio", "Logística Norte", "Aluminio"], ["Clínica Maipú · ventanas PVC", "Salud Integral", "PVC"],
    ["Condominio La Florida · ventanales", "Inmobiliaria Cordillera", "Instalación"]];
  const porEsp = { PVC: [204, 212, 209], Aluminio: [203, 211, 208], Instalación: [205, 210, 201, 209] };
  const proyectos = [], fuente = {};
  let encN = 20900;
  P.forEach((per, pi) => {
    const [yy, mm] = per.split("-"); const nProy = pi === 3 ? 4 : 7;
    fuente[per] = { lote: `LOTE-${yy}${mm}`, disponible: true, encuestas: [] };
    for (let i = 0; i < nProy; i++) {
      const [nom, cli, esp] = base[(i + pi) % base.length];
      const pid = `P-${yy.slice(2)}${mm}${U.pad(i + 1)}`;
      let eq = porEsp[esp].map(fid).filter(f => !(f === fid(208) && pi >= 2) && !(f === fid(212) && pi === 3));
      const k = 1 + Math.floor(R() * Math.min(3, eq.length)); eq = eq.slice(0, k);
      if (pi === 2 && i === 4) eq = [];             /* proyecto sin colaboradores asignados (RF-BON-05 criterio 3) */
      if (pi === 2 && i === 1) eq = [fid(211)];      /* proyecto con un solo colaborador (RF-BON-05 criterio 2) */
      if (pi === 2 && i === 0) eq = [fid(204), fid(212), fid(209)]; /* tres colaboradores (RF-BON-05 criterio 1) */
      const fecha = `${per}-${U.pad(3 + i * 3)}`;
      proyectos.push({ id: pid, nombre: nom, cliente: cli, especialidad: esp, periodo: per, fecha, colaboradores: eq });
      const sinEncuesta = pi === 2 && i === 6;       /* proyecto sin evaluación (RF-BON-09) */
      if (!sinEncuesta) {
        const nE = 1 + (R() < 0.35 ? 1 : 0);
        for (let e = 0; e < nE; e++) {
          let cal = Math.round((4.6 + R() * 2.4) * 10) / 10; if (cal > 7) cal = 7;
          fuente[per].encuestas.push({ id: "ENC-" + (++encN), proyecto: pid, cliente: cli, fecha: U.sumarDias(fecha, 4 + e), calificacion: cal });
        }
      }
    }
    if (pi >= 2) { /* encuestas con problemas en el lote (RF-BON-02 y RF-BON-10) */
      fuente[per].encuestas.push({ id: "ENC-" + (++encN), proyecto: "", cliente: "Inmobiliaria Sur", fecha: `${per}-20`, calificacion: 6.1, corregible: { proyecto: proyectos.find(p => p.periodo === per).id } });
      fuente[per].encuestas.push({ id: "ENC-" + (++encN), proyecto: proyectos.filter(p => p.periodo === per)[1].id, cliente: "Cliente particular", fecha: `${per}-21`, calificacion: 9.0, corregible: { calificacion: 6.6 } });
      fuente[per].encuestas.push({ id: "ENC-" + (++encN), proyecto: "P-9999", cliente: "Constructora Andes", fecha: `${per}-22`, calificacion: 5.8 });
      const dup = fuente[per].encuestas[0]; fuente[per].encuestas.push({ ...dup });
    }
  });
  fuente[P[2]].tardia = { id: "ENC-" + (++encN), proyecto: proyectos.filter(p => p.periodo === P[2])[6].id, cliente: base[(6 + 2) % base.length][1], fecha: `${P[2]}-27`, calificacion: 6.4 };

  /* reglas de cálculo versionadas (RF-BON-03) */
  const reglas = [
    { version: 1, desde: P[0], creada: U.fecha(`${P[0]}-01`) + " 09:00", por: "User_Prueba", distribucion: "Partes iguales entre los colaboradores asignados al proyecto",
      tramos: [{ t: "Sin bonificación", desde: 1.0, hasta: 4.9, monto: 0 }, { t: "C", desde: 5.0, hasta: 5.9, monto: 100000 }, { t: "B", desde: 6.0, hasta: 6.4, monto: 160000 }, { t: "A", desde: 6.5, hasta: 7.0, monto: 220000 }] },
    { version: 2, desde: P[1], creada: U.fecha(`${P[1]}-01`) + " 09:00", por: "User_Prueba", distribucion: "Partes iguales entre los colaboradores asignados al proyecto",
      tramos: [{ t: "Sin bonificación", desde: 1.0, hasta: 5.4, monto: 0 }, { t: "C", desde: 5.5, hasta: 5.9, monto: 120000 }, { t: "B", desde: 6.0, hasta: 6.4, monto: 180000 }, { t: "A", desde: 6.5, hasta: 7.0, monto: 250000 }] },
  ];

  const d = {
    v: 2, creado: HOY, seq: 215, fichas, usuarios, bitacora: [], permisos: U.clon(PERMISOS_BASE), correos: [], recordar: "",
    empresas, capacitadores, tipos, capacitaciones: caps, versiones, inscripciones, certificaciones,
    proyectos, fuente, encuestas: [], importaciones: [], reglas, calculos: [], config: { umbral: 5.0, servicio: true }, seqIns: insN, seqVer: verN, seqCert: certN, seqCap: capN,
  };
  /* importación, cálculo, aprobación y pago de los dos períodos anteriores (histórico) */
  BON.importar(d, P[0], "User_Prueba", U.fecha(`${P[1]}-02`) + " 10:00");
  BON.importar(d, P[1], "brojas", U.fecha(`${P[2]}-02`) + " 10:00");
  [[P[0], P[1]], [P[1], P[2]]].forEach(([per, sig]) => {
    const c = BON.calcular(d, per, "brojas", U.fecha(`${sig}-03`) + " 11:00");
    c.estado = "Aprobado"; c.aprobado = { fecha: U.fecha(`${sig}-04`) + " 16:20", por: "User_Prueba" };
    BON.registrarPago(d, c, "User_Prueba", U.fecha(`${sig}-05`) + " 09:15");
  });
  d.bitacora = [
    { fecha: U.fecha(`${P[1]}-02`) + " 10:00", usuario: "User_Prueba", modulo: "Bonificaciones", accion: "Importación de encuestas", detalle: `Lote ${fuente[P[0]].lote}` },
    { fecha: U.fecha(`${P[1]}-04`) + " 16:20", usuario: "User_Prueba", modulo: "Bonificaciones", accion: "Aprobación de cálculo", detalle: U.mes(P[0]) },
    { fecha: U.fecha(`${P[2]}-02`) + " 10:00", usuario: "brojas", modulo: "Bonificaciones", accion: "Importación de encuestas", detalle: `Lote ${fuente[P[1]].lote}` },
    { fecha: U.fecha(`${P[2]}-04`) + " 16:20", usuario: "User_Prueba", modulo: "Bonificaciones", accion: "Aprobación de cálculo", detalle: U.mes(P[1]) },
    { fecha: U.fecha(U.sumarDias(HOY, -8)) + " 08:55", usuario: "prios", modulo: "Contrataciones", accion: "Registro de ficha", detalle: "COL-000213 · Javiera Muñoz Soto (borrador incompleto)" },
    { fecha: U.fecha(U.sumarDias(HOY, -8)) + " 09:02", usuario: "prios", modulo: "Contrataciones", accion: "Registro de ficha", detalle: "COL-000214 · Tomás Fuentes Vera (borrador incompleto)" },
    { fecha: U.fecha(U.sumarDias(HOY, -2)) + " 09:47", usuario: "jmora", modulo: "Seguridad", accion: "Cuenta bloqueada", detalle: "3 intentos fallidos de contraseña" },
  ];
  return d;
}

/* ====================================================================== */
/*  Almacenamiento (localStorage con respaldo en memoria)                 */
/* ====================================================================== */
const DB = {
  KEY: "sgrh-instalum-prototipo-v2",
  d: null, persistente: true,
  cargar() {
    let raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch (e) { raw = null; this.persistente = false; }
    try { this.d = raw ? JSON.parse(raw) : semilla(); } catch (e) { this.d = semilla(); }
    if (!this.d || this.d.v !== 2) this.d = semilla();
    this.guardar();
  },
  guardar() { try { localStorage.setItem(this.KEY, JSON.stringify(this.d)); } catch (e) { this.persistente = false; } },
  reiniciar() { this.d = semilla(); this.guardar(); },
  log(usuario, modulo, accion, detalle) { this.d.bitacora.push({ fecha: U.ahora(), usuario, modulo, accion, detalle }); this.guardar(); },
  usuario(u) { return this.d.usuarios.find(x => x.user.toLowerCase() === String(u || "").trim().toLowerCase()); },
  ficha(id) { return this.d.fichas.find(f => f.id === id); },
  fichaPorRutOId(q) { const t = String(q || "").trim(); if (!t) return null; const up = t.toUpperCase(); if (/^COL-?\d+$/.test(up)) { const n = up.replace(/\D/g, ""); return this.ficha("COL-" + n.padStart(6, "0")); } const r = U.rutLimpio(t); return this.d.fichas.find(f => U.rutLimpio(f.rut) === r) || null; },
  nuevoId() { const id = "COL-" + String(this.d.seq).padStart(6, "0"); this.d.seq++; return id; },
  puede(perfil, permiso) { return (this.d.permisos[perfil] || []).includes(permiso); },
  empresa(rut) { return this.d.empresas.find(e => U.rutLimpio(e.rut) === U.rutLimpio(rut)); },
  capacitador(rut) { return this.d.capacitadores.find(e => U.rutLimpio(e.rut) === U.rutLimpio(rut)); },
  cap(id) { return this.d.capacitaciones.find(c => c.id === id); },
  version(id) { return this.d.versiones.find(v => v.id === id); },
};

/* ====================================================================== */
/*  Reglas de la ficha (RF-CON)                                           */
/* ====================================================================== */
const FICHA = {
  secciones: [
    { k: "personales", t: "Datos personales", req: [["rut", "RUT"], ["nombres", "Nombres"], ["apPat", "Apellido paterno"], ["fnac", "Fecha de nacimiento"], ["nacionalidad", "Nacionalidad"]] },
    { k: "contacto", t: "Contacto", req: [["direccion", "Dirección"], ["comuna", "Comuna"], ["telefono", "Teléfono"], ["correo", "Correo electrónico personal"]] },
    { k: "emergencia", t: "Contacto de emergencia", req: [["emergencia.nombre", "Nombre del contacto de emergencia"], ["emergencia.telefono", "Teléfono del contacto de emergencia"]] },
    { k: "cargo", t: "Cargo y contrato", req: [["cargo.cargo", "Cargo"], ["cargo.departamento", "Departamento"], ["cargo.especialidad", "Especialidad"], ["cargo.contrato", "Tipo de contrato"], ["cargo.jornada", "Jornada"], ["cargo.ingreso", "Fecha de ingreso"], ["cargo.sueldo", "Sueldo base"]] },
    { k: "prevision", t: "Previsión y salud", req: [["prevision.afp", "Institución previsional (AFP)"], ["prevision.salud", "Institución de salud"], ["prevision.plan", "Plan de salud (UF)"], ["prevision.anioInicio", "Año de inicio de cotización"]] },
  ],
  get(f, path) { return path.split(".").reduce((o, k) => (o == null ? "" : o[k]), f); },
  requerido(f, path) { if (path === "cargo.especialidad") return f.cargo && f.cargo.departamento === "Construcción"; if (path === "prevision.plan") return f.prevision && /^Isapre/.test(f.prevision.salud || ""); return true; },
  faltantes(f, sec) { return sec.req.filter(([p]) => this.requerido(f, p) && !String(this.get(f, p) ?? "").trim()).map(([, t]) => t); },
  completa(f) { return this.secciones.every(s => this.faltantes(f, s).length === 0); },
  activas: () => DB.d.fichas.filter(f => f.estado !== "Desvinculado"),
  /* validaciones de formato y duplicados; devuelve {campo: mensaje} */
  validar(f, idActual) {
    const e = {};
    if (f.rut) {
      if (!U.rutValido(f.rut)) e.rut = "RUT inválido";
      else { const dup = DB.d.fichas.find(x => x.id !== idActual && x.estado !== "Desvinculado" && U.rutLimpio(x.rut) === U.rutLimpio(f.rut)); if (dup) e.rut = `Ya existe la ficha ${dup.id} · ${FICHA.nombre(dup)}`; }
    }
    if (f.fnac) { const ed = U.edad(f.fnac); if (ed < 18) e.fnac = "Debe ser mayor de 18 años"; else if (ed > 80) e.fnac = "Fecha fuera de rango"; }
    if (f.correo && !U.correoValido(f.correo)) e.correo = "Formato de correo inválido";
    if (f.telefono && !U.fonoValido(f.telefono)) e.telefono = "Use el formato +56 9 1234 5678";
    const em = f.emergencia || {};
    if (em.telefono && !U.fonoValido(em.telefono)) e["emergencia.telefono"] = "Use el formato +56 9 1234 5678";
    if (em.rut && !U.rutValido(em.rut)) e["emergencia.rut"] = "RUT inválido";
    if (em.correo && !U.correoValido(em.correo)) e["emergencia.correo"] = "Formato de correo inválido";
    const c = f.cargo || {};
    if (c.ingreso && f.fnac && c.ingreso <= f.fnac) e["cargo.ingreso"] = "Anterior a la fecha de nacimiento";
    if (c.sueldo !== "" && c.sueldo != null) { const s = Number(c.sueldo); if (!isFinite(s) || s < 0) e["cargo.sueldo"] = "Debe ser un número positivo"; else if (s < 529000) e["cargo.sueldo"] = "No puede ser menor al ingreso mínimo ($529.000)"; }
    if (c.correoInst) {
      if (!U.correoValido(c.correoInst)) e["cargo.correoInst"] = "Formato de correo inválido";
      else { const dup = DB.d.fichas.find(x => x.id !== idActual && x.estado !== "Desvinculado" && String(x.cargo.correoInst || "").toLowerCase() === c.correoInst.toLowerCase()); if (dup) e["cargo.correoInst"] = `Asignado a ${FICHA.nombre(dup)} (${dup.id})`; }
    }
    const p = f.prevision || {};
    if (p.plan !== "" && p.plan != null) { const v = Number(String(p.plan).replace(",", ".")); if (!isFinite(v) || v < 0) e["prevision.plan"] = "Debe ser un número positivo"; }
    if (p.anioInicio) { const a = +p.anioInicio; if (!/^\d{4}$/.test(String(p.anioInicio)) || a < 1960 || a > U.anio()) e["prevision.anioInicio"] = `Año entre 1960 y ${U.anio()}`; else if (f.fnac && a < +f.fnac.slice(0, 4) + 14) e["prevision.anioInicio"] = "Anterior a los 14 años de edad"; }
    return e;
  },
  vacia() {
    return { id: "", rut: "", nombres: "", apPat: "", apMat: "", fnac: "", nacionalidad: "Chilena", estadoCivil: "", direccion: "", comuna: "", telefono: "", correo: "",
      emergencia: { nombre: "", rut: "", telefono: "", parentesco: "", correo: "" },
      cargo: { cargo: "", departamento: "", especialidad: "", jefatura: "", contrato: "", jornada: "", ingreso: U.hoy(), sueldo: "", correoInst: "" },
      prevision: { afp: "", salud: "", plan: "", anioInicio: "", seguro: "No", alergias: "" }, estado: "", motivoEstado: "", historial: [] };
  },
  nombre: f => `${f.nombres} ${f.apPat} ${f.apMat}`.replace(/\s+/g, " ").trim(),
  disponible: f => f.estado === "Activo",
};

/* ====================================================================== */
/*  Reglas de capacitaciones (RF-CAP)                                     */
/* ====================================================================== */
const CAPR = {
  ocupaCupo: i => ["Inscrito", "Aprobado", "Reprobado"].includes(i.estado),
  inscritos: capId => DB.d.inscripciones.filter(i => i.cap === capId),
  cuposUsados(capId) { return this.inscritos(capId).filter(this.ocupaCupo).length; },
  cuposLibres(c) { return Math.max(0, c.cupos - this.cuposUsados(c.id)); },
  certEstado(ce, hoy = U.hoy()) { if (!ce.vence) return "Permanente"; if (ce.vence < hoy) return "Vencida"; if (U.dias(hoy, ce.vence) <= 30) return "Por vencer"; return "Vigente"; },
  certVigente: (ce, hoy = U.hoy()) => !ce.vence || ce.vence >= hoy,
  certsDe: fichaId => DB.d.certificaciones.filter(c => c.ficha === fichaId),
  tieneVigente(fichaId, tipo) { return this.certsDe(fichaId).some(c => c.tipo === tipo && this.certVigente(c)); },
  obligatoriasPara(esp, anio = U.anio()) { return DB.d.capacitaciones.filter(c => c.anio === anio && c.estado === "Publicada" && c.obligatoria && c.especialidades.includes(esp)); },
  /* habilitación por especialidad (RF-CAP-02 y RF-CAP-06) */
  habilitacion(f) {
    const esp = f.cargo && f.cargo.especialidad; if (!esp || f.cargo.departamento !== "Construcción") return { aplica: false, habilitado: true, faltan: [] };
    const faltan = this.obligatoriasPara(esp).filter(c => !this.tieneVigente(f.id, c.tipo)).map(c => c.nombre);
    return { aplica: true, habilitado: faltan.length === 0, faltan };
  },
  estadoPlan(c, hoy = U.hoy()) {
    if (c.estado === "Dada de baja") return "Dada de baja";
    const vs = DB.d.versiones.filter(v => v.cap === c.id);
    if (c.anio < U.anio()) return vs.some(v => v.cerrada) ? "Finalizada" : "No ejecutada";
    if (vs.length && vs.every(v => v.cerrada) && !this.inscritos(c.id).some(i => i.estado === "Inscrito")) return "Finalizada";
    if (vs.some(v => v.cerrada || v.fecha <= hoy)) return "En ejecución";
    return "Planificada";
  },
  realizada: c => DB.d.versiones.some(v => v.cap === c.id && v.cerrada),
  nuevoId(tipo) { const d = DB.d; if (tipo === "ins") return "INS-" + U.pad(++d.seqIns, 5); if (tipo === "ver") return "VER-" + U.pad(++d.seqVer, 4); if (tipo === "cert") return "CER-" + U.pad(++d.seqCert, 5); },
  nuevoCapId(anio) { let n = DB.d.capacitaciones.filter(c => c.anio === anio).length, id; do { n++; id = `CAP-${anio}-${U.pad(n, 3)}`; } while (DB.cap(id)); return id; },
  /* inscripción con control de cupos y duplicados (RF-CAP-03) */
  inscribir(c, fichaId, origen, usuario) {
    const f = DB.ficha(fichaId);
    if (this.inscritos(c.id).some(i => i.ficha === fichaId && ["Inscrito", "Pendiente (sin cupo)"].includes(i.estado))) return { ok: false, motivo: "Ya está inscrito en esta capacitación" };
    if (!f || f.estado === "Desvinculado") return { ok: false, motivo: "Colaborador desvinculado" };
    if (f.estado === "Licencia") return { ok: false, motivo: "Con licencia: no disponible para asignación" };
    if (this.cuposLibres(c) <= 0) return { ok: false, motivo: "No hay cupos disponibles" };
    const prox = DB.d.versiones.filter(v => v.cap === c.id && !v.cerrada && v.fecha >= U.hoy()).sort((a, b) => a.fecha < b.fecha ? -1 : 1)[0];
    DB.d.inscripciones.push({ id: this.nuevoId("ins"), cap: c.id, version: prox ? prox.id : "", ficha: fichaId, origen, estado: "Inscrito", fecha: U.hoy() });
    return { ok: true };
  },
  /* asignación automática de obligatorias (RF-CAP-10) */
  asignarObligatoria(c, usuario, soloFicha) {
    const r = { asignados: [], cumplidos: [], yaInscritos: [], pendientes: [] };
    if (!(c.obligatoria && c.estado === "Publicada" && c.anio === U.anio())) return r;
    const grupo = DB.d.fichas.filter(f => f.estado === "Activo" && f.cargo.departamento === "Construcción" && c.especialidades.includes(f.cargo.especialidad) && (!soloFicha || f.id === soloFicha));
    for (const f of grupo) {
      if (this.tieneVigente(f.id, c.tipo)) { r.cumplidos.push(f); continue; }
      const prev = this.inscritos(c.id).find(i => i.ficha === f.id && ["Inscrito", "Pendiente (sin cupo)"].includes(i.estado));
      if (prev) { if (prev.estado === "Pendiente (sin cupo)" && this.cuposLibres(c) > 0) { prev.estado = "Inscrito"; r.asignados.push(f); } else r.yaInscritos.push(f); continue; }
      if (this.cuposLibres(c) > 0) { this.inscribir(c, f.id, "Asignada automáticamente (obligatoria)", usuario); r.asignados.push(f); }
      else { DB.d.inscripciones.push({ id: this.nuevoId("ins"), cap: c.id, version: "", ficha: f.id, origen: "Asignada automáticamente (obligatoria)", estado: "Pendiente (sin cupo)", fecha: U.hoy() }); r.pendientes.push(f); }
    }
    return r;
  },
  /* tope de horario del capacitador (RF-CAP-16) */
  tope(v, ignorarId) {
    return DB.d.versiones.find(x => x.id !== ignorarId && x.capacitador && U.rutLimpio(x.capacitador) === U.rutLimpio(v.capacitador) && x.fecha === v.fecha && U.hm(x.inicio) < U.hm(v.termino) && U.hm(v.inicio) < U.hm(x.termino));
  },
};

/* ====================================================================== */
/*  Reglas de bonificaciones (RF-BON)                                     */
/* ====================================================================== */
const BON = {
  ESTADOS: ["Pendiente de aprobación", "Rechazado", "Aprobado", "Registrado para pago"],
  calculo: (d, per) => d.calculos.find(c => c.periodo === per),
  reglaVigente(d, per) { return [...d.reglas].filter(r => r.desde <= per).sort((a, b) => b.version - a.version)[0] || d.reglas[d.reglas.length - 1]; },
  tramo(regla, cal) { const c = Math.round(cal * 10) / 10; return regla.tramos.find(t => c >= t.desde - 1e-9 && c <= t.hasta + 1e-9); },
  /* valida tramos sin solapes ni vacíos entre 1,0 y 7,0 (RF-BON-03 criterio 2) */
  validarTramos(tr) {
    if (!tr.length) return "Debe definir al menos un tramo.";
    for (const t of tr) {
      if (!String(t.t || "").trim()) return "Cada tramo debe tener un nombre.";
      if (!isFinite(t.desde) || !isFinite(t.hasta)) return `El tramo «${t.t}» tiene límites inválidos.`;
      if (t.desde < 1 || t.hasta > 7) return `El tramo «${t.t}» debe estar entre 1,0 y 7,0.`;
      if (t.desde > t.hasta) return `En el tramo «${t.t}» el límite inferior (${U.num1(t.desde)}) es mayor que el superior (${U.num1(t.hasta)}).`;
      if (!isFinite(t.monto) || t.monto < 0) return `El monto del tramo «${t.t}» debe ser un número positivo o cero.`;
    }
    const s = [...tr].sort((a, b) => a.desde - b.desde);
    const sinCubrir = (a, b) => `Rango sin cubrir: ${Math.abs(a - b) < 1e-9 ? U.num1(a) : U.num1(a) + " a " + U.num1(b)}.`;
    if (Math.abs(s[0].desde - 1) > 1e-9) return sinCubrir(1, s[0].desde - 0.1);
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i];
      if (b.desde <= a.hasta + 1e-9) return `Tramos solapados: «${a.t}» (${U.num1(a.desde)}–${U.num1(a.hasta)}) y «${b.t}» (${U.num1(b.desde)}–${U.num1(b.hasta)}).`;
      if (b.desde - a.hasta > 0.1 + 1e-9) return sinCubrir(a.hasta + 0.1, b.desde - 0.1);
    }
    if (Math.abs(s[s.length - 1].hasta - 7) > 1e-9) return sinCubrir(s[s.length - 1].hasta + 0.1, 7);
    return "";
  },
  /* importación del lote con rechazos y control de duplicados (RF-BON-01, 02 y 10) */
  importar(d, per, usuario, fecha) {
    const src = d.fuente[per];
    if (!d.config.servicio) return { error: "servicio" };
    if (!src) return { error: "sinLote" };
    const ya = new Set(d.encuestas.map(e => e.id));
    const previa = d.importaciones.filter(i => i.periodo === per);
    const vistos = new Set(); const res = { periodo: per, lote: src.lote, fecha: fecha || U.ahora(), usuario, recibidas: src.encuestas.length, aceptadas: 0, rechazadas: [], omitidas: 0, reproceso: previa.length > 0 };
    const proy = new Set(d.proyectos.map(p => p.id));
    for (const e of src.encuestas) {
      let motivo = "";
      if (vistos.has(e.id)) motivo = "Encuesta duplicada en el lote";
      else if (ya.has(e.id)) { vistos.add(e.id); res.omitidas++; continue; }
      else if (!e.proyecto) motivo = "Sin identificador de proyecto";
      else if (!proy.has(e.proyecto)) motivo = `Proyecto ${e.proyecto} no registrado`;
      else if (!(e.calificacion >= 1 && e.calificacion <= 7)) motivo = `Calificación fuera de rango (${U.num1(e.calificacion)}; escala 1 a 7)`;
      vistos.add(e.id);
      if (motivo) { res.rechazadas.push({ id: e.id, proyecto: e.proyecto || "—", cliente: e.cliente, calificacion: e.calificacion, motivo }); continue; }
      d.encuestas.push({ ...e, periodo: per, lote: src.lote, importada: res.fecha }); ya.add(e.id); res.aceptadas++;
    }
    if (previa.length && res.aceptadas === 0) return { error: "procesado", res };
    d.importaciones.push(res);
    return { res };
  },
  /* cálculo del período (RF-BON-04, 05, 09 y 11) */
  validarPrevio(d, per) {
    const c = this.calculo(d, per);
    if (c && ["Aprobado", "Registrado para pago"].includes(c.estado)) return `El período ${U.mes(per)} se encuentra cerrado: su cálculo ya fue aprobado.`;
    if (!d.encuestas.some(e => e.periodo === per)) return `No hay encuestas importadas para ${U.mes(per)}. Importe el lote antes de calcular.`;
    return "";
  },
  calcular(d, per, usuario, fecha) {
    const regla = this.reglaVigente(d, per);
    const encs = d.encuestas.filter(e => e.periodo === per);
    const res = {}, excluidos = [], proyRes = [];
    for (const p of d.proyectos.filter(p => p.periodo === per)) {
      const es = encs.filter(e => e.proyecto === p.id);
      if (!es.length) { excluidos.push({ id: p.id, nombre: p.nombre, motivo: "Sin encuesta respondida (proyecto sin evaluación)" }); p.colaboradores.forEach(fid => { (res[fid] = res[fid] || { proyectos: [] }); }); continue; }
      const prom = Math.round(es.reduce((s, e) => s + e.calificacion, 0) / es.length * 10) / 10;
      const tr = this.tramo(regla, prom);
      if (!p.colaboradores.length) { excluidos.push({ id: p.id, nombre: p.nombre, motivo: "Sin colaboradores asignados · pendiente de revisión" }); continue; }
      const n = p.colaboradores.length, baseParte = Math.floor(tr.monto / n), resto = tr.monto - baseParte * n;
      proyRes.push({ id: p.id, prom, tramo: tr.t, monto: tr.monto, n });
      p.colaboradores.forEach((fid, ix) => {
        const parte = baseParte + (ix === 0 ? resto : 0);
        (res[fid] = res[fid] || { proyectos: [] }).proyectos.push({ id: p.id, nombre: p.nombre, cliente: p.cliente, encuestas: es.map(e => ({ id: e.id, fecha: e.fecha, calificacion: e.calificacion })), prom, tramo: tr.t, montoProyecto: tr.monto, n, parte });
      });
    }
    const filas = Object.entries(res).map(([fid, r]) => {
      const f = d.fichas.find(x => x.id === fid) || { nombres: fid, apPat: "", apMat: "", cargo: {} };
      const ps = r.proyectos, monto = ps.reduce((s, p) => s + p.parte, 0);
      const calif = ps.length ? Math.round(ps.reduce((s, p) => s + p.prom, 0) / ps.length * 10) / 10 : null;
      const tramos = [...new Set(ps.map(p => p.tramo))].join(", ");
      const motivo = monto > 0 ? "" : (!ps.length ? "Sin encuestas en el período (sus proyectos no tienen evaluación)" : `Calificación bajo el tramo mínimo con bonificación (${U.num1(calif)})`);
      return { ficha: fid, nombre: FICHA.nombre(f), departamento: f.cargo.departamento || "", especialidad: f.cargo.especialidad || "", calif, tramos: tramos || "—", monto, motivo, proyectos: ps };
    }).sort((a, b) => b.monto - a.monto || a.nombre.localeCompare(b.nombre));
    let c = this.calculo(d, per);
    const nuevo = { periodo: per, estado: "Pendiente de aprobación", regla: regla.version, fecha: fecha || U.ahora(), por: usuario, filas, excluidos, proyectos: proyRes, total: filas.reduce((s, x) => s + x.monto, 0), encuestas: encs.length, rechazos: c ? c.rechazos : [], aprobado: null, pago: null };
    if (c) Object.assign(c, nuevo); else { c = nuevo; d.calculos.push(c); }
    return c;
  },
  registrarPago(d, c, usuario, fecha) {
    const [y, m] = c.periodo.split("-");
    c.pago = { fecha: fecha || U.ahora(), por: usuario, registros: c.filas.filter(x => x.monto > 0).map((x, i) => ({ nro: `PAG-${y}-${m}-${U.pad(i + 1, 3)}`, ficha: x.ficha, nombre: x.nombre, monto: x.monto })) };
    c.estado = "Registrado para pago";
  },
  /* servicio de calificaciones del sistema informático actual (RF-BON-12 y RF-CAP-17) */
  servicioCalificaciones(d, fichaId, periodos) {
    if (!d.config.servicio) return { error: true };
    const out = [];
    for (const per of periodos) {
      const src = d.fuente[per]; if (!src) continue;
      for (const p of d.proyectos.filter(p => p.periodo === per && p.colaboradores.includes(fichaId))) {
        const es = src.encuestas.filter(e => e.proyecto === p.id && e.calificacion >= 1 && e.calificacion <= 7);
        const unicos = [...new Map(es.map(e => [e.id, e])).values()];
        unicos.forEach(e => out.push({ periodo: per, proyecto: p.id, nombre: p.nombre, cliente: p.cliente, fecha: e.fecha, calificacion: e.calificacion, encuesta: e.id }));
      }
    }
    return { servicios: out.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) };
  },
};
