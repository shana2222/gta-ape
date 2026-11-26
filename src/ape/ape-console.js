// Consola APE del juego: cada misión abre Metas → Explicación → Actividades → Reflexión.
// Reemplaza a la terminal SQL del juego original y mantiene la misma API (window.gtaSql).
import { MISSIONS, MISSION_BY_N, PHASES, BONUS, CENTERS, AREAS, phasesFor, checkPython, norm } from './content.js';
import { runPython, Interpreter, PyError } from './python-mini.js';
import { downloadProgressPdf } from './pdf-report.js';
import { computeBadges, earnedIds } from './badges.js';
import { STREET_CHALLENGES, getStreetChallenge, normalizeAnswer } from './street-challenges.js';
import { renderMbsim, renderPorts, renderOhm, renderWires, renderPinwire, renderMltrain, renderMlprog } from './sim-ui.js';

/* limpieza de simuladores al cambiar de pantalla */
let leaveFns = [];
function runLeave() { const fns = leaveFns; leaveFns = []; fns.forEach((f) => { try { f(); } catch { /* nada */ } }); }

const KEY_PROGRESS = 'gtaape.progress.v2';
const KEY_STUDENT = 'gtaape.student.v1';
const KEY_THEME = 'gtaape.theme.v1';
const KEY_PRIORITY = 'gtaape.priority.v1';
const KEY_SANDBOX = 'gtaape.sandbox.v1';

/* ---------------- persistencia ---------------- */
function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
}

const progress = load(KEY_PROGRESS, {});
for (const k of ['completed', 'code', 'lessonSeen', 'reflections', 'attempts']) progress[k] = progress[k] || {};

function persist() {
  save(KEY_PROGRESS, progress);
  refreshChips();
}

export function getGrade() {
  const done = PHASES.filter((p) => progress.completed[p.id]).length;
  return { done, total: PHASES.length, grade: Math.round((done / PHASES.length) * 100) / 10 };
}

/* ---------------- prioridades del docente (?prioridad=1,3,7-10) ---------------- */
function readPriority() {
  try {
    const q = new URLSearchParams(window.location.search).get('prioridad') ?? new URLSearchParams(window.location.search).get('ape');
    if (q !== null) {
      const set = new Set();
      for (const part of q.split(/[,\s]+/)) {
        const r = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
        if (!r) continue;
        const a = Number(r[1]); const b = Number(r[2] || r[1]);
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (MISSION_BY_N[i]) set.add(i);
      }
      const list = [...set].sort((x, y) => x - y);
      save(KEY_PRIORITY, list);
      return list;
    }
  } catch { /* sin URL */ }
  return load(KEY_PRIORITY, []);
}
const PRIORITY = typeof window !== 'undefined' ? readPriority() : [];
const isPriority = (n) => PRIORITY.includes(n);

/* ---------------- estado de una misión ---------------- */
function missionState(n) {
  const m = MISSION_BY_N[n];
  const done = m.phases.filter((p) => progress.completed[p.id]).length;
  const refl = progress.reflections[n];
  return { m, done, total: m.phases.length, lesson: Boolean(progress.lessonSeen[n]), reflection: Boolean(refl?.text), complete: done === m.phases.length && Boolean(refl?.text) };
}

/* ---------------- utilidades de DOM ---------------- */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function mountPoint() {
  return document.fullscreenElement || document.getElementById('game-shell') || document.body;
}
function mount(el) {
  const target = mountPoint();
  if (el.parentElement !== target) target.append(el);
}
if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    for (const id of ['apec-root', 'sqlr-root', 'sqlc-toast', 'apei-root']) { const el = document.getElementById(id); if (el) mount(el); }
  });
}

function askConfirm(message, { okText = 'Sí', cancelText = 'Cancelar', danger = false } = {}) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const cancel = h('button', { type: 'button', class: 'sqlc-btn' }, cancelText);
    const ok = h('button', { type: 'button', class: `sqlc-btn ${danger ? 'sqlc-btn-danger-solid' : 'sqlc-btn-primary'}` }, okText);
    const box = h('div', { class: 'sqlc-confirm', role: 'alertdialog', 'aria-modal': 'true' },
      h('div', { class: 'sqlc-confirm-card' }, h('p', {}, message), h('div', { class: 'sqlc-confirm-actions' }, cancel, ok)));
    const finish = (v) => { box.remove(); try { prevFocus?.focus?.(); } catch { /* nada */ } resolve(v); };
    cancel.addEventListener('click', () => finish(false));
    ok.addEventListener('click', () => finish(true));
    box.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
    mount(box);
    applyTheme(box);
    setTimeout(() => cancel.focus(), 20);
  });
}

/* ---------------- tema claro / oscuro ---------------- */
function applyTheme(root) {
  const t = load(KEY_THEME, null);
  if (t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
}
function toggleTheme(root) {
  const t = root.getAttribute('data-theme');
  const dark = t ? t === 'dark' : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);
  save(KEY_THEME, dark ? 'light' : 'dark');
  for (const id of ['apec-root', 'sqlr-root', 'apei-root']) { const el = document.getElementById(id); if (el) applyTheme(el); }
}

let toastTimer = null;
function showToast(msg) {
  let t = document.getElementById('sqlc-toast');
  if (!t) { t = h('div', { id: 'sqlc-toast', class: 'sqlc-toast', role: 'status' }); }
  mount(t);
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---------------- bloqueo del juego mientras hay una pantalla abierta ---------------- */
let openLayers = 0;
function lockGame() { openLayers += 1; window.__sqlConsoleOpen = true; }
function unlockGame() {
  openLayers = Math.max(0, openLayers - 1);
  if (!openLayers) setTimeout(() => { if (!openLayers) window.__sqlConsoleOpen = false; }, 120);
}

/* ======================================================================
   CONSOLA DE MISIÓN
   ====================================================================== */
let ui = null;
let session = null; // { kind: 'mission'|'bonus'|'sandbox', mission, queue, view, onSolved, onCancel, slide }

function buildUi() {
  if (ui) return ui;
  const root = h('div', { class: 'apec-root', id: 'apec-root', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'apec-title', hidden: true });
  applyTheme(root);
  const icon = h('span', { class: 'apec-logo', 'aria-hidden': 'true' }, '▣');
  const title = h('h2', { id: 'apec-title', class: 'apec-title' }, 'APE');
  const subtitle = h('div', { class: 'apec-subtitle' });
  const gradeChip = h('button', { type: 'button', class: 'sqlc-chip', title: 'Ver mi reporte de avance', onclick: () => openReport() });
  const indexBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost apec-index-btn', title: 'Ver todos los contenidos', onclick: () => openIndex(), 'aria-label': 'Ver todos los contenidos' }, '🗺', h('span', { class: 'apec-hide-sm' }, ' Contenidos'));
  const themeBtn = h('button', { type: 'button', class: 'sqlc-icon-btn', title: 'Cambiar tema claro/oscuro', 'aria-label': 'Cambiar tema claro u oscuro', onclick: () => toggleTheme(root) }, '🌓');
  const closeBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost', onclick: () => close(false), 'aria-label': 'Salir' }, h('span', { class: 'apec-hide-sm' }, 'Salir '), '✕');
  const header = h('header', { class: 'apec-header' },
    h('div', { class: 'apec-brand' }, icon, h('div', { class: 'apec-brand-text' }, title, subtitle)),
    h('div', { class: 'apec-header-actions' }, gradeChip, indexBtn, themeBtn, closeBtn));
  const tabs = h('nav', { class: 'apec-tabs', 'aria-label': 'Partes de esta misión' });
  const body = h('main', { class: 'apec-body' });
  root.append(header, tabs, body);
  mount(root);
  root.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape' && !e.target.closest?.('.apec-editor')) { e.preventDefault(); close(false); }
  });
  ui = { root, icon, title, subtitle, gradeChip, tabs, body, indexBtn };
  return ui;
}

