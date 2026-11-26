// Interfaz de los simuladores de placas y circuitos (micro:bit, conectores, corriente, cables y protoboard).
import { MicrobitSim, patternOf } from './microbit-sim.js';
import { PyError, codeWithoutComments } from './python-mini.js';
import { solveCircuit } from './circuit-sim.js';
import { trainModel } from './ml-sim.js';
import { blocksToPython } from './blocks-gen.js';
import { createWorkspace } from './blocks.js';
import { Interpreter } from './python-mini.js';

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
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/* ======================================================================
   EDITOR (mismo comportamiento que el de Python: Tab, Enter con sangría, Ctrl+Enter)
   ====================================================================== */
function codeEditor({ value, readonly = false, onInput = () => {}, onRun = () => {}, highlight }) {
  if (readonly) {
    return { box: h('div', { class: 'apec-codeview' }, h('div', { class: 'apec-codeview-title' }, '📄 programa cargado en la placa'), h('pre', { class: 'apec-code', html: highlight(value) })), get value() { return value; } };
  }
  const editor = h('textarea', { class: 'apec-editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': 'Programa de la micro:bit en Python. Tab inserta sangría. Ctrl+Enter carga el programa.' });
  editor.value = value;
  const gutter = h('div', { class: 'apec-gutter', 'aria-hidden': 'true' });
  const sync = () => { gutter.textContent = Array.from({ length: Math.max(1, editor.value.split('\n').length) }, (_, i) => i + 1).join('\n'); gutter.scrollTop = editor.scrollTop; };
  editor.addEventListener('input', () => { sync(); onInput(editor.value); });
  editor.addEventListener('scroll', () => { gutter.scrollTop = editor.scrollTop; });
  editor.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onRun(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      if (e.shiftKey) {
        const ls = editor.value.lastIndexOf('\n', s - 1) + 1;
        if (editor.value.slice(ls, ls + 4) === '    ') { editor.setRangeText('', ls, ls + 4, 'preserve'); editor.selectionStart = editor.selectionEnd = Math.max(ls, s - 4); }
      } else editor.setRangeText('    ', s, editor.selectionEnd, 'end');
      editor.dispatchEvent(new Event('input'));
      return;
    }
    if (e.key === 'Enter') {
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
  sync();
  const box = h('div', { class: 'apec-editor-wrap apec-editor-wrap-sm' }, gutter, editor);
  return { box, editor, get value() { return editor.value; }, set value(v) { editor.value = v; sync(); } };
}

/* ======================================================================
   MICRO:BIT
   ====================================================================== */
function microbitBoard({ sensors = [], pins = false, onTrigger, onTemp, onExtLight, onLight }) {
  const cells = [];
  const matrix = h('div', { class: 'apec-microbit', role: 'img', 'aria-label': 'Matriz de LED de la micro:bit' });
  for (let y = 0; y < 5; y++) {
    const row = h('div', { class: 'apec-mb-row' });
    for (let x = 0; x < 5; x++) { const c = h('span', { class: 'apec-led sim' }); cells.push(c); row.append(c); }
    matrix.append(row);
  }
  const btn = (k, label, extra = '') => h('button', { type: 'button', class: `apec-mb-btn ${extra}`, 'aria-label': label, onclick: () => onTrigger(k) }, k === 'SHAKE' ? '🤚 Sacudir' : k);
  const bA = btn('A', 'Botón A'); const bB = btn('B', 'Botón B');
  const extLed = pins ? h('div', { class: 'apec-ext-led', 'aria-live': 'polite' }, h('span', { class: 'apec-ext-bulb' }), h('small', {}, 'LED en P0')) : null;
  const shown = h('div', { class: 'apec-mb-shown', 'aria-live': 'polite' }, 'La placa está apagada. Carga un programa.');
  const tempVal = h('b', {}, '21 °C');
  const temp = sensors.includes('temperature') ? h('label', { class: 'apec-mb-sensor' }, '🌡️ Temperatura ', tempVal,
    h('input', { type: 'range', min: '-5', max: '45', value: '21', 'aria-label': 'Temperatura del ambiente', oninput: (e) => { tempVal.textContent = `${e.target.value} °C`; onTemp(Number(e.target.value)); } })) : null;
  const lightVal = h('b', {}, '128');
  const lightCtl = sensors.includes('light') ? h('label', { class: 'apec-mb-sensor' }, '🔆 Nivel de luz ', lightVal,
    h('input', { type: 'range', min: '0', max: '255', value: '128', 'aria-label': 'Luz que recibe el sensor de la placa (0 a 255)', oninput: (e) => { lightVal.textContent = e.target.value; onLight?.(Number(e.target.value)); } })) : null;
  const extVal = h('b', {}, '70 %');
  const ext = sensors.includes('ext-light') ? h('label', { class: 'apec-mb-sensor' }, '🔆 Luz sobre el sensor (P1) ', extVal,
    h('input', { type: 'range', min: '0', max: '100', value: '70', 'aria-label': 'Luz que recibe el sensor externo', oninput: (e) => { extVal.textContent = `${e.target.value} %`; onExtLight?.(Number(e.target.value)); } })) : null;
  const board = h('div', { class: 'apec-mb-sim' },
    h('div', { class: 'apec-mb-face' }, bA, matrix, bB,
      h('div', { class: 'apec-mb-pins', 'aria-hidden': 'true' }, h('span', {}, '0'), h('span', {}, '1'), h('span', {}, '2'), h('span', {}, '3V'), h('span', {}, 'GND'))),
    h('div', { class: 'apec-mb-side' }, btn('SHAKE', 'Sacudir la placa', 'shake'), temp, lightCtl, ext, extLed),
    shown);
  const update = (sim) => {
    sim.leds.flat().forEach((v, i) => cells[i].classList.toggle('on', Boolean(v)));
    bA.classList.toggle('held', Boolean(sim.held.A));
    bB.classList.toggle('held', Boolean(sim.held.B));
    if (extLed) { const v = sim.pins.P0; extLed.classList.toggle('on', v > 0); extLed.style.setProperty('--glow', String(v)); }
    const last = sim.lastShown();
    if (sim.error) shown.textContent = '⚠️ La placa se detuvo por un error (míralo abajo).';
    else if (last) shown.textContent = `Última salida: ${last.kind === 'icon' ? `ícono ${last.value}` : last.kind === 'number' ? `número ${last.value}` : last.kind === 'string' ? `texto "${last.value}"` : last.value}`;
    else shown.textContent = 'Programa cargado. Usa las entradas de la placa.';
  };
  return { board, update, reset: () => { cells.forEach((c) => c.classList.remove('on')); shown.textContent = 'La placa está apagada. Carga un programa.'; extLed?.classList.remove('on'); } };
}

export function renderMbsim(p, ctx, { verdict, highlight, saveCode, loadCode }) {
  const log = h('div', { class: 'apec-console apec-console-sm', 'aria-live': 'polite' }, h('div', { class: 'apec-console-hint' }, 'Acá aparecen los errores del programa.'));
  let sim = null;
  let temp = 21;
  let extLight = 70;
  let light = 128;
  const showErr = (err) => {
    log.querySelector('.apec-console-hint')?.remove();
    log.append(h('pre', { class: 'apec-con-err' }, err.toPython()));
    if (err.hint) log.append(h('div', { class: 'apec-con-hint' }, `💡 ${err.hint}`));
    log.scrollTop = log.scrollHeight;
  };
  const board = microbitBoard({ sensors: p.sensors || [], pins: p.pins, onTrigger: (k) => sim?.trigger(k), onTemp: (v) => { temp = v; sim?.setTemperature(v); }, onExtLight: (v) => { extLight = v; sim?.setExtLight(v); }, onLight: (v) => { light = v; sim?.setLight(v); } });
  const goalsBox = p.goals ? h('ul', { class: 'apec-mb-goals' }) : null;
  const drawGoals = () => {
    if (!goalsBox) return;
    goalsBox.replaceChildren(...p.goals.map((g) => {
      const ok = sim && g.done(sim);
      return h('li', { class: ok ? 'ok' : '' }, h('span', { 'aria-hidden': 'true' }, ok ? '✅' : '⬜'), h('span', {}, h('b', {}, g.text), ok ? h('small', {}, ` · Entrada: ${g.input} → Salida: ${g.output}`) : ''));
    }));
  };
  let explored = false;
  const onChange = (s) => {
    board.update(s);
    if (p.goals) {
      drawGoals();
      if (!explored && p.goals.every((g) => g.done(s))) { explored = true; verdict(ctx, true, ''); }
    }
  };
  const start = async (code) => {
    sim?.stop();
    log.querySelectorAll('.apec-con-err, .apec-con-hint, .apec-con-sep').forEach((x) => x.remove());
    sim = new MicrobitSim({ realtime: true, onChange, onLog: (t, err) => { if (err) showErr(err); } });
    sim.setTemperature(temp);
    sim.setExtLight(extLight);
    sim.setLight(light);
    sim.inputsUsed.clear();
    const ok = await sim.load(code);
    if (ok) { sim.startForever(); log.append(h('div', { class: 'apec-con-sep ok' }, '▶ programa cargado en la placa')); }
    board.update(sim);
    drawGoals();
  };

  if (p.mode === 'explore') {
    const code = p.blocks ? blocksToPython(p.blocks).code : p.code;
    const view = p.blocks ? blocksView(p.blocks, ctx, highlight) : codeEditor({ value: p.code, readonly: true, highlight }).box;
    ctx.work.append(h('div', { class: 'apec-mb-layout' }, board.board, h('div', {}, goalsBox, view)));
    start(code);
    if (ctx.done) explored = true;
    ctx.onLeave(() => sim?.stop());
    return;
  }

  // ---- editor: bloques (placas) o texto ----
  let getCode;
  let editorBox;
  const pyView = h('pre', { class: 'apec-code apec-blocks-py', hidden: true });
  const warnBox = h('div', { class: 'apec-blocks-warn', 'aria-live': 'polite' });
  if (p.blocks !== undefined || p.blockStarter) {
    let area = null;
    const holder = h('div', { class: 'apec-blockly', 'aria-label': 'Área de bloques. Arrastra bloques desde las categorías de la izquierda.' }, h('p', { class: 'apec-muted apec-blockly-loading' }, 'Cargando los bloques…'));
    const saved = loadCode(p.id);
    let state = p.blockStarter || null;
    try { if (saved) state = JSON.parse(saved); } catch { /* bloques viejos */ }
    const refreshPy = () => {
      if (!area) return;
      const r = blocksToPython(area.save());
      pyView.textContent = r.code;
      warnBox.textContent = r.warnings.length ? `⚠️ ${r.warnings[0]}` : '';
    };
    getCode = () => (area ? blocksToPython(area.save()).code : '');
    editorBox = h('div', { class: 'apec-ide' },
      h('div', { class: 'apec-ide-title' }, h('span', {}, '🧩 Bloques (MakeCode)'), h('span', { class: 'apec-ide-keys' }, 'Arrastra desde las categorías · rueda: desplazar')),
      holder, warnBox);
    createWorkspace(holder, { state, only: p.toolbox || null, onChange: () => { if (area) { saveCode(p.id, JSON.stringify(area.save())); refreshPy(); } } })
      .then((a) => { area = a; holder.querySelector('.apec-blockly-loading')?.remove(); refreshPy(); a.resize(); })
      .catch(() => { holder.replaceChildren(h('p', { class: 'apec-feedback fail' }, 'No se pudieron cargar los bloques. Recarga la página.')); });
    const ro = new ResizeObserver(() => area?.resize());
    ro.observe(holder);
    ctx.onLeave(() => { ro.disconnect(); area?.dispose(); });
  } else {
    const ed = codeEditor({ value: loadCode(p.id) ?? p.starter ?? '', onInput: (v) => saveCode(p.id, v), onRun: () => start(ed.value), highlight });
    getCode = () => ed.value;
    editorBox = h('div', { class: 'apec-ide' }, h('div', { class: 'apec-ide-title' }, h('span', {}, '🟩 main.py (MakeCode Python)'), h('span', { class: 'apec-ide-keys' }, 'Tab: sangría · Ctrl+Enter: cargar')), ed.box);
  }
  const target = p.target ? h('div', { class: 'apec-mb-target' }, h('small', {}, '🎯 Objetivo'), h('div', { class: 'apec-mini-matrix', 'aria-label': 'Figura objetivo' },
    patternOf(p.target).replace(/\//g, '').split('').map((c) => h('i', { class: c === '#' ? 'on' : '' })))) : null;
  const runBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-run', onclick: () => start(getCode()) }, '▶ Cargar en la placa');
  const stopBtn = h('button', { type: 'button', class: 'sqlc-btn', onclick: () => { sim?.stop(); board.reset(); } }, '■ Apagar');
  const pyBtn = p.blocks !== undefined || p.blockStarter ? h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost', 'aria-pressed': 'false', onclick: (e) => { pyView.hidden = !pyView.hidden; e.currentTarget.setAttribute('aria-pressed', String(!pyView.hidden)); e.currentTarget.textContent = pyView.hidden ? '🐍 Ver en Python' : '🐍 Ocultar Python'; } }, '🐍 Ver en Python') : null;
  const verifyBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: async () => {
    verifyBtn.disabled = true;
    try {
      const code = getCode();
      if (/___/.test(codeWithoutComments(code))) { verdict(ctx, false, 'Todavía quedan espacios <code>___</code> sin completar.'); return; }
      if (!codeWithoutComments(code).trim()) { verdict(ctx, false, 'Todavía no hay bloques adentro de "al iniciar", "para siempre" o de un evento.'); return; }
      const test = new MicrobitSim({ realtime: false, seed: 11, charMs: 400 });
      let firstErr = null;
      test.onLog = (t, err) => { if (err && !firstErr) firstErr = err; };
      test.setTemperature(21);
      await test.load(code);
      if (firstErr) { showErr(firstErr); verdict(ctx, false, 'El programa tiene un error. Mira el mensaje en rojo y la pista 💡.'); return; }
      const res = await p.check(test);
      if (firstErr) { showErr(firstErr); verdict(ctx, false, 'El programa da un error cuando se usa la placa. Mira el mensaje en rojo.'); return; }
      if (res !== true) { verdict(ctx, false, `Probé tu programa en una placa de prueba y ${res}`); return; }
      const clean = codeWithoutComments(code);
      const miss = (p.require || []).find((r) => !r.re.test(clean));
      if (miss) { verdict(ctx, false, miss.msg); return; }
      verdict(ctx, true, '');
      start(code);
    } catch (e) {
      showErr(e instanceof PyError ? e : new PyError('RuntimeError', String(e?.message || e)));
    } finally { verifyBtn.disabled = false; }
  } }, '✔ Verificar');
  editorBox.append(h('div', { class: 'apec-toolbar' }, runBtn, verifyBtn, stopBtn, pyBtn), pyView, log);
  ctx.work.append(h('div', { class: 'apec-mb-layout apec-mb-layout-blocks' }, h('div', { class: 'apec-mb-col' }, board.board, target), editorBox));
  ctx.onLeave(() => sim?.stop());
}

/** Programa de bloques de solo lectura (con respaldo en texto si no cargan los bloques). */
const escHtml = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function blocksView(state, ctx, highlight = escHtml, title = '🧩 Programa cargado en la placa') {
  const holder = h('div', { class: 'apec-blockly apec-blockly-ro', 'aria-label': `Programa en bloques: ${blocksToPython(state).events.join(', ')}` });
  const pre = h('pre', { class: 'apec-code', hidden: true, html: highlight(blocksToPython(state).code) });
  const btn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost apec-ro-py', onclick: () => { pre.hidden = !pre.hidden; btn.textContent = pre.hidden ? '🐍 Ver en Python' : '🐍 Ocultar Python'; } }, '🐍 Ver en Python');
  createWorkspace(holder, { state, readOnly: true }).then((a) => { ctx?.onLeave?.(() => a.dispose()); }).catch(() => { holder.hidden = true; pre.hidden = false; });
  return h('div', { class: 'apec-codeview' }, h('div', { class: 'apec-codeview-title' }, h('span', {}, title), btn), holder, pre);
}

/* ======================================================================
   CONECTORES
   ====================================================================== */
const PORT_ICON = { usb: '▭ USB', hdmi: '⏢ HDMI', bt: 'ᛒ Bluetooth', pin: '◉ Pines' };
export function renderPorts(p, ctx, { verdict }) {
  const conn = {};
  if (ctx.done) p.devices.forEach((d) => { conn[d.id] = p.ports.find((pt) => pt.type === d.port && !Object.values(conn).includes(pt.id))?.id; });
  let selected = null;
  const msg = h('p', { class: 'apec-circuit-result', 'aria-live': 'polite' }, 'Toca un dispositivo para elegirlo.');
  const devBox = h('div', { class: 'apec-ports-devices', role: 'group', 'aria-label': 'Dispositivos' });
  const pcBox = h('div', { class: 'apec-ports-pc' });
  const mbBox = h('div', { class: 'apec-ports-mb' });
  const draw = () => {
    devBox.replaceChildren(...p.devices.map((d) => {
      const c = conn[d.id];
      return h('button', { type: 'button', class: `apec-dev ${c ? 'ok' : ''} ${selected === d.id ? 'sel' : ''}`, 'aria-pressed': String(selected === d.id), onclick: () => { if (c) { delete conn[d.id]; msg.textContent = `Desconectaste: ${d.name}.`; } else { selected = selected === d.id ? null : d.id; msg.textContent = selected ? `Ahora toca el conector donde va: ${d.name}.` : 'Toca un dispositivo para elegirlo.'; } draw(); } },
        h('span', { class: 'apec-dev-icon', 'aria-hidden': 'true' }, d.icon), h('b', {}, d.name),
        c ? h('small', { class: 'apec-dev-works' }, `✔ ${d.works} · ${d.io}`) : h('small', {}, 'Sin conectar'));
    }));
    const portBtn = (pt) => {
      const owner = p.devices.find((d) => conn[d.id] === pt.id);
      return h('button', { type: 'button', class: `apec-port ${pt.type} ${owner ? 'busy' : ''}`, onclick: () => {
        if (!selected) { msg.textContent = 'Primero toca un dispositivo.'; return; }
        const d = p.devices.find((x) => x.id === selected);
        if (owner) { msg.textContent = `Ese conector ya está ocupado por: ${owner.name}.`; return; }
        if (d.port !== pt.type) { msg.textContent = `✖ ${d.name} no va en ${pt.label}. ${p.fail}`; ctx.attempt(); return; }
        conn[d.id] = pt.id; selected = null;
        msg.textContent = `✔ ${d.name} conectado en ${pt.label}: ${d.works}.`;
        draw();
        if (p.devices.every((x) => conn[x.id])) verdict(ctx, true, '');
      } }, h('span', { class: 'apec-port-shape', 'aria-hidden': 'true' }, PORT_ICON[pt.type]), h('small', {}, owner ? `${owner.icon} ${pt.label}` : pt.label));
    };
    pcBox.replaceChildren(h('div', { class: 'apec-ports-title' }, '💻 Ceibalita'), h('div', { class: 'apec-ports-row' }, p.ports.filter((x) => x.where === 'pc').map(portBtn)));
    mbBox.replaceChildren(h('div', { class: 'apec-ports-title' }, '🟩 micro:bit'), h('div', { class: 'apec-ports-row' }, p.ports.filter((x) => x.where === 'mb').map(portBtn)));
  };
  draw();
  ctx.work.append(devBox, h('div', { class: 'apec-ports-hw' }, pcBox, mbBox), msg);
}

/* ======================================================================
   LABORATORIO DE CORRIENTE (ley de Ohm)
   ====================================================================== */
const VOLTS = [1.5, 3, 9];
const OHMS = [0, 47, 100, 220, 330, 470, 1000, 2200];
export function currentFor(v, r) {
  if (v <= 2) return 0;
  if (r === 0) return Infinity;
  return ((v - 2) / r) * 1000; // mA
}
export function renderOhm(p, ctx, { verdict }) {
  let vi = 1; let ri = 3;
  if (ctx.done) { vi = 2; ri = 5; }
  const tried = new Set();
  const amp = h('div', { class: 'apec-amp', 'aria-live': 'polite' });
  const state = h('p', { class: 'apec-circuit-result' });
  const formula = h('p', { class: 'apec-ohm-formula' });
  const svgBox = h('div', { class: 'apec-circuit-svg apec-ohm-svg' });
  const goal1 = h('li', {}); const goal2 = h('li', {});
  const draw = () => {
    const v = VOLTS[vi]; const r = OHMS[ri]; const i = currentFor(v, r);
    tried.add(`${vi}-${ri}`);
    const burnt = i > 30; const hot = i > 20 && !burnt; const lit = i > 0 && !burnt;
    const bright = Math.min(1, i / 20);
    amp.innerHTML = `<span>🔌 Amperímetro</span><b>${i === Infinity ? '∞' : i.toFixed(1)} mA</b>`;
    formula.innerHTML = v <= 2 ? `La pila de ${v} V no alcanza para el LED (necesita unos 2 V).` : r === 0 ? 'Sin resistencia nada frena la corriente: I = (V − 2) ÷ 0 → ¡muchísima!' : `I = (${v} V − 2 V) ÷ ${r} Ω = <b>${i.toFixed(1)} mA</b>`;
    state.textContent = burnt ? '💥 ¡Demasiada corriente! El LED se quema.' : hot ? '🔥 El LED brilla mucho y se calienta: más de 20 mA.' : i >= 10 ? '✅ El LED brilla bien y seguro (entre 10 y 20 mA).' : i > 0 ? '🔅 El LED brilla poquito: pasa poca corriente.' : '⚫ El LED está apagado.';
    const flow = i === 0 ? 0 : Math.max(0.25, Math.min(3, 3 - Math.min(i, 40) / 15));
    svgBox.innerHTML = `<svg viewBox="0 0 340 170" role="img" aria-label="Circuito: pila de ${v} voltios, resistencia de ${r} ohmios y LED">
      <path id="ohm-loop" d="M40 120 V40 H300 V120 Z" fill="none" stroke="currentColor" stroke-width="3"/>
      ${i > 0 ? `<path d="M40 120 V40 H300 V120 Z" fill="none" stroke="#00dcf0" stroke-width="3" stroke-dasharray="6 14" class="apec-flow-dash" style="animation-duration:${flow}s"/>` : ''}
      <rect x="20" y="60" width="40" height="50" rx="5" fill="rgba(255,176,0,.25)" stroke="currentColor" stroke-width="2.5"/>
      <text x="40" y="91" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">${v} V</text>
      <rect x="130" y="28" width="80" height="24" rx="4" fill="${r === 0 ? 'rgba(255,255,255,.1)' : 'rgba(210,153,34,.5)'}" stroke="currentColor" stroke-width="2"/>
      <text x="170" y="45" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">${r === 0 ? 'cable' : `${r} Ω`}</text>
      <g transform="translate(300 82)">
        ${lit ? `<circle r="${18 + 18 * bright}" fill="rgba(255,60,60,${0.15 + 0.35 * bright})"/>` : ''}
        <path d="M-13 -12 L13 -12 L0 12 Z" fill="${burnt ? '#333' : lit ? `rgba(255,${60 - 30 * bright},${60 - 30 * bright},${0.45 + 0.55 * bright})` : 'rgba(255,64,64,.25)'}" stroke="currentColor" stroke-width="2.5"/>
        <path d="M-13 14 H13" stroke="currentColor" stroke-width="3"/>
      </g>
      ${burnt ? '<text x="300" y="58" text-anchor="middle" font-size="22">💥</text>' : ''}
      <text x="300" y="150" text-anchor="middle" font-size="12" fill="currentColor">LED</text>
    </svg>`;
    goal1.innerHTML = `${tried.size >= 4 ? '✅' : '⬜'} Explorar: ${Math.min(tried.size, 4)} de 4 combinaciones`;
    goal2.innerHTML = `${v === 9 && i >= 10 && i <= 20 ? '✅' : '⬜'} Pila de 9 V con el LED entre 10 y 20 mA`;
  };
  const voltBox = h('div', { class: 'apec-cl-opts', role: 'radiogroup', 'aria-label': 'Pila' });
  const drawVolts = () => voltBox.replaceChildren(...VOLTS.map((v, i) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(vi === i), class: `apec-pill ${vi === i ? 'on' : ''}`, onclick: () => { vi = i; drawVolts(); draw(); } }, `🔋 ${v} V`)));
  drawVolts();
  const rLabel = h('b', {});
  const slider = h('input', { type: 'range', min: '0', max: String(OHMS.length - 1), value: String(ri), 'aria-label': 'Resistencia', oninput: (e) => { ri = Number(e.target.value); rLabel.textContent = OHMS[ri] === 0 ? 'sin resistencia' : `${OHMS[ri]} Ω`; draw(); } });
  rLabel.textContent = `${OHMS[ri]} Ω`;
  draw();
  const check = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => {
    const i = currentFor(VOLTS[vi], OHMS[ri]);
    if (tried.size < 4) { verdict(ctx, false, `Primero explora: prueba al menos 4 combinaciones de pila y resistencia (llevas ${tried.size}).`); return; }
    if (VOLTS[vi] !== 9) { verdict(ctx, false, 'El reto es con la pila de 9 V. Elígela y ajusta la resistencia.'); return; }
    verdict(ctx, i >= 10 && i <= 20, p.fail);
  } }, '✔ Comprobar');
  ctx.work.append(svgBox, amp, formula, state,
    h('fieldset', { class: 'apec-fieldset' }, h('legend', {}, 'Pila'), voltBox),
    h('fieldset', { class: 'apec-fieldset' }, h('legend', {}, 'Resistencia: ', rLabel), slider),
    h('ul', { class: 'apec-mb-goals' }, goal1, goal2), h('div', { class: 'apec-row' }, check));
}

