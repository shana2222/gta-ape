// Interfaz de los simuladores de placas y circuitos (micro:bit, conectores, corriente, cables y protoboard).
import { MicrobitSim, patternOf } from './microbit-sim.js';
import { PyError, codeWithoutComments } from './python-mini.js';
import { solveCircuit, protoLinks, protoNet, PROTO_COLS, PROTO_TOP, PROTO_BOTTOM } from './circuit-sim.js';

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
function microbitBoard({ sensors = [], pins = false, onTrigger, onTemp }) {
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
  const board = h('div', { class: 'apec-mb-sim' },
    h('div', { class: 'apec-mb-face' }, bA, matrix, bB,
      h('div', { class: 'apec-mb-pins', 'aria-hidden': 'true' }, h('span', {}, '0'), h('span', {}, '1'), h('span', {}, '2'), h('span', {}, '3V'), h('span', {}, 'GND'))),
    h('div', { class: 'apec-mb-side' }, btn('SHAKE', 'Sacudir la placa', 'shake'), temp, extLed),
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
  const showErr = (err) => {
    log.querySelector('.apec-console-hint')?.remove();
    log.append(h('pre', { class: 'apec-con-err' }, err.toPython()));
    if (err.hint) log.append(h('div', { class: 'apec-con-hint' }, `💡 ${err.hint}`));
    log.scrollTop = log.scrollHeight;
  };
  const board = microbitBoard({ sensors: p.sensors || [], pins: p.pins, onTrigger: (k) => sim?.trigger(k), onTemp: (v) => { temp = v; sim?.setTemperature(v); } });
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
    sim.inputsUsed.clear();
    const ok = await sim.load(code);
    if (ok) { sim.startForever(); log.append(h('div', { class: 'apec-con-sep ok' }, '▶ programa cargado en la placa')); }
    board.update(sim);
    drawGoals();
  };

  if (p.mode === 'explore') {
    const view = codeEditor({ value: p.code, readonly: true, highlight });
    ctx.work.append(h('div', { class: 'apec-mb-layout' }, board.board, h('div', {}, goalsBox, view.box)));
    start(p.code);
    if (ctx.done) explored = true;
    ctx.onLeave(() => sim?.stop());
    return;
  }

  const ed = codeEditor({ value: loadCode(p.id) ?? p.starter ?? '', onInput: (v) => saveCode(p.id, v), onRun: () => start(ed.value), highlight });
  const target = p.target ? h('div', { class: 'apec-mb-target' }, h('small', {}, '🎯 Objetivo'), h('div', { class: 'apec-mini-matrix', 'aria-label': 'Figura objetivo' },
    patternOf(p.target).replace(/\//g, '').split('').map((c) => h('i', { class: c === '#' ? 'on' : '' })))) : null;
  const runBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-run', onclick: () => start(ed.value) }, '▶ Cargar en la placa');
  const stopBtn = h('button', { type: 'button', class: 'sqlc-btn', onclick: () => { sim?.stop(); board.reset(); } }, '■ Apagar');
  const verifyBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: async () => {
    verifyBtn.disabled = true;
    try {
      const code = ed.value;
      if (/___/.test(codeWithoutComments(code))) { verdict(ctx, false, 'Todavía quedan espacios <code>___</code> sin completar.'); return; }
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
  ctx.work.append(h('div', { class: 'apec-mb-layout' },
    h('div', { class: 'apec-mb-col' }, board.board, target),
    h('div', { class: 'apec-ide' }, h('div', { class: 'apec-ide-title' }, h('span', {}, '🟩 main.py (MakeCode Python)'), h('span', { class: 'apec-ide-keys' }, 'Tab: sangría · Ctrl+Enter: cargar')),
      ed.box, h('div', { class: 'apec-toolbar' }, runBtn, verifyBtn, stopBtn), log)));
  ctx.onLeave(() => sim?.stop());
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
   PROTOBOARD
   ====================================================================== */
export function renderProto(p, ctx, { verdict }) {
  const parts = {
    R: { name: 'Resistencia 220 Ω', icon: '〰️', legs: [] },
    W: { name: 'Cable negro', icon: '➖', legs: [] },
  };
  if (ctx.done) { parts.R.legs = ['+3', 'c5']; parts.W.legs = ['b7', '-9']; }
  let current = 'R';
  const led = p.led;
  const result = h('p', { class: 'apec-circuit-result', 'aria-live': 'polite' }, 'Elige un componente y toca dos agujeros para pincharlo.');
  const grid = h('div', { class: 'apec-proto-board', role: 'grid', 'aria-label': 'Protoboard' });
  const palette = h('div', { class: 'apec-cl-opts', role: 'radiogroup', 'aria-label': 'Componente a colocar' });
  const owner = (hole) => {
    if (hole === led.a) return 'LED+'; if (hole === led.k) return 'LED−';
    for (const [k, pt] of Object.entries(parts)) if (pt.legs.includes(hole)) return k;
    return null;
  };
  const highlight = (hole, on) => { for (const x of protoNet(hole)) grid.querySelector(`[data-h="${x}"]`)?.classList.toggle('net', on); };
  const drawPalette = () => palette.replaceChildren(...Object.entries(parts).map(([k, pt]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(current === k), class: `apec-pill ${current === k ? 'on' : ''}`, onclick: () => { current = k; drawPalette(); result.textContent = `Colocando: ${pt.name}. ${pt.legs.length === 2 ? 'Ya está pinchada: si tocas un agujero, la vuelves a colocar.' : `Toca ${pt.legs.length ? 'el segundo' : 'el primer'} agujero.`}`; } },
    `${pt.icon} ${pt.name} ${pt.legs.length === 2 ? '✔' : `(${pt.legs.length}/2)`}`)));
  const hole = (id, extra = '') => {
    const o = owner(id);
    const b = h('button', { type: 'button', class: `apec-hole ${extra} ${o ? `has ${o === 'R' ? 'r' : o === 'W' ? 'w' : 'led'}` : ''}`, 'data-h': id, title: id, 'aria-label': `Agujero ${id}${o ? `, ocupado por ${o === 'R' ? 'la resistencia' : o === 'W' ? 'el cable' : o === 'LED+' ? 'la pata larga del LED' : 'la pata corta del LED'}` : ''}` },
      o === 'LED+' ? '+' : o === 'LED−' ? '−' : o === 'R' ? 'R' : o === 'W' ? '●' : '');
    b.addEventListener('mouseenter', () => highlight(id, true));
    b.addEventListener('mouseleave', () => highlight(id, false));
    b.addEventListener('focus', () => highlight(id, true));
    b.addEventListener('blur', () => highlight(id, false));
    b.addEventListener('click', () => {
      if (o === 'LED+' || o === 'LED−') { result.textContent = 'Ahí ya está una pata del LED.'; return; }
      const pt = parts[current];
      if (pt.legs.includes(id)) { pt.legs = pt.legs.filter((x) => x !== id); draw(); return; }
      if (o) { result.textContent = 'Ese agujero ya está ocupado.'; return; }
      if (pt.legs.length === 2) pt.legs = [];
      pt.legs.push(id);
      result.textContent = pt.legs.length === 1 ? `Primera pata de ${pt.name} en ${id}. Toca el agujero de la otra pata.` : `${pt.name}: de ${pt.legs[0]} a ${pt.legs[1]}.`;
      draw();
      highlight(id, true);
    });
    return b;
  };
  const draw = () => {
    grid.replaceChildren();
    const colHead = h('div', { class: 'apec-proto-row head' }, h('span', { class: 'apec-proto-lbl' }, ''), Array.from({ length: PROTO_COLS }, (_, i) => h('span', { class: 'apec-proto-lbl' }, String(i + 1))));
    grid.append(colHead);
    grid.append(h('div', { class: 'apec-proto-row rail plus' }, h('span', { class: 'apec-proto-lbl' }, '+'), Array.from({ length: PROTO_COLS }, (_, i) => hole(`+${i + 1}`, 'rail'))));
    grid.append(h('div', { class: 'apec-proto-row rail minus' }, h('span', { class: 'apec-proto-lbl' }, '−'), Array.from({ length: PROTO_COLS }, (_, i) => hole(`-${i + 1}`, 'rail'))));
    for (const r of PROTO_TOP) grid.append(h('div', { class: 'apec-proto-row' }, h('span', { class: 'apec-proto-lbl' }, r), Array.from({ length: PROTO_COLS }, (_, i) => hole(`${r}${i + 1}`))));
    grid.append(h('div', { class: 'apec-proto-gap', 'aria-hidden': 'true' }, 'canaleta'));
    for (const r of PROTO_BOTTOM) grid.append(h('div', { class: 'apec-proto-row' }, h('span', { class: 'apec-proto-lbl' }, r), Array.from({ length: PROTO_COLS }, (_, i) => hole(`${r}${i + 1}`))));
    drawPalette();
  };
  const bulb = h('div', { class: 'apec-proto-bulb', 'aria-hidden': 'true' }, '💡');
  const test = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => {
    const missing = Object.values(parts).filter((pt) => pt.legs.length < 2);
    if (missing.length) { verdict(ctx, false, `Falta colocar: ${missing.map((pt) => pt.name).join(' y ')} (cada uno tiene 2 patas).`); return; }
    const links = [...protoLinks(), parts.W.legs];
    const r = solveCircuit({ links, comps: [{ type: 'LED', a: led.a, b: led.k }, { type: 'R', a: parts.R.legs[0], b: parts.R.legs[1] }], pos: '+1', neg: '-1' });
    result.textContent = r.message;
    bulb.className = `apec-proto-bulb ${r.status === 'on' ? 'on' : r.status === 'burnt' ? 'burnt' : ''}`;
    verdict(ctx, r.status === 'on', p.fail);
  } }, '⚡ Probar circuito');
  draw();
  ctx.work.append(h('div', { class: 'apec-proto-wrap' },
    h('div', { class: 'apec-proto-battery' }, '🔋 Pila 3 V', h('small', {}, '+ al riel rojo · − al riel azul'), bulb),
    h('div', { class: 'apec-proto-scroll' }, grid)),
    h('fieldset', { class: 'apec-fieldset' }, h('legend', {}, 'Componente a colocar'), palette), result, h('div', { class: 'apec-row' }, test));
}