/* ---------------- HUD ---------------- */
let fab = null;
function buildFab() {
  if (fab || typeof document === 'undefined') return;
  const quick = document.querySelector('#hud-layer .hud-quick-actions');
  if (!quick) { setTimeout(buildFab, 300); return; }
  fab = h('button', { type: 'button', id: 'sql-hud-button', class: 'hud-pill pause-button sqlc-hud-btn', title: 'Contenidos del APE y práctica libre', 'aria-label': 'Abrir contenidos del APE', onclick: () => openIndex() });
  fab.addEventListener('keydown', (e) => e.stopPropagation());
  fab.addEventListener('pointerdown', (e) => e.stopPropagation());
  quick.append(fab);
  const reportBtn = h('button', { type: 'button', id: 'report-hud-button', class: 'hud-pill pause-button sqlc-hud-btn sqlc-report-btn', title: 'Ver tu reporte de avance y descargar el PDF', 'aria-label': 'Abrir mi reporte de avance', onclick: () => openReport() },
    h('span', { 'aria-hidden': 'true' }, '📄'), h('span', { class: 'sqlc-hud-label' }, 'Mi reporte'));
  reportBtn.addEventListener('keydown', (e) => e.stopPropagation());
  reportBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  quick.append(reportBtn);
  const pauseActions = document.querySelector('#pause-screen .pause-actions');
  if (pauseActions && !document.getElementById('pause-report-btn')) {
    pauseActions.insertBefore(h('button', { type: 'button', id: 'pause-index-btn', class: 'secondary-button', onclick: () => openIndex() }, '🗺 CONTENIDOS DEL APE'), pauseActions.children[1] || null);
    pauseActions.insertBefore(h('button', { type: 'button', id: 'pause-report-btn', class: 'secondary-button', onclick: () => openReport() }, '📄 MI REPORTE DE AVANCE'), pauseActions.children[2] || null);
  }
  refreshChips();
}

function refreshChips() {
  const { grade, done, total } = getGrade();
  if (fab) {
    fab.innerHTML = `<svg class="sqlc-hud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z"/><path d="M9 8h7M9 11.5h5"/></svg><span class="sqlc-hud-label">APE</span><span class="sqlc-hud-grade">${grade.toFixed(1)}</span>`;
    fab.setAttribute('aria-label', `Abrir contenidos del APE. Nota ${grade.toFixed(1)}, ${done} de ${total} actividades`);
  }
  if (ui) ui.gradeChip.innerHTML = `📊 <span class="apec-hide-sm">Nota </span>${grade.toFixed(1)}<span class="apec-hide-sm"> · ${done}/${total}</span>`;
}

/* ---------------- pestañas ---------------- */
function viewsFor(s) {
  if (s.kind === 'mission') return ['lesson', ...s.queue.map((_, i) => i), 'reflection'];
  if (s.kind === 'bonus') return s.queue.map((_, i) => i);
  return ['sandbox'];
}

function canOpen(view) {
  if (session.kind !== 'mission') return true;
  if (view === 'lesson') return true;
  if (!progress.lessonSeen[session.mission.n]) return false;
  if (view === 'reflection') return session.queue.every((p) => progress.completed[p.id]);
  return true;
}

function renderTabs() {
  const u = ui;
  u.tabs.replaceChildren();
  if (session.kind === 'sandbox') { u.tabs.hidden = true; return; }
  u.tabs.hidden = false;
  for (const v of viewsFor(session)) {
    let label; let state = '';
    if (v === 'lesson') { label = '📖 Explicación'; state = progress.lessonSeen[session.mission.n] ? 'done' : ''; }
    else if (v === 'reflection') { label = '🪞 Reflexión'; state = progress.reflections[session.mission.n]?.text ? 'done' : ''; }
    else { const p = session.queue[v]; label = `${progress.completed[p.id] ? '✔' : v + 1}. ${p.title}`; state = progress.completed[p.id] ? 'done' : ''; }
    const locked = !canOpen(v);
    const b = h('button', {
      type: 'button', class: `apec-tab ${state} ${session.view === v ? 'current' : ''} ${locked ? 'locked' : ''}`,
      'aria-current': session.view === v ? 'step' : null, 'aria-disabled': locked ? 'true' : null,
      title: locked ? (v === 'reflection' ? 'Se habilita cuando termines las actividades' : 'Primero mira la explicación') : '',
      onclick: () => {
        if (locked) { showToast(v === 'reflection' ? '🔒 La reflexión se habilita cuando termines las actividades.' : '🔒 Primero mira la explicación hasta el final.'); return; }
        go(v);
      },
    }, locked ? '🔒 ' : '', label);
    u.tabs.append(b);
  }
  u.tabs.querySelector('.current')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

function go(view) {
  session.view = view;
  renderTabs();
  renderBody();
  ui.body.scrollTop = 0;
}

function renderHeader() {
  const u = ui;
  if (session.kind === 'mission') {
    const m = session.mission;
    u.icon.textContent = m.icon;
    u.title.textContent = `Misión ${m.n}: ${m.title}`;
    u.subtitle.textContent = `${AREAS[m.area].icon} ${m.tema}${isPriority(m.n) ? ' · ⭐ prioritaria' : ''}`;
  } else if (session.kind === 'bonus') {
    const c = CENTERS[session.queue[0].center];
    u.icon.textContent = c.icon;
    u.title.textContent = `Misión nerd: ${c.full}`;
    u.subtitle.textContent = `Bonus con ${c.npc} · no cambia la nota`;
  } else {
    u.icon.textContent = '🐍';
    u.title.textContent = 'Cuartel del Hacker — Python libre';
    u.subtitle.textContent = 'Practica lo que quieras: no cambia tu nota.';
  }
  refreshChips();
}

function renderBody() {
  runLeave();
  const u = ui;
  u.body.replaceChildren();
  u.body.className = 'apec-body';
  const v = session.view;
  if (v === 'lesson') return renderLesson();
  if (v === 'reflection') return renderReflection();
  if (v === 'sandbox') return renderSandbox();
  return renderActivity(session.queue[v], v);
}

/* ---------------- explicación ---------------- */
function renderLesson() {
  const m = session.mission;
  const total = m.lesson.length + 1; // + metas
  session.slide = Math.max(0, Math.min(session.slide ?? 0, total));
  const s = session.slide;
  const card = h('article', { class: 'apec-slide', 'aria-live': 'polite' });
  if (s === 0) {
    card.append(h('div', { class: 'apec-kicker' }, '🎯 Metas de aprendizaje'),
      h('h3', {}, `¿Qué vas a lograr en esta misión?`),
      h('p', { class: 'apec-lead' }, 'Esta misión es parte de tu Acompañamiento Pedagógico Específico (APE). Al terminarla vas a poder decir:'),
      h('ul', { class: 'apec-goals' }, m.goals.map((g) => h('li', {}, h('span', { 'aria-hidden': 'true' }, '✅'), g))),
      h('p', { class: 'apec-muted' }, `Primero vas a ver una explicación corta (${m.lesson.length} pantallas). Después, ${m.phases.length} actividades y una reflexión para tu portafolio.`));
  } else if (s <= m.lesson.length) {
    const sl = m.lesson[s - 1];
    card.append(h('div', { class: 'apec-kicker' }, `📖 Explicación · ${s} de ${m.lesson.length}`), h('h3', {}, sl.title), h('div', { class: 'apec-rich', html: sl.html }));
  } else {
    card.append(h('div', { class: 'apec-kicker' }, '🃏 Repaso rápido'), h('h3', {}, 'Tarjetas para recordar'),
      h('p', { class: 'apec-muted' }, 'Toca cada tarjeta para darla vuelta. Antes de girarla, intenta decir la respuesta.'),
      h('div', { class: 'apec-cards' }, m.cards.map((c) => {
        const b = h('button', { type: 'button', class: 'apec-card', 'aria-pressed': 'false', 'aria-label': `Tarjeta: ${c.front}. Toca para ver la respuesta.` },
          h('span', { class: 'apec-card-inner' }, h('span', { class: 'apec-card-front' }, c.front), h('span', { class: 'apec-card-back' }, c.back)));
        b.addEventListener('click', () => { const on = b.classList.toggle('flipped'); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? `${c.front}: ${c.back}` : `Tarjeta: ${c.front}. Toca para ver la respuesta.`); });
        return b;
      })));
    if (!progress.lessonSeen[m.n]) { progress.lessonSeen[m.n] = new Date().toISOString(); persist(); renderTabs(); }
  }
  const dots = h('div', { class: 'apec-dots', 'aria-hidden': 'true' }, Array.from({ length: total + 1 }, (_, i) => h('i', { class: i === s ? 'on' : i < s ? 'seen' : '' })));
  const prev = h('button', { type: 'button', class: 'sqlc-btn', disabled: s === 0 ? true : null, onclick: () => { session.slide -= 1; renderBody(); } }, '◀ Anterior');
  const nextLabel = s < total ? (s === 0 ? 'Empezar la explicación ▶' : 'Siguiente ▶') : 'Ir a las actividades ▶';
  const next = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => {
    if (s < total) { session.slide += 1; renderBody(); setTimeout(() => ui.body.querySelector('.apec-nav .sqlc-btn-primary')?.focus(), 20); return; }
    const first = session.queue.findIndex((p) => !progress.completed[p.id]);
    go(first >= 0 ? first : 'reflection');
  } }, nextLabel);
  ui.body.append(h('div', { class: 'apec-lesson' }, card, h('div', { class: 'apec-nav' }, prev, dots, next)));
}