/* ======================================================================
   CABLEADO LIBRE (esquema)
   ====================================================================== */
const TERMS = {
  'B+': { x: 60, y: 70, label: '+' }, 'B-': { x: 60, y: 210, label: '−' },
  S1: { x: 190, y: 40, label: '' }, S2: { x: 280, y: 40, label: '' },
  R1: { x: 380, y: 40, label: '' }, R2: { x: 500, y: 40, label: '' },
  LA: { x: 560, y: 120, label: 'ánodo (pata larga)' }, LK: { x: 560, y: 220, label: 'cátodo' },
};
export function renderWires(p, ctx, { verdict }) {
  let wires = ctx.done ? [['B+', 'S1'], ['S2', 'R1'], ['R2', 'LA'], ['LK', 'B-']] : [];
  let swClosed = true;
  let pick = null;
  let okClosed = false; let okOpen = false;
  const result = h('p', { class: 'apec-circuit-result', 'aria-live': 'polite' }, 'Toca dos puntos para tender un cable.');
  const box = h('div', { class: 'apec-circuit-svg apec-wires' });
  const solve = (closed) => solveCircuit({ links: wires, comps: [{ type: 'R', a: 'R1', b: 'R2' }, { type: 'LED', a: 'LA', b: 'LK' }, { type: 'SW', a: 'S1', b: 'S2', closed }], pos: 'B+', neg: 'B-' });
  const draw = (lit = null) => {
    const svg = svgEl('svg', { viewBox: '0 0 640 270', role: 'img', 'aria-label': `Esquema para cablear. Cables: ${wires.length}. Interruptor ${swClosed ? 'cerrado' : 'abierto'}.` });
    // componentes
    svg.innerHTML = `
      <rect x="35" y="90" width="50" height="100" rx="8" fill="rgba(255,176,0,.18)" stroke="currentColor" stroke-width="2.5"/>
      <text x="60" y="130" text-anchor="middle" font-size="26" font-weight="900" fill="#ffb000">+</text>
      <text x="60" y="170" text-anchor="middle" font-size="26" font-weight="900" fill="#ffb000">−</text>
      <text x="60" y="250" text-anchor="middle" font-size="12" fill="currentColor">Pila 3 V</text>
      <path d="M60 90 V78 M60 190 V202" stroke="currentColor" stroke-width="3"/>
      <path d="M190 40 ${swClosed ? 'L280 40' : 'L268 14'}" stroke="currentColor" stroke-width="4" stroke-linecap="round" class="apec-sw-lever"/>
      <text x="235" y="72" text-anchor="middle" font-size="12" fill="currentColor">Interruptor (${swClosed ? 'cerrado' : 'abierto'})</text>
      <path d="M380 40 h14 l8 -12 l12 24 l12 -24 l12 24 l12 -24 l12 24 l8 -12 h10" fill="none" stroke="currentColor" stroke-width="3"/>
      <text x="440" y="74" text-anchor="middle" font-size="12" fill="currentColor">Resistencia 220 Ω</text>
      <g transform="translate(560 170)">
        ${lit === 'on' ? '<circle r="36" fill="rgba(255,60,60,.4)"/>' : ''}
        <path d="M-16 -22 L16 -22 L0 6 Z" fill="${lit === 'on' ? '#ff4040' : lit === 'burnt' ? '#333' : 'rgba(255,64,64,.3)'}" stroke="currentColor" stroke-width="2.5"/>
        <path d="M-16 8 H16" stroke="currentColor" stroke-width="3"/>
        <path d="M0 -22 V-50 M0 8 V50" stroke="currentColor" stroke-width="3"/>
      </g>
      ${lit === 'burnt' ? '<text x="600" y="150" font-size="24">💥</text>' : ''}
      ${lit === 'short' ? '<text x="100" y="140" font-size="24">🔥</text>' : ''}
      <text x="560" y="262" text-anchor="middle" font-size="12" fill="currentColor">LED</text>`;
    // cables
    wires.forEach(([a, b], i) => {
      const A = TERMS[a]; const B = TERMS[b];
      const midY = Math.min(A.y, B.y) - 0;
      const path = svgEl('path', { d: `M${A.x} ${A.y} C ${A.x} ${midY + 60}, ${B.x} ${midY + 60}, ${B.x} ${B.y}`, class: 'apec-wire', tabindex: '0', role: 'button', 'aria-label': `Cable de ${a} a ${b}. Toca para quitarlo.` });
      const remove = () => { wires.splice(i, 1); result.textContent = 'Quitaste un cable.'; draw(); };
      path.addEventListener('click', remove);
      path.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); remove(); } });
      svg.append(path);
    });
    // terminales
    for (const [id, t] of Object.entries(TERMS)) {
      const g = svgEl('g', { class: `apec-term ${pick === id ? 'sel' : ''}`, tabindex: '0', role: 'button', 'aria-label': `Punto ${id === 'B+' ? 'positivo de la pila' : id === 'B-' ? 'negativo de la pila' : id.startsWith('S') ? 'del interruptor' : id.startsWith('R') ? 'de la resistencia' : t.label}` });
      g.append(svgEl('circle', { cx: t.x, cy: t.y, r: 26, class: 'apec-term-hit' }));
      g.append(svgEl('circle', { cx: t.x, cy: t.y, r: 12, class: 'apec-term-dot' }));
      if (t.label && id.startsWith('L')) { const tx = svgEl('text', { x: t.x - 20, y: t.y + 4, 'font-size': 12, fill: 'currentColor', 'text-anchor': 'end' }); tx.textContent = t.label; g.append(tx); }
      const act = () => {
        if (!pick) { pick = id; result.textContent = 'Ahora toca el otro punto del cable.'; draw(); return; }
        if (pick === id) { pick = null; draw(); return; }
        if (!wires.some(([a, b]) => (a === pick && b === id) || (a === id && b === pick))) wires.push([pick, id]);
        pick = null; okClosed = false; okOpen = false;
        result.textContent = `Cables: ${wires.length}. Cuando termines, toca ⚡ Probar.`;
        draw();
      };
      g.addEventListener('click', act);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      svg.append(g);
    }
    // el interruptor también se puede tocar
    const hit = svgEl('rect', { x: 200, y: 10, width: 70, height: 36, fill: 'transparent', style: 'cursor:pointer' });
    hit.addEventListener('click', () => toggleSw());
    svg.append(hit);
    box.replaceChildren(svg);
  };
  const swBtn = h('button', { type: 'button', class: 'sqlc-btn' });
  const setSwLabel = () => { swBtn.textContent = swClosed ? '🔘 Abrir interruptor' : '🔘 Cerrar interruptor'; };
  const toggleSw = () => { swClosed = !swClosed; setSwLabel(); draw(); result.textContent = `Interruptor ${swClosed ? 'cerrado' : 'abierto'}. Toca ⚡ Probar.`; };
  swBtn.addEventListener('click', toggleSw);
  setSwLabel();
  const test = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => {
    const r = solve(swClosed);
    draw(r.status);
    result.textContent = r.message;
    if (r.status === 'on' && swClosed) okClosed = true;
    if (swClosed && r.status !== 'on') { verdict(ctx, false, p.fail); okClosed = false; return; }
    if (!swClosed) {
      const closed = solve(true);
      if (closed.status === 'on' && r.status === 'open') okOpen = true;
      else if (r.status === 'on') { result.textContent = '⚠️ El LED sigue prendido con el interruptor abierto: el interruptor no está en el camino de la corriente.'; verdict(ctx, false, 'El interruptor tiene que estar en el camino de la corriente, para poder cortarla.'); return; }
    }
    if (okClosed && okOpen) { verdict(ctx, true, ''); return; }
    if (okClosed) result.textContent += ' Ahora abre el interruptor y prueba de nuevo: el LED se tiene que apagar.';
    else if (okOpen) result.textContent += ' Ahora cierra el interruptor y prueba de nuevo.';
  } }, '⚡ Probar');
  const clear = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost', onclick: () => { wires = []; pick = null; okClosed = okOpen = false; result.textContent = 'Sin cables.'; draw(); } }, 'Quitar todos los cables');
  draw(ctx.done ? 'on' : null);
  ctx.work.append(box, result, h('div', { class: 'apec-row' }, test, swBtn, clear));
}

