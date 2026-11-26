// Reporte de avance y portafolio del APE en PDF (jsPDF 2.5.1 desde cdnjs, CDN aprobado por Ceibal).
// Cada descarga queda registrada como una "entrega" numerada para seguir el avance en el tiempo.
import { MISSIONS, PHASES, BONUS, CENTERS, AREAS } from './content.js';
import { computeBadges } from './badges.js';

const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
let loading = null;

function loadJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = JSPDF_URL;
    s.async = true;
    s.onload = () => (window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF no cargó')));
    s.onerror = () => { loading = null; reject(new Error('No se pudo descargar jsPDF (¿sin internet?)')); };
    document.head.append(s);
  });
  return loading;
}

/** Las fuentes estándar del PDF solo tienen caracteres latinos: sacamos emojis y símbolos raros. */
function clean(text) {
  return String(text ?? '')
    .replace(/[✔✅]/g, 'OK')
    .replace(/[→➜]/g, '->')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF–—‘’“”•…]/g, '')
    .replace(/[ \t]+\n/g, '\n');
}

function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (x) => String(x).padStart(2, '0');
  const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}

function slug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'estudiante';
}

const FEEL = { logrado: 'Lo logré: puedo explicarlo', casi: 'Casi: tengo alguna duda', ayuda: 'Necesito más ayuda' };

/**
 * Registra una nueva entrega en `progress.entregas` y arma el PDF.
 * @returns {Promise<{ filename: string, entrega: object }>}
 */
