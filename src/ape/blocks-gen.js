// Bloques de MakeCode (en español) → Python de MakeCode, para correr en la micro:bit simulada.
// Trabaja sobre el JSON que guarda Blockly (serialization), así que no necesita el navegador
// y se puede probar con tests. También trae un "constructor" para escribir programas de bloques.

/* ---------------- constructor de programas de bloques (para el contenido y los tests) ---------------- */
let uid = 0;
const id = () => `b${(uid += 1)}`;
export const num = (n) => ({ shadow: { type: 'math_number', id: id(), fields: { NUM: n } } });
export const txt = (t) => ({ shadow: { type: 'text', id: id(), fields: { TEXT: t } } });
/** Valor que es un bloque (reporte), con el número de fondo que tiene MakeCode. */
export const put = (block, fallback = 0) => ({ block, ...num(fallback) });
export const putB = (block) => ({ block });
/** Un bloque: tipo, campos, entradas y bloques que siguen debajo. */
export function B(type, fields = {}, inputs = {}, ...next) {
  const b = { type, id: id(), fields: { ...fields }, inputs: { ...inputs } };
  if (next.length) b.next = { block: chain(next) };
  return b;
}
/** Encadena bloques uno debajo del otro. */
export function chain(list) {
  const [first, ...rest] = list.filter(Boolean);
  if (!first) return null;
  let cur = first;
  for (const b of rest) { while (cur.next?.block) cur = cur.next.block; cur.next = { block: b }; cur = b; }
  return first;
}
export const stack = (...list) => ({ block: chain(list) });
/** Workspace completo con bloques sueltos (contenedores) y variables. */
export function program(tops, vars = []) {
  let y = 20;
  const blocks = tops.map((t, i) => { const b = { ...t, x: 20 + (i % 2) * 330, y }; if (i % 2) y += 190; return b; });
  return { blocks: { languageVersion: 0, blocks }, variables: vars.map((v) => ({ name: v, id: `var_${v}` })) };
}
export const varRef = (name) => ({ id: `var_${name}` });

/* ---------------- generador ---------------- */
const EVENT_TYPES = ['mb_on_start', 'mb_forever', 'mb_on_button', 'mb_on_gesture', 'mb_every', 'mb_on_pin'];
const OPS = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
const ARITH = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/' };
const GESTURE_NAME = { SHAKE: 'agitado', LOGO_UP: 'logo arriba', LOGO_DOWN: 'logo abajo', TILT_LEFT: 'inclinado a la izquierda', TILT_RIGHT: 'inclinado a la derecha' };

export function safeName(n) {
  let s = String(n || 'variable').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_áéíóúñÁÉÍÓÚÑü]/g, '');
  if (!s || /^\d/.test(s)) s = `v_${s}`;
  if (['if', 'else', 'elif', 'for', 'while', 'in', 'and', 'or', 'not', 'def', 'return', 'True', 'False', 'None', 'import', 'from', 'pass', 'global', 'basic', 'input', 'led', 'pins', 'loops', 'music'].includes(s)) s += '_';
  return s;
}

/**
 * @param {object} state  JSON de Blockly.serialization.workspaces.save()
 * @returns {{ code: string, warnings: string[], events: string[] }}
 */