/* ======================================================================
   CONECTAR A LA PLACA (LED y sensor externo: polos, energía y tierra)
   ====================================================================== */
const PADS = { P0: 110, P1: 210, P2: 310, '3V': 420, GND: 530 };
const PART_TERMS = {
  'L+': { x: 140, y: 170, part: 'led', label: '+ pata larga (ánodo)', color: '#e5484d', anchor: 'end', lx: -12 },
  'L-': { x: 178, y: 158, part: 'led', label: '− pata corta (cátodo)', color: '#9aa7b4', anchor: 'start', lx: 12 },
  SV: { x: 405, y: 160, part: 'sensor', label: 'VCC +', color: '#e5484d', anchor: 'middle', lx: 0 },
  SG: { x: 465, y: 160, part: 'sensor', label: 'GND −', color: '#9aa7b4', anchor: 'middle', lx: 0 },
  SO: { x: 525, y: 160, part: 'sensor', label: 'OUT señal', color: '#2ea043', anchor: 'middle', lx: 0 },
};

/** Revisa las conexiones a la placa. wires: [[terminal, pad]] · parts: ['led'] o ['led','sensor'] */
export function checkPinWiring(wires, parts, power, resistor = '100') {
  const at = (t) => [...new Set(wires.filter(([a]) => a === t).map(([, b]) => b))];
  const used = Object.keys(PART_TERMS).filter((t) => parts.includes(PART_TERMS[t].part));
  for (const t of used) if (at(t).length > 1) return { ok: false, msg: `La ${PART_TERMS[t].label} tiene dos cables a lugares distintos. Cada pata va a un solo lugar.` };
  const one = (t) => at(t)[0] || null;
  if (parts.includes('sensor')) {
    const v = one('SV'); const g = one('SG'); const o = one('SO');
    if (v === 'GND' && g === '3V') return { ok: false, danger: true, msg: '⚠️ Invertiste los polos del sensor: el + está en GND y el − en 3V. ¡Así el sensor se puede dañar!' };
    if (v && v !== '3V') return { ok: false, msg: v === 'GND' ? '⚠️ El VCC (+) del sensor está en GND (−): polos invertidos.' : 'El VCC (+) del sensor es su alimentación: va a 3V, no a un pin de señal.' };
    if (g && g !== 'GND') return { ok: false, msg: 'El GND (−) del sensor va a la tierra de la placa: GND.' };
    if (o === '3V' || o === 'GND') return { ok: false, msg: 'La señal (OUT) del sensor no va a la alimentación: va a un pin, el P1.' };
    if (!v) return { ok: false, msg: 'El sensor no tiene energía: conecta su VCC (+) a 3V.' };
    if (!g) return { ok: false, msg: 'Al sensor le falta la tierra: conecta su GND (−) al GND de la placa.' };
    if (!o) return { ok: false, msg: 'Falta conectar la señal (OUT) del sensor al pin P1, para que la placa pueda leerlo.' };
    if (o !== 'P1') return { ok: false, msg: 'El programa lee el sensor en el pin P1: conecta ahí la señal (OUT).' };
  }
  const a = one('L+'); const k = one('L-');
  if (!a || !k) return { ok: false, msg: `Al LED le falta un cable en la ${!a ? 'pata larga (+)' : 'pata corta (−)'}.` };
  if (a === k) return { ok: false, msg: 'Las dos patas del LED están en el mismo lugar: la corriente no pasa por el LED.' };
  if (a === 'GND' && k !== 'GND') return { ok: false, msg: 'El LED está al revés: la pata larga (+) va al pin P0 y la pata corta (−) a GND.' };
  if (k !== 'GND') return { ok: false, msg: 'La pata corta (−) del LED tiene que ir a la tierra: GND.' };
  if (a === '3V') return { ok: false, msg: 'Así el LED queda prendido siempre: está conectado directo a 3V y el programa no lo puede manejar. Conecta la pata larga al pin P0.' };
  if (a !== 'P0') return { ok: false, msg: 'El programa maneja el LED desde el pin P0: conecta ahí la pata larga (+).' };
  if (resistor === '10') return { ok: false, msg: 'Para un LED rojo el kit indica una resistencia de 100 Ω. La de 10 Ω es para los LED verde y azul: con el rojo pasa demasiada corriente.' };
  if (resistor === '10k') return { ok: false, msg: 'Con 10 kΩ casi no pasa corriente y el LED apenas se ve. Para un LED rojo el kit indica 100 Ω (10 kΩ es para el LDR).' };
  if (!resistor) return { ok: false, msg: 'Falta elegir la resistencia que va en la pata larga del LED.' };
  if (!power) return { ok: false, msg: 'Las conexiones están bien, pero la placa no tiene energía. Conecta el USB (o la pila) para darle energía.' };
  return { ok: true, msg: parts.includes('sensor') ? '✔ Todo conectado y con energía: LED con su resistencia en P0 y GND; sensor con VCC en 3V, GND en GND y OUT en P1.' : '✔ LED bien conectado: resistencia de 100 Ω y pata larga en P0, pata corta en GND. ¡Y la placa tiene energía!' };
}