/* ---------------- actividades ---------------- */
function activityShell(p, idx) {
  const done = Boolean(progress.completed[p.id]);
  const fb = h('div', { class: 'apec-feedback', role: 'status', 'aria-live': 'polite' });
  const nextBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-success', hidden: true, onclick: () => goNextFrom(idx) });
  const lessonBtn = session.kind === 'mission'
    ? h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost apec-relesson', onclick: () => { session.slide = 1; go('lesson'); } }, '📖 Volver a la explicación')
    : null;
  const head = h('div', { class: 'apec-act-head' },
    h('div', { class: 'apec-kicker' }, session.kind === 'bonus' ? `⭐ Reto nerd ${idx + 1} de ${session.queue.length}` : `🎯 Actividad ${idx + 1} de ${session.queue.length}`),
    h('h3', {}, p.title));
  const prompt = h('div', { class: 'apec-rich apec-prompt', html: p.prompt });
  const work = h('div', { class: 'apec-work' });
  const success = (already = false) => {
    fb.className = 'apec-feedback ok';
    fb.innerHTML = already ? '✔ <b>Actividad ya lograda.</b> Puedes volver a practicarla o seguir.' : `✔ <b>¡Lograda!</b> ${praise()}`;
    const last = idx >= session.queue.length - 1;
    nextBtn.hidden = false;
    nextBtn.textContent = last ? (session.kind === 'mission' ? 'Ir a la reflexión ▶' : 'Volver al juego ▶') : 'Siguiente actividad ▶';
    if (!already) setTimeout(() => nextBtn.focus(), 30);
  };
  const fail = (msg, extra) => {
    fb.className = 'apec-feedback fail';
    fb.replaceChildren(h('span', { class: 'apec-fb-icon', 'aria-hidden': 'true' }, '🔎'), h('div', { html: msg }), extra || '');
  };
  const markDone = () => {
    if (progress.completed[p.id]) return;
    const before = earnedIds(progress);
    progress.completed[p.id] = new Date().toISOString();
    persist();
    renderTabs();
    computeBadges(progress).filter((b) => b.earned && !before.has(b.id)).forEach((b, i) => setTimeout(() => showToast(`🏅 ¡Nueva insignia: ${b.icon} ${b.name}! Mírala en tu inventario.`), 500 + i * 2900));
  };
  const attempt = () => { progress.attempts[p.id] = (progress.attempts[p.id] || 0) + 1; save(KEY_PROGRESS, progress); return progress.attempts[p.id]; };
  const layout = ['python', 'predict'].includes(p.type) ? 'apec-split' : ['mbsim', 'wires', 'pinwire', 'ohm', 'ports', 'mltrain', 'mlprog'].includes(p.type) ? 'apec-sim' : 'apec-stack';
  const wide = p.type === 'mbsim' && (p.blockStarter || p.blocks) ? ' apec-sim-wide' : '';
  const left = h('section', { class: 'apec-act-left' }, head, prompt, fb, h('div', { class: 'apec-act-actions' }, nextBtn, lessonBtn));
  const wrap = h('div', { class: `apec-activity ${layout}${wide}` }, left, work);
  ui.body.append(wrap);
  if (done) success(true);
  const onLeave = (fn) => leaveFns.push(fn);
  return { work, fb, success, fail, markDone, attempt, done, onLeave };
}

const PRAISES = ['¡Muy bien! Eso es justo lo que había que hacer.', '¡Excelente trabajo!', '¡Bien pensado!', '¡Lo lograste! Sigue así.', '¡Impecable!'];
const praise = () => PRAISES[Math.floor(Math.random() * PRAISES.length)].replace('Sigue', 'Sigue');

function verdict(ctx, ok, failMsg) {
  const n = ctx.attempt();
  if (ok) { ctx.markDone(); ctx.success(); return; }
  ctx.fail(`${failMsg}${n >= 3 ? '<br><small>¿Te trancaste? Toca <b>📖 Volver a la explicación</b> y repasa el tema. ¡Equivocarse es parte de aprender!</small>' : ''}`);
}

function renderActivity(p, idx) {
  const ctx = activityShell(p, idx);
  const simHelpers = {
    verdict, highlight,
    saveCode: (id, v) => { progress.code[id] = v; save(KEY_PROGRESS, progress); },
    loadCode: (id) => progress.code[id] ?? null,
  };
  const SIMS = { mbsim: renderMbsim, ports: renderPorts, ohm: renderOhm, wires: renderWires, pinwire: renderPinwire, mltrain: renderMltrain, mlprog: renderMlprog };
  if (SIMS[p.type]) { SIMS[p.type](p, ctx, simHelpers); return; }
  const R = { order: renderOrder, classify: renderClassify, choice: renderChoice, led: renderLed, predict: renderPredict, python: renderPython };
  (R[p.type] || renderChoice)(p, ctx);
}

/* ---- ordenar ---- */
function renderOrder(p, ctx) {
  let order = shuffle(p.items.map((_, i) => i));
  while (order.every((v, i) => v === i) && p.items.length > 1) order = shuffle(order);
  if (ctx.done) order = p.items.map((_, i) => i);
  const list = h('ol', { class: 'apec-order', 'aria-label': 'Lista para ordenar' });
  const draw = (focusIdx = null, dir = null) => {
    list.replaceChildren(...order.map((it, pos) => h('li', { class: 'apec-order-item' },
      h('span', { class: 'apec-order-n', 'aria-hidden': 'true' }, String(pos + 1)),
      h('span', { class: 'apec-order-text' }, p.items[it]),
      h('span', { class: 'apec-order-btns' },
        h('button', { type: 'button', class: 'sqlc-icon-btn', 'aria-label': `Subir: ${p.items[it]}`, disabled: pos === 0 ? true : null, 'data-k': `${pos}-up`, onclick: () => { [order[pos - 1], order[pos]] = [order[pos], order[pos - 1]]; draw(pos - 1, 'up'); } }, '▲'),
        h('button', { type: 'button', class: 'sqlc-icon-btn', 'aria-label': `Bajar: ${p.items[it]}`, disabled: pos === order.length - 1 ? true : null, 'data-k': `${pos}-down`, onclick: () => { [order[pos + 1], order[pos]] = [order[pos], order[pos + 1]]; draw(pos + 1, 'down'); } }, '▼')))));
    if (focusIdx !== null) {
      const btn = list.querySelector(`[data-k="${focusIdx}-${dir}"]`) || list.querySelector(`[data-k="${focusIdx}-${dir === 'up' ? 'down' : 'up'}"]`);
      btn?.focus();
    }
  };
  draw();
  const check = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => {
    const ok = order.every((v, i) => v === i);
    const right = order.filter((v, i) => v === i).length;
    verdict(ctx, ok, `${right} de ${order.length} están en su lugar. ${p.fail}`);
  } }, '✔ Comprobar orden');
  ctx.work.append(h('p', { class: 'apec-muted' }, 'Usa ▲ y ▼ para mover cada paso.'), list, h('div', { class: 'apec-row' }, check));
}

