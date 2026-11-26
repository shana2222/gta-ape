// Editor de bloques estilo MakeCode (en español) con Blockly (copia local en vendor/blockly).
// Mismos nombres y colores que MakeCode para micro:bit: Básico, Entrada, LED, Bucles, Lógica, Variables, Matemática, Pines.

export const CAT = {
  basic: { name: 'Básico', colour: '#1E90FF', icon: '▦' },
  input: { name: 'Entrada', colour: '#D400D4', icon: '◉' },
  led: { name: 'LED', colour: '#5C2D91', icon: '◐' },
  loops: { name: 'Bucles', colour: '#00AA00', icon: '↻' },
  logic: { name: 'Lógica', colour: '#00A4A6', icon: '⤨' },
  vars: { name: 'Variables', colour: '#DC143C', icon: '≡' },
  math: { name: 'Matemática', colour: '#9400D3', icon: '▤' },
  pins: { name: 'Pines', colour: '#B22222', icon: '◎' },
};

const ICON_OPTIONS = [
  ['❤️ corazón', 'HEART'], ['♡ corazón chico', 'SMALL_HEART'], ['🙂 feliz', 'HAPPY'], ['🙁 triste', 'SAD'], ['😮 sorpresa', 'SURPRISED'],
  ['😴 dormido', 'ASLEEP'], ['✔ sí', 'YES'], ['✖ no', 'NO'], ['◻ cuadrado', 'SQUARE'], ['◇ diamante', 'DIAMOND'],
  ['△ triángulo', 'TRIANGLE'], ['💀 calavera', 'SKULL'], ['👻 fantasma', 'GHOST'], ['🏠 casa', 'HOUSE'], ['☂ paraguas', 'UMBRELLA'], ['🗡 espada', 'SWORD'],
];
const BUTTONS = [['A', 'A'], ['B', 'B'], ['A+B', 'AB']];
const GESTURES = [['agitado', 'SHAKE'], ['logo arriba', 'LOGO_UP'], ['logo abajo', 'LOGO_DOWN'], ['inclinado a la izquierda', 'TILT_LEFT'], ['inclinado a la derecha', 'TILT_RIGHT']];
const PINS = [['P0', 'P0'], ['P1', 'P1'], ['P2', 'P2']];