export function renderPinwire(p, ctx, { verdict }) {
  const parts = p.parts;
  let wires = ctx.done ? [['L+', 'P0'], ['L-', 'GND'], ...(parts.includes('sensor') ? [['SV', '3V'], ['SG', 'GND'], ['SO', 'P1']] : [])] : [];
  let power = Boolean(ctx.done);
  let pick = null;
  let resistor = ctx.done ? '100' : null;
  let pressed = false;
  let blinkOn = false;
  let timer = null;
  const tested = { press: false, release: false };
  let passed = Boolean(ctx.done);
  const box = h('div', { class: 'apec-circuit-svg apec-wires apec-pinwire' });
  const result = h('p', { class: 'apec-circuit-result', 'aria-live': 'polite' }, 'Toca una pata del componente y después el lugar de la placa donde va.');
  const goals = p.parts.includes('sensor') ? h('ul', { class: 'apec-mb-goals' }) : null;
  const status = () => checkPinWiring(wires, parts, power, resistor);
  const ledLit = () => {
    const st = status();
    if (!st.ok) return st.msg.startsWith('Así el LED queda prendido') && power;
    return p.program === 'alarma' ? pressed : blinkOn;
  };
  const drawGoals = () => {
    if (!goals) return;
    const st = status();
    const items = [[st.ok, 'LED y sensor bien conectados, con energía'], [tested.press, 'Al tocar el sensor, el LED se prende'], [tested.release, 'Al soltarlo, el LED se apaga']];
    goals.replaceChildren(...items.map(([ok, t]) => h('li', { class: ok ? 'ok' : '' }, h('span', { 'aria-hidden': 'true' }, ok ? '✅' : '⬜'), h('b', {}, t))));
  };
  const evaluate = () => {
    const st = status();
    if (st.ok && p.program === 'alarma') { if (pressed) tested.press = true; else if (tested.press) tested.release = true; }
    drawGoals();
    if (st.ok && !passed && (p.program !== 'alarma' || (tested.press && tested.release))) { passed = true; verdict(ctx, true, ''); }
  };
  const draw = () => {
    const lit = ledLit();
    const st = status();
    const svg = svgEl('svg', { viewBox: '0 0 640 350', role: 'img', 'aria-label': `Conexiones: ${wires.map(([a, b]) => `${PART_TERMS[a].label} a ${b}`).join(', ') || 'ninguna'}. Placa ${power ? 'con' : 'sin'} energía.` });
    svg.innerHTML = `
      <rect x="40" y="246" width="560" height="96" rx="16" fill="rgb(28,30,38)" stroke="rgb(10,12,16)" stroke-width="3"/>
      <text x="320" y="272" text-anchor="middle" font-size="13" font-weight="800" fill="rgb(200,205,215)">micro:bit</text>
      <g transform="translate(62 262)">${power ? '<text font-size="20">🔌</text><text x="26" y="-2" font-size="11" fill="rgb(126,231,135)">USB</text>' : '<text font-size="11" y="4" fill="rgb(150,150,160)">sin energía</text>'}</g>
      ${power ? '<circle cx="580" cy="268" r="5" fill="rgb(255,60,60)"><title>la placa tiene energía</title></circle>' : ''}
      <g transform="translate(150 60)">
        ${lit ? '<circle cx="0" cy="10" r="44" fill="rgba(255,60,60,.38)"/>' : ''}
        <path d="M-22 40 V8 a22 22 0 0 1 44 0 V40 Z" fill="${lit ? '#ff4040' : 'rgba(255,64,64,.3)'}" stroke="currentColor" stroke-width="2.5"/>
        <rect x="-27" y="38" width="54" height="8" rx="2" fill="${lit ? '#c81e1e' : 'rgba(200,30,30,.35)'}" stroke="currentColor" stroke-width="2"/>
        <path d="M-10 46 V110 M28 46 V98" stroke="rgb(160,165,175)" stroke-width="4"/>
        ${resistor ? `<rect x="-17" y="62" width="14" height="30" rx="5" fill="rgb(222,196,140)" stroke="rgb(120,90,40)" stroke-width="1.5"/><path d="M-17 70 h14 M-17 77 h14 M-17 84 h14" stroke="${resistor === '100' ? 'rgb(140,70,20)' : resistor === '10' ? 'rgb(20,20,20)' : 'rgb(200,30,30)'}" stroke-width="2"/><text x="-24" y="82" font-size="10" text-anchor="end" fill="currentColor">${resistor === '10k' ? '10 kΩ' : `${resistor} Ω`}</text>` : ''}
        <text x="0" y="-22" text-anchor="middle" font-size="12" fill="currentColor">LED</text>
      </g>
      ${parts.includes('sensor') ? `
      <rect x="382" y="58" width="166" height="74" rx="8" fill="rgb(20,70,140)" stroke="currentColor" stroke-width="2"/>
      <rect x="400" y="70" width="50" height="34" rx="4" fill="rgb(30,30,30)"/>
      <path d="M402 ${pressed ? 72 : 70} L ${pressed ? 452 : 446} ${pressed ? 66 : 50}" stroke="rgb(200,200,200)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="530" cy="78" r="5" fill="${pressed && power ? 'rgb(255,60,60)' : 'rgb(90,30,30)'}"/>
      <text x="465" y="124" text-anchor="middle" font-size="11" font-weight="700" fill="white">Sensor de contacto</text>
      <path d="M405 132 V150 M465 132 V150 M525 132 V150" stroke="rgb(160,165,175)" stroke-width="4"/>` : ''}`;
    // pads
    for (const [name, x] of Object.entries(PADS)) {
      const g = svgEl('g', { class: `apec-term apec-pad ${pick === name ? 'sel' : ''}`, tabindex: '0', role: 'button', 'aria-label': `Conector ${name} de la placa` });
      g.append(svgEl('rect', { x: x - 30, y: 292, width: 60, height: 44, rx: 6, class: 'apec-pad-rect' }));
      const t = svgEl('text', { x, y: 320, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 900, class: 'apec-pad-text' }); t.textContent = name; g.append(t);
      const act = () => onPick(name, 'pad');
      g.addEventListener('click', act);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      svg.append(g);
    }
    // cables
    wires.forEach(([term, pad], i) => {
      const A = PART_TERMS[term]; const x2 = PADS[pad];
      const path = svgEl('path', { d: `M${A.x} ${A.y} C ${A.x} ${A.y + 80}, ${x2} ${200}, ${x2} 294`, class: 'apec-wire', style: `stroke:${A.color}`, tabindex: '0', role: 'button', 'aria-label': `Cable de ${A.label} a ${pad}. Toca para quitarlo.` });
      const remove = () => { wires.splice(i, 1); result.textContent = 'Quitaste un cable.'; draw(); };
      path.addEventListener('click', remove);
      path.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); remove(); } });
      svg.append(path);
    });
    // patas de los componentes
    for (const [id, t] of Object.entries(PART_TERMS)) {
      if (!parts.includes(t.part)) continue;
      const g = svgEl('g', { class: `apec-term ${pick === id ? 'sel' : ''}`, tabindex: '0', role: 'button', 'aria-label': `${t.part === 'led' ? 'LED' : 'Sensor'}: ${t.label}` });
      g.append(svgEl('circle', { cx: t.x, cy: t.y, r: 24, class: 'apec-term-hit' }));
      g.append(svgEl('circle', { cx: t.x, cy: t.y, r: 11, class: 'apec-term-dot', style: `fill:${t.color}` }));
      const tx = svgEl('text', { x: t.x + t.lx, y: t.part === 'sensor' ? t.y + 30 : t.y + 4, 'font-size': 12, fill: 'currentColor', 'text-anchor': t.anchor, 'font-weight': 700 });
      tx.textContent = t.label; g.append(tx);
      const act = () => onPick(id, 'term');
      g.addEventListener('click', act);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      svg.append(g);
    }
    box.replaceChildren(svg);
    if (st.danger) box.classList.add('danger'); else box.classList.remove('danger');
  };
  const onPick = (id, kind) => {
    if (!pick) { pick = { id, kind }; result.textContent = kind === 'pad' ? `Elegiste ${id}. Ahora toca la pata del componente.` : 'Ahora toca el lugar de la placa (P0, P1, P2, 3V o GND).'; draw(); return; }
    if (pick.kind === kind) { pick = pick.id === id ? null : { id, kind }; draw(); return; }
    const term = kind === 'term' ? id : pick.id; const pad = kind === 'pad' ? id : pick.id;
    wires = wires.filter(([t]) => t !== term);
    wires.push([term, pad]);
    pick = null;
    result.textContent = `Conectaste ${PART_TERMS[term].label} a ${pad}.`;
    draw();
  };
  const powerBtn = h('button', { type: 'button', class: 'sqlc-btn' });
  const setPowerLabel = () => { powerBtn.textContent = power ? '🔌 Desconectar energía' : '🔌 Dar energía (USB)'; powerBtn.classList.toggle('sqlc-btn-run', !power); };
  powerBtn.addEventListener('click', () => { power = !power; setPowerLabel(); draw(); });
  setPowerLabel();
  const resBox = h('div', { class: 'apec-cl-opts', role: 'radiogroup', 'aria-label': 'Resistencia para el LED rojo' });
  const drawRes = () => resBox.replaceChildren(...[['10', '10 Ω'], ['100', '100 Ω'], ['10k', '10 kΩ']].map(([v, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(resistor === v), class: `apec-pill ${resistor === v ? 'on' : ''}`, onclick: () => { resistor = v; drawRes(); draw(); } }, l)));
  drawRes();
  const resCtl = h('fieldset', { class: 'apec-fieldset' }, h('legend', {}, '〰️ Resistencia en la pata larga del LED rojo'), resBox);
  const pressBtn = parts.includes('sensor') ? h('button', { type: 'button', class: 'sqlc-btn apec-press-btn' }, '👆 Mantener presionado el sensor') : null;
  if (pressBtn) {
    const down = (e) => { e.preventDefault(); pressed = true; pressBtn.classList.add('held'); draw(); evaluate(); };
    const up = () => { if (!pressed) return; pressed = false; pressBtn.classList.remove('held'); draw(); evaluate(); };
    pressBtn.addEventListener('pointerdown', down);
    pressBtn.addEventListener('pointerup', up);
    pressBtn.addEventListener('pointerleave', up);
    pressBtn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !pressed) down(e); });
    pressBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
  }
  const test = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => {
    const st = status();
    result.textContent = st.msg;
    draw();
    if (!st.ok) { verdict(ctx, false, st.msg); return; }
    if (p.program === 'alarma' && !(tested.press && tested.release)) result.textContent += ' Ahora mantén presionado el sensor y después suéltalo.';
    evaluate();
  } }, '⚡ Probar conexiones');
  const clear = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost', onclick: () => { wires = []; pick = null; result.textContent = 'Sin cables.'; draw(); } }, 'Quitar cables');
  if (p.program === 'blink') timer = setInterval(() => { blinkOn = !blinkOn; if (status().ok) draw(); }, 500);
  ctx.onLeave(() => clearInterval(timer));
  draw();
  drawGoals();
  const progView = p.programBlocks ? blocksView(p.programBlocks, ctx, undefined, '📄 Programa que ya tiene la placa') : h('div', { class: 'apec-codeview apec-pinwire-prog' }, h('div', { class: 'apec-codeview-title' }, '📄 Programa que ya tiene la placa'), h('pre', { class: 'apec-code' }, p.programText));
  progView.classList.add('apec-pinwire-prog');
  ctx.work.append(progView, box, resCtl, h('div', { class: 'apec-row' }, powerBtn, pressBtn), result, goals, h('div', { class: 'apec-row' }, test, clear));
}