export async function downloadProgressPdf({ student, progress, priority = [], save }) {
  const JsPDF = await loadJsPdf();

  const now = new Date();
  const doneIds = PHASES.filter((p) => progress.completed[p.id]).map((p) => p.id);
  const bonusIds = BONUS.filter((p) => progress.completed[p.id]).map((p) => p.id);
  const reflections = MISSIONS.filter((m) => progress.reflections?.[m.n]?.text);
  const grade = Math.round((doneIds.length / PHASES.length) * 100) / 10;
  progress.entregas = Array.isArray(progress.entregas) ? progress.entregas : [];
  const prev = progress.entregas[progress.entregas.length - 1] || null;
  const n = progress.entregas.length + 1;
  const code = `E${n}-${fnv(`${student.name}|${student.group}|${n}|${doneIds.join(',')}|${bonusIds.join(',')}|${now.toISOString()}`).replace(/(.{4})(.{4})/, '$1-$2')}`;
  const prevIds = new Set(prev?.ids || []);
  const nuevas = PHASES.filter((p) => progress.completed[p.id] && !prevIds.has(p.id));
  const entrega = { n, fecha: now.toISOString(), nota: grade, fases: doneIds.length, bonus: bonusIds.length, reflexiones: reflections.length, ids: [...doneIds, ...bonusIds], code };

  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const W = 210; const M = 14; const CW = W - M * 2; const BOTTOM = 282;
  let y = 0;
  const C = { ink: [27, 31, 36], muted: [91, 101, 112], amber: [184, 110, 0], green: [26, 127, 55], red: [180, 35, 24], line: [214, 209, 196], band: [13, 17, 23], pc: [130, 80, 223], hw: [191, 57, 137], ia: [0, 140, 140], py: [31, 111, 235] };
  const color = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (style = 'normal', size = 10, fam = 'helvetica') => { doc.setFont(fam, style); doc.setFontSize(size); };

  const header = (first) => {
    fill(C.band); doc.rect(0, 0, W, first ? 30 : 14, 'F');
    color([255, 176, 0]); font('bold', first ? 18 : 11);
    doc.text('GTA APE · Portafolio y reporte de avance', M, first ? 13 : 9);
    color([230, 237, 243]); font('normal', first ? 10 : 8);
    doc.text(clean('Reinicio en Santa Bruma · 9no · Ciencias de la Computación · Recurso educativo SHANUKI'), M, first ? 21 : 12.5);
    if (first) { font('bold', 10); color([0, 220, 240]); doc.text(clean(`Entrega N.º ${n}`), W - M, 13, { align: 'right' }); font('normal', 9); color([230, 237, 243]); doc.text(clean(fmtDate(entrega.fecha, true)), W - M, 21, { align: 'right' }); }
    y = first ? 38 : 22;
  };
  const ensure = (hh) => { if (y + hh > BOTTOM) { doc.addPage(); header(false); } };
  const section = (title) => {
    ensure(16);
    y += 3;
    color(C.amber); font('bold', 12); doc.text(clean(title), M, y);
    stroke(C.line); doc.setLineWidth(0.4); doc.line(M, y + 1.8, W - M, y + 1.8);
    y += 7;
  };
  const para = (text, { size = 10, style = 'normal', col = C.ink, indent = 0, lh = 4.6 } = {}) => {
    font(style, size); color(col);
    const ls = doc.splitTextToSize(clean(text), CW - indent);
    for (const ln of ls) { ensure(lh); doc.text(ln, M + indent, y); y += lh; }
  };

  header(true);

  // ---------- estudiante ----------
  font('bold', 9); color(C.muted);
  doc.text('ESTUDIANTE', M, y); doc.text('GRUPO', M + 105, y); doc.text('CÓDIGO DE ENTREGA', M + 145, y);
  y += 5.5;
  font('bold', 13); color(C.ink);
  doc.text(clean(student.name || '(sin nombre)'), M, y, { maxWidth: 100 });
  doc.text(clean(student.group || '-'), M + 105, y, { maxWidth: 38 });
  font('bold', 10); doc.text(code, M + 145, y);
  y += 9;

  // ---------- nota y avance por área ----------
  stroke(C.line); fill([246, 245, 239]); doc.setLineWidth(0.3); doc.roundedRect(M, y, CW, 42, 3, 3, 'FD');
  color(C.amber); font('bold', 34); doc.text(grade.toFixed(1), M + 6, y + 19);
  const gw = doc.getTextWidth(grade.toFixed(1));
  color(C.muted); font('normal', 11); doc.text('/ 10', M + 6 + gw + 2, y + 19);
  font('normal', 9);
  doc.text(clean(`${doneIds.length} de ${PHASES.length} actividades`), M + 6, y + 27);
  doc.text(clean(`${reflections.length} de ${MISSIONS.length} reflexiones`), M + 6, y + 31.5);
  doc.text(clean(`Nota = (actividades / ${PHASES.length}) x 10`), M + 6, y + 36);
  const bx = M + 66; let by = y + 6;
  for (const [k, a] of Object.entries(AREAS)) {
    const all = PHASES.filter((p) => p.area === k); const d = all.filter((p) => progress.completed[p.id]).length;
    color(C.ink); font('bold', 8.5); doc.text(clean(a.name), bx, by + 3);
    fill([225, 228, 232]); doc.roundedRect(bx + 50, by, 52, 4, 1.5, 1.5, 'F');
    if (d) { fill(C[k]); doc.roundedRect(bx + 50, by, Math.max(3, 52 * (d / all.length)), 4, 1.5, 1.5, 'F'); }
    font('normal', 9); color(C.muted); doc.text(`${d}/${all.length}`, bx + 106, by + 3.3);
    by += 8.5;
  }
  y += 49;
  if (priority.length) para(`Misiones prioritarias indicadas por el docente: ${priority.join(', ')}.`, { style: 'bold', col: C.amber });

  // ---------- novedades ----------
  section(prev ? `Novedades desde la entrega N.º ${prev.n} (${fmtDate(prev.fecha)})` : 'Primera entrega');
  if (prev) {
    const delta = Math.round((grade - (prev.nota || 0)) * 10) / 10;
    para(`Nota anterior: ${Number(prev.nota || 0).toFixed(1)}  ->  nota actual: ${grade.toFixed(1)}  (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`, { style: 'bold' });
  }
  if (nuevas.length) {
    para(`Actividades nuevas logradas: ${nuevas.length}`);
    for (const p of nuevas) para(`• Misión ${p.mission} · ${p.title}`, { indent: 3, col: C.green });
  } else para(prev ? 'No hay actividades nuevas desde la entrega anterior.' : 'Todavía no hay actividades logradas.', { col: C.muted });

  // ---------- misiones ----------
  section('Misiones: metas, actividades y autoevaluación');
  for (const m of MISSIONS) {
    const d = m.phases.filter((p) => progress.completed[p.id]).length;
    const refl = progress.reflections?.[m.n];
    ensure(14);
    para(`${m.n}. ${m.title}${priority.includes(m.n) ? ' (prioritaria)' : ''} — ${d}/${m.phases.length} actividades${refl?.text ? ' · reflexión OK' : ''}`, { style: 'bold', size: 10, col: d === m.phases.length && refl?.text ? C.green : C.ink });
    para(m.tema, { size: 8.5, col: C.muted, indent: 3, lh: 4 });
    for (const p of m.phases) {
      const at = progress.completed[p.id];
      para(`${at ? '[x]' : '[ ]'} ${p.title}${at ? ` (${fmtDate(at)})` : ''}`, { size: 8.5, indent: 5, lh: 4, col: at ? C.ink : C.muted });
    }
    if (refl?.feel) para(`Autoevaluación: ${FEEL[refl.feel] || refl.feel}`, { size: 8.5, indent: 5, lh: 4, col: refl.feel === 'ayuda' ? C.red : C.ink });
    y += 1.5;
  }

  // ---------- reflexiones ----------
  section('Reflexiones (evidencia para el portafolio)');
  if (!reflections.length) para('Todavía no hay reflexiones guardadas.', { col: C.muted });
  for (const m of reflections) {
    const r = progress.reflections[m.n];
    ensure(18);
    para(`Misión ${m.n} · ${m.title} · ${fmtDate(r.at)}`, { size: 9.5, style: 'bold' });
    para(`Pregunta: ${m.reflection}`, { size: 8.5, col: C.muted, indent: 3, lh: 4 });
    para(r.text, { size: 9.5, indent: 3 });
    y += 2;
  }

  // ---------- código ----------
  section('Evidencia: programas en Python de las actividades logradas');
  const withCode = [...PHASES, ...BONUS].filter((p) => p.type === 'python' && progress.completed[p.id] && progress.code?.[p.id]);
  if (!withCode.length) para('Todavía no hay programas registrados en este dispositivo.', { col: C.muted });
  for (const p of withCode) {
    ensure(18);
    para(p.center ? `Bonus ${CENTERS[p.center].name} · ${p.title}` : `Misión ${p.mission} · ${p.title}`, { size: 9.5, style: 'bold' });
    doc.setFont('courier', 'normal'); doc.setFontSize(8);
    const src = String(progress.code[p.id]).replace(/\t/g, '    ').trimEnd().split('\n').slice(0, 40);
    const ls = src.flatMap((l) => doc.splitTextToSize(clean(l) || ' ', CW - 10));
    for (const ln of ls) {
      ensure(4);
      fill([243, 244, 246]); doc.rect(M + 3, y - 3, CW - 3, 3.9, 'F');
      doc.setFont('courier', 'normal'); doc.setFontSize(8); color([17, 99, 41]);
      doc.text(ln, M + 5, y); y += 3.9;
    }
    y += 2.5;
  }

  // ---------- bonus e insignias ----------
  section(`Misiones nerds (bonus, no cambian la nota): ${bonusIds.length} de ${BONUS.length} retos`);
  for (const [key, c] of Object.entries(CENTERS)) {
    const all = BONUS.filter((p) => p.center === key); const d = all.filter((p) => progress.completed[p.id]).length;
    para(`• ${c.full}: ${d}/${all.length}${d === all.length ? ' (completa)' : ''}`, { indent: 1, col: d === all.length ? C.green : C.ink });
  }
  const won = computeBadges(progress).filter((b) => b.earned);
  section(`Insignias: ${won.length}`);
  para(won.length ? won.map((b) => b.name).join(' · ') : 'Todavía no ganó insignias.', { col: won.length ? C.green : C.muted });
  const street = progress.street || {};
  para(`Mini retos de la calle: ${Object.keys(street.solved || {}).length} distintos resueltos · ${street.helped || 0} ayudas en total.`);

  // ---------- historial ----------
  section('Historial de entregas');
  for (const e of [...progress.entregas, entrega]) {
    para(`Entrega N.º ${e.n} · ${fmtDate(e.fecha, true)} · nota ${Number(e.nota).toFixed(1)} · ${e.fases} actividades · ${e.reflexiones ?? 0} reflexiones · código ${e.code}`, { size: 9, indent: 1, style: e.n === n ? 'bold' : 'normal' });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    stroke(C.line); doc.setLineWidth(0.3); doc.line(M, 288, W - M, 288);
    font('normal', 7.5); color(C.muted);
    doc.text(clean(`GTA APE · ${student.name || ''} · ${student.group || ''} · Entrega N.º ${n} · ${code}`), M, 292);
    doc.text(`Página ${i} de ${pages}`, W - M, 292, { align: 'right' });
  }

  const filename = `GTA-APE_${slug(student.name)}_${slug(student.group)}_entrega-${n}.pdf`;
  doc.save(filename);
  progress.entregas.push(entrega);
  save();
  return { filename, entrega };
}