function blockDefs() {
  const c = (k) => CAT[k].colour;
  const stmt = { previousStatement: null, nextStatement: null };
  const ledRows = [0, 1, 2, 3, 4].map((y) => ({
    [`message${y + 1}`]: '%1 %2 %3 %4 %5',
    [`args${y + 1}`]: [0, 1, 2, 3, 4].map((x) => ({ type: 'field_checkbox', name: `L${y}${x}`, checked: false })),
  }));
  return [
    { type: 'math_number', message0: '%1', args0: [{ type: 'field_number', name: 'NUM', value: 0 }], output: 'Number', colour: c('math') },
    { type: 'text', message0: '%1', args0: [{ type: 'field_input', name: 'TEXT', text: '' }], output: 'String', colour: c('basic') },
    // Básico
    { type: 'mb_on_start', message0: 'al iniciar %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: c('basic') },
    { type: 'mb_forever', message0: 'para siempre %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: c('basic') },
    { type: 'mb_show_number', message0: 'mostrar número %1', args0: [{ type: 'input_value', name: 'NUM', check: 'Number' }], ...stmt, colour: c('basic') },
    { type: 'mb_show_string', message0: 'mostrar cadena %1', args0: [{ type: 'input_value', name: 'TEXT' }], ...stmt, colour: c('basic') },
    { type: 'mb_show_icon', message0: 'mostrar ícono %1', args0: [{ type: 'field_dropdown', name: 'ICON', options: ICON_OPTIONS }], ...stmt, colour: c('basic') },
    Object.assign({ type: 'mb_show_leds', message0: 'mostrar LEDs', ...stmt, colour: c('basic') }, ...ledRows),
    { type: 'mb_clear', message0: 'borrar la pantalla', ...stmt, colour: c('basic') },
    { type: 'mb_pause', message0: 'pausa (ms) %1', args0: [{ type: 'input_value', name: 'MS', check: 'Number' }], ...stmt, colour: c('basic') },
    // Entrada
    { type: 'mb_on_button', message0: 'al presionarse el botón %1 %2 %3', args0: [{ type: 'field_dropdown', name: 'BUTTON', options: BUTTONS }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: c('input') },
    { type: 'mb_on_gesture', message0: 'si %1 %2 %3', args0: [{ type: 'field_dropdown', name: 'GESTURE', options: GESTURES }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: c('input') },
    { type: 'mb_button_pressed', message0: 'botón %1 presionado', args0: [{ type: 'field_dropdown', name: 'BUTTON', options: BUTTONS }], output: 'Boolean', colour: c('input') },
    { type: 'mb_temperature', message0: 'temperatura (°C)', output: 'Number', colour: c('input') },
    { type: 'mb_light', message0: 'nivel de luz', output: 'Number', colour: c('input') },
    // LED
    { type: 'mb_plot', message0: 'graficar x %1 y %2', args0: [{ type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], inputsInline: true, ...stmt, colour: c('led') },
    { type: 'mb_unplot', message0: 'desgraficar x %1 y %2', args0: [{ type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], inputsInline: true, ...stmt, colour: c('led') },
    { type: 'mb_toggle', message0: 'alternar x %1 y %2', args0: [{ type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], inputsInline: true, ...stmt, colour: c('led') },
    // Bucles
    { type: 'mb_repeat', message0: 'repetir %1 veces %2 ejecutar %3', args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], ...stmt, colour: c('loops') },
    { type: 'mb_while', message0: 'mientras %1 %2 ejecutar %3', args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], ...stmt, colour: c('loops') },
    { type: 'mb_for', message0: 'para %1 de 0 a %2 %3 ejecutar %4', args0: [{ type: 'field_variable', name: 'VAR', variable: 'index' }, { type: 'input_value', name: 'TO', check: 'Number' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], ...stmt, colour: c('loops') },
    { type: 'mb_every', message0: 'cada %1 ms %2 %3', args0: [{ type: 'input_value', name: 'MS', check: 'Number' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: c('loops') },
    // Lógica
    { type: 'mb_if', message0: 'si %1 entonces %2 %3', args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], ...stmt, colour: c('logic') },
    { type: 'mb_ifelse', message0: 'si %1 entonces %2 %3', args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], message1: 'si no %1', args1: [{ type: 'input_statement', name: 'ELSE' }], ...stmt, colour: c('logic') },
    { type: 'mb_compare', message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A' }, { type: 'field_dropdown', name: 'OP', options: [['=', 'EQ'], ['≠', 'NEQ'], ['<', 'LT'], ['≤', 'LTE'], ['>', 'GT'], ['≥', 'GTE']] }, { type: 'input_value', name: 'B' }], inputsInline: true, output: 'Boolean', colour: c('logic') },
    { type: 'mb_and_or', message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }, { type: 'field_dropdown', name: 'OP', options: [['y', 'AND'], ['o', 'OR']] }, { type: 'input_value', name: 'B', check: 'Boolean' }], inputsInline: true, output: 'Boolean', colour: c('logic') },
    { type: 'mb_not', message0: 'no %1', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }], output: 'Boolean', colour: c('logic') },
    { type: 'mb_bool', message0: '%1', args0: [{ type: 'field_dropdown', name: 'BOOL', options: [['verdadero', 'TRUE'], ['falso', 'FALSE']] }], output: 'Boolean', colour: c('logic') },
    // Variables
    { type: 'mb_var_set', message0: 'fijar %1 a %2', args0: [{ type: 'field_variable', name: 'VAR', variable: 'item' }, { type: 'input_value', name: 'VALUE' }], inputsInline: true, ...stmt, colour: c('vars') },
    { type: 'mb_var_change', message0: 'cambiar %1 por %2', args0: [{ type: 'field_variable', name: 'VAR', variable: 'item' }, { type: 'input_value', name: 'VALUE', check: 'Number' }], inputsInline: true, ...stmt, colour: c('vars') },
    { type: 'mb_var_get', message0: '%1', args0: [{ type: 'field_variable', name: 'VAR', variable: 'item' }], output: null, colour: c('vars') },
    // Matemática
    { type: 'mb_arith', message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'field_dropdown', name: 'OP', options: [['+', 'ADD'], ['−', 'MINUS'], ['×', 'MULTIPLY'], ['÷', 'DIVIDE']] }, { type: 'input_value', name: 'B', check: 'Number' }], inputsInline: true, output: 'Number', colour: c('math') },
    { type: 'mb_random', message0: 'escoger al azar de %1 a %2', args0: [{ type: 'input_value', name: 'FROM', check: 'Number' }, { type: 'input_value', name: 'TO', check: 'Number' }], inputsInline: true, output: 'Number', colour: c('math') },
    { type: 'mb_remainder', message0: 'restante de %1 ÷ %2', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], inputsInline: true, output: 'Number', colour: c('math') },
    // Pines
    { type: 'mb_digital_write', message0: 'escritura digital pin %1 a %2', args0: [{ type: 'field_dropdown', name: 'PIN', options: PINS }, { type: 'input_value', name: 'VALUE', check: 'Number' }], inputsInline: true, ...stmt, colour: c('pins') },
    { type: 'mb_digital_read', message0: 'lectura digital pin %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: PINS }], output: 'Number', colour: c('pins') },
    { type: 'mb_analog_read', message0: 'lectura analógica pin %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: PINS }], output: 'Number', colour: c('pins') },
  ];
}

const N = (n) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const T = (t) => ({ shadow: { type: 'text', fields: { TEXT: t } } });
const blk = (type, extra = {}) => ({ kind: 'block', type, ...extra });

/** Caja de herramientas: categorías como en MakeCode. `only` limita los bloques (por actividad). */
export function toolbox(only = null) {
  const cats = {
    basic: [blk('mb_show_number', { inputs: { NUM: N(0) } }), blk('mb_show_leds'), blk('mb_show_icon'), blk('mb_show_string', { inputs: { TEXT: T('Hola') } }), blk('mb_clear'), blk('mb_pause', { inputs: { MS: N(100) } }), blk('mb_on_start'), blk('mb_forever')],
    input: [blk('mb_on_button'), blk('mb_on_gesture'), blk('mb_button_pressed'), blk('mb_temperature'), blk('mb_light')],
    led: [blk('mb_plot', { inputs: { X: N(0), Y: N(0) } }), blk('mb_unplot', { inputs: { X: N(0), Y: N(0) } }), blk('mb_toggle', { inputs: { X: N(0), Y: N(0) } })],
    loops: [blk('mb_repeat', { inputs: { TIMES: N(4) } }), blk('mb_while', { inputs: { COND: { shadow: { type: 'mb_bool', fields: { BOOL: 'TRUE' } } } } }), blk('mb_for', { inputs: { TO: N(4) } }), blk('mb_every', { inputs: { MS: N(500) } })],
    logic: [blk('mb_if', { inputs: { COND: { shadow: { type: 'mb_bool', fields: { BOOL: 'TRUE' } } } } }), blk('mb_ifelse', { inputs: { COND: { shadow: { type: 'mb_bool', fields: { BOOL: 'TRUE' } } } } }),
      blk('mb_compare', { fields: { OP: 'EQ' }, inputs: { A: N(0), B: N(0) } }), blk('mb_compare', { fields: { OP: 'LT' }, inputs: { A: N(0), B: N(0) } }),
      blk('mb_and_or', { fields: { OP: 'AND' } }), blk('mb_and_or', { fields: { OP: 'OR' } }), blk('mb_not'), blk('mb_bool')],
    vars: 'MB_VARIABLES',
    math: [blk('mb_arith', { inputs: { A: N(0), B: N(0) } }), blk('mb_random', { inputs: { FROM: N(0), TO: N(10) } }), blk('mb_remainder', { inputs: { A: N(0), B: N(1) } }), blk('math_number')],
    pins: [blk('mb_digital_write', { inputs: { VALUE: N(0) } }), blk('mb_digital_read'), blk('mb_analog_read')],
  };
  const keys = only || Object.keys(cats);
  return {
    kind: 'categoryToolbox',
    contents: keys.map((k) => (cats[k] === 'MB_VARIABLES'
      ? { kind: 'category', name: `${CAT[k].icon} ${CAT[k].name}`, colour: CAT[k].colour, custom: 'MB_VARIABLES' }
      : { kind: 'category', name: `${CAT[k].icon} ${CAT[k].name}`, colour: CAT[k].colour, contents: cats[k] })),
  };
}

/* ---------------- carga de Blockly (una sola vez) ---------------- */
let loading = null;
function addScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.append(s);
  });
}
const BASE = new URL('../../vendor/blockly/', import.meta.url).href;