/* ======================================================================
   ENTRENAR UN MODELO DE IA
   ====================================================================== */
export function renderMltrain(p, ctx, { verdict }) {
  const assign = {};
  const reserve = p.reserve || {};
  const all = [...p.pool, ...Object.values(reserve).flat()];
  const visible = new Set(p.pool.map((it) => it.id));
  const requests = [];
  for (const [c, ids] of Object.entries(p.preset || {})) ids.forEach((id) => { assign[id] = Number(c); });
  if (ctx.done) all.forEach((it) => { visible.add(it.id); if (it.cat !== null && it.cat !== undefined) assign[it.id] = it.cat; });
  const shown = () => all.filter((it) => visible.has(it.id));
  const balanceBox = h('div', { class: 'apec-ml-balance', 'aria-live': 'polite' });
  const counts = () => p.classes.map((_, ci) => shown().filter((it) => assign[it.id] === ci).length);
  const biased = () => { const c = counts(); const mn = Math.min(...c); const mx = Math.max(...c); return mn === 0 || mx / mn >= 2; };
  const drawBalance = () => {
    const c = counts(); const mx = Math.max(1, ...c); const mn = Math.min(...c);
    const big = p.classes[c.indexOf(Math.max(...c))]; const small = p.classes[c.indexOf(mn)];
    const bad = biased();
    balanceBox.className = `apec-ml-balance ${bad ? 'bad' : 'ok'}`;
    balanceBox.replaceChildren(h('div', { class: 'apec-ml-head' }, '⚖️ Balance de los datos'),
      ...p.classes.map((cl, ci) => h('div', { class: 'apec-ml-barrow' }, h('span', {}, `${cl.icon} ${cl.name}`), h('span', { class: 'apec-ml-track' }, h('i', { style: `width:${(c[ci] / mx) * 100}%` })), h('b', {}, String(c[ci])))),
      h('p', { class: 'apec-ml-balance-msg' }, c.every((x) => x === 0) ? 'Todavía no hay ejemplos.'
        : bad ? `⚠️ Sesgo: hay ${mn === 0 ? 'una clase sin ejemplos' : `${Math.max(...c)} de ${big.name} y solo ${mn} de ${small.name}`}. El modelo va a tender a decir "${big.name}".`
          : '✅ Las clases están balanceadas.'));
  };
  const requestBox = p.reserve ? h('div', { class: 'apec-ml-request' }) : null;
  const drawRequest = () => {
    if (!requestBox) return;
    requestBox.replaceChildren(h('div', { class: 'apec-ml-head' }, '📷 Pedir más imágenes'),
      h('p', { class: 'apec-muted' }, '¿Qué tipo de imágenes le faltan al modelo? Pide las que necesites: van a llegar sin etiqueta.'),
      h('div', { class: 'apec-cl-opts' }, p.classes.map((cl, ci) => {
        const left = (reserve[ci] || []).filter((it) => !visible.has(it.id)).length;
        return h('button', { type: 'button', class: 'sqlc-btn', disabled: left ? null : true, onclick: () => {
          const next = (reserve[ci] || []).filter((it) => !visible.has(it.id)).slice(0, 2);
          next.forEach((it) => visible.add(it.id));
          requests.push(ci);
          const c = counts();
          const already = c[ci] >= Math.max(...c);
          trainMsg.textContent = already
            ? `📷 Llegaron ${next.length} fotos de la clase ${cl.name}. Ojo: ya tenías más fotos de ${cl.name} que de las otras clases; si las agregas, el sesgo aumenta.`
            : `📷 Llegaron ${next.length} fotos de la clase ${cl.name}. Etiquétalas y vuelve a entrenar.`;
          draw();
        } }, `${cl.icon} Pedir fotos de ${cl.name.toLowerCase()} (${left})`);
      })));
  };
  let model = null;
  let stale = true;
  const poolBox = h('div', { class: 'apec-ml-pool' });
  const classBox = h('div', { class: 'apec-ml-classes' });
  const trainBar = h('div', { class: 'apec-ml-bar' }, h('i', {}));
  const trainMsg = h('p', { class: 'apec-muted', 'aria-live': 'polite' }, 'Todavía no entrenaste el modelo.');
  const testBox = h('div', { class: 'apec-ml-tests' });
  const resultBox = h('div', { class: 'apec-ml-results', 'aria-live': 'polite' });
  const markStale = () => { if (model) { stale = true; trainMsg.textContent = '⚠️ Cambiaste los ejemplos: vuelve a entrenar el modelo.'; } };
  const draw = () => {
    poolBox.replaceChildren(h('div', { class: 'apec-ml-head' }, '📦 Ejemplos sin etiquetar'), ...shown().filter((it) => assign[it.id] === undefined).map((it) => h('div', { class: 'apec-ml-tile' },
      h('span', { class: 'apec-ml-emoji', 'aria-hidden': 'true' }, it.emoji), h('small', {}, it.name),
      h('div', { class: 'apec-ml-send' }, p.classes.map((c, ci) => h('button', { type: 'button', class: 'apec-pill', title: `Agregar a ${c.name}`, 'aria-label': `Agregar ${it.name} a ${c.name}`, onclick: () => { assign[it.id] = ci; markStale(); draw(); } }, `${c.icon} ${c.name}`))))));
    if (!shown().some((it) => assign[it.id] === undefined)) poolBox.append(h('p', { class: 'apec-muted' }, p.reserve ? 'No hay fotos sin etiquetar. Si le faltan datos al modelo, pide más imágenes.' : 'No quedan ejemplos sin etiquetar.'));
    classBox.replaceChildren(...p.classes.map((c, ci) => {
      const items = shown().filter((it) => assign[it.id] === ci);
      return h('div', { class: 'apec-ml-class' }, h('div', { class: 'apec-ml-head' }, `${c.icon} ${c.name}`, h('span', { class: 'apec-ml-count' }, `${items.length} ejemplo${items.length === 1 ? '' : 's'}`)),
        h('div', { class: 'apec-ml-chips' }, items.map((it) => h('button', { type: 'button', class: 'apec-ml-chip', title: 'Quitar de esta clase', 'aria-label': `Quitar ${it.name} de ${c.name}`, onclick: () => { delete assign[it.id]; markStale(); draw(); } }, `${it.emoji} ${it.name} ✕`))),
        !items.length ? h('small', { class: 'apec-muted' }, 'Sin ejemplos todavía.') : null);
    }));
    drawBalance();
    drawRequest();
  };
  const examples = () => shown().filter((it) => assign[it.id] !== undefined).map((it) => ({ f: it.f, cat: assign[it.id], item: it }));
  const bars = (res) => h('div', { class: 'apec-ml-bars' }, p.classes.map((c, ci) => h('div', { class: `apec-ml-barrow ${ci === res.best ? 'best' : ''}` },
    h('span', {}, `${c.icon} ${c.name}`), h('span', { class: 'apec-ml-track' }, h('i', { style: `width:${res.pct[ci]}%` })), h('b', {}, `${res.pct[ci]} %`))));
  const train = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: async () => {
    const ex = examples();
    const empty = p.classes.filter((_, ci) => !ex.some((e) => e.cat === ci));
    if (empty.length) { trainMsg.textContent = `No se puede entrenar: la clase ${empty.map((c) => c.name).join(' y ')} no tiene ejemplos.`; return; }
    train.disabled = true;
    const fill = trainBar.querySelector('i');
    for (let e = 1; e <= 10; e++) { fill.style.width = `${e * 10}%`; trainMsg.textContent = `🧠 Entrenando… época ${e} de 10`; await new Promise((r) => setTimeout(r, 90)); }
    model = trainModel(ex, p.classes.length, p.model || {});
    stale = false;
    train.disabled = false;
    trainMsg.textContent = `✔ Modelo entrenado con ${ex.length} ejemplos (${p.classes.map((c, ci) => `${c.name}: ${ex.filter((x) => x.cat === ci).length}`).join(', ')}). Ahora pruébalo.`;
    resultBox.replaceChildren();
  } }, '🧠 Entrenar modelo');
  testBox.replaceChildren(h('div', { class: 'apec-ml-head' }, '🔍 Probar con objetos nuevos'), h('div', { class: 'apec-ml-testrow' }, p.test.map((t) => h('button', { type: 'button', class: 'apec-ml-tile test', onclick: () => {
    if (!model) { resultBox.replaceChildren(h('p', {}, 'Primero entrena el modelo.')); return; }
    const r = model.predict(t.f);
    resultBox.replaceChildren(h('p', {}, h('b', {}, `${t.emoji} ${t.name}: `), `el modelo dice ${p.classes[r.best].icon} ${p.classes[r.best].name} con ${r.conf} % de confianza${stale ? ' (modelo viejo: vuelve a entrenar)' : ''}.`), bars(r));
  } }, h('span', { class: 'apec-ml-emoji', 'aria-hidden': 'true' }, t.emoji), h('small', {}, t.name)))));
  const check = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-success', onclick: () => {
    if (!model || stale) { verdict(ctx, false, 'Primero entrena el modelo con los ejemplos actuales.'); return; }
    const rows = p.test.map((t) => ({ t, r: model.predict(t.f) }));
    resultBox.replaceChildren(h('p', {}, h('b', {}, 'Prueba con todos los objetos nuevos:')), ...rows.map(({ t, r }) => h('div', { class: `apec-ml-line ${r.best === t.cat && r.conf >= p.minConf ? 'ok' : 'bad'}` },
      `${t.emoji} ${t.name} → ${p.classes[r.best].icon} ${p.classes[r.best].name} (${r.conf} %) ${r.best === t.cat ? (r.conf >= p.minConf ? '✔' : '· acierta pero con poca confianza') : '✖ se equivoca'}`)));
    const wrong = rows.filter(({ t, r }) => r.best !== t.cat).length;
    const low = rows.filter(({ t, r }) => r.best === t.cat && r.conf < p.minConf).length;
    const mislabeled = examples().filter((e) => e.item.cat !== e.cat);
    const biasHint = p.reserve && biased() ? ' Mira el medidor de balance: ¿de qué clase tiene pocas imágenes? Pide más de ese tipo.' : '';
    if (wrong) { verdict(ctx, false, `El modelo se equivoca con ${wrong} objeto${wrong === 1 ? '' : 's'}. ${p.fail}${biasHint}`); return; }
    if (low) { verdict(ctx, false, `Acierta, pero con menos de ${p.minConf} % de confianza. ${p.lowConf}${biasHint}`); return; }
    if (mislabeled.length) { verdict(ctx, false, `La prueba salió bien, pero hay ejemplos en la clase equivocada (${mislabeled.map((e) => e.item.name).join(', ')}). Con otros objetos el modelo se va a confundir: sácalos o muévelos.`); return; }
    verdict(ctx, true, '');
  } }, `✔ Comprobar (meta: ${p.minConf} % o más)`);
  draw();
  ctx.work.append(h('ol', { class: 'apec-ml-steps' }, h('li', {}, 'Clases'), h('li', {}, 'Ejemplos'), h('li', {}, 'Entrenar'), h('li', {}, 'Probar')),
    h('div', { class: 'apec-ml-grid' }, h('div', { class: 'apec-ml-col' }, requestBox, poolBox), h('div', { class: 'apec-ml-col' }, balanceBox, classBox)),
    h('div', { class: 'apec-row' }, train, trainBar), trainMsg, testBox, resultBox, h('div', { class: 'apec-row' }, check));
}