/* ---- clasificar ---- */
function renderClassify(p, ctx) {
  const items = shuffle(p.items.map((it, i) => ({ ...it, i })));
  const pick = {};
  if (ctx.done) items.forEach((it) => { pick[it.i] = it.cat; });
  const rows = h('div', { class: 'apec-classify' });
  const draw = () => {
    rows.replaceChildren(...items.map((it) => h('div', { class: 'apec-cl-row', 'data-i': it.i },
      h('div', { class: `apec-cl-text ${p.mono ? 'mono' : ''}` }, it.text),
      h('div', { class: 'apec-cl-opts', role: 'radiogroup', 'aria-label': `Categoría para: ${it.text}` },
        p.categories.map((c, ci) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': String(pick[it.i] === ci), class: `apec-pill ${pick[it.i] === ci ? 'on' : ''}`,
          onclick: (e) => { pick[it.i] = ci; e.currentTarget.closest('.apec-cl-row').classList.remove('wrong'); draw(); rows.querySelector(`[data-i="${it.i}"] .apec-pill.on`)?.focus(); },
        }, c))))));
  };
  draw();
  const check = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => {
    const missing = items.filter((it) => pick[it.i] === undefined).length;
    if (missing) { ctx.fail(`Te falta clasificar ${missing} ${missing === 1 ? 'elemento' : 'elementos'}.`); return; }
    let wrong = 0;
    for (const it of items) {
      const row = rows.querySelector(`[data-i="${it.i}"]`);
      const bad = pick[it.i] !== it.cat;
      row.classList.toggle('wrong', bad);
      if (bad) wrong += 1;
    }
    verdict(ctx, wrong === 0, `Hay ${wrong} ${wrong === 1 ? 'elemento mal clasificado (marcado en rojo)' : 'elementos mal clasificados (marcados en rojo)'}. ${p.fail}`);
  } }, '✔ Comprobar');
  ctx.work.append(rows, h('div', { class: 'apec-row' }, check));
}

/* ---- opción múltiple ---- */
function renderChoice(p, ctx) {
  const order = shuffle(p.options.map((_, i) => i));
  const box = h('div', { class: `apec-choices ${p.code ? 'code' : ''}`, role: 'group', 'aria-label': 'Opciones' });
  for (const i of order) {
    const b = h('button', { type: 'button', class: `apec-choice ${ctx.done && i === p.answer ? 'right' : ''}` },
      p.code ? h('pre', {}, p.options[i]) : p.options[i]);
    b.addEventListener('click', () => {
      if (progress.completed[p.id] && b.classList.contains('right')) return;
      box.querySelectorAll('.apec-choice').forEach((x) => x.classList.remove('wrong'));
      b.classList.add(i === p.answer ? 'right' : 'wrong');
      verdict(ctx, i === p.answer, p.fail);
    });
    box.append(b);
  }
  ctx.work.append(box);
}

/* ---- matriz de LED (micro:bit) ---- */
function renderLed(p, ctx) {
  const on = new Set(ctx.done ? p.target.map(([x, y]) => `${x},${y}`) : []);
  const grid = h('div', { class: 'apec-microbit', role: 'grid', 'aria-label': 'Matriz de LED de 5 por 5. x es la columna, y es la fila.' });
  const cells = [];
  for (let y = 0; y < 5; y++) {
    const row = h('div', { class: 'apec-mb-row', role: 'row' });
    for (let x = 0; x < 5; x++) {
      const k = `${x},${y}`;
      const b = h('button', { type: 'button', role: 'gridcell', class: `apec-led ${on.has(k) ? 'on' : ''}`, 'aria-pressed': String(on.has(k)), 'aria-label': `LED x ${x}, y ${y}`, title: `(${x}, ${y})` });
      b.addEventListener('click', () => { if (on.has(k)) on.delete(k); else on.add(k); b.classList.toggle('on', on.has(k)); b.setAttribute('aria-pressed', String(on.has(k))); });
      b.addEventListener('keydown', (e) => {
        const mv = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
        if (!mv) return;
        e.preventDefault();
        const nx = Math.max(0, Math.min(4, x + mv[0])); const ny = Math.max(0, Math.min(4, y + mv[1]));
        cells[ny * 5 + nx].focus();
      });
      cells.push(b);
      row.append(b);
    }
    grid.append(row);
  }
  const xAxis = h('div', { class: 'apec-mb-x', 'aria-hidden': 'true' }, [0, 1, 2, 3, 4].map((n) => h('span', {}, String(n))));
  const yAxis = h('div', { class: 'apec-mb-y', 'aria-hidden': 'true' }, [0, 1, 2, 3, 4].map((n) => h('span', {}, String(n))));
  const board = h('div', { class: 'apec-mb-board' }, h('div', { class: 'apec-mb-corner', 'aria-hidden': 'true' }, 'y\\x'), xAxis, yAxis, grid,
    h('div', { class: 'apec-mb-btns', 'aria-hidden': 'true' }, h('span', {}, 'A'), h('span', {}, 'B')));
  const check = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => {
    const target = new Set(p.target.map(([x, y]) => `${x},${y}`));
    const extra = [...on].filter((k) => !target.has(k)).length;
    const missing = [...target].filter((k) => !on.has(k)).length;
    verdict(ctx, !extra && !missing, `${missing ? `Te faltan ${missing} LED. ` : ''}${extra ? `Hay ${extra} LED prendidos que el programa no pide. ` : ''}${p.fail}`);
  } }, '✔ Comprobar dibujo');
  const clear = h('button', { type: 'button', class: 'sqlc-btn', onclick: () => { on.clear(); cells.forEach((c) => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); }); } }, 'Borrar todo');
  ctx.work.append(board, h('div', { class: 'apec-row' }, check, clear));
}

/* ---- predecir la salida ---- */
function renderPredict(p, ctx) {
  const area = h('textarea', { class: 'apec-answer', rows: '4', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Tu predicción de la salida, una línea por print', placeholder: 'Escribe acá lo que crees que muestra, una línea por cada print' });
  area.value = progress.code[p.id] || '';
  area.addEventListener('keydown', (e) => e.stopPropagation());
  const check = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: async () => {
    const r = await runPython(p.code);
    const expected = r.out.split('\n').map((l) => l.trim()).filter(Boolean);
    const got = area.value.split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).filter(Boolean);
    progress.code[p.id] = area.value;
    save(KEY_PROGRESS, progress);
    if (!got.length) { ctx.fail('Escribe tu predicción primero.'); return; }
    if (got.length !== expected.length) { verdict(ctx, false, `El programa muestra ${expected.length} líneas y escribiste ${got.length}. Cada print() es una línea.`); return; }
    const bad = expected.map((e, i) => (norm(e.replace(/\s+/g, ' ')) === norm(got[i]) && e.replace(/\s+/g, ' ') === got[i] ? null : i + 1)).filter(Boolean);
    const badCase = expected.map((e, i) => (norm(e) === norm(got[i]) && e.replace(/\s+/g, ' ') !== got[i] ? i + 1 : null)).filter(Boolean);
    if (!bad.length) { verdict(ctx, true, ''); showOut(); return; }
    verdict(ctx, false, `Revisa la línea ${bad.join(' y la ')}.${badCase.length ? ' (¡Ojo con las mayúsculas y minúsculas!)' : ''} ${p.fail}`);
  } }, '✔ Comprobar predicción');
  const out = h('pre', { class: 'apec-out', hidden: true });
  const showOut = async () => { const r = await runPython(p.code); out.hidden = false; out.textContent = `▶ Salida real del programa:\n${r.out}`; };
  if (ctx.done) showOut();
  ctx.work.append(h('div', { class: 'apec-codeview' }, h('div', { class: 'apec-codeview-title' }, '📄 programa.py'), h('pre', { class: 'apec-code', html: highlight(p.code) })),
    h('label', { class: 'apec-label' }, '✍️ ¿Qué va a mostrar?', area), h('div', { class: 'apec-row' }, check), out);
}