export function loadBlockly() {
  if (window.Blockly?.inject && window.__apeBlocksReady) return Promise.resolve(window.Blockly);
  if (loading) return loading;
  loading = (async () => {
    if (!window.Blockly?.inject) await addScript(`${BASE}blockly_compressed.js`);
    await addScript(`${BASE}msg-es.js`);
    const Blockly = window.Blockly;
    Blockly.common.defineBlocksWithJsonArray(blockDefs());
    window.__apeBlocksReady = true;
    return Blockly;
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

let themeMade = null;
function theme(Blockly) {
  if (themeMade) return themeMade;
  themeMade = Blockly.Theme.defineTheme('makecode-es', {
    base: Blockly.Themes.Classic,
    fontStyle: { family: '"Roboto Mono", ui-monospace, Menlo, Consolas, monospace', weight: '600', size: 11 },
    componentStyles: {
      workspaceBackgroundColour: '#ecf0f1', toolboxBackgroundColour: '#ffffff', toolboxForegroundColour: '#1b1f24',
      flyoutBackgroundColour: '#3d3d3d', flyoutForegroundColour: '#ffffff', flyoutOpacity: 0.96, scrollbarColour: '#b0b6bd', insertionMarkerColour: '#ffffff',
    },
  });
  return themeMade;
}

/**
 * Crea un área de bloques.
 * @returns {Promise<{ ws, save: () => object, resize: () => void, dispose: () => void }>}
 */
export async function createWorkspace(container, { state = null, readOnly = false, only = null, onChange = null } = {}) {
  const Blockly = await loadBlockly();
  const ws = Blockly.inject(container, {
    toolbox: readOnly ? undefined : toolbox(only),
    readOnly,
    renderer: 'zelos',
    theme: theme(Blockly),
    media: `${BASE}media/`,
    trashcan: !readOnly,
    sounds: false,
    move: { scrollbars: true, drag: true, wheel: true },
    zoom: { controls: !readOnly, wheel: false, startScale: readOnly ? 0.8 : 0.85, maxScale: 2, minScale: 0.4, scaleSpeed: 1.15 },
    grid: { spacing: 22, length: 2, colour: '#d6dbdf', snap: false },
  });
  if (!readOnly) {
    ws.registerToolboxCategoryCallback('MB_VARIABLES', (w) => {
      const list = [{ kind: 'button', text: 'Crear una variable...', callbackKey: 'MB_NEW_VAR' }];
      const vars = w.getVariablesOfType('');
      if (vars.length) {
        const v = vars[vars.length - 1];
        list.push(
          { kind: 'block', type: 'mb_var_set', fields: { VAR: { id: v.getId() } }, inputs: { VALUE: N(0) } },
          { kind: 'block', type: 'mb_var_change', fields: { VAR: { id: v.getId() } }, inputs: { VALUE: N(1) } },
          ...vars.map((x) => ({ kind: 'block', type: 'mb_var_get', fields: { VAR: { id: x.getId() } } })),
        );
      }
      return list;
    });
    ws.registerButtonCallback('MB_NEW_VAR', (btn) => {
      Blockly.Variables.createVariableButtonHandler(btn.getTargetWorkspace(), null, '');
    });
  }
  if (state) {
    try { Blockly.serialization.workspaces.load(state, ws); } catch (e) { console.warn('[GTA APE] No se pudo cargar el programa de bloques', e); }
  }
  if (onChange) ws.addChangeListener((ev) => { if (!ev.isUiEvent) onChange(); });
  const resize = () => { try { Blockly.svgResize(ws); } catch { /* nada */ } };
  if (readOnly) {
    // que el bloque entre completo
    setTimeout(() => { resize(); ws.zoomToFit?.(); if (ws.scale > 0.85) ws.setScale(0.85); ws.scrollCenter?.(); }, 30);
  }
  return {
    ws,
    save: () => Blockly.serialization.workspaces.save(ws),
    resize,
    dispose: () => { try { ws.dispose(); } catch { /* nada */ } },
  };
}
