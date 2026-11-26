// Contenidos del APE de 9no — Ciencias de la Computación (según el portafolio del curso).
// Cada misión = metas de aprendizaje + explicación (pantallas cortas + tarjetas) + actividades + reflexión.
// Las actividades se verifican por la lógica, no por el texto exacto.
import { runPython, codeWithoutComments } from './python-mini.js';
import { B, put, putB, num, txt, stack, program } from './blocks-gen.js';

/* ---------------- bloques dibujados (para las explicaciones) ---------------- */
const mk = (cat, text) => `<span class="mk mk-${cat}">${text}</span>`;
const mkR = (cat, text) => `<span class="mk-r mk-${cat}">${text}</span>`;
const mkH = (cat, text) => `<span class="mk-h mk-${cat}">${text}</span>`;
const mkC = (cat, head, inner) => `<span class="mk-c mk-${cat}"><span class="mk-head">${head}</span><span class="mk-body">${inner}</span><span class="mk-foot"></span></span>`;
const mkIf = (cond, yes, no) => `<span class="mk-c mk-logic"><span class="mk-head">si ${mkH('logic', cond)} entonces</span><span class="mk-body">${yes}</span><span class="mk-head">si no</span><span class="mk-body">${no}</span><span class="mk-foot"></span></span>`;

/* ---------------- utilidades de verificación ---------------- */
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const lines = (out) => String(out).split('\n').map((l) => l.trim()).filter(Boolean);
const has = (out, ...words) => words.every((w) => norm(out).includes(norm(w)));
const numsIn = (out) => (String(out).match(/-?\d+(?:[.,]\d+)?/g) || []).map((n) => Number(n.replace(',', '.')));
const hasNum = (out, n, tol = 0.011) => numsIn(out).some((x) => Math.abs(x - n) <= tol);

/**
 * Verificador de actividades de Python.
 * tests: [{ inputs: [...], check: (out) => true | 'mensaje de qué revisar' }]
 * require: [{ re: /…/, msg }]  (se busca en el código sin comentarios)
 */