/* ---- programar en Python ---- */
function pythonWorkspace({ id, starter = '', onVerify = null, verifyLabel = '✔ Verificar actividad' }) {
  const editor = h('textarea', { class: 'apec-editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', 'aria-label': 'Editor de código Python. Tab inserta sangría. Ctrl+Enter ejecuta.', wrap: 'off' });
  editor.value = (id && progress.code[id]) || starter;
  const gutter = h('div', { class: 'apec-gutter', 'aria-hidden': 'true' });
  const syncGutter = () => { const n = editor.value.split('\n').length; gutter.textContent = Array.from({ length: Math.max(n, 1) }, (_, i) => i + 1).join('\n'); gutter.scrollTop = editor.scrollTop; };
  editor.addEventListener('input', () => { syncGutter(); if (id) { progress.code[id] = editor.value; save(KEY_PROGRESS, progress); } });
  editor.addEventListener('scroll', () => { gutter.scrollTop = editor.scrollTop; });
  syncGutter();
  const consoleEl = h('div', { class: 'apec-console', 'aria-live': 'polite', 'aria-label': 'Consola de salida' }, h('div', { class: 'apec-console-hint' }, 'Acá vas a ver lo que muestra tu programa.'));
  let running = false;
  const runBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-run' }, '▶ Ejecutar');
  const verifyBtn = onVerify ? h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary' }, verifyLabel) : null;
  const clearBtn = h('button', { type: 'button', class: 'sqlc-btn', onclick: () => consoleEl.replaceChildren() }, 'Limpiar');
  const resetBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost', title: 'Volver al código inicial', onclick: async () => {
    if (!(await askConfirm('¿Volver al código inicial? Se borra lo que escribiste en esta actividad.', { okText: 'Volver al inicial' }))) return;
    editor.value = starter; syncGutter(); if (id) { progress.code[id] = starter; save(KEY_PROGRESS, progress); } editor.focus();
  } }, '↺');

  const write = (text, cls = '') => {
    consoleEl.querySelector('.apec-console-hint')?.remove();
    let last = consoleEl.lastElementChild;
    if (!last || !last.classList.contains('apec-con-out') || last.dataset.cls !== cls) {
      last = h('pre', { class: `apec-con-out ${cls}`, 'data-cls': cls });
      consoleEl.append(last);
    }
    last.textContent += text;
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };
  const showError = (err) => {
    consoleEl.append(h('pre', { class: 'apec-con-err' }, err.toPython()));
    if (err.hint) consoleEl.append(h('div', { class: 'apec-con-hint' }, `💡 ${err.hint}`));
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };
  const askInput = () => new Promise((resolve) => {
    const inp = h('input', { type: 'text', class: 'apec-con-input', 'aria-label': 'Escribe la respuesta que pide el programa y aprieta Enter', autocomplete: 'off', spellcheck: 'false' });
    const ok = h('button', { type: 'button', class: 'sqlc-btn apec-con-enter' }, '↵');
    const row = h('div', { class: 'apec-con-inrow' }, inp, ok);
    consoleEl.append(row);
    consoleEl.scrollTop = consoleEl.scrollHeight;
    const send = () => { const v = inp.value; row.remove(); resolve(v); };
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); send(); } });
    ok.addEventListener('click', send);
    setTimeout(() => inp.focus(), 20);
  });
  const run = async () => {
    if (running) return;
    running = true; runBtn.disabled = true; if (verifyBtn) verifyBtn.disabled = true;
    consoleEl.querySelector('.apec-console-hint')?.remove();
    consoleEl.append(h('div', { class: 'apec-con-sep' }, '▶ programa.py'));
    const it = new Interpreter({ write: (t, kind) => write(t, kind === 'echo' ? 'echo' : kind === 'prompt' ? 'prompt' : ''), input: askInput });
    try { await it.run(editor.value); consoleEl.append(h('div', { class: 'apec-con-end' }, '— fin del programa —')); } catch (e) {
      if (e instanceof PyError) showError(e); else showError(new PyError('RuntimeError', String(e?.message || e)));
    }
    consoleEl.scrollTop = consoleEl.scrollHeight;
    running = false; runBtn.disabled = false; if (verifyBtn) verifyBtn.disabled = false;
  };
  runBtn.addEventListener('click', run);
  if (verifyBtn) verifyBtn.addEventListener('click', async () => {
    if (running) return;
    verifyBtn.disabled = true;
    try { await onVerify(editor.value, { showError, write, consoleEl }); } finally { verifyBtn.disabled = false; }
  });
  editor.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart; const en = editor.selectionEnd;
      if (e.shiftKey) {
        const ls = editor.value.lastIndexOf('\n', s - 1) + 1;
        if (editor.value.slice(ls, ls + 4) === '    ') { editor.setRangeText('', ls, ls + 4, 'preserve'); editor.selectionStart = editor.selectionEnd = Math.max(ls, s - 4); }
      } else editor.setRangeText('    ', s, en, 'end');
      editor.dispatchEvent(new Event('input'));
      return;
    }
    if (e.key === 'Enter') {
      // sangría automática: mantener la de la línea anterior y sumar 4 después de ':'
      const s = editor.selectionStart;
      const ls = editor.value.lastIndexOf('\n', s - 1) + 1;
      const line = editor.value.slice(ls, s);
      let ind = /^ */.exec(line)[0];
      if (/:\s*$/.test(line)) ind += '    ';
      e.preventDefault();
      editor.setRangeText(`\n${ind}`, s, editor.selectionEnd, 'end');
      editor.dispatchEvent(new Event('input'));
    }
  });
  const box = h('div', { class: 'apec-ide' },
    h('div', { class: 'apec-ide-title' }, h('span', {}, '🐍 programa.py'), h('span', { class: 'apec-ide-keys' }, 'Tab: sangría · Ctrl+Enter: ejecutar')),
    h('div', { class: 'apec-editor-wrap' }, gutter, editor),
    h('div', { class: 'apec-toolbar' }, runBtn, verifyBtn, clearBtn, resetBtn),
    consoleEl);
  return { box, editor, consoleEl, showError };
}

function renderPython(p, ctx) {
  const ws = pythonWorkspace({
    id: p.id,
    starter: p.starter || '',
    onVerify: async (code, { showError, consoleEl }) => {
      const res = p.custom ? await p.custom(code) : await checkPython(code, p);
      if (!res.ok) {
        if (res.error) { consoleEl.append(h('div', { class: 'apec-con-sep' }, '✔ verificación')); if (res.transcript) consoleEl.append(h('pre', { class: 'apec-con-out' }, res.transcript)); showError(res.error); }
        else if (res.transcript !== undefined) { consoleEl.append(h('div', { class: 'apec-con-sep' }, '✔ verificación'), h('pre', { class: 'apec-con-out' }, res.transcript || '(no mostró nada)')); }
      } else {
        consoleEl.append(h('div', { class: 'apec-con-sep ok' }, '✔ verificación: ¡todas las pruebas pasaron!'));
      }
      consoleEl.scrollTop = consoleEl.scrollHeight;
      verdict(ctx, res.ok, res.msg || '');
    },
  });
  ctx.work.append(ws.box);
}

/* ---------------- reflexión ---------------- */
const FEEL = [
  { v: 'logrado', icon: '🟢', text: 'Lo logré: puedo explicarlo' },
  { v: 'casi', icon: '🟡', text: 'Casi: tengo alguna duda' },
  { v: 'ayuda', icon: '🔴', text: 'Necesito más ayuda' },
];
function renderReflection() {
  const m = session.mission;
  const prev = progress.reflections[m.n] || {};
  let feel = prev.feel || null;
  const area = h('textarea', { class: 'apec-answer apec-reflect', rows: '5', 'aria-label': 'Tu reflexión', placeholder: 'Escribe con tus palabras (mínimo dos oraciones).' });
  area.value = prev.text || '';
  area.addEventListener('keydown', (e) => e.stopPropagation());
  const fb = h('div', { class: 'apec-feedback', role: 'status', 'aria-live': 'polite' });
  const feelBox = h('div', { class: 'apec-feel', role: 'radiogroup', 'aria-label': '¿Cómo te sientes con este tema?' });
  const drawFeel = () => feelBox.replaceChildren(...FEEL.map((f) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(feel === f.v), class: `apec-pill ${feel === f.v ? 'on' : ''}`, onclick: () => { feel = f.v; drawFeel(); } }, `${f.icon} ${f.text}`)));
  drawFeel();
  const goalsBox = h('ul', { class: 'apec-goals small' }, m.goals.map((g) => h('li', {}, h('span', { 'aria-hidden': 'true' }, '✅'), g)));
  const saveBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => {
    const text = area.value.trim();
    if (text.split(/\s+/).filter(Boolean).length < 8) { fb.className = 'apec-feedback fail'; fb.textContent = 'Escribe un poco más (al menos 8 palabras). Esta reflexión va a tu portafolio.'; area.focus(); return; }
    if (!feel) { fb.className = 'apec-feedback fail'; fb.textContent = 'Elige cómo te sientes con este tema.'; return; }
    const first = !prev.text;
    progress.reflections[m.n] = { text, feel, at: new Date().toISOString() };
    persist();
    renderTabs();
    fb.className = 'apec-feedback ok';
    fb.innerHTML = `✔ <b>Reflexión guardada en tu portafolio.</b> ${feel === 'ayuda' ? 'Avísale a tu docente qué parte te costó: para eso es el APE.' : '¡Misión completa!'}`;
    finishBtn.hidden = false;
    if (first) setTimeout(() => finishBtn.focus(), 30);
  } }, '💾 Guardar en mi portafolio');
  const finishBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-success', hidden: !prev.text, onclick: () => close(true) }, session.onSolved ? 'Volver a la historia ▶' : 'Cerrar ▶');
  ui.body.append(h('article', { class: 'apec-slide apec-reflection' },
    h('div', { class: 'apec-kicker' }, '🪞 Reflexión para tu portafolio'),
    h('h3', {}, 'Mira tus metas de aprendizaje'),
    goalsBox,
    h('p', { class: 'apec-q' }, m.reflection),
    area,
    h('p', { class: 'apec-label' }, '¿Cómo te sientes con este tema?'), feelBox,
    fb, h('div', { class: 'apec-row' }, saveBtn, finishBtn)));
}