export function blocksToPython(state) {
  const tops = state?.blocks?.blocks || [];
  const varNames = new Map((state?.variables || []).map((v) => [v.id, safeName(v.name)]));
  const warnings = [];
  const varOf = (field) => varNames.get(field?.id) || safeName(field?.name || field?.id || 'variable');
  const valueBlock = (input) => input?.block || input?.shadow || null;

  const expr = (b) => {
    if (!b) return '0';
    const f = b.fields || {};
    const inp = (name, def = '0') => { const x = valueBlock(b.inputs?.[name]); return x ? expr(x) : def; };
    switch (b.type) {
      case 'math_number': { const n = Number(f.NUM); return Number.isFinite(n) ? String(n) : '0'; }
      case 'text': return JSON.stringify(String(f.TEXT ?? ''));
      case 'mb_bool': return f.BOOL === 'FALSE' ? 'False' : 'True';
      case 'mb_compare': return `${inp('A')} ${OPS[f.OP] || '=='} ${inp('B')}`;
      case 'mb_and_or': return `(${inp('A', 'False')}) ${f.OP === 'OR' ? 'or' : 'and'} (${inp('B', 'False')})`;
      case 'mb_not': return `not (${inp('A', 'False')})`;
      case 'mb_arith': return `(${inp('A')} ${ARITH[f.OP] || '+'} ${inp('B')})`;
      case 'mb_random': return `randint(${inp('FROM')}, ${inp('TO')})`;
      case 'mb_remainder': return `(${inp('A')} % ${inp('B')})`;
      case 'mb_var_get': return varOf(f.VAR);
      case 'mb_button_pressed': return `input.button_is_pressed(Button.${f.BUTTON || 'A'})`;
      case 'mb_temperature': return 'input.temperature()';
      case 'mb_light': return 'input.light_level()';
      case 'mb_point': return `led.point(${inp('X')}, ${inp('Y')})`;
      case 'mb_digital_read': return `pins.digital_read_pin(DigitalPin.${f.PIN || 'P0'})`;
      case 'mb_analog_read': return `pins.analog_read_pin(AnalogPin.${f.PIN || 'P0'})`;
      default:
        warnings.push(`El bloque "${b.type}" no va en un hueco de valor.`);
        return '0';
    }
  };

  const assigned = new Set();
  const stmts = (b, ind) => {
    const out = [];
    let cur = b;
    while (cur) {
      out.push(...stmt(cur, ind));
      cur = cur.next?.block || null;
    }
    return out;
  };
  const body = (b, name, ind) => {
    const inner = b.inputs?.[name]?.block;
    const lines = inner ? stmts(inner, ind) : [];
    return lines.length ? lines : [`${ind}pass`];
  };
  const stmt = (b, ind) => {
    const f = b.fields || {};
    const inp = (name, def = '0') => { const x = valueBlock(b.inputs?.[name]); return x ? expr(x) : def; };
    switch (b.type) {
      case 'mb_show_number': return [`${ind}basic.show_number(${inp('NUM')})`];
      case 'mb_show_string': return [`${ind}basic.show_string(${inp('TEXT', '""')})`];
      case 'mb_show_icon': return [`${ind}basic.show_icon(IconNames.${f.ICON || 'HEART'})`];
      case 'mb_show_leds': {
        const rows = [];
        for (let y = 0; y < 5; y++) { let r = ''; for (let x = 0; x < 5; x++) r += f[`L${y}${x}`] === true || f[`L${y}${x}`] === 'TRUE' ? '#' : '.'; rows.push(r); }
        return [`${ind}basic.show_leds("${rows.join('/')}")`];
      }
      case 'mb_clear': return [`${ind}basic.clear_screen()`];
      case 'mb_pause': return [`${ind}basic.pause(${inp('MS', '100')})`];
      case 'mb_plot': return [`${ind}led.plot(${inp('X')}, ${inp('Y')})`];
      case 'mb_unplot': return [`${ind}led.unplot(${inp('X')}, ${inp('Y')})`];
      case 'mb_toggle': return [`${ind}led.toggle(${inp('X')}, ${inp('Y')})`];
      case 'mb_digital_write': return [`${ind}pins.digital_write_pin(DigitalPin.${f.PIN || 'P0'}, ${inp('VALUE')})`];
      case 'mb_var_set': { const n = varOf(f.VAR); assigned.add(n); return [`${ind}${n} = ${inp('VALUE')}`]; }
      case 'mb_var_change': { const n = varOf(f.VAR); assigned.add(n); return [`${ind}${n} += ${inp('VALUE', '1')}`]; }
      case 'mb_repeat': return [`${ind}for _ in range(int(${inp('TIMES', '4')})):`, ...body(b, 'DO', `${ind}    `)];
      case 'mb_while': return [`${ind}while ${inp('COND', 'False')}:`, ...body(b, 'DO', `${ind}    `), `${ind}    basic.pause(20)`];
      case 'mb_for': { const n = varOf(f.VAR); assigned.add(n); return [`${ind}for ${n} in range(0, int(${inp('TO', '4')}) + 1):`, ...body(b, 'DO', `${ind}    `)]; }
      case 'mb_if': return [`${ind}if ${inp('COND', 'False')}:`, ...body(b, 'DO', `${ind}    `)];
      case 'mb_ifelse': return [`${ind}if ${inp('COND', 'False')}:`, ...body(b, 'DO', `${ind}    `), `${ind}else:`, ...body(b, 'ELSE', `${ind}    `)];
      default:
        if (EVENT_TYPES.includes(b.type)) { warnings.push('Un bloque de evento no puede ir adentro de otro.'); return []; }
        warnings.push(`No sé traducir el bloque "${b.type}".`);
        return [];
    }
  };

  const init = [...new Set(varNames.values())].map((n) => `${n} = 0`);
  const defs = [];
  const start = [];
  const forever = [];
  const events = [];
  const counter = {};
  const fname = (base) => { counter[base] = (counter[base] || 0) + 1; return counter[base] > 1 ? `${base}${counter[base]}` : base; };
  const handler = (name, b, register) => {
    assigned.clear();
    const lines = body(b, 'DO', '    ');
    const glob = [...assigned].filter((n) => init.includes(`${n} = 0`));
    defs.push(`def ${name}():`, ...(glob.length ? [`    global ${glob.join(', ')}`] : []), ...lines, register(name), '');
  };
  let loose = 0;
  for (const b of tops) {
    const f = b.fields || {};
    switch (b.type) {
      case 'mb_on_start': events.push('al iniciar'); start.push(...body(b, 'DO', '')); break;
      case 'mb_forever': events.push('para siempre'); assigned.clear(); { const lines = body(b, 'DO', '    '); const glob = [...assigned].filter((n) => init.includes(`${n} = 0`)); const n = fname('on_forever'); forever.push(`def ${n}():`, ...(glob.length ? [`    global ${glob.join(', ')}`] : []), ...lines, `basic.forever(${n})`, ''); } break;
      case 'mb_on_button': events.push(`botón ${f.BUTTON || 'A'}`); handler(fname(`on_button_pressed_${String(f.BUTTON || 'A').toLowerCase()}`), b, (n) => `input.on_button_pressed(Button.${f.BUTTON || 'A'}, ${n})`); break;
      case 'mb_on_gesture': events.push(`si ${GESTURE_NAME[f.GESTURE] || 'agitado'}`); handler(fname(`on_gesture_${String(f.GESTURE || 'SHAKE').toLowerCase()}`), b, (n) => `input.on_gesture(Gesture.${f.GESTURE || 'SHAKE'}, ${n})`); break;
      case 'mb_every': events.push('cada'); { const ms = valueBlock(b.inputs?.MS) ? expr(valueBlock(b.inputs.MS)) : '500'; handler(fname('on_every_interval'), b, (n) => `loops.every_interval(${ms}, ${n})`); } break;
      default: loose += 1;
    }
  }
  if (loose) warnings.push(`Hay ${loose} bloque${loose === 1 ? '' : 's'} suelto${loose === 1 ? '' : 's'}: no está${loose === 1 ? '' : 'n'} adentro de "al iniciar", "para siempre" ni de un evento, así que no se ejecuta${loose === 1 ? '' : 'n'}.`);
  const code = [...init, ...(init.length ? [''] : []), ...defs, ...start, ...(start.length ? [''] : []), ...forever].join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { code: `${code}\n`, warnings, events };
}