export async function checkPython(code, { tests = [{ inputs: [] }], require = [], forbid = [] }) {
  const clean = codeWithoutComments(code);
  if (!clean.trim()) return { ok: false, msg: 'Todavía no escribiste código. Escribe tu programa en el editor y aprieta ▶ Ejecutar y verificar.' };
  for (const t of tests) {
    const r = await runPython(code, { inputs: t.inputs || [], seed: 7 });
    if (r.error) {
      const ctx = t.inputs?.length ? ` (probando con las entradas: ${t.inputs.map((x) => `"${x}"`).join(', ')})` : '';
      return { ok: false, error: r.error, transcript: r.transcript, msg: `Tu programa da un error${ctx}. Mira el mensaje en rojo y la pista 💡.` };
    }
    if (t.check) {
      const v = t.check(r.out, r);
      if (v !== true) {
        const ctx = t.inputs?.length ? `Probé tu programa con las entradas ${t.inputs.map((x) => `<code>${esc(x)}</code>`).join(', ')} y` : 'Ejecuté tu programa y';
        return { ok: false, transcript: r.transcript, msg: `${ctx} todavía no hace lo pedido: ${v || 'revisa la consigna.'}` };
      }
    }
  }
  for (const rq of require) {
    if (!rq.re.test(clean)) return { ok: false, msg: rq.msg };
  }
  for (const f of forbid) {
    if (f.re.test(clean)) return { ok: false, msg: f.msg };
  }
  return { ok: true };
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- bloques de contenido (para el reporte) ---------------- */
export const AREAS = {
  pc: { name: 'Pensamiento computacional', icon: '🧩' },
  hw: { name: 'Placas y electrónica', icon: '🔌' },
  ia: { name: 'Inteligencia artificial', icon: '🤖' },
  py: { name: 'Programación en Python', icon: '🐍' },
};

/* ======================================================================
   MISIONES
   ====================================================================== */
export const MISSIONS = [
  /* ---------------------------------------------------------------- 1 */
  {
    n: 1, area: 'pc', icon: '⚙️', title: 'El proceso computacional',
    tema: 'Entrada → Proceso → Salida y conceptos básicos de programación',
    goals: [
      'Identifico la entrada, el proceso y la salida de un sistema.',
      'Escribo un algoritmo con pasos ordenados y precisos.',
      'Distingo secuencia, condición y repetición.',
    ],
    lesson: [
      { title: 'Todo sistema hace lo mismo', html: `<p>Una computadora, un celular o una micro:bit funcionan siempre igual:</p>
        <div class="apec-flow"><span>⌨️ ENTRADA</span><i>→</i><span>⚙️ PROCESO</span><i>→</i><span>🖥️ SALIDA</span></div>
        <ul><li><b>Entrada</b>: los datos que recibe (teclado, botón, sensor).</li>
        <li><b>Proceso</b>: lo que hace con esos datos (calcula, compara, decide).</li>
        <li><b>Salida</b>: el resultado que muestra (pantalla, sonido, luz).</li></ul>` },
      { title: 'Ejemplo: el cajero automático', html: `<table class="apec-table"><tbody>
          <tr><th>Entrada</th><td>Tarjeta, PIN y el monto que escribes.</td></tr>
          <tr><th>Proceso</th><td>Verifica el PIN, revisa si hay saldo, descuenta el dinero.</td></tr>
          <tr><th>Salida</th><td>Los billetes, el ticket y el mensaje en pantalla.</td></tr>
        </tbody></table>
        <p class="apec-tip">💡 Muchas veces también hay <b>almacenamiento</b>: el banco guarda tu nuevo saldo.</p>` },
      { title: 'Algoritmo y programa', html: `<p>Un <b>algoritmo</b> es una lista de pasos <b>ordenados</b>, <b>precisos</b> y que <b>terminan</b>.</p>
        <p>Un <b>programa</b> es un algoritmo escrito en un <b>lenguaje de programación</b> para que lo ejecute una computadora.</p>
        <div class="apec-ex"><b>Algoritmo para cargar la tarjeta STM:</b><br>1. Ir a un local de cobranza. 2. Entregar la tarjeta. 3. Decir el monto. 4. Pagar. 5. Recibir la tarjeta y el ticket.</div>` },
      { title: 'Las 3 estructuras básicas', html: `<div class="apec-grid3">
          <div><span>➡️</span><b>Secuencia</b><small>Los pasos se hacen uno después del otro.</small></div>
          <div><span>🔀</span><b>Condición</b><small>Se elige un camino: <i>si</i> pasa algo hago esto, <i>si no</i> aquello.</small></div>
          <div><span>🔁</span><b>Repetición</b><small>Un paso se repite varias veces (o <i>mientras</i> se cumpla algo).</small></div>
        </div>
        <p>¡Con estas tres estructuras se puede escribir <b>cualquier</b> programa!</p>` },
    ],
    cards: [
      { front: 'Entrada', back: 'Datos que recibe el sistema. Ej: teclado, mouse, botón, sensor.' },
      { front: 'Proceso', back: 'Lo que el sistema hace con los datos: calcular, comparar, decidir.' },
      { front: 'Salida', back: 'El resultado que entrega. Ej: pantalla, parlante, LED, impresora.' },
      { front: 'Condición', back: 'Estructura que elige un camino: SI pasa algo… SI NO…' },
    ],
    phases: [
      {
        id: 'm2-a', title: 'Entrada, proceso o salida', type: 'classify',
        prompt: '<p>El <b>semáforo inteligente</b> de Santa Bruma tiene un botón para peatones. Clasifica cada parte.</p>',
        categories: ['Entrada', 'Proceso', 'Salida'],
        items: [
          { text: 'El peatón aprieta el botón.', cat: 0 },
          { text: 'El sensor detecta cuántos autos hay.', cat: 0 },
          { text: 'Calcula cuántos segundos esperar.', cat: 1 },
          { text: 'Decide si cambia a rojo para los autos.', cat: 1 },
          { text: 'Prende la luz verde del peatón.', cat: 2 },
          { text: 'Suena el pitido para personas ciegas.', cat: 2 },
        ],
        fail: 'Lo que el sistema RECIBE es entrada; lo que PIENSA/CALCULA es proceso; lo que MUESTRA o HACE SONAR es salida.',
      },
      {
        id: 'm2-b', title: 'Algoritmo: prender la micro:bit', type: 'order',
        prompt: '<p>Ordena los pasos del algoritmo para <b>mostrar un mensaje en la micro:bit</b>.</p>',
        items: ['Escribir el programa en MakeCode', 'Conectar la micro:bit con el cable USB', 'Descargar el programa a la placa', 'Ver el mensaje en la matriz de LED'],
        fail: 'Primero hay que tener el programa hecho; al final se ve el resultado. ¿Qué va en el medio?',
      },
      {
        id: 'm2-c', title: '¿Qué estructura es?', type: 'classify',
        prompt: '<p>Indica qué <b>estructura</b> se usa en cada instrucción.</p>',
        categories: ['Secuencia', 'Condición', 'Repetición'],
        items: [
          { text: 'Si llueve, llevo paraguas; si no, llevo gorro.', cat: 1 },
          { text: 'Revolver la mezcla 10 veces.', cat: 2 },
          { text: 'Abrir la puerta, entrar, cerrar la puerta.', cat: 0 },
          { text: 'Mientras el agua no hierva, esperar.', cat: 2 },
          { text: 'Si la nota es 6 o más, aprobé.', cat: 1 },
          { text: 'Encender la PC y después abrir el navegador.', cat: 0 },
        ],
        fail: 'Busca palabras clave: "si… si no" es condición; "veces" o "mientras" es repetición; "después" es secuencia.',
      },
    ],
    reflection: 'Elige un aparato de tu casa (microondas, celular, lavarropas…) y explica cuál es su entrada, su proceso y su salida.',
  },

  /* ---------------------------------------------------------------- 2 */
  {
    n: 2, area: 'hw', icon: '🟩', title: 'La placa micro:bit',
    tema: 'Placas programables: entradas, salidas y programas con bloques en MakeCode',
    goals: [
      'Reconozco las partes de la micro:bit y si son entrada o salida.',
      'Ubico un LED de la matriz con sus coordenadas (x, y).',
      'Programo eventos de la micro:bit con bloques (botones, agitar) y pruebo el resultado.',
    ],
    lesson: [
      { title: '¿Qué es una placa programable?', html: `<p>La micro:bit es una <b>minicomputadora</b>: <b>recibe información</b> por sus dispositivos de entrada, la <b>procesa</b> con su microprocesador (el cerebro de la placa) y <b>muestra resultados</b> por sus dispositivos de salida.</p>
        <p>Se programa en <b>MakeCode</b> con <b>bloques</b> (también con Python o JavaScript). Los bloques se arrastran y encastran como piezas.</p>` },
      { title: 'Sensores y actuadores', html: `<div class="apec-grid2">
          <div><b>👀 Sensores (entrada)</b><small>Son los ojos y oídos de la placa:</small><ul><li>Botones <b>A</b> y <b>B</b></li><li>Sensor de <b>luz</b></li><li>Sensor de <b>temperatura</b></li><li><b>Acelerómetro</b> (movimiento, agitar)</li><li><b>Magnetómetro</b> (brújula)</li><li><b>Micrófono</b> (V2)</li></ul></div>
          <div><b>💡 Actuadores (salida)</b><small>Transforman la información en luz, sonido o movimiento:</small><ul><li>Matriz de <b>25 LED</b> ("pantalla")</li><li><b>Altavoz</b> (V2)</li><li>Por los <b>pines</b>: LED, buzzer, servomotor…</li></ul></div>
        </div>` },
      { title: 'Dos bloques fundamentales', html: `<div class="apec-grid2">
          <div>${mkC('basic', 'al iniciar', mk('basic', 'mostrar ícono ❤️ ▾'))}<small>Se ejecuta <b>una sola vez</b>, cuando la placa se enciende o se reinicia. Ideal para un saludo o para darle valor inicial a las variables.</small></div>
          <div>${mkC('basic', 'para siempre', mk('basic', `mostrar número ${mkR('input', 'temperatura (°C)')}`))}<small>Se <b>repite sin parar</b> mientras la placa está prendida. Ideal para leer sensores todo el tiempo.</small></div>
        </div>
        <p>Y los <b>eventos</b> de Entrada, que se ejecutan cuando pasa algo:</p>
        <div class="apec-grid2"><div>${mkC('input', 'al presionarse el botón A ▾', mk('basic', `mostrar número ${mkR('input', 'nivel de luz')}`))}</div><div>${mkC('input', 'si agitado ▾', mk('basic', 'mostrar número 2'))}</div></div>` },
      { title: 'Coordenadas de la matriz', html: `<p>Cada LED tiene una posición <b>(x, y)</b>:</p>
        <ul><li><b>x</b> = columna, de 0 (izquierda) a 4 (derecha)</li><li><b>y</b> = fila, de 0 (arriba) a 4 (abajo)</li></ul>
        <p>${mk('led', 'graficar x 0 y 0')} prende el LED de arriba a la izquierda. ${mk('led', 'graficar x 2 y 2')} prende el del centro.</p>
        <p>En la categoría <b style="color:#5C2D91">LED</b> están <i>graficar</i>, <i>desgraficar</i> (apagar) y <i>alternar</i>.</p>` },
      { title: 'Las categorías de bloques', html: `<p>En MakeCode cada categoría tiene su color. Fíjate en la <b>forma</b>:</p>
        <ul><li>Bloques que <b>encastran</b> arriba y abajo: son instrucciones (${mk('basic', 'mostrar número 0')}).</li>
        <li>Bloques <b>redondeados</b>: devuelven un valor, como un sensor (${mkR('input', 'nivel de luz')} va de 0 a 255).</li>
        <li>Bloques <b>hexagonales</b>: son preguntas de verdadero o falso (${mkH('input', 'botón A ▾ presionado')}).</li></ul>
        <div class="mk-cats">${['basic', 'input', 'led', 'loops', 'logic', 'vars', 'math', 'pins'].map((k) => `<span class="mk-cat mk-${k}">${{ basic: 'Básico', input: 'Entrada', led: 'LED', loops: 'Bucles', logic: 'Lógica', vars: 'Variables', math: 'Matemática', pins: 'Pines' }[k]}</span>`).join('')}</div>
        <p class="apec-tip">💡 En el simulador puedes tocar <b>🐍 Ver en Python</b> para ver el mismo programa escrito en Python.</p>` },
    ],
    cards: [
      { front: 'Matriz de LED', back: 'Actuador: 25 luces (5×5) que funcionan como pantalla de salida.' },
      { front: 'Acelerómetro', back: 'Sensor que detecta movimiento, inclinación y si agitas la placa.' },
      { front: 'graficar x y', back: 'Bloque de LED que prende el LED de la columna x y la fila y (de 0 a 4).' },
      { front: 'al iniciar / para siempre', back: 'Al iniciar: una sola vez al prender. Para siempre: se repite sin parar.' },
    ],
    phases: [
      {
        id: 'm3-a', title: 'Explora la placa', type: 'mbsim', mode: 'explore', sensors: ['temperature'],
        prompt: `<p>La micro:bit de la ciudad ya tiene un programa cargado. <b>Usa sus entradas</b> (botones, agitar, temperatura) y descubre las <b>4 salidas</b> que tiene programadas.</p>
          <p class="apec-tip">💡 Lee los bloques: cada evento dice <b>cuándo</b> pasa algo y lo de adentro dice <b>qué</b> pasa.</p>`,
        blocks: program([
          B('mb_on_button', { BUTTON: 'A' }, { DO: stack(B('mb_show_icon', { ICON: 'HEART' })) }),
          B('mb_on_button', { BUTTON: 'B' }, { DO: stack(B('mb_show_number', {}, { NUM: put(B('mb_temperature')) })) }),
          B('mb_on_gesture', { GESTURE: 'SHAKE' }, { DO: stack(B('mb_show_icon', { ICON: 'SURPRISED' })) }),
          B('mb_forever', {}, { DO: stack(B('mb_if', {}, { COND: putB(B('mb_compare', { OP: 'GT' }, { A: put(B('mb_temperature')), B: num(30) })), DO: stack(B('mb_show_string', {}, { TEXT: txt('CALOR') })) })) }),
        ]),
        goals: [
          { text: 'Aparece un corazón ❤️', input: 'Botón A', output: 'Matriz: ícono', done: (s) => s.shown.some((x) => x.value === 'HEART') },
          { text: 'Aparece la temperatura', input: 'Botón B + sensor de temperatura', output: 'Matriz: número', done: (s) => s.shown.some((x) => x.kind === 'number') },
          { text: 'Aparece una cara de sorpresa 😮', input: 'Acelerómetro (agitar)', output: 'Matriz: ícono', done: (s) => s.shown.some((x) => x.value === 'SURPRISED') },
          { text: 'La placa dice CALOR', input: 'Sensor de temperatura (más de 30 °C)', output: 'Matriz: texto', done: (s) => s.shown.some((x) => x.kind === 'string' && x.value === 'CALOR') },
        ],
        fail: 'Te faltan salidas por descubrir. Mira en los bloques qué evento dispara cada una.',
      },
      {
        id: 'm3-b', title: 'Dibujar con coordenadas', type: 'mbsim', mode: 'code',
        prompt: `<p>Ohm necesita una <b>flecha hacia arriba</b> para señalizar el puerto. Arma un programa que, <b>al iniciar</b>, dibuje exactamente la figura del objetivo.</p>
          <p class="apec-tip">Usa ${mk('led', 'graficar x y')} de la categoría <b>LED</b>: <b>x</b> es la columna y <b>y</b> la fila (de 0 a 4). Ya te dejamos la punta de la flecha. También puedes usar ${mk('basic', 'mostrar LEDs')}.</p>`,
        target: '..#../.###./#.#.#/..#../..#..',
        blockStarter: program([B('mb_on_start', {}, { DO: stack(B('mb_plot', {}, { X: num(2), Y: num(0) })) })]),
        check: async (sim) => {
          const want = '..#../.###./#.#.#/..#../..#..';
          const got = sim.matrixString();
          if (got === want) return true;
          const W = want.replace(/\//g, ''); const G = got.replace(/\//g, '');
          const missing = [...W].filter((c, i) => c === '#' && G[i] !== '#').length;
          const extra = [...W].filter((c, i) => c !== '#' && G[i] === '#').length;
          return `${missing ? `faltan ${missing} LED` : ''}${missing && extra ? ' y ' : ''}${extra ? `hay ${extra} LED de más` : ''}. Compara tu placa con el objetivo, LED por LED.`;
        },
        require: [{ re: /led\.plot\s*\(|basic\.show_leds\s*\(/, msg: 'Dibuja la flecha con bloques de LED (graficar) o con mostrar LEDs.' }],
      },
      {
        id: 'm3-c', title: 'Programar un dado', type: 'mbsim', mode: 'code',
        prompt: `<p>En la feria quieren un <b>dado electrónico</b>: cuando alguien <b>agita</b> la placa, tiene que mostrar un número al azar <b>del 1 al 6</b>.</p>
          <p>Ya está el evento ${mkC('input', 'si agitado ▾', mk('basic', 'mostrar número 0'))} Busca en <b>Matemática</b> el bloque ${mkR('math', 'escoger al azar de 0 a 10')}, ponlo dentro de <i>mostrar número</i> y cambia los números. Después toca <b>▶ Cargar en la placa</b> y prueba con <b>🤚 Sacudir</b>.</p>`,
        blockStarter: program([B('mb_on_gesture', { GESTURE: 'SHAKE' }, { DO: stack(B('mb_show_number', {}, { NUM: num(0) })) })]),
        check: async (sim) => {
          const nums = new Set();
          for (let i = 0; i < 40; i++) {
            await sim.trigger('SHAKE');
            if (sim.error) return 'la placa dio un error al agitarla.';
            const last = sim.lastShown('number');
            if (!last) return 'al agitar la placa no aparece ningún número. ¿Usaste "si agitado" y "mostrar número"?';
            nums.add(Number(last.value));
          }
          const list = [...nums];
          if (list.some((n) => n < 1 || n > 6)) return `apareció el número ${list.find((n) => n < 1 || n > 6)}, y un dado va del 1 al 6.`;
          if (list.length < 5) return 'siempre sale el mismo número (o casi). Usa "escoger al azar de 1 a 6".';
          return true;
        },
        require: [{ re: /on_gesture\s*\(\s*Gesture\.SHAKE/, msg: 'El dado tiene que reaccionar al evento "si agitado".' }],
      },
    ],
    reflection: 'Inventa un proyecto útil para tu liceo con la micro:bit. ¿Qué sensor (entrada) usarías y qué actuador (salida)?',
  },

  /* ---------------------------------------------------------------- 3 */
  {
    n: 3, area: 'hw', icon: '🔌', title: 'Periféricos y corriente',
    tema: 'Periféricos, conexiones y corriente eléctrica',
    goals: [
      'Clasifico periféricos de entrada, salida y entrada/salida.',
      'Reconozco conexiones comunes (USB, HDMI, Bluetooth, pines).',
      'Explico qué son el voltaje, la corriente y la resistencia.',
    ],
    lesson: [
      { title: 'Periféricos', html: `<p>Un <b>periférico</b> es un dispositivo que se conecta a la computadora para darle o sacarle información.</p>
        <table class="apec-table"><tbody>
          <tr><th>Entrada</th><td>Teclado, mouse, micrófono, cámara web, escáner.</td></tr>
          <tr><th>Salida</th><td>Monitor, parlantes, impresora, proyector.</td></tr>
          <tr><th>Entrada / salida</th><td>Pantalla táctil, pendrive, auriculares con micrófono, impresora multifunción.</td></tr>
        </tbody></table>` },
      { title: 'Conexiones', html: `<div class="apec-grid2">
          <div><b>🔌 USB</b><small>Datos y energía: teclado, pendrive, micro:bit.</small></div>
          <div><b>🖥️ HDMI</b><small>Imagen y sonido hacia monitor o TV.</small></div>
          <div><b>📶 Bluetooth / Wi-Fi</b><small>Conexión inalámbrica, sin cables.</small></div>
          <div><b>📍 Pines</b><small>En las placas: para conectar LED, sensores o motores.</small></div>
        </div>` },
      { title: 'La electricidad es como el agua', html: `<p>Imagina agua que corre por una manguera:</p>
        <table class="apec-table"><tbody>
          <tr><th>⚡ Voltaje (V)</th><td>La <b>fuerza</b> que empuja (como la presión del agua). Se mide en <b>voltios</b>.</td></tr>
          <tr><th>🌊 Corriente (I)</th><td>La <b>cantidad</b> de electricidad que circula (cuánta agua pasa). Se mide en <b>amperios</b>.</td></tr>
          <tr><th>🚧 Resistencia (R)</th><td>Lo que <b>frena</b> la corriente (una manguera finita). Se mide en <b>ohmios (Ω)</b>.</td></tr>
        </tbody></table>` },
      { title: '¿Cuánta corriente pasa?', html: `<p>La <b>ley de Ohm</b> relaciona las tres: <b>I = V ÷ R</b>. Con más resistencia, pasa <b>menos</b> corriente; con más voltaje, pasa <b>más</b>.</p>
        <p>Un LED rojo "usa" unos <b>2 V</b>, así que en un circuito con LED la cuenta es:</p>
        <div class="apec-ex"><b>I = (V de la pila − 2 V) ÷ R</b><br>Con una pila de 9 V y una resistencia de 470 Ω: (9 − 2) ÷ 470 = 0,015 A = <b>15 mA</b> ✔</div>
        <p class="apec-tip">💡 Un LED común funciona bien entre <b>10 y 20 mA</b> (miliamperios). Con más de 20 mA se calienta, y si pasa mucha más, se quema.</p>` },
      { title: 'Circuito cerrado', html: `<p>La corriente solo circula si hay un <b>camino completo</b>: sale del polo <b>+</b> de la pila, pasa por los componentes y vuelve al polo <b>−</b>.</p>
        <ul><li><b>Circuito cerrado</b>: el camino está completo → funciona.</li><li><b>Circuito abierto</b>: hay un corte (cable suelto, interruptor apagado) → no funciona.</li><li><b>Cortocircuito</b>: la corriente vuelve sin pasar por nada que la frene → ¡peligro, se calienta!</li></ul>` },
    ],
    cards: [
      { front: 'Periférico de E/S', back: 'Recibe y entrega información. Ej: pantalla táctil, pendrive.' },
      { front: 'Voltaje', back: 'La fuerza que empuja a la corriente. Se mide en voltios (V).' },
      { front: 'Corriente', back: 'Cantidad de electricidad que circula. Se mide en amperios (A).' },
      { front: 'Resistencia', back: 'Lo que frena la corriente. Se mide en ohmios (Ω).' },
    ],
    phases: [
      {
        id: 'm4-a', title: 'Clasificar periféricos', type: 'classify',
        prompt: '<p>En el depósito de Tito hay periféricos mezclados. Ordénalos.</p>',
        categories: ['Entrada', 'Salida', 'Entrada/Salida'],
        items: [
          { text: '⌨️ Teclado', cat: 0 }, { text: '🖨️ Impresora', cat: 1 }, { text: '🎤 Micrófono', cat: 0 },
          { text: '📱 Pantalla táctil', cat: 2 }, { text: '🔊 Parlantes', cat: 1 }, { text: '💾 Pendrive', cat: 2 },
        ],
        fail: 'Si solo manda datos a la computadora es entrada; si solo los muestra es salida; si hace las dos cosas, entrada/salida.',
      },
      {
        id: 'm4-b', title: 'Conectar cada cosa en su lugar', type: 'ports',
        prompt: `<p>Tito quiere armar un puesto de trabajo con una ceibalita. <b>Toca un dispositivo y después el conector</b> donde va. Cuando quede bien conectado, vas a ver que funciona.</p>`,
        devices: [
          { id: 'teclado', icon: '⌨️', name: 'Teclado', port: 'usb', io: 'Entrada', works: 'Escribe: hola Santa Bruma_' },
          { id: 'monitor', icon: '🖥️', name: 'Televisor del salón', port: 'hdmi', io: 'Salida', works: 'Muestra la pantalla de la ceibalita' },
          { id: 'auris', icon: '🎧', name: 'Auriculares inalámbricos', port: 'bt', io: 'Salida', works: '♪ Suena la radio' },
          { id: 'microbit', icon: '🟩', name: 'micro:bit (cable)', port: 'usb', io: 'Entrada/Salida', works: 'Recibe el programa' },
          { id: 'led', icon: '💡', name: 'LED externo', port: 'pin', io: 'Salida', works: 'Se prende con el programa' },
        ],
        ports: [
          { id: 'usb1', type: 'usb', label: 'USB 1', where: 'pc' }, { id: 'usb2', type: 'usb', label: 'USB 2', where: 'pc' },
          { id: 'hdmi', type: 'hdmi', label: 'HDMI', where: 'pc' }, { id: 'bt', type: 'bt', label: 'Bluetooth', where: 'pc' },
          { id: 'p0', type: 'pin', label: 'Pin 0 + GND', where: 'mb' },
        ],
        fail: 'Ese dispositivo no va ahí. Piensa: ¿necesita cable de datos (USB), imagen (HDMI), conexión sin cable (Bluetooth) o un pin de la placa?',
      },
      {
        id: 'm4-c', title: 'Laboratorio de corriente', type: 'ohm',
        prompt: `<p>Bit armó un circuito con una <b>pila</b>, una <b>resistencia</b> y un <b>LED</b>. Cambia la pila y la resistencia y mira el <b>amperímetro</b>.</p>
          <ol><li>Explora: prueba al menos <b>4 combinaciones</b> distintas.</li><li>Reto: con la pila de <b>9 V</b>, logra que el LED funcione <b>seguro</b>: entre <b>10 y 20 mA</b>.</li></ol>`,
        fail: 'Con 9 V la corriente todavía no está entre 10 y 20 mA. Si es mucha, sube la resistencia; si es poca, bájala.',
      },
    ],
    reflection: '¿Qué periféricos usas todos los días? Elige dos y explica si son de entrada, de salida o de entrada/salida.',
  },

  /* ---------------------------------------------------------------- 4 */
  {
    n: 4, area: 'hw', icon: '💡', title: 'LED y sensores en la placa',
    tema: 'Pines y periféricos: conectar un LED y un sensor del kit de Ceibal a la micro:bit',
    goals: [
      'Conecto un LED a la placa con su resistencia y respetando los polos: pata larga al pin, pata corta a GND.',
      'Conecto un sensor externo con su alimentación (3V), su tierra (GND) y su salida (OUT) a un pin.',
      'Programo con bloques la placa para que el LED reaccione a un sensor.',
    ],
    lesson: [
      { title: 'Un circuito es un camino cerrado', html: `<p>A través de sus <b>pines</b> la micro:bit se conecta a componentes externos. Para que funcionen, la electricidad necesita un <b>camino cerrado</b>: todas las partes conectadas.</p>
        <table class="apec-table"><tbody>
          <tr><th>3V (+)</th><td>Entrega <b>3,3 V</b>: alimenta los componentes.</td></tr>
          <tr><th>GND (−)</th><td>La <b>tierra</b>: por donde vuelve la corriente. Todos los componentes se conectan a GND.</td></tr>
          <tr><th>P0, P1, P2</th><td>Pines <b>digitales y analógicos</b>: el programa los usa para prender cosas o leer sensores.</td></tr>
        </tbody></table>
        <p class="apec-tip">💡 Se conecta con <b>cables cocodrilo</b> (o cocodrilo - header pin). La placa necesita <b>energía</b>: cable USB o portapilas.</p>` },
      { title: 'Pines digitales y analógicos', html: `<div class="apec-grid2">
          <div><b>Digital</b><small>Solo dos estados: <b>1</b> (3,3 V) o <b>0</b> (0 V). Para LED (prendido/apagado), botones y sensores que detectan o no detectan.</small><p>${mk('pins', 'escritura digital pin P0 ▾ a 1')}</p></div>
          <div><b>Analógico</b><small>Un valor dentro de un rango: de <b>0 a 1023</b>. Para sensores que cambian de a poco (luz, humedad, temperatura).</small><p>${mkR('pins', 'lectura analógica pin P1 ▾')}</p></div>
        </div>
        <p class="apec-tip">⚠️ Cada pin aguanta poca corriente (unos 5 mA): por eso siempre se usa una <b>resistencia</b> con el LED.</p>` },
      { title: 'El LED y su resistencia', html: `<ul><li><b>Pata larga = positivo (+)</b>: va, a través de la <b>resistencia</b>, al pin (P0, P1 o P2).</li>
        <li><b>Pata corta = negativo (−)</b>: va a <b>GND</b>.</li></ul>
        <table class="apec-table"><tbody><tr><th>LED rojo</th><td>resistencia de <b>100 Ω</b></td></tr><tr><th>LED verde y azul</th><td>resistencia de <b>10 Ω</b></td></tr></tbody></table>
        <p>Al revés el LED no prende. Directo a 3V queda siempre prendido y el programa no lo puede apagar.</p>` },
      { title: 'Periféricos del kit', html: `<table class="apec-table"><tbody>
          <tr><th>Sensor de contacto/colisión</th><td><b>VCC</b> → 3V · <b>GND</b> → GND · <b>OUT</b> → P0, P1 o P2</td></tr>
          <tr><th>Seguidor de línea</th><td>VCC → 3V · GND → GND · <b>DO</b> (digital) → un pin</td></tr>
          <tr><th>Humedad del suelo</th><td>VCC → 3V · GND → GND · <b>AO</b> (analógico) o DO → un pin</td></tr>
          <tr><th>Buzzer</th><td>conector <b>+</b> → P0 · <b>−</b> → GND</td></tr>
          <tr><th>Servomotor</th><td><b>marrón</b> → GND · <b>rojo</b> → 3V · <b>anaranjado</b> → un pin</td></tr>
        </tbody></table>
        <p class="apec-tip">⚠️ Si inviertes VCC y GND, el sensor se puede dañar. ¡Revisa los polos antes de dar energía!</p>` },
      { title: 'Práctica guiada: el estacionamiento', html: `<p>Un auto estacionado tapa la luz. Con el <b>sensor de luz</b> de la placa (${mkR('input', 'nivel de luz')}, de 0 a 255) y un LED podemos marcar si el lugar está <b>ocupado</b>:</p>
        <ol class="apec-steps"><li><b>Leer</b> el nivel de luz todo el tiempo (para siempre).</li><li>Elegir un <b>umbral</b>: por ejemplo, menos de 100 = ocupado.</li><li><b>Comparar</b>: si la luz es menor que el umbral, prender el LED; si no, apagarlo.</li></ol>
        <div>${mkC('basic', 'para siempre', mkIf(`${mkR('input', 'nivel de luz')} &lt; 100`, mk('pins', 'escritura digital pin P0 ▾ a 1'), mk('pins', 'escritura digital pin P0 ▾ a 0')))}</div>
        <p>En <b>Tinkercad Circuits</b> puedes armarlo y simularlo antes de usar los componentes reales.</p>` },
    ],
    cards: [
      { front: 'GND', back: 'Tierra o negativo (−): por donde vuelve la corriente. Todos los componentes van a GND.' },
      { front: 'LED rojo', back: 'Pata larga (+) con resistencia de 100 Ω al pin; pata corta (−) a GND.' },
      { front: 'VCC', back: 'La pata de energía (+) de un sensor. Va a 3V.' },
      { front: 'OUT / DO / AO', back: 'La salida de un sensor: va a un pin (P0, P1 o P2) para que la placa la lea.' },
    ],
    phases: [
      {
        id: 'm5-a', title: 'Conectar el LED', type: 'pinwire', parts: ['led'], program: 'blink',
        programBlocks: program([B('mb_forever', {}, { DO: stack(B('mb_digital_write', { PIN: 'P0' }, { VALUE: num(1) }), B('mb_pause', {}, { MS: num(500) }), B('mb_digital_write', { PIN: 'P0' }, { VALUE: num(0) }), B('mb_pause', {}, { MS: num(500) })) })]),
        prompt: `<p>La placa ya tiene un programa que hace parpadear un LED en el <b>pin P0</b>. Elige la <b>resistencia</b> para el LED rojo, <b>conecta</b> el LED y <b>dale energía</b>.</p>
          <p class="apec-tip">Toca una pata del LED y después el pin de la placa (como poner un cable cocodrilo). Para sacar un cable, tócalo.</p>`,
        fail: 'Revisa: resistencia de 100 Ω, pata larga (+) al pin P0, pata corta (−) a GND, y que la placa tenga energía.',
      },
      {
        id: 'm5-b', title: 'Conectar un sensor de contacto', type: 'pinwire', parts: ['led', 'sensor'], program: 'alarma',
        programBlocks: program([B('mb_forever', {}, { DO: stack(B('mb_ifelse', {}, { COND: putB(B('mb_compare', { OP: 'EQ' }, { A: put(B('mb_digital_read', { PIN: 'P1' })), B: num(1) })), DO: stack(B('mb_digital_write', { PIN: 'P0' }, { VALUE: num(1) })), ELSE: stack(B('mb_digital_write', { PIN: 'P0' }, { VALUE: num(0) })) })) })]),
        prompt: `<p>Tito quiere una <b>alarma de choque</b> para el portón del depósito: cuando algo toca el <b>sensor de contacto</b>, se prende el LED. Conecta el <b>LED</b> y el <b>sensor</b>, dale energía y pruébalo.</p>
          <p class="apec-tip">El sensor tiene 3 patas: <b>VCC</b> (energía), <b>GND</b> (tierra) y <b>OUT</b> (salida). Mira el programa: ¿en qué pin lee el sensor?</p>`,
        fail: 'Revisa cada pata: VCC a 3V, GND a GND, OUT al pin que lee el programa, y el LED con su resistencia y sus polos bien puestos.',
      },
      {
        id: 'm5-c', title: 'Programar el estacionamiento', type: 'mbsim', mode: 'code', pins: true, sensors: ['light'],
        prompt: `<p>Práctica guiada del <b>estacionamiento</b>: el LED (en P0) se tiene que <b>prender cuando hay poca luz</b> (un auto tapa el sensor) y <b>apagar cuando hay mucha</b>.</p>
          <p>Completa los bloques: pon un <b>umbral</b> en la comparación y los valores <b>1</b> (prender) y <b>0</b> (apagar). Prueba moviendo el <b>nivel de luz</b> de la placa (0 a 255).</p>`,
        blockStarter: program([B('mb_forever', {}, { DO: stack(B('mb_ifelse', {}, { COND: putB(B('mb_compare', { OP: 'LT' }, { A: put(B('mb_light')), B: num(0) })), DO: stack(B('mb_digital_write', { PIN: 'P0' }, { VALUE: num(0) })), ELSE: stack(B('mb_digital_write', { PIN: 'P0' }, { VALUE: num(0) })) })) })]),
        check: async (sim) => {
          sim.setLight(20);
          await sim.advance(400);
          if (sim.error) return 'la placa dio un error.';
          if (sim.pins.P0 !== 1) return 'con poca luz (nivel 20, lugar ocupado) el LED tiene que estar prendido (1). ¿El umbral es mayor que 20?';
          sim.setLight(230);
          await sim.advance(400);
          if (sim.pins.P0 !== 0) return 'con mucha luz (nivel 230, lugar libre) el LED tiene que apagarse (0). ¿El umbral es menor que 230?';
          sim.setLight(25);
          await sim.advance(400);
          if (sim.pins.P0 !== 1) return 'cuando vuelve a llegar un auto, el LED se tiene que prender otra vez. ¿Está dentro de "para siempre"?';
          return true;
        },
        require: [{ re: /input\.light_level\s*\(/, msg: 'El programa tiene que leer el sensor de luz (nivel de luz).' }],
      },
    ],
    reflection: 'Si conectas un sensor y no funciona, ¿qué revisarías primero? Usa las palabras energía, GND y OUT.',
  },

  /* ---------------------------------------------------------------- 5 */
  {
    n: 5, area: 'ia', icon: '🤖', title: 'Entrenar y usar una IA',
    tema: 'Entrenar un modelo de Machine Learning y programar con su confianza (%)',
    goals: [
      'Entreno un modelo dando ejemplos etiquetados de cada clase.',
      'Explico por qué la confianza (%) sube con más y mejores datos, y cómo los datos desbalanceados generan sesgo.',
      'Programo una decisión usando la clase y el % de confianza del modelo.',
    ],
    lesson: [
      { title: '¿Qué es la IA?', html: `<p>La <b>inteligencia artificial</b> son programas que hacen tareas que antes solo hacían las personas: reconocer caras, entender la voz, traducir, recomendar videos.</p>
        <p class="apec-tip">💡 La IA <b>no piensa ni siente</b>: encuentra patrones en muchos datos.</p>` },
      { title: 'Machine Learning', html: `<p>En la programación común, <b>nosotros escribimos las reglas</b>. En ML, le damos a la computadora <b>muchos ejemplos</b> y ella <b>descubre las reglas</b> sola.</p>
        <ol class="apec-steps"><li><b>Clases</b>: qué tiene que reconocer (plástico, papel, vidrio).</li><li><b>Ejemplos</b>: muchos objetos de cada clase, con su <b>etiqueta</b>.</li><li><b>Entrenar</b>: la computadora busca los patrones.</li><li><b>Probar</b>: con objetos <b>nuevos</b>, que no vio.</li></ol>
        <p>Es lo mismo que haces en <b>Teachable Machine</b> o <b>Machine Learning for Kids</b>.</p>` },
      { title: 'La confianza (%)', html: `<p>Cuando el modelo mira algo nuevo, no dice solo "es plástico": da un <b>porcentaje para cada clase</b>.</p>
        <div class="apec-ex">🧴 → Plástico <b>86 %</b> · Papel 9 % · Vidrio 5 %</div>
        <ul><li>Con <b>pocos ejemplos</b>, el modelo duda: los % quedan parejos.</li><li>Con <b>más ejemplos y bien etiquetados</b>, la confianza sube.</li><li>Si una clase tiene <b>muchos más ejemplos</b> que otra, el modelo tiende a elegirla: eso es <b>sesgo</b>.</li></ul>` },
      { title: 'Programar con el %', html: `<p>Una IA útil <b>hace algo</b> con lo que reconoce. Pero si no está segura, conviene no actuar:</p>
        <pre class="apec-code">if confianza &gt;= 80:
    if clase == "plastico":
        print("Contenedor amarillo")
else:
    print("No estoy segura: que lo revise una persona")</pre>
        <p class="apec-tip">💡 El número (80) es el <b>umbral</b>: lo decidimos nosotros según cuánto riesgo aceptamos.</p>` },
    ],
    cards: [
      { front: 'Etiqueta', back: 'El nombre de la clase de cada ejemplo (ej: esta foto es "papel").' },
      { front: 'Confianza', back: 'El % con que el modelo cree que algo pertenece a una clase.' },
      { front: 'Umbral', back: 'El % mínimo que pedimos para que el programa actúe (ej: 80 %).' },
      { front: 'Sesgo', back: 'Error del modelo por datos desbalanceados, incompletos o mal etiquetados.' },
    ],
    phases: [
      {
        id: 'm6-a', title: 'Entrenar el clasificador de reciclaje', type: 'mltrain', minConf: 80,
        prompt: `<p>Tecla está armando una <b>cinta de reciclaje inteligente</b>. Pon ejemplos en cada clase, <b>entrena</b> el modelo y <b>pruébalo</b> con objetos nuevos.</p>
          <p class="apec-tip">Meta: que reconozca los 3 objetos nuevos con <b>80 % o más</b> de confianza. Mira qué pasa con el % cuando agregas más ejemplos. ¡Ojo con lo que no es reciclable!</p>`,
        classes: [{ name: 'Plástico', icon: '🟨' }, { name: 'Papel', icon: '🟦' }, { name: 'Vidrio', icon: '🟩' }],
        pool: [
          { id: 'p1', emoji: '🥤', name: 'Vaso descartable', f: [0.95, 0.1, 0.05, 0], cat: 0 },
          { id: 'q1', emoji: '📄', name: 'Hoja', f: [0.1, 0.9, 0, 0], cat: 1 },
          { id: 'v1', emoji: '🍾', name: 'Botella de vidrio', f: [0.1, 0, 0.95, 0], cat: 2 },
          { id: 'p2', emoji: '🛍️', name: 'Bolsa', f: [0.85, 0.05, 0.15, 0], cat: 0 },
          { id: 'q2', emoji: '📦', name: 'Caja de cartón', f: [0.05, 1, 0.1, 0], cat: 1 },
          { id: 'x1', emoji: '🍌', name: 'Cáscara de banana', f: [0.1, 0.15, 0, 1], cat: null },
          { id: 'v2', emoji: '🫙', name: 'Frasco', f: [0, 0.1, 0.9, 0], cat: 2 },
          { id: 'p3', emoji: '🧴', name: 'Botella de shampoo', f: [0.9, 0.2, 0, 0], cat: 0 },
          { id: 'q3', emoji: '📰', name: 'Diario', f: [0.2, 0.85, 0, 0], cat: 1 },
          { id: 'v3', emoji: '🍷', name: 'Copa', f: [0.15, 0, 1, 0], cat: 2 },
          { id: 'p4', emoji: '🪣', name: 'Balde', f: [1, 0, 0.1, 0], cat: 0 },
          { id: 'q4', emoji: '✉️', name: 'Sobre', f: [0, 0.95, 0.05, 0], cat: 1 },
          { id: 'v4', emoji: '🥛', name: 'Vaso de vidrio', f: [0.05, 0.05, 0.85, 0], cat: 2 },
        ],
        test: [
          { emoji: '🧃', name: 'Envase de yogur', f: [0.9, 0.05, 0.1, 0], cat: 0 },
          { emoji: '🗞️', name: 'Revista', f: [0.1, 0.9, 0.05, 0], cat: 1 },
          { emoji: '🏺', name: 'Jarrón', f: [0.05, 0.1, 0.9, 0], cat: 2 },
        ],
        model: { T: 0.3, prior: 1 },
        fail: 'Revisa que cada clase tenga ejemplos correctos.',
        lowConf: 'Con pocos ejemplos el modelo duda. Agrega más ejemplos a cada clase y vuelve a entrenar.',
      },
      {
        id: 'm6-b', title: 'Corregir el sesgo', type: 'mltrain', minConf: 75,
        prompt: `<p>Pixel entrenó un modelo para la veterinaria que reconoce <b>perros y gatos</b>, pero lo entrenó con <b>7 perros y 1 solo gato</b>. Entrénalo así y pruébalo: ¿qué pasa con los gatos?</p>
          <p>Después <b>corrige los datos</b> para que reconozca los 3 animales nuevos con <b>75 % o más</b>.</p>`,
        classes: [{ name: 'Perro', icon: '🐶' }, { name: 'Gato', icon: '🐱' }],
        pool: [
          { id: 'd1', emoji: '🐕', name: 'Perro 1', f: [0.3, 0.8, 0.7], cat: 0 }, { id: 'd2', emoji: '🐩', name: 'Caniche', f: [0.4, 0.9, 0.5], cat: 0 },
          { id: 'd3', emoji: '🦮', name: 'Perro guía', f: [0.2, 0.7, 0.9], cat: 0 }, { id: 'd4', emoji: '🐕‍🦺', name: 'Perro de servicio', f: [0.35, 0.85, 0.6], cat: 0 },
          { id: 'd5', emoji: '🐶', name: 'Cachorro', f: [0.5, 0.75, 0.4], cat: 0 }, { id: 'd6', emoji: '🐕', name: 'Perro 2', f: [0.3, 0.9, 0.8], cat: 0 },
          { id: 'd7', emoji: '🐩', name: 'Perro 3', f: [0.45, 0.7, 0.5], cat: 0 },
          { id: 'c1', emoji: '🐈', name: 'Gato 1', f: [0.9, 0.2, 0.2], cat: 1 },
          { id: 'c2', emoji: '🐈‍⬛', name: 'Gato negro', f: [0.85, 0.3, 0.25], cat: 1 }, { id: 'c3', emoji: '🐱', name: 'Gatito', f: [0.95, 0.25, 0.15], cat: 1 },
          { id: 'c4', emoji: '🐈', name: 'Gato 2', f: [0.8, 0.2, 0.3], cat: 1 }, { id: 'c5', emoji: '😺', name: 'Gato 3', f: [0.9, 0.35, 0.2], cat: 1 },
          { id: 'c6', emoji: '🐈‍⬛', name: 'Gato 4', f: [0.85, 0.15, 0.25], cat: 1 },
        ],
        preset: { 0: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'], 1: ['c1'] },
        test: [
          { emoji: '😸', name: 'Gata de Byte', f: [0.78, 0.33, 0.28], cat: 1 },
          { emoji: '🐱', name: 'Gato del vecino', f: [0.8, 0.3, 0.3], cat: 1 },
          { emoji: '🐕', name: 'Perro de Rayo', f: [0.35, 0.8, 0.6], cat: 0 },
        ],
        model: { T: 0.25, prior: 1.3 },
        fail: 'Hay muchos más perros que gatos: el modelo tiende a decir "perro". Agrega ejemplos de gatos para balancear las clases.',
        lowConf: 'Las clases todavía están desbalanceadas. Agrega más gatos (o saca algunos perros) y vuelve a entrenar.',
      },
      {
        id: 'm6-c', title: 'Programar con la confianza', type: 'mlprog',
        prompt: `<p>El modelo ya está entrenado. El robot de la cinta recibe dos variables: <code>clase</code> (<code>"plastico"</code>, <code>"papel"</code> o <code>"vidrio"</code>) y <code>confianza</code> (de 0 a 100).</p>
          <p>Programa el robot: si la confianza es de <b>80 o más</b>, manda el objeto al contenedor de su clase (<b>amarillo</b> plástico, <b>azul</b> papel, <b>verde</b> vidrio). Si es <b>menor a 80</b>, que lo deje para que lo <b>revise</b> una persona.</p>`,
        classNames: ['plastico', 'papel', 'vidrio'],
        cases: [
          { emoji: '🧴', name: 'Envase de detergente', clase: 'plastico', conf: 93 },
          { emoji: '🗞️', name: 'Revista', clase: 'papel', conf: 88 },
          { emoji: '🫙', name: 'Frasco', clase: 'vidrio', conf: 91 },
          { emoji: '🧸', name: 'Peluche', clase: 'plastico', conf: 46 },
          { emoji: '🍕', name: 'Caja de pizza con grasa', clase: 'papel', conf: 61 },
          { emoji: '🥫', name: 'Lata', clase: 'vidrio', conf: 79 },
          { emoji: '🥤', name: 'Vaso', clase: 'plastico', conf: 80 },
        ],
        starter: '# clase y confianza las da el modelo entrenado\nif confianza >= ___:\n    if clase == "plastico":\n        print("Contenedor amarillo")\n    elif clase == "papel":\n        print("Contenedor ___")\n    # completa: vidrio va al contenedor verde\nelse:\n    print("Revisar a mano")\n',
        expect: (c, out) => {
          const o = norm(out);
          const want = c.conf >= 80 ? { plastico: 'amarillo', papel: 'azul', vidrio: 'verde' }[c.clase] : 'revis';
          const all = ['amarillo', 'azul', 'verde', 'revis'];
          if (!o.includes(want)) return c.conf >= 80 ? `tiene que ir al contenedor ${want}.` : 'la confianza es menor a 80: tiene que quedar para revisar.';
          const extra = all.filter((w) => w !== want && o.includes(w));
          if (extra.length) return `el robot hace más de una cosa (${extra.join(', ')}). Tiene que hacer solo una.`;
          return true;
        },
        require: [{ re: /confianza/, msg: 'El robot tiene que usar la variable confianza para decidir.' }],
      },
    ],
    reflection: '¿Por qué conviene que el robot no actúe cuando la confianza es baja? Da un ejemplo de algo que podría salir mal.',
  },
  /* ---------------------------------------------------------------- 6 */
  {
    n: 6, area: 'py', icon: '🐍', title: 'Python: primeros pasos',
    tema: 'Lenguaje de programación, salida de datos con print() y tipos de datos',
    goals: [
      'Explico qué es un lenguaje de programación y cómo se ejecuta Python.',
      'Muestro mensajes en pantalla con print().',
      'Distingo los tipos de datos int, float, str y bool.',
    ],
    lesson: [
      { title: 'Lenguaje de programación', html: `<p>Es un idioma con <b>reglas muy estrictas</b> para darle instrucciones a la computadora.</p>
        <p><b>Python</b> es un lenguaje de <b>alto nivel</b> (parecido al inglés), muy usado en ciencia, IA y videojuegos. Lo ejecuta un programa llamado <b>intérprete</b>, que lee el código <b>línea por línea</b>, de arriba hacia abajo.</p>
        <p class="apec-tip">💡 Python distingue mayúsculas: <code>print</code> funciona, <code>Print</code> da error.</p>` },
      { title: 'Salida de datos: print()', html: `<p><code>print()</code> muestra en pantalla lo que pongas entre los paréntesis.</p>
        <pre class="apec-code">print("Hola, Santa Bruma")
print(5 + 3)
print("Tengo", 15, "años")</pre>
        <pre class="apec-out">Hola, Santa Bruma
8
Tengo 15 años</pre>
        <p>Los <b>textos</b> van entre comillas. Las cuentas, sin comillas. Con <b>comas</b> unes varias cosas (Python pone un espacio entre ellas).</p>` },
      { title: 'Tipos de datos', html: `<table class="apec-table"><tbody>
          <tr><th><code>int</code></th><td>Número entero: <code>15</code>, <code>-3</code>, <code>0</code></td></tr>
          <tr><th><code>float</code></th><td>Número con decimales (con <b>punto</b>): <code>3.5</code>, <code>0.25</code></td></tr>
          <tr><th><code>str</code></th><td>Texto, siempre entre comillas: <code>"hola"</code>, <code>"15"</code></td></tr>
          <tr><th><code>bool</code></th><td>Verdadero o falso: <code>True</code>, <code>False</code></td></tr>
        </tbody></table>
        <p class="apec-tip">💡 <code>"15"</code> (con comillas) es un <b>texto</b>, no un número. <code>type(dato)</code> te dice el tipo.</p>` },
      { title: 'Operaciones y comentarios', html: `<pre class="apec-code"># Esto es un comentario: Python lo ignora
print(7 + 2)    # suma → 9
print(7 - 2)    # resta → 5
print(7 * 2)    # multiplicación → 14
print(7 / 2)    # división → 3.5
print(7 // 2)   # división entera → 3
print(7 % 2)    # resto → 1</pre>` },
    ],
    cards: [
      { front: 'print()', back: 'Función de salida: muestra en pantalla lo que va entre paréntesis.' },
      { front: 'str', back: 'Tipo de dato texto. Va entre comillas: "Hola".' },
      { front: 'float', back: 'Número con decimales. En Python se usa punto: 3.5' },
      { front: '# comentario', back: 'Texto para personas que Python no ejecuta.' },
    ],
    phases: [
      {
        id: 'm7-a', title: 'Tu primer mensaje', type: 'python',
        prompt: `<p>La radio de la ciudad volvió a funcionar. Escribe un programa que muestre <b>exactamente estas 3 líneas</b>:</p>
          <pre class="apec-out">Atención Santa Bruma
La luz vuelve a las 20 horas
Gracias por esperar</pre>`,
        starter: '# Escribe tu programa acá\n',
        tests: [{ inputs: [], check: (out) => {
          const l = lines(out);
          if (l.length < 3) return `mostró ${l.length} línea${l.length === 1 ? '' : 's'} y se piden 3. Usa un print() por línea.`;
          if (!has(l[0], 'atencion santa bruma')) return 'la primera línea tiene que decir "Atención Santa Bruma".';
          if (!(has(l[1], 'la luz vuelve a las') && hasNum(l[1], 20))) return 'la segunda línea tiene que decir "La luz vuelve a las 20 horas".';
          if (!has(l[2], 'gracias por esperar')) return 'la tercera línea tiene que decir "Gracias por esperar".';
          return true;
        } }],
        require: [{ re: /print\s*\(/, msg: 'Usa la función print() para mostrar los mensajes.' }],
      },
      {
        id: 'm7-b', title: '¿Qué tipo de dato es?', type: 'classify',
        prompt: '<p>Clasifica cada valor según su <b>tipo de dato</b> en Python.</p>',
        categories: ['int', 'float', 'str', 'bool'],
        mono: true,
        items: [
          { text: '42', cat: 0 }, { text: '3.14', cat: 1 }, { text: '"Byte"', cat: 2 }, { text: 'True', cat: 3 },
          { text: '"15"', cat: 2 }, { text: '-7', cat: 0 }, { text: '0.5', cat: 1 }, { text: 'False', cat: 3 },
        ],
        fail: 'Ojo con las comillas: todo lo que está entre comillas es str, aunque adentro haya números. El punto decimal indica float.',
      },
      {
        id: 'm7-c', title: 'Predecir la salida', type: 'predict',
        prompt: '<p>Sin ejecutarlo, escribe <b>qué va a mostrar</b> este programa (una línea por cada print).</p>',
        code: 'print("Total:", 4 + 6)\nprint(10 / 4)\nprint("4" + "6")',
        fail: 'Piensa cada línea por separado: la coma agrega un espacio; la división / siempre da decimales; sumar dos textos los pega.',
      },
    ],
    reflection: '¿Por qué crees que "15" y 15 no son lo mismo para Python? Explícalo como si se lo contaras a un compañero.',
  },

  /* ---------------------------------------------------------------- 7 */
  {
    n: 7, area: 'py', icon: '📦', title: 'Variables y entrada de datos',
    tema: 'Variables, input() y conversión de datos con int(), float() y str()',
    goals: [
      'Guardo datos en variables con nombres claros.',
      'Pido datos al usuario con input().',
      'Convierto datos con int(), float() y str() para hacer cuentas o unir textos.',
    ],
    lesson: [
      { title: 'Variables', html: `<p>Una <b>variable</b> es como una <b>caja con nombre</b> donde guardamos un dato para usarlo después.</p>
        <pre class="apec-code">nombre = "Byte"
edad = 15
print(nombre, "tiene", edad, "años")</pre>
        <p>El signo <code>=</code> <b>guarda</b> el valor de la derecha en la variable de la izquierda.</p>
        <p class="apec-tip">💡 Nombres válidos: sin espacios, sin empezar con número, sin tildes conviene. Ej: <code>precio_total</code>.</p>` },
      { title: 'Entrada de datos: input()', html: `<p><code>input()</code> muestra un mensaje, <b>espera</b> que el usuario escriba y devuelve lo que escribió.</p>
        <pre class="apec-code">barrio = input("¿En qué barrio vives? ")
print("¡Hola, vecino de", barrio + "!")</pre>
        <p class="apec-tip">⚠️ <code>input()</code> <b>siempre devuelve texto (str)</b>, aunque escribas un número.</p>` },
      { title: 'El error más común', html: `<pre class="apec-code">edad = input("Edad: ")
print(edad + 1)</pre>
        <pre class="apec-err">TypeError: can only concatenate str (not "int") to str</pre>
        <p>Python no puede sumar el <b>texto</b> "15" con el <b>número</b> 1. Hay que <b>convertir</b>:</p>
        <pre class="apec-code">edad = int(input("Edad: "))
print(edad + 1)</pre>` },
      { title: 'Funciones de conversión', html: `<table class="apec-table"><tbody>
          <tr><th><code>int("15")</code></th><td>→ <code>15</code> (texto a entero)</td></tr>
          <tr><th><code>float("2.5")</code></th><td>→ <code>2.5</code> (texto a decimal)</td></tr>
          <tr><th><code>str(15)</code></th><td>→ <code>"15"</code> (número a texto, para unir con +)</td></tr>
        </tbody></table>
        <pre class="apec-code">precio = 120
print("Total: $" + str(precio * 2))</pre>` },
    ],
    cards: [
      { front: 'Variable', back: 'Espacio con nombre donde se guarda un dato. Se crea con = .' },
      { front: 'input()', back: 'Pide un dato al usuario. Siempre devuelve texto (str).' },
      { front: 'int()', back: 'Convierte a número entero: int("12") → 12' },
      { front: 'str()', back: 'Convierte a texto, para unirlo con +: str(12) → "12"' },
    ],
    phases: [
      {
        id: 'm8-a', title: 'Saludo personalizado', type: 'python',
        prompt: `<p>El puesto de informes necesita un saludo. Escribe un programa que:</p>
          <ol><li>Pida el <b>nombre</b> del visitante con <code>input()</code>.</li><li>Pida su <b>barrio</b>.</li><li>Muestre un saludo que incluya el nombre y el barrio.</li></ol>
          <p class="apec-tip">Ejemplo: si escriben <code>Ana</code> y <code>Cerro</code>, puede mostrar <i>Bienvenida Ana, del barrio Cerro</i>.</p>`,
        starter: 'nombre = input("¿Cómo te llamas? ")\n',
        tests: [
          { inputs: ['Ana', 'Cerro'], check: (out) => (has(out, 'ana') && has(out, 'cerro') ? true : 'el saludo tiene que mostrar el nombre y el barrio que se escribieron.') },
          { inputs: ['Leo', 'Malvín'], check: (out) => (has(out, 'leo') && has(out, 'malvin') ? true : 'con otro nombre y otro barrio el saludo tiene que cambiar (usa las variables, no escribas "Ana" fijo).') },
        ],
        require: [{ re: /input\s*\(/, msg: 'Tienes que pedir los datos con input().' }],
      },
      {
        id: 'm8-b', title: 'Arreglar la calculadora de edad', type: 'python',
        prompt: `<p>Chispa hizo este programa pero da <b>error</b>. Ejecútalo, lee el mensaje y <b>arréglalo</b> para que muestre la edad que va a tener el año que viene.</p>`,
        starter: 'edad = input("¿Cuántos años tienes? ")\nproximo = edad + 1\nprint("El año que viene vas a tener " + proximo + " años")\n',
        tests: [
          { inputs: ['14'], check: (out) => (hasNum(out, 15) ? true : 'si la edad es 14, tiene que mostrar 15.') },
          { inputs: ['15'], check: (out) => (hasNum(out, 16) ? true : 'si la edad es 15, tiene que mostrar 16.') },
        ],
        require: [{ re: /int\s*\(/, msg: 'Funciona, pero para hacer la cuenta tienes que convertir el input() a número con int().' }],
      },
      {
        id: 'm8-c', title: 'Ticket del carrito de chivitos', type: 'python',
        prompt: `<p>El carrito de comida de la Rambla necesita imprimir tickets. Escribe un programa que:</p>
          <ol><li>Pida el <b>precio</b> de un chivito (número entero).</li><li>Pida la <b>cantidad</b> de chivitos.</li><li>Muestre el <b>total</b> a pagar (precio × cantidad).</li></ol>
          <p class="apec-tip">Ejemplo: precio <code>350</code> y cantidad <code>3</code> → el total es <code>1050</code>.</p>`,
        starter: '# Ticket del carrito\n',
        tests: [
          { inputs: ['350', '3'], check: (out) => (hasNum(out, 1050) ? true : 'con precio 350 y cantidad 3 el total tiene que ser 1050.') },
          { inputs: ['420', '2'], check: (out) => (hasNum(out, 840) ? true : 'con precio 420 y cantidad 2 el total tiene que ser 840.') },
        ],
        require: [{ re: /input\s*\(/, msg: 'Pide el precio y la cantidad con input().' }, { re: /\*/, msg: 'Para calcular el total multiplica el precio por la cantidad con *.' }],
      },
    ],
    reflection: 'Explica con tus palabras por qué hay que usar int() con input() antes de hacer una cuenta. ¿Qué error aparece si no lo haces?',
  },

  /* ---------------------------------------------------------------- 8 */
  {
    n: 8, area: 'py', icon: '🔎', title: 'Funciones de texto y math',
    tema: 'Funciones incorporadas de Python: texto (len, upper, lower…) y el módulo math',
    goals: [
      'Uso funciones de texto: len(), upper(), lower(), title(), replace(), strip().',
      'Uso round(), abs(), max(), min() y el módulo math.',
      'Combino variables y funciones para resolver un problema.',
    ],
    lesson: [
      { title: '¿Qué es una función?', html: `<p>Una <b>función</b> es una instrucción que <b>recibe datos</b> (entre paréntesis), <b>hace algo</b> y <b>devuelve un resultado</b>.</p>
        <p>Ya usaste varias: <code>print()</code>, <code>input()</code>, <code>int()</code>. Python trae muchas más "incorporadas".</p>` },
      { title: 'Funciones de texto', html: `<pre class="apec-code">pista = "el Puerto"
print(len(pista))          # 9  (cantidad de caracteres)
print(pista.upper())       # EL PUERTO
print(pista.lower())       # el puerto
print(pista.title())       # El Puerto
print(pista.replace("Puerto", "Prado"))  # el Prado
print("  hola  ".strip())  # hola (saca espacios de los bordes)</pre>
        <p class="apec-tip">💡 Ojo: <code>len(texto)</code> va con el texto adentro, pero <code>texto.upper()</code> va con un punto.</p>` },
      { title: 'Funciones con números', html: `<pre class="apec-code">print(round(3.756, 2))   # 3.76
print(abs(-8))           # 8
print(max(4, 9, 2))      # 9
print(min(4, 9, 2))      # 2</pre>` },
      { title: 'El módulo math', html: `<p>Para funciones matemáticas hay que <b>importar</b> el módulo <code>math</code> al principio:</p>
        <pre class="apec-code">import math
print(math.sqrt(25))     # 5.0  (raíz cuadrada)
print(math.pi)           # 3.141592653589793
print(math.floor(4.8))   # 4   (redondea para abajo)
print(math.ceil(4.2))    # 5   (redondea para arriba)</pre>
        <div class="apec-ex"><b>Área de un círculo:</b> <code>area = math.pi * radio ** 2</code></div>` },
    ],
    cards: [
      { front: 'len()', back: 'Devuelve la cantidad de caracteres de un texto: len("hola") → 4' },
      { front: '.upper()', back: 'Pasa un texto a MAYÚSCULAS: "hola".upper() → "HOLA"' },
      { front: 'round(x, 2)', back: 'Redondea x con 2 decimales.' },
      { front: 'import math', back: 'Trae el módulo de matemática: math.sqrt(), math.pi, math.floor()…' },
    ],
    phases: [
      {
        id: 'm9-a', title: 'El mensaje cifrado', type: 'predict',
        prompt: '<p>Encontraste este programa en la escena del misterio. Escribe <b>qué va a mostrar</b> (una línea por cada print).</p>',
        code: 'clave = "rambla sur"\nprint(clave.upper())\nprint(len(clave))\nprint(clave.title())',
        fail: 'upper() pasa todo a mayúsculas; len() cuenta TODOS los caracteres (el espacio también); title() pone en mayúscula la primera letra de cada palabra.',
      },
      {
        id: 'm9-b', title: 'Limpiar la pista', type: 'python',
        prompt: `<p>La pista del misterio llegó toda desordenada. Completa el programa para que muestre:</p>
          <ol><li>La pista <b>sin espacios en los bordes</b> y en <b>MAYÚSCULAS</b>.</li><li>La <b>cantidad de letras</b> de la pista limpia (usa <code>len()</code>).</li></ol>`,
        starter: 'pista = "   el culpable está en el puerto   "\n',
        tests: [{ inputs: [], check: (out) => {
          if (!out.includes('EL CULPABLE ESTÁ EN EL PUERTO')) return 'tiene que aparecer la pista en mayúsculas: EL CULPABLE ESTÁ EN EL PUERTO.';
          if (/ {2,}EL CULPABLE|PUERTO {2,}/.test(out)) return 'la pista todavía tiene espacios en los bordes: usa strip().';
          if (!hasNum(out, 29, 0)) return 'tiene que mostrar la cantidad de caracteres de la pista limpia (29).';
          return true;
        } }],
        require: [{ re: /\.upper\s*\(/, msg: 'Usa .upper() para pasar a mayúsculas.' }, { re: /\.strip\s*\(/, msg: 'Usa .strip() para sacar los espacios de los bordes.' }, { re: /len\s*\(/, msg: 'Usa len() para contar los caracteres.' }],
        forbid: [{ re: /print\s*\(\s*["']\s*EL CULPABLE/i, msg: 'No escribas la pista a mano: transforma la variable pista con las funciones.' }],
      },
      {
        id: 'm9-c', title: 'La fuente de la plaza', type: 'python',
        prompt: `<p>Hay que cubrir la fuente redonda de Plaza Independencia. Escribe un programa que:</p>
          <ol><li>Pida el <b>radio</b> en metros (puede tener decimales: usa <code>float()</code>).</li><li>Calcule el área: <code>math.pi * radio ** 2</code>.</li><li>Muestre el área <b>redondeada a 2 decimales</b>.</li></ol>
          <p class="apec-tip">Ejemplo: radio <code>3</code> → área <code>28.27</code>.</p>`,
        starter: 'import math\n',
        tests: [
          { inputs: ['3'], check: (out) => (hasNum(out, 28.27, 0.001) ? true : 'con radio 3 el área redondeada tiene que ser 28.27.') },
          { inputs: ['1.5'], check: (out) => (hasNum(out, 7.07, 0.001) ? true : 'con radio 1.5 el área redondeada tiene que ser 7.07 (¿usaste float()?).') },
        ],
        require: [{ re: /math\.pi/, msg: 'Usa math.pi para el número π.' }, { re: /round\s*\(/, msg: 'Usa round(valor, 2) para redondear a 2 decimales.' }],
      },
    ],
    reflection: '¿Qué función de texto o de math te pareció más útil? Inventa un problema donde la usarías.',
  },

  /* ---------------------------------------------------------------- 9 */
  {
    n: 9, area: 'py', icon: '🔀', title: 'Decisiones: if / elif / else',
    tema: 'Estructuras condicionales y el flujo de decisiones de una historia',
    goals: [
      'Escribo condiciones con operadores de comparación (==, !=, <, >, <=, >=).',
      'Uso if / else para elegir entre dos caminos.',
      'Uso if / elif / else para elegir entre varios caminos (historia interactiva).',
    ],
    lesson: [
      { title: 'Condiciones', html: `<p>Una <b>condición</b> es una pregunta que se responde con <code>True</code> o <code>False</code>.</p>
        <table class="apec-table"><tbody>
          <tr><th><code>==</code></th><td>igual a</td><th><code>!=</code></th><td>distinto de</td></tr>
          <tr><th><code>&gt;</code></th><td>mayor que</td><th><code>&lt;</code></th><td>menor que</td></tr>
          <tr><th><code>&gt;=</code></th><td>mayor o igual</td><th><code>&lt;=</code></th><td>menor o igual</td></tr>
        </tbody></table>
        <p class="apec-tip">⚠️ <code>=</code> guarda un valor; <code>==</code> compara.</p>` },
      { title: 'if / else', html: `<pre class="apec-code">temperatura = int(input("Temperatura: "))
if temperatura > 30:
    print("Hace calor, toma agua")
else:
    print("Clima agradable")
print("Fin del reporte")</pre>
        <ul><li>Después de la condición van <b>dos puntos</b> <code>:</code></li><li>Lo que está <b>adentro</b> lleva <b>sangría</b> (4 espacios o Tab).</li><li>La última línea no tiene sangría: se ejecuta siempre.</li></ul>` },
      { title: 'if / elif / else', html: `<p>Con <code>elif</code> ("si no, si…") agregas más caminos. Python revisa <b>de arriba hacia abajo</b> y entra solo en el <b>primero</b> que se cumple.</p>
        <pre class="apec-code">nota = int(input("Nota: "))
if nota >= 10:
    print("Excelente")
elif nota >= 6:
    print("Aprobado")
else:
    print("A seguir trabajando")</pre>` },
      { title: 'Historias con decisiones', html: `<p>Con condicionales puedes programar una <b>historia interactiva</b> donde el lector elige:</p>
        <pre class="apec-code">print("Llegas a un cruce en la Rambla.")
camino = input("¿izquierda o derecha? ")
if camino == "izquierda":
    print("Encuentras el faro abandonado...")
elif camino == "derecha":
    print("Llegas al puerto lleno de contenedores...")
else:
    print("Te quedas quieto y anochece.")</pre>
        <p class="apec-tip">💡 Primero se dibuja el <b>diagrama de flujo</b> de la historia (Etapa 1) y después se programa (Etapa 2).</p>` },
    ],
    cards: [
      { front: '==', back: 'Compara si dos valores son iguales. (= solo guarda)' },
      { front: 'if', back: 'Ejecuta el bloque solo si la condición es True.' },
      { front: 'elif', back: '"Si no, si…": otra condición que se revisa si las anteriores fueron False.' },
      { front: 'Sangría', back: 'Espacios al inicio de la línea que marcan qué está adentro del if/else.' },
    ],
    phases: [
      {
        id: 'm10-a', title: 'Batería del semáforo', type: 'python',
        prompt: `<p>Los semáforos nuevos tienen batería de respaldo. Escribe un programa que:</p>
          <ol><li>Pida el <b>porcentaje de batería</b> (número entero).</li><li>Si es <b>menor a 20</b>, muestre <code>Batería baja</code>.</li><li>Si no, muestre <code>Batería OK</code>.</li></ol>`,
        starter: 'bateria = int(input("Porcentaje de batería: "))\n',
        tests: [
          { inputs: ['10'], check: (out) => (has(out, 'bateria baja') && !has(out, 'bateria ok') ? true : 'con 10% tiene que mostrar solo "Batería baja".') },
          { inputs: ['85'], check: (out) => (has(out, 'bateria ok') && !has(out, 'bateria baja') ? true : 'con 85% tiene que mostrar solo "Batería OK".') },
          { inputs: ['20'], check: (out) => (has(out, 'bateria ok') && !has(out, 'bateria baja') ? true : 'con exactamente 20% NO es menor a 20: tiene que mostrar "Batería OK".') },
        ],
        require: [{ re: /\bif\b/, msg: 'Usa if para decidir.' }, { re: /\belse\b/, msg: 'Usa else para el otro camino.' }],
      },
      {
        id: 'm10-b', title: 'Clasificar la nota', type: 'python',
        prompt: `<p>Escribe un programa que pida una <b>nota del 1 al 12</b> y muestre:</p>
          <ul><li><code>Excelente</code> si es 10 o más.</li><li><code>Aprobado</code> si es 6 o más (y menos de 10).</li><li><code>A recuperar</code> si es menor a 6.</li></ul>
          <p class="apec-tip">Usa <code>if</code>, <code>elif</code> y <code>else</code>. Piensa en qué orden van las condiciones.</p>`,
        starter: '',
        tests: [
          { inputs: ['11'], check: (out) => (has(out, 'excelente') && !has(out, 'aprobado') && !has(out, 'recuperar') ? true : 'con 11 tiene que mostrar solo "Excelente".') },
          { inputs: ['10'], check: (out) => (has(out, 'excelente') && !has(out, 'aprobado') ? true : 'con 10 tiene que mostrar "Excelente" (10 o más).') },
          { inputs: ['7'], check: (out) => (has(out, 'aprobado') && !has(out, 'excelente') && !has(out, 'recuperar') ? true : 'con 7 tiene que mostrar solo "Aprobado".') },
          { inputs: ['6'], check: (out) => (has(out, 'aprobado') && !has(out, 'recuperar') ? true : 'con 6 tiene que mostrar "Aprobado" (6 o más).') },
          { inputs: ['3'], check: (out) => (has(out, 'recuperar') && !has(out, 'aprobado') && !has(out, 'excelente') ? true : 'con 3 tiene que mostrar solo "A recuperar".') },
        ],
        require: [{ re: /input\s*\(/, msg: 'Pide la nota con input() (y conviértela con int()).' }, { re: /\belif\b/, msg: 'Usa elif para el camino del medio.' }, { re: /\belse\b/, msg: 'Usa else para el último camino.' }],
      },
      {
        id: 'm10-c', title: 'Tu historia interactiva', type: 'python',
        prompt: `<p><b>Etapa 2 — Programa la historia.</b> Escribe una historia corta donde el lector elige un camino:</p>
          <ol><li>Muestra el comienzo de la historia con <code>print()</code>.</li><li>Pregunta con <code>input()</code> qué camino elige: <code>a</code> o <code>b</code>.</li><li>Con <code>if / elif / else</code> muestra un final distinto para <code>a</code>, otro para <code>b</code> y otro si escribe cualquier otra cosa.</li></ol>
          <p class="apec-tip">¡Inventa tú la historia! Se verifica que los tres finales sean distintos.</p>`,
        starter: 'print("Era una noche de apagón en Santa Bruma...")\n',
        tests: [{ inputs: ['a'] }, { inputs: ['b'] }, { inputs: ['x'] }],
        custom: async (code) => {
          const outs = [];
          for (const inp of ['a', 'b', 'zzz']) {
            const r = await runPython(code, { inputs: [inp], seed: 7 });
            if (r.error) return { ok: false, error: r.error, transcript: r.transcript, msg: `Con la elección "${inp}" tu programa da un error. Mira el mensaje en rojo.` };
            outs.push(norm(r.out));
          }
          if (outs[0] === outs[1]) return { ok: false, msg: 'Elegir <code>a</code> y elegir <code>b</code> muestran lo mismo. Cada camino necesita su propio final (revisa las condiciones: ¿comparas con == "a"?).' };
          if (outs[2] === outs[0] || outs[2] === outs[1]) return { ok: false, msg: 'Si el lector escribe otra cosa (ni a ni b), tiene que aparecer un tercer final distinto, con else.' };
          return { ok: true };
        },
        require: [{ re: /input\s*\(/, msg: 'Pregunta el camino con input().' }, { re: /\bif\b[\s\S]*\belif\b[\s\S]*\belse\b/, msg: 'Usa if, elif y else (en ese orden) para los tres finales.' }],
      },
    ],
    reflection: 'Cuenta en dos o tres líneas cómo sigue tu historia. ¿Qué otra decisión le agregarías y qué estructura usarías?',
  },
];

/* ---------------- índices ---------------- */
export const PHASES = MISSIONS.flatMap((m) => m.phases.map((p) => ({ ...p, mission: m.n, area: m.area })));
export const MISSION_BY_N = Object.fromEntries(MISSIONS.map((m) => [m.n, m]));

/* ======================================================================
   MISIONES BONUS (centros de la ciudad) — no cambian la nota
   ====================================================================== */
export const CENTERS = {
  iti: { name: 'ITI', full: 'ITI — Instituto Tecnológico Informático', icon: '🤖', npc: 'Profe Ohm' },
  ceibal: { name: 'Ceibal', full: 'Ceibal', icon: '💻', npc: 'Tecla' },
  liceo29: { name: 'Liceo 29', full: 'Liceo 29', icon: '📚', npc: 'Profe Ada' },
  inet: { name: 'INET', full: 'INET — Instituto Normal de Enseñanza Técnica', icon: '🔐', npc: 'Profe Bit' },
  palacio: { name: 'Palacio', full: 'Palacio Legislativo', icon: '🏛️', npc: 'Delia' },
};

export const BONUS = [
  {
    id: 'b-iti-1', center: 'iti', title: 'Carita feliz', type: 'led',
    prompt: '<p>Ohm quiere que su robot sonría. Prende estos LED:</p><pre class="apec-code">led.plot(1, 1)\nled.plot(3, 1)\nled.plot(0, 3)\nled.plot(4, 3)\nled.plot(1, 4)\nled.plot(2, 4)\nled.plot(3, 4)</pre>',
    target: [[1, 1], [3, 1], [0, 3], [4, 3], [1, 4], [2, 4], [3, 4]],
    fail: 'x es la columna (izquierda → derecha) e y es la fila (arriba → abajo), las dos empiezan en 0.',
  },
  {
    id: 'b-iti-2', center: 'iti', title: 'Termómetro del taller', type: 'mbsim', mode: 'code', sensors: ['temperature'],
    prompt: '<p>Arma con bloques un programa que muestre la <b>temperatura</b> del taller <b>cada vez que se aprieta el botón B</b>. Pruébalo moviendo el termómetro del simulador.</p>',
    blockStarter: program([B('mb_on_button', { BUTTON: 'A' }, {})]),
    check: async (sim) => {
      for (const t of [27, 12]) {
        sim.setTemperature(t);
        await sim.trigger('B');
        const last = sim.lastShown('number');
        if (!last || Number(last.value) !== t) return `con ${t} °C, al apretar B la placa tiene que mostrar ${t}. Usa "mostrar número" con "temperatura (°C)".`;
      }
      return true;
    },
    require: [{ re: /Button\.B/, msg: 'Tiene que reaccionar al botón B.' }],
  },
  {
    id: 'b-ceibal-1', center: 'ceibal', title: '¿Es IA o no?', type: 'classify',
    prompt: '<p>Tecla pregunta: ¿cuáles de estas tecnologías usan <b>aprendizaje automático</b>?</p>',
    categories: ['Usa ML', 'No usa ML'],
    items: [
      { text: 'Desbloquear el celular con la cara.', cat: 0 }, { text: 'Una calculadora que suma.', cat: 1 },
      { text: 'Recomendaciones de videos.', cat: 0 }, { text: 'Un interruptor de luz.', cat: 1 },
      { text: 'Traductor de voz automático.', cat: 0 }, { text: 'Un reloj despertador común.', cat: 1 },
    ],
    fail: 'Usa ML si aprendió de muchos ejemplos para reconocer o predecir algo. Si solo sigue una regla fija, no.',
  },
  {
    id: 'b-ceibal-2', center: 'ceibal', title: 'Datos de prueba', type: 'choice',
    prompt: '<p>¿Por qué se prueba un modelo con ejemplos <b>que no usó para entrenar</b>?</p>',
    options: ['Para saber si de verdad aprendió el patrón y no solo memorizó los ejemplos.', 'Porque los ejemplos de entrenamiento se borran.', 'Para que entrene más rápido.', 'No hace falta probarlo.'],
    answer: 0,
    fail: 'Piensa en un examen: si te toman exactamente los mismos ejercicios que practicaste, ¿demuestra que aprendiste?',
  },
  {
    id: 'b-liceo29-1', center: 'liceo29', title: 'El préstamo de la biblioteca', type: 'python',
    prompt: '<p>La biblioteca presta libros por <b>7 días</b>. Pide cuántos días pasaron desde el préstamo. Si pasaron <b>más de 7</b>, muestra <code>Atrasado</code> y cuántos días de atraso; si no, muestra <code>En fecha</code>.</p>',
    starter: '',
    tests: [
      { inputs: ['10'], check: (out) => (has(out, 'atrasado') && hasNum(out, 3) ? true : 'con 10 días tiene que decir "Atrasado" y 3 días de atraso.') },
      { inputs: ['7'], check: (out) => (has(out, 'en fecha') && !has(out, 'atrasado') ? true : 'con 7 días está en fecha.') },
    ],
    require: [{ re: /\bif\b/, msg: 'Usa if para decidir.' }],
  },
  {
    id: 'b-liceo29-2', center: 'liceo29', title: 'Iniciales', type: 'python',
    prompt: '<p>Pide <b>nombre</b> y <b>apellido</b> y muestra las iniciales en mayúscula, con punto. Ejemplo: <code>ada</code> y <code>lovelace</code> → <code>A.L.</code></p><p class="apec-tip">Pista: <code>nombre[0]</code> es la primera letra.</p>',
    starter: '',
    tests: [
      { inputs: ['ada', 'lovelace'], check: (out) => (out.includes('A.L.') ? true : 'con ada y lovelace tiene que mostrar A.L.') },
      { inputs: ['José', 'Artigas'], check: (out) => (out.includes('J.A.') ? true : 'con José y Artigas tiene que mostrar J.A.') },
    ],
  },
  {
    id: 'b-inet-1', center: 'inet', title: 'El farol a pila (desafío)', type: 'wires',
    prompt: '<p>Profe Bit tiene un farol que funciona <b>a pila</b>, sin placa. Tiende los cables: pila, interruptor, resistencia y LED, para que prenda y se apague con el interruptor.</p><p class="apec-tip">Toca un punto y después otro para tender un cable. Prueba con el interruptor cerrado y abierto.</p>',
    fail: 'Revisa: ¿hay un camino completo del + al −? ¿pasa por la resistencia y por el interruptor? ¿la pata larga del LED mira hacia el +?',
  },
  {
    id: 'b-inet-2', center: 'inet', title: 'Ley de Ohm (desafío)', type: 'choice',
    prompt: '<p>La ley de Ohm dice <b>V = I × R</b>. Si una resistencia de <b>100 Ω</b> tiene una corriente de <b>0,05 A</b>, ¿cuántos voltios tiene?</p>',
    options: ['5 V', '0,5 V', '50 V', '2000 V'], answer: 0,
    fail: 'Multiplica: V = 0,05 × 100.',
  },
  {
    id: 'b-palacio-1', center: 'palacio', title: 'Descomponer una ley', type: 'order',
    prompt: '<p>Delia explica cómo se aprueba una ley (simplificado). Ordena los pasos del algoritmo.</p>',
    items: ['Se presenta el proyecto de ley', 'Lo discute y vota una cámara', 'Lo discute y vota la otra cámara', 'El Poder Ejecutivo la promulga', 'Se publica y entra en vigencia'],
    fail: 'Un proyecto pasa por las dos cámaras antes de que el Ejecutivo lo promulgue; al final se publica.',
  },
  {
    id: 'b-palacio-2', center: 'palacio', title: 'Patrones en la fila', type: 'choice',
    prompt: '<p>En la visita guiada entran grupos así: <b>2, 4, 8, 16, …</b> personas. Usando el <b>patrón</b>, ¿cuántas entran en el grupo siguiente?</p>',
    options: ['32', '18', '24', '20'], answer: 0,
    fail: 'Mira cómo cambia cada número respecto del anterior: ¿se suma o se multiplica?',
  },
];

export function phasesFor(challengeId) {
  const id = String(challengeId).trim().toLowerCase();
  const m = /^mision-(\d+)$/.exec(id);
  if (m) return PHASES.filter((p) => p.mission === Number(m[1]));
  const b = /^nerd-(\w+)$/.exec(id);
  if (b) return BONUS.filter((p) => p.center === b[1]).map((p) => ({ ...p, bonus: true }));
  return [];
}