/* ---------------- práctica libre ---------------- */
const IDEAS = [
  'Pide tu nombre y muéstralo al revés con nombre[::-1]… (¡ups, eso no está en el juego!). Mejor: muéstralo en MAYÚSCULAS.',
  'Calcula cuántos días viviste: edad × 365.',
  'Convierte grados Celsius a Fahrenheit: f = c * 9 / 5 + 32.',
  'Haz un dado con import random y random.randint(1, 6).',
  'Pide una contraseña y muestra "Acceso concedido" solo si es la correcta.',
  'Muestra si un número es par o impar con el operador %.',
];
function renderSandbox() {
  const ws = pythonWorkspace({ id: null, starter: load(KEY_SANDBOX, 'nombre = input("¿Cómo te llamas? ")\nprint("¡Hola,", nombre + "!")\n') });
  ws.editor.addEventListener('input', () => save(KEY_SANDBOX, ws.editor.value));
  const left = h('section', { class: 'apec-act-left' },
    h('div', { class: 'apec-kicker' }, '🐍 Práctica libre'), h('h3', {}, 'Tu laboratorio de Python'),
    h('div', { class: 'apec-rich', html: `<p>Escribe cualquier programa y ejecútalo. Puedes usar <code>print</code>, <code>input</code>, variables, <code>int()</code>, <code>float()</code>, <code>str()</code>, funciones de texto, <code>import math</code>, <code>import random</code>, <code>if / elif / else</code>, <code>while</code> y <code>for</code>.</p>` }),
    h('div', { class: 'sqlc-ideas' }, h('b', {}, 'Ideas para practicar:'), h('ol', {}, IDEAS.slice(1).map((t) => h('li', {}, t)))));
  ui.body.append(h('div', { class: 'apec-activity apec-split' }, left, ws.box));
}

/* ---------------- resaltado simple de Python ---------------- */
function highlight(code) {
  return esc(code).split('\n').map((line) => {
    const hashIdx = (() => { let q = null; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '#') return i; } return -1; })();
    let codePart = hashIdx >= 0 ? line.slice(0, hashIdx) : line;
    const comment = hashIdx >= 0 ? `<span class="tk-com">${line.slice(hashIdx)}</span>` : '';
    codePart = codePart.replace(/(&quot;.*?&quot;|'.*?')|\b(if|elif|else|while|for|in|and|or|not|import|from|def|return|True|False|None)\b|\b(print|input|int|float|str|len|round|type|abs|max|min)\b(?=\()|\b(\d+(?:\.\d+)?)\b/g,
      (m, s, kw, fn, n) => (s ? `<span class="tk-str">${s}</span>` : kw ? `<span class="tk-kw">${kw}</span>` : fn ? `<span class="tk-fn">${fn}</span>` : `<span class="tk-num">${n}</span>`));
    return codePart + comment;
  }).join('\n');
}

/* ---------------- navegación ---------------- */
function goNextFrom(idx) {
  if (idx < session.queue.length - 1) { go(idx + 1); return; }
  if (session.kind === 'mission') { go('reflection'); return; }
  close(true);
}

function open() {
  const u = buildUi();
  mount(u.root);
  applyTheme(u.root);
  const wasHidden = u.root.hidden;
  u.root.hidden = false;
  document.documentElement.classList.add('sqlc-open');
  if (wasHidden) lockGame();
  renderHeader();
  renderTabs();
  renderBody();
  setTimeout(() => u.body.querySelector('button.sqlc-btn-primary, .apec-editor')?.focus(), 40);
}

let closing = false;
async function close(solved) {
  if (!ui || ui.root.hidden || closing) return;
  const s = session;
  if (s?.onSolved && !solved && s.kind !== 'sandbox') {
    const st = s.kind === 'mission' ? missionState(s.mission.n) : null;
    const pending = s.queue.filter((q) => !progress.completed[q.id]).length + (st && !st.reflection ? 1 : 0);
    if (pending > 0) {
      closing = true;
      const leave = await askConfirm(`Te ${pending === 1 ? 'falta 1 parte' : `faltan ${pending} partes`} de esta misión. ¿Salir? Tu avance queda guardado y puedes volver desde la escena o desde 🗺 Contenidos.`, { okText: 'Salir', cancelText: 'Seguir acá' });
      closing = false;
      if (!leave || session !== s) return;
    }
  }
  runLeave();
  ui.root.hidden = true;
  document.documentElement.classList.remove('sqlc-open');
  session = null;
  unlockGame();
  if (s?.kind === 'sandbox') { s.onClose?.(); return; }
  const allDone = s && s.queue.every((q) => progress.completed[q.id]) && (s.kind !== 'mission' || missionState(s.mission.n).reflection);
  if (allDone) s.onSolved?.(); else s?.onCancel?.();
}

/** Abre la consola de una misión (- SQL: mision-N / nerd-X / libre). */
export function openSqlChallenge(challengeId, { onSolved, onCancel } = {}) {
  const id = String(challengeId).trim().toLowerCase();
  if (id === 'libre') { openFreePractice({ onClose: onSolved }); return; }
  const targets = phasesFor(id);
  if (!targets.length) { console.warn(`[GTA APE] Reto desconocido: ${challengeId}`); onSolved?.(); return; }
  if (targets[0].bonus) {
    if (targets.every((p) => progress.completed[p.id])) {
      showToast(`✔ Misión nerd de ${CENTERS[targets[0].center].name} ya lograda. ¡Vuelve cuando quieras!`);
      onSolved?.();
      return;
    }
    session = { kind: 'bonus', queue: targets, view: Math.max(0, targets.findIndex((p) => !progress.completed[p.id])), onSolved, onCancel };
    open();
    return;
  }
  const n = targets[0].mission;
  openMission(n, { onSolved, onCancel, fromStory: true });
}

function openMission(n, { onSolved = null, onCancel = null, fromStory = false } = {}) {
  const m = MISSION_BY_N[n];
  const st = missionState(n);
  if (fromStory && st.complete) { showToast(`✔ Misión ${n} ya completa. ¡Bien!`); onSolved?.(); return; }
  const queue = m.phases.map((p) => ({ ...p, mission: n }));
  let view = 'lesson';
  if (st.lesson) {
    const first = queue.findIndex((p) => !progress.completed[p.id]);
    view = first >= 0 ? first : 'reflection';
  }
  if (ui && !ui.root.hidden && session) { session.onCancel?.(); }
  session = { kind: 'mission', mission: m, queue, view, slide: 0, onSolved, onCancel };
  open();
}

export function openFreePractice({ onClose } = {}) {
  session = { kind: 'sandbox', queue: [], view: 'sandbox', onClose };
  open();
}

/* ======================================================================
   ÍNDICE DE CONTENIDOS (para estudiar sin seguir la historia)
   ====================================================================== */