/* ======================================================================
   PROGRAMAR CON LA CONFIANZA (%) DEL MODELO
   ====================================================================== */
export async function runWithModel(code, item) {
  let out = '';
  const it = new Interpreter({ globals: { clase: item.clase, confianza: item.conf }, write: (t) => { out += t; } });
  try { await it.run(code); return { out, error: null }; } catch (e) { return { out, error: e }; }
}

export function renderMlprog(p, ctx, { verdict, saveCode, loadCode }) {
  let current = p.cases[0];
  const ed = codeEditor({ value: loadCode(p.id) ?? p.starter, onInput: (v) => saveCode(p.id, v), onRun: () => runOne(), highlight: (x) => x });
  const camera = h('div', { class: 'apec-ml-camera', 'aria-live': 'polite' });
  const action = h('div', { class: 'apec-ml-action', 'aria-live': 'polite' });
  const log = h('div', { class: 'apec-console apec-console-sm' });
  const showCase = () => {
    const others = p.classNames.filter((c) => c !== current.clase);
    const rest = 100 - current.conf;
    const pct = { [current.clase]: current.conf };
    const weights = others.map((_, i) => 0.6 ** i);
    const wsum = weights.reduce((a, b) => a + b, 0);
    let given = 0;
    others.forEach((c, i) => { const v = i === others.length - 1 ? rest - given : Math.round((rest * weights[i]) / wsum); pct[c] = v; given += v; });
    camera.replaceChildren(h('div', { class: 'apec-ml-cam-emoji', 'aria-hidden': 'true' }, current.emoji), h('b', {}, current.name),
      h('div', { class: 'apec-ml-bars' }, p.classNames.map((c) => h('div', { class: `apec-ml-barrow ${c === current.clase ? 'best' : ''}` }, h('span', {}, c), h('span', { class: 'apec-ml-track' }, h('i', { style: `width:${pct[c]}%` })), h('b', {}, `${pct[c]} %`)))),
      h('code', { class: 'apec-ml-vars' }, `clase = "${current.clase}"   confianza = ${current.conf}`));
  };
  const runOne = async () => {
    const r = await runWithModel(ed.value, current);
    log.replaceChildren(h('div', { class: 'apec-con-sep' }, `▶ con ${current.emoji} ${current.name}`), h('pre', { class: 'apec-con-out' }, r.out || '(no mostró nada)'));
    if (r.error) { log.append(h('pre', { class: 'apec-con-err' }, r.error.toPython?.() || String(r.error))); if (r.error.hint) log.append(h('div', { class: 'apec-con-hint' }, `💡 ${r.error.hint}`)); }
    action.textContent = r.error ? '🤖 El robot se detuvo por un error.' : `🤖 ${r.out.trim() || '…no hace nada'}`;
  };
  const conveyor = h('div', { class: 'apec-ml-testrow' }, p.cases.map((c) => h('button', { type: 'button', class: 'apec-ml-tile test', onclick: () => { current = c; showCase(); runOne(); } }, h('span', { class: 'apec-ml-emoji', 'aria-hidden': 'true' }, c.emoji), h('small', {}, c.name))));
  const verify = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: async () => {
    if (/___/.test(codeWithoutComments(ed.value))) { verdict(ctx, false, 'Todavía quedan espacios <code>___</code> sin completar.'); return; }
    for (const c of p.cases) {
      const r = await runWithModel(ed.value, c);
      if (r.error) { current = c; showCase(); await runOne(); verdict(ctx, false, `Con ${c.emoji} ${c.name} el programa da un error. Míralo abajo.`); return; }
      const v = p.expect(c, r.out);
      if (v !== true) { current = c; showCase(); await runOne(); verdict(ctx, false, `Con ${c.emoji} ${c.name} (clase "${c.clase}", confianza ${c.conf} %) ${v}`); return; }
    }
    const miss = (p.require || []).find((q) => !q.re.test(codeWithoutComments(ed.value)));
    if (miss) { verdict(ctx, false, miss.msg); return; }
    verdict(ctx, true, '');
  } }, '✔ Verificar con todos los objetos');
  showCase();
  ctx.work.append(h('div', { class: 'apec-ml-head' }, '🏭 Cinta de reciclaje: toca un objeto para que la cámara lo vea'), conveyor,
    h('div', { class: 'apec-mb-layout' }, h('div', {}, camera, action),
      h('div', { class: 'apec-ide' }, h('div', { class: 'apec-ide-title' }, h('span', {}, '🐍 robot.py'), h('span', { class: 'apec-ide-keys' }, 'Ctrl+Enter: probar con el objeto elegido')),
        ed.box, h('div', { class: 'apec-toolbar' }, h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-run', onclick: () => runOne() }, '▶ Probar con este objeto'), verify), log)));
}