let indexEl = null;
function closeIndex() { if (indexEl) { indexEl.remove(); indexEl = null; unlockGame(); } }
function openIndex() {
  if (ui && !ui.root.hidden && session?.onSolved) { showToast('Termina o sal de la misión actual para ver los contenidos.'); return; }
  if (indexEl) closeIndex();
  closeReport();
  if (ui && !ui.root.hidden) { runLeave(); ui.root.hidden = true; document.documentElement.classList.remove('sqlc-open'); session = null; unlockGame(); }
  const { grade, done, total } = getGrade();
  const cards = MISSIONS.map((m) => {
    const st = missionState(m.n);
    const status = st.complete ? '✔ Completa' : st.done || st.lesson ? `En curso · ${st.done}/${st.total}` : 'Sin empezar';
    return h('button', { type: 'button', class: `apei-card ${st.complete ? 'done' : ''} ${isPriority(m.n) ? 'prio' : ''}`, onclick: () => { closeIndex(); openMission(m.n); } },
      h('span', { class: 'apei-icon', 'aria-hidden': 'true' }, m.icon),
      h('span', { class: 'apei-text' },
        h('span', { class: 'apei-n' }, `Misión ${m.n} · ${AREAS[m.area].name}`, isPriority(m.n) ? h('b', { class: 'apei-prio' }, ' ⭐ Prioritaria') : null),
        h('b', { class: 'apei-title' }, m.title),
        h('small', {}, m.tema),
        h('span', { class: 'apei-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${((st.done + (st.reflection ? 1 : 0)) / (st.total + 1)) * 100}%` })),
        h('span', { class: 'apei-status' }, status)));
  });
  indexEl = h('div', { class: 'apei-root', id: 'apei-root', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'apei-title' },
    h('div', { class: 'apei-card-wrap' },
      h('header', { class: 'apei-head' },
        h('div', {}, h('div', { class: 'apec-kicker' }, 'APE · 9no · Ciencias de la Computación'), h('h2', { id: 'apei-title' }, '🗺 Contenidos del curso')),
        h('div', { class: 'apec-header-actions' },
          h('button', { type: 'button', class: 'sqlc-chip', onclick: () => { closeIndex(); openReport(); } }, `📊 Nota ${grade.toFixed(1)} · ${done}/${total}`),
          h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost', onclick: () => closeIndex() }, 'Cerrar ✕'))),
      h('p', { class: 'apei-intro' }, PRIORITY.length
        ? `Tu docente marcó con ⭐ las misiones prioritarias para tu APE. Empieza por esas. Cada misión tiene explicación, actividades y una reflexión.`
        : 'Puedes seguir la historia del juego o entrar directo al contenido que necesitas repasar. Cada misión tiene explicación, actividades y una reflexión.'),
      h('div', { class: 'apei-grid' }, cards,
        h('button', { type: 'button', class: 'apei-card sandbox', onclick: () => { closeIndex(); openFreePractice(); } },
          h('span', { class: 'apei-icon', 'aria-hidden': 'true' }, '🧪'),
          h('span', { class: 'apei-text' }, h('span', { class: 'apei-n' }, 'Sin nota'), h('b', { class: 'apei-title' }, 'Práctica libre de Python'), h('small', {}, 'Un editor para probar lo que quieras.')))),
      h('p', { class: 'shanuki-credit small', html: 'Recurso educativo <span class="sk-logo">SHANUKI</span>' })));
  applyTheme(indexEl);
  indexEl.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeIndex(); });
  mount(indexEl);
  lockGame();
  setTimeout(() => indexEl?.querySelector('.apei-card')?.focus(), 30);
}

/* ======================================================================
   REPORTE DE AVANCE
   ====================================================================== */
let reportEl = null;
function closeReport() { if (reportEl) { reportEl.remove(); reportEl = null; unlockGame(); } }
function openReport() {
  if (reportEl) closeReport();
  closeIndex();
  const student = load(KEY_STUDENT, { name: '', group: '' });
  const { grade, done, total } = getGrade();
  const nameIn = h('input', { type: 'text', value: student.name, placeholder: 'Nombre y apellido', 'aria-label': 'Nombre y apellido', oninput: (e) => { student.name = e.target.value; save(KEY_STUDENT, student); } });
  const groupIn = h('input', { type: 'text', value: student.group, placeholder: 'Grupo (ej: 9no 3)', 'aria-label': 'Grupo', oninput: (e) => { student.group = e.target.value; save(KEY_STUDENT, student); } });
  const rows = MISSIONS.map((m) => {
    const st = missionState(m.n);
    const refl = progress.reflections[m.n];
    const feel = FEEL.find((f) => f.v === refl?.feel);
    return h('tr', { class: st.complete ? 'done' : '' },
      h('td', {}, String(m.n)), h('td', {}, `${m.icon} ${m.title}${isPriority(m.n) ? ' ⭐' : ''}`),
      h('td', {}, st.lesson ? '✔' : '—'), h('td', {}, `${st.done}/${st.total}`),
      h('td', {}, feel ? `${feel.icon} ${feel.text.split(':')[0]}` : '—'),
      h('td', {}, st.complete ? '✔ Completa' : 'Pendiente'));
  });
  const pdfMsg = h('p', { class: 'sqlr-pdf-msg', role: 'status', 'aria-live': 'polite' });
  const entregasText = () => {
    const list = Array.isArray(progress.entregas) ? progress.entregas : [];
    if (!list.length) return 'Todavía no descargaste ningún PDF. Cada descarga queda registrada como una entrega (1, 2, 3…).';
    const last = list[list.length - 1];
    return `Entregas registradas: ${list.length}. La última fue la N.º ${last.n}, el ${new Date(last.fecha).toLocaleDateString('es-UY')}, con nota ${Number(last.nota).toFixed(1)}.`;
  };
  const onPdf = async (btn) => {
    pdfMsg.className = 'sqlr-pdf-msg';
    if (!student.name.trim() || !student.group.trim()) {
      pdfMsg.classList.add('fail');
      pdfMsg.textContent = 'Antes de descargar, escribe tu nombre y apellido y tu grupo.';
      (student.name.trim() ? groupIn : nameIn).focus();
      return;
    }
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Generando PDF…';
    try {
      const { filename, entrega } = await downloadProgressPdf({ student, progress, priority: PRIORITY, save: () => save(KEY_PROGRESS, progress) });
      pdfMsg.classList.add('ok');
      pdfMsg.textContent = `Listo: se descargó «${filename}» (entrega N.º ${entrega.n}, código ${entrega.code}). Súbelo a la tarea de CREA.`;
      reportEl?.querySelector('.sqlr-entregas')?.replaceChildren(entregasText());
    } catch (err) {
      pdfMsg.classList.add('fail');
      pdfMsg.textContent = window.self !== window.top
        ? 'Desde esta vista no se pueden descargar archivos. Abre el juego en su propia pestaña para descargar el PDF.'
        : `No se pudo generar el PDF: ${err.message}. Revisa la conexión a internet y prueba de nuevo.`;
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  };
  const byArea = Object.entries(AREAS).map(([k, a]) => {
    const all = PHASES.filter((p) => p.area === k);
    const d = all.filter((p) => progress.completed[p.id]).length;
    return h('div', { class: 'sqlr-kind' }, h('b', {}, `${a.icon} ${a.name}`), ` ${d}/${all.length}`, h('div', { class: 'sqlr-bar' }, h('span', { style: `width:${(d / all.length) * 100}%` })));
  });
  reportEl = h('div', { class: 'sqlr-root', id: 'sqlr-root', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Reporte de avance' },
    h('div', { class: 'sqlr-card' },
      h('div', { class: 'sqlr-head' },
        h('div', {}, h('div', { class: 'sqlr-kicker' }, 'GTA APE · Reporte de avance y portafolio'), h('h2', {}, 'Reinicio en Santa Bruma')),
        h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost sqlr-noprint', onclick: () => closeReport() }, 'Cerrar ✕')),
      h('div', { class: 'sqlr-student' }, h('label', {}, 'Estudiante', nameIn), h('label', {}, 'Grupo', groupIn),
        h('div', { class: 'sqlr-date' }, `Fecha: ${new Date().toLocaleDateString('es-UY')}`)),
      h('div', { class: 'sqlr-summary' },
        h('div', { class: 'sqlr-grade' }, h('span', {}, grade.toFixed(1)), h('small', {}, '/ 10')),
        h('div', { class: 'sqlr-summary-text' }, h('p', {}, `${done} de ${total} actividades logradas · ${Object.values(progress.reflections).filter((r) => r?.text).length} de ${MISSIONS.length} reflexiones.`), h('p', { class: 'sqlr-formula' }, 'Nota = (actividades logradas ÷ total) × 10'), ...byArea)),
      h('div', { class: 'sqlr-table-wrap' }, h('table', { class: 'sqlr-table' },
        h('thead', {}, h('tr', {}, ['#', 'Misión', 'Explicación', 'Actividades', 'Autoevaluación', 'Estado'].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', {}, rows))),
      PRIORITY.length ? h('p', { class: 'sqlr-formula' }, `⭐ Misiones prioritarias marcadas por tu docente: ${PRIORITY.join(', ')}.`) : null,
      h('h3', { class: 'sqlr-bonus-title' }, `⭐ Misiones nerds (bonus): ${BONUS.filter((p) => progress.completed[p.id]).length} de ${BONUS.length} retos`),
      h('div', { class: 'sqlr-bonus' }, Object.entries(CENTERS).map(([key, c]) => {
        const all = BONUS.filter((p) => p.center === key);
        const d = all.filter((p) => progress.completed[p.id]).length;
        return h('div', { class: `sqlr-bonus-item${d === all.length ? ' done' : ''}` }, h('span', { class: 'sqlr-bonus-icon', 'aria-hidden': 'true' }, c.icon), h('b', {}, c.name), h('small', {}, d === all.length ? '✔ completa' : `${d}/${all.length}`));
      })),
      h('p', { class: 'shanuki-credit sqlr-credit', html: 'Recurso educativo <span class="sk-logo">SHANUKI</span>' }),
      h('div', { class: 'sqlr-entregas' }, entregasText()),
      pdfMsg,
      h('div', { class: 'sqlr-actions sqlr-noprint' },
        h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary sqlr-pdf-btn', onclick: (e) => onPdf(e.currentTarget) }, '⬇ Descargar PDF (portafolio)'),
        window.self === window.top ? h('button', { type: 'button', class: 'sqlc-btn', onclick: () => window.print() }, '🖨 Imprimir') : null,
        h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-danger', onclick: () => resetAll() }, 'Borrar mi progreso'))));
  applyTheme(reportEl);
  reportEl.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeReport(); });
  mount(reportEl);
  lockGame();
  nameIn.focus();
}

async function resetAll() {
  if (!(await askConfirm('¿Borrar TODO tu progreso del APE (actividades, reflexiones y código)? Esto no se puede deshacer.', { okText: 'Borrar todo', danger: true }))) return;
  for (const k of ['completed', 'code', 'lessonSeen', 'reflections', 'attempts']) progress[k] = {};
  progress.entregas = [];
  progress.street = { solved: {}, helped: 0 };
  persist();
  closeReport();
}

/* ======================================================================
   MINI RETOS DE LA CALLE
   ====================================================================== */
function streetState() {
  progress.street = progress.street || { solved: {}, helped: 0 };
  progress.street.solved = progress.street.solved || {};
  return progress.street;
}
let lastStreetId = null;
function nextStreetChallenge() {
  const st = streetState();
  const pending = STREET_CHALLENGES.filter((c) => !st.solved[c.id] && c.id !== lastStreetId);
  const pool = pending.length ? pending : STREET_CHALLENGES.filter((c) => c.id !== lastStreetId);
  const c = pool[Math.floor(Math.random() * pool.length)];
  lastStreetId = c.id;
  return { id: c.id, who: c.who, icon: c.icon, cry: c.cry };
}

function openStreetChallenge(id, { onClose } = {}) {
  const c = getStreetChallenge(id);
  if (!c) { onClose?.({ solved: false }); return; }
  const st = streetState();
  let tries = 0;
  let solved = false;
  const fb = h('p', { class: 'street-fb', role: 'status', 'aria-live': 'polite' });
  const body = h('div', { class: 'street-body' });
  const closeBtn = h('button', { type: 'button', class: 'sqlc-btn', onclick: () => finish() }, 'Ahora no');
  const root = h('div', { class: 'street-root', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Mini reto: ${c.who}` },
    h('div', { class: 'street-card' },
      h('div', { class: 'street-head' }, h('span', { class: 'street-icon', 'aria-hidden': 'true' }, c.icon), h('div', {}, h('div', { class: 'street-kicker' }, '❗ Mini reto de la calle'), h('h3', {}, c.who))),
      h('p', { class: 'street-story' }, c.story),
      c.code ? h('pre', { class: 'street-code' }, c.code) : null,
      h('p', { class: 'street-q' }, c.question),
      body, fb,
      h('div', { class: 'street-actions' }, closeBtn)));
  const check = (ok) => {
    tries += 1;
    if (ok) {
      solved = true;
      if (!st.solved[c.id]) st.solved[c.id] = { firstTry: tries === 1, at: new Date().toISOString() };
      const before = earnedIds(progress);
      st.helped = (st.helped || 0) + 1;
      persist();
      const nuevas = computeBadges(progress).filter((b) => b.earned && !before.has(b.id));
      fb.className = 'street-fb ok';
      fb.replaceChildren(h('b', {}, '✔ ¡Bien! '), c.explain, h('br'), h('span', { class: 'street-thanks' }, `${c.who}: "${c.thanks}"`));
      body.querySelectorAll('button, input').forEach((el) => { el.disabled = true; });
      closeBtn.textContent = 'Seguir jugando ▶';
      closeBtn.className = 'sqlc-btn sqlc-btn-success';
      closeBtn.focus();
      nuevas.forEach((b, i) => setTimeout(() => showToast(`🏅 ¡Nueva insignia: ${b.icon} ${b.name}! Mírala en tu inventario.`), 600 + i * 2800));
    } else {
      fb.className = 'street-fb fail';
      fb.replaceChildren(h('b', {}, '✖ Todavía no. '), tries === 1 ? 'Léelo con calma y prueba otra vez.' : c.explain);
    }
  };
  if (c.type === 'fill') {
    const input = h('input', { type: 'text', class: 'street-input', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Tu respuesta' });
    const send = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => check(c.accept.map(normalizeAnswer).includes(normalizeAnswer(input.value))) }, 'Responder');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send.click(); } });
    body.append(h('div', { class: 'street-fill' }, input, send));
    setTimeout(() => input.focus(), 30);
  } else {
    const order = shuffle(c.options.map((_, i) => i));
    body.append(h('div', { class: 'street-options' }, order.map((i) => h('button', { type: 'button', class: 'street-opt', onclick: (e) => { e.currentTarget.classList.add(i === c.answer ? 'right' : 'wrong'); check(i === c.answer); } }, c.options[i]))));
  }
  function finish() {
    root.remove();
    unlockGame();
    onClose?.({ solved });
  }
  root.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') finish(); });
  lockGame();
  mount(root);
  applyTheme(root);
}

/* ---------------- insignias en el inventario ---------------- */
function renderInventoryBadges() {
  const screen = document.getElementById('inventory-screen');
  const card = screen?.querySelector('.inventory-card');
  if (!card) return;
  let box = card.querySelector('.inv-badges');
  if (!box) {
    box = h('section', { class: 'inv-badges', 'aria-label': 'Insignias' });
    card.insertBefore(box, card.querySelector('.inventory-actions'));
  }
  const list = computeBadges(progress);
  const got = list.filter((b) => b.earned).length;
  const info = h('p', { class: 'inv-badges-info', 'aria-live': 'polite' }, 'Toca una insignia para ver cómo se gana.');
  const groups = ['Misiones', 'Áreas', 'Misiones nerds', 'Calle'].map((g) => h('div', { class: 'inv-badges-group' },
    h('span', { class: 'inv-badges-label' }, g),
    h('div', { class: 'inv-badges-row' }, list.filter((b) => b.group === g).map((b) => h('button', {
      type: 'button', class: `inv-badge${b.earned ? ' earned' : ''}`, title: `${b.name} — ${b.desc}`,
      'aria-label': `${b.name}: ${b.earned ? 'ganada' : `bloqueada, ${b.progress}`}`,
      onclick: () => { info.textContent = `${b.earned ? '🏅' : '🔒'} ${b.name} (${b.title}) · ${b.desc}`; },
    }, h('span', { class: 'inv-badge-icon', 'aria-hidden': 'true' }, b.earned ? b.icon : '🔒'), h('span', { class: 'inv-badge-name' }, b.name))))));
  box.replaceChildren(h('div', { class: 'inv-badges-head' }, h('b', {}, '🏅 Insignias'), h('span', {}, `${got} de ${list.length}`)), ...groups, info);
}
function watchInventory() {
  const screen = document.getElementById('inventory-screen');
  if (!screen) { setTimeout(watchInventory, 500); return; }
  const check = () => { if (!screen.classList.contains('hidden')) renderInventoryBadges(); };
  new MutationObserver(check).observe(screen, { attributes: true, attributeFilter: ['class'] });
  check();
}

/* ---------------- arranque ---------------- */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { buildFab(); watchInventory(); });
  else { buildFab(); watchInventory(); }
  window.gtaSql = {
    openFreePractice, openSqlChallenge, getGrade, openReport, openIndex, nextStreetChallenge, openStreetChallenge,
    nerdDone: (center) => BONUS.some((p) => p.center === center) && BONUS.filter((p) => p.center === center).every((p) => progress.completed[p.id]),
  };
}
