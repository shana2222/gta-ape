// Contenidos del APE de 9no — Ciencias de la Computación (según el portafolio del curso).
// Cada misión = metas de aprendizaje + explicación (pantallas cortas + tarjetas) + actividades + reflexión.
// Las actividades se verifican por la lógica, no por el texto exacto.
import { runPython, codeWithoutComments } from './python-mini.js';

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
    n: 1, area: 'pc', icon: '🧩', title: 'Pensar como programador',
    tema: 'Pensamiento computacional y las 4 fases de Polya',
    goals: [
      'Reconozco las 4 fases de Polya para resolver un problema.',
      'Uso descomposición, patrones, abstracción y algoritmos.',
      'Resuelvo un desafío tipo Bebras explicando mis pasos.',
    ],
    lesson: [
      { title: '¿Qué es un problema?', html: `<p>Un <b>problema</b> es una situación donde queremos llegar a una meta y <b>todavía no sabemos cómo</b>.</p>
        <div class="apec-ex"><b>Ejemplo:</b> se cortó la luz en Santa Bruma y hay que volver a prender los semáforos.</div>
        <p>Para resolverlo no alcanza con "probar cosas": conviene <b>pensar con un método</b>.</p>` },
      { title: 'Pensamiento computacional', html: `<p>Es la forma de pensar que usamos para resolver problemas como lo haría una computadora. Tiene <b>4 habilidades</b>:</p>
        <div class="apec-grid4">
          <div><span>✂️</span><b>Descomposición</b><small>Dividir el problema grande en partes chicas.</small></div>
          <div><span>🔁</span><b>Patrones</b><small>Encontrar lo que se repite o se parece.</small></div>
          <div><span>🎯</span><b>Abstracción</b><small>Quedarse con lo importante y dejar de lado lo que no sirve.</small></div>
          <div><span>📋</span><b>Algoritmo</b><small>Escribir los pasos ordenados para llegar a la solución.</small></div>
        </div>` },
      { title: 'Las 4 fases de Polya', html: `<p>George Polya fue un matemático que propuso <b>4 fases</b> para resolver cualquier problema:</p>
        <ol class="apec-steps">
          <li><b>Comprender el problema</b>: ¿qué me piden? ¿qué datos tengo?</li>
          <li><b>Concebir un plan</b>: pensar una estrategia (dibujar, dividir, buscar un problema parecido…).</li>
          <li><b>Ejecutar el plan</b>: hacer los pasos, uno por uno.</li>
          <li><b>Examinar la solución</b>: comprobar si funciona y si se puede mejorar.</li>
        </ol>
        <p class="apec-tip">💡 Truco para recordarlas: <b>Entiendo → Planeo → Hago → Reviso</b>.</p>` },
      { title: 'Polya en un ejemplo', html: `<p><b>Problema:</b> el semáforo de 18 de Julio no prende.</p>
        <table class="apec-table"><tbody>
          <tr><th>1. Comprender</th><td>¿Qué semáforo? ¿No prende ninguna luz o solo una?</td></tr>
          <tr><th>2. Planear</th><td>Revisar primero la corriente, después el cable, después la lámpara.</td></tr>
          <tr><th>3. Ejecutar</th><td>Medir la corriente, cambiar el cable roto.</td></tr>
          <tr><th>4. Revisar</th><td>Prender el semáforo y ver si cambian las 3 luces.</td></tr>
        </tbody></table>` },
      { title: 'Desafíos Bebras', html: `<p>Bebras es un concurso internacional de pensamiento computacional. Sus desafíos se resuelven <b>sin computadora</b>, pensando.</p>
        <p><b>Cómo encarar uno:</b></p>
        <ul><li>Lee dos veces la consigna (fase 1).</li><li>Sigue las instrucciones <b>de a una</b>, anotando dónde estás (fase 3).</li><li>Al final, verifica tu respuesta volviendo a hacer el recorrido (fase 4).</li></ul>` },
    ],
    cards: [
      { front: 'Descomposición', back: 'Dividir un problema grande en partes más chicas y fáciles.' },
      { front: 'Abstracción', back: 'Quedarse con la información importante e ignorar los detalles que no sirven.' },
      { front: 'Algoritmo', back: 'Lista de pasos ordenados y precisos para resolver un problema.' },
      { front: 'Fases de Polya', back: '1 Comprender · 2 Planear · 3 Ejecutar · 4 Examinar la solución.' },
    ],
    phases: [
      {
        id: 'm1-a', title: 'Ordenar las fases de Polya', type: 'order',
        prompt: '<p>La Cuadrilla tiene que arreglar el apagón. Ordena las <b>4 fases de Polya</b> de la primera a la última.</p>',
        items: ['Comprender el problema', 'Concebir un plan', 'Ejecutar el plan', 'Examinar la solución'],
        fail: 'Piensa: primero hay que entender qué pasa, y lo último es revisar si funcionó.',
      },
      {
        id: 'm1-b', title: '¿En qué fase estoy?', type: 'classify',
        prompt: '<p>Chispa anotó lo que hizo para arreglar el semáforo. Indica en qué <b>fase de Polya</b> está cada acción.</p>',
        categories: ['1. Comprender', '2. Planear', '3. Ejecutar', '4. Revisar'],
        items: [
          { text: 'Leo el reporte: "el semáforo de Ejido no prende la luz verde".', cat: 0 },
          { text: 'Decido probar primero la lámpara verde y después el cable.', cat: 1 },
          { text: 'Cambio la lámpara verde por una nueva.', cat: 2 },
          { text: 'Espero un ciclo completo para ver si cambian las 3 luces.', cat: 3 },
          { text: 'Me pregunto: ¿qué datos tengo y qué me están pidiendo?', cat: 0 },
          { text: 'Dibujo un esquema con los pasos que voy a seguir.', cat: 1 },
        ],
        fail: 'Fíjate en el verbo: entender/preguntar = comprender; decidir/dibujar el plan = planear; hacer = ejecutar; comprobar = revisar.',
      },
      {
        id: 'm1-c', title: 'Desafío Bebras: el robot repartidor', type: 'choice',
        prompt: `<p>El robot 🤖 empieza en la casilla <b>A1</b> mirando hacia la <b>derecha</b>. Sigue estas instrucciones:</p>
          <pre class="apec-code">avanzar 2
girar a la izquierda (queda mirando hacia arriba)
avanzar 1
girar a la derecha
avanzar 1</pre>
          <div class="apec-board" aria-label="Tablero de 4 columnas (A a D) y 3 filas (1 a 3). La fila 1 es la de abajo.">
            <div class="r"><span class="lbl">3</span><i></i><i></i><i></i><i></i></div>
            <div class="r"><span class="lbl">2</span><i></i><i></i><i></i><i></i></div>
            <div class="r"><span class="lbl">1</span><i>🤖</i><i></i><i></i><i></i></div>
            <div class="r cols"><span class="lbl"></span><b>A</b><b>B</b><b>C</b><b>D</b></div>
          </div>
          <p>¿En qué casilla termina? (la fila 1 es la de abajo)</p>`,
        options: ['D2', 'C2', 'D3', 'C3'], answer: 0,
        fail: 'Hazlo paso a paso: A1 → avanza 2 a la derecha → C1. Ahora mira hacia arriba y avanza 1… sigue tú.',
      },
    ],
    reflection: '¿En qué situación de tu vida (no de informática) podrías usar las 4 fases de Polya? Cuenta el ejemplo con tus palabras.',
  },

  /* ---------------------------------------------------------------- 2 */
  {
    n: 2, area: 'pc', icon: '⚙️', title: 'El proceso computacional',
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

  /* ---------------------------------------------------------------- 3 */
  {
    n: 3, area: 'hw', icon: '🟩', title: 'La placa micro:bit',
    tema: 'Placas programables: entradas, salidas y programas',
    goals: [
      'Reconozco las partes de la micro:bit y si son entrada o salida.',
      'Ubico un LED de la matriz con sus coordenadas (x, y).',
      'Leo un programa de la micro:bit y predigo qué hace.',
    ],
    lesson: [
      { title: '¿Qué es una placa programable?', html: `<p>Es una <b>pequeña computadora</b> en una placa: tiene un procesador, memoria, entradas y salidas. Le cargamos un programa y lo ejecuta.</p>
        <p>La <b>micro:bit</b> se programa con bloques (MakeCode) o con Python.</p>` },
      { title: 'Partes de la micro:bit', html: `<div class="apec-grid2">
          <div><b>⌨️ Entradas</b><ul><li>Botones <b>A</b> y <b>B</b></li><li>Sensor de <b>luz</b></li><li>Sensor de <b>temperatura</b></li><li><b>Acelerómetro</b> (movimiento, sacudir)</li><li><b>Brújula</b></li><li><b>Micrófono</b> (V2)</li></ul></div>
          <div><b>💡 Salidas</b><ul><li>Matriz de <b>25 LED</b> (5 × 5)</li><li><b>Parlante</b> (V2)</li><li><b>Pines</b> para conectar LED, motores…</li></ul></div>
        </div>
        <p class="apec-tip">💡 La <b>radio/Bluetooth</b> sirve para enviar <i>y</i> recibir: es de entrada y salida.</p>` },
      { title: 'Coordenadas de la matriz', html: `<p>Cada LED tiene una posición <b>(x, y)</b>:</p>
        <ul><li><b>x</b> = columna, de 0 (izquierda) a 4 (derecha)</li><li><b>y</b> = fila, de 0 (arriba) a 4 (abajo)</li></ul>
        <div class="apec-ex"><code>led.plot(0, 0)</code> prende el LED de arriba a la izquierda.<br><code>led.plot(4, 4)</code> prende el de abajo a la derecha.<br><code>led.plot(2, 2)</code> prende el del centro.</div>` },
      { title: 'Los programas de la micro:bit', html: `<p>Un programa de micro:bit tiene <b>eventos</b>:</p>
        <ul><li><b>al iniciar</b>: se ejecuta una vez, cuando se prende.</li><li><b>para siempre</b>: se repite sin parar.</li><li><b>al presionar el botón A</b>: se ejecuta cada vez que aprietas A.</li></ul>
        <pre class="apec-code">def al_presionar_a():
    basic.show_icon(IconNames.HEART)
input.on_button_pressed(Button.A, al_presionar_a)</pre>
        <p>Este programa muestra un ❤️ cada vez que aprietas <b>A</b>. El botón es la <b>entrada</b> y la matriz es la <b>salida</b>.</p>` },
    ],
    cards: [
      { front: 'Matriz de LED', back: '25 luces (5×5) que funcionan como pantalla de salida.' },
      { front: 'Acelerómetro', back: 'Sensor de entrada que detecta movimiento, inclinación y sacudidas.' },
      { front: 'led.plot(x, y)', back: 'Prende el LED de la columna x y la fila y (de 0 a 4).' },
      { front: 'para siempre', back: 'Evento que repite su contenido una y otra vez mientras la placa está prendida.' },
    ],
    phases: [
      {
        id: 'm3-a', title: 'Entradas y salidas de la placa', type: 'classify',
        prompt: '<p>Clasifica cada parte de la micro:bit.</p>',
        categories: ['Entrada', 'Salida'],
        items: [
          { text: 'Botón A', cat: 0 }, { text: 'Matriz de 25 LED', cat: 1 }, { text: 'Sensor de temperatura', cat: 0 },
          { text: 'Acelerómetro', cat: 0 }, { text: 'Parlante', cat: 1 }, { text: 'Sensor de luz', cat: 0 },
        ],
        fail: 'Pregúntate: ¿esta parte RECIBE información del mundo (entrada) o MUESTRA algo al mundo (salida)?',
      },
      {
        id: 'm3-b', title: 'Dibujar con coordenadas', type: 'led',
        prompt: `<p>Ohm necesita una <b>flecha</b> para la señal del puerto. Prende los LED que indica el programa (tócalos en la matriz):</p>
          <pre class="apec-code">led.plot(2, 0)
led.plot(1, 1)
led.plot(2, 1)
led.plot(3, 1)
led.plot(2, 2)
led.plot(2, 3)
led.plot(2, 4)</pre>`,
        target: [[2, 0], [1, 1], [2, 1], [3, 1], [2, 2], [2, 3], [2, 4]],
        fail: 'Recuerda: el primer número es la columna (x, de izquierda a derecha) y el segundo es la fila (y, de arriba hacia abajo).',
      },
      {
        id: 'm3-c', title: 'Leer un programa', type: 'choice',
        prompt: `<p>Lee este programa de la micro:bit:</p>
          <pre class="apec-code">def al_sacudir():
    basic.show_number(randint(1, 6))
input.on_gesture(Gesture.SHAKE, al_sacudir)</pre>
          <p>¿Qué hace?</p>`,
        options: [
          'Cuando sacudes la placa, muestra un número al azar del 1 al 6 (un dado).',
          'Muestra los números del 1 al 6 cuando aprietas el botón A.',
          'Muestra siempre el número 6 apenas se prende.',
          'Hace sonar 6 pitidos cuando la sacudes.',
        ], answer: 0,
        fail: 'Fíjate en el evento (Gesture.SHAKE = sacudir) y en la salida (show_number con randint = número al azar).',
      },
    ],
    reflection: 'Inventa un proyecto útil para tu liceo con la micro:bit. ¿Qué entrada usarías y qué salida?',
  },

  /* ---------------------------------------------------------------- 4 */
  {
    n: 4, area: 'hw', icon: '🔌', title: 'Periféricos y corriente',
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
        id: 'm4-b', title: 'La conexión correcta', type: 'classify',
        prompt: '<p>¿Qué conexión usarías en cada caso?</p>',
        categories: ['USB', 'HDMI', 'Bluetooth', 'Pines'],
        items: [
          { text: 'Pasar el programa de la ceibalita a la micro:bit con un cable.', cat: 0 },
          { text: 'Ver la ceibalita en el televisor del salón.', cat: 1 },
          { text: 'Escuchar música en auriculares sin cable.', cat: 2 },
          { text: 'Conectar un LED externo a la micro:bit.', cat: 3 },
        ],
        fail: 'Piensa: imagen al TV = HDMI; sin cable = Bluetooth; cable de datos a la placa = USB; componentes en la placa = pines.',
      },
      {
        id: 'm4-c', title: 'Voltaje, corriente y resistencia', type: 'choice',
        prompt: '<p>En la analogía del agua, una manguera <b>más finita</b> deja pasar menos agua. ¿Qué representa en un circuito?</p>',
        options: ['Una resistencia mayor, que frena más la corriente.', 'Un voltaje mayor, que empuja más.', 'Una corriente mayor.', 'Un circuito abierto.'],
        answer: 0,
        fail: 'Lo que FRENA el paso del agua en la manguera es lo que frena la corriente en el circuito.',
      },
    ],
    reflection: '¿Qué periféricos usas todos los días? Elige dos y explica si son de entrada, de salida o de entrada/salida.',
  },

  /* ---------------------------------------------------------------- 5 */
  {
    n: 5, area: 'hw', icon: '💡', title: 'Encender un LED',
    tema: 'Componentes electrónicos, protoboard y LED con micro:bit (Tinkercad)',
    goals: [
      'Reconozco la batería, la resistencia, el LED y la protoboard.',
      'Armo un circuito cerrado con el LED bien conectado (polaridad).',
      'Prendo un LED conectado a un pin de la micro:bit.',
    ],
    lesson: [
      { title: 'Los componentes', html: `<div class="apec-grid2">
          <div><b>🔋 Batería / pila</b><small>Da la energía. Tiene polo + y polo −.</small></div>
          <div><b>〰️ Resistencia</b><small>Frena la corriente para que el LED no se queme. Sus franjas de colores indican su valor.</small></div>
          <div><b>💡 LED</b><small>Diodo emisor de luz. Solo funciona conectado en un sentido.</small></div>
          <div><b>🔘 Interruptor</b><small>Abre o cierra el circuito.</small></div>
        </div>` },
      { title: 'El LED tiene polaridad', html: `<ul><li><b>Ánodo (+)</b>: la <b>pata larga</b>. Va hacia el polo + (o hacia el pin de la placa).</li>
        <li><b>Cátodo (−)</b>: la <b>pata corta</b> (el lado plano del LED). Va hacia el − (GND).</li></ul>
        <p class="apec-tip">💡 Si lo conectas al revés no se rompe, pero <b>no prende</b>. Y sin resistencia, ¡se puede quemar!</p>` },
      { title: 'La protoboard', html: `<p>Es una placa para armar circuitos <b>sin soldar</b>.</p>
        <ul><li>En la parte central, los agujeros de una misma <b>columna de 5</b> están conectados entre sí.</li>
        <li>La <b>canaleta del medio</b> separa las dos mitades: lo de un lado no está conectado con lo del otro.</li>
        <li>Los <b>rieles</b> de los costados (+ rojo y − azul) recorren toda la placa: ahí va la alimentación.</li></ul>` },
      { title: 'LED con la micro:bit', html: `<p>La micro:bit puede dar energía por sus <b>pines</b>:</p>
        <p><b>Pin 0</b> → resistencia → <b>ánodo</b> (pata larga) … <b>cátodo</b> → <b>GND</b>.</p>
        <pre class="apec-code">pins.digital_write_pin(DigitalPin.P0, 1)   # 1 = prender
pins.digital_write_pin(DigitalPin.P0, 0)   # 0 = apagar</pre>
        <p>En <b>Tinkercad</b> (Circuitos) puedes armarlo y simularlo antes de hacerlo con los componentes reales.</p>` },
    ],
    cards: [
      { front: 'Ánodo', back: 'Pata larga del LED. Se conecta hacia el polo positivo (+).' },
      { front: 'Cátodo', back: 'Pata corta del LED (lado plano). Se conecta al negativo (− / GND).' },
      { front: 'GND', back: 'Tierra o negativo: el punto por donde vuelve la corriente.' },
      { front: 'Protoboard', back: 'Placa para armar circuitos sin soldar. Las columnas de 5 agujeros están conectadas.' },
    ],
    phases: [
      {
        id: 'm5-a', title: 'Armar el circuito', type: 'circuit',
        prompt: '<p>El farol de la plaza no prende. Elige cómo armar el circuito para que el <b>LED prenda sin quemarse</b>.</p>',
        fail: 'Revisa las tres cosas: ¿el circuito está cerrado? ¿hay algo que frene la corriente? ¿la pata larga va hacia el +?',
      },
      {
        id: 'm5-b', title: 'La protoboard', type: 'choice',
        prompt: `<p>En la protoboard pusiste la pata larga del LED en el agujero <b>E10</b>.</p>
          <div class="apec-proto" aria-hidden="true">columna 10: <b>A10 B10 C10 D10 E10</b> │ canaleta │ F10 G10 H10 I10 J10</div>
          <p>¿En qué agujero tienes que poner la resistencia para que quede conectada a esa pata?</p>`,
        options: ['A10 (misma columna, mismo lado de la canaleta)', 'F10 (del otro lado de la canaleta)', 'E11 (la columna de al lado)', 'En cualquier agujero de la placa'],
        answer: 0,
        fail: 'Solo están conectados los 5 agujeros de la misma columna y del mismo lado de la canaleta (A a E, o F a J).',
      },
      {
        id: 'm5-c', title: 'Prender el LED del pin 0', type: 'choice',
        prompt: `<p>Conectaste el LED al <b>pin 0</b> y a <b>GND</b>. ¿Qué programa lo hace <b>parpadear</b> (prender y apagar cada medio segundo)?</p>`,
        options: [
          'para siempre:\n  pins.digital_write_pin(DigitalPin.P0, 1)\n  basic.pause(500)\n  pins.digital_write_pin(DigitalPin.P0, 0)\n  basic.pause(500)',
          'al iniciar:\n  pins.digital_write_pin(DigitalPin.P0, 1)',
          'para siempre:\n  pins.digital_write_pin(DigitalPin.P1, 1)\n  basic.pause(500)',
          'para siempre:\n  pins.digital_write_pin(DigitalPin.P0, 0)\n  basic.pause(500)',
        ],
        code: true, answer: 0,
        fail: 'Para parpadear hay que prender (1), esperar, apagar (0) y esperar… y repetirlo para siempre. Y tiene que ser el pin P0.',
      },
    ],
    reflection: 'Si el LED de tu circuito no prende, ¿qué revisarías primero y por qué? Usa las palabras ánodo, cátodo o resistencia.',
  },

  /* ---------------------------------------------------------------- 6 */
  {
    n: 6, area: 'ia', icon: '🤖', title: 'Entrenar una IA',
    tema: 'Fundamentos de IA y entrenamiento de un modelo de Machine Learning',
    goals: [
      'Explico qué es la inteligencia artificial y el aprendizaje automático (ML).',
      'Ordeno las etapas para entrenar un modelo: datos, etiquetas, entrenamiento, prueba.',
      'Reconozco que datos malos o desbalanceados producen un modelo con errores (sesgo).',
    ],
    lesson: [
      { title: '¿Qué es la IA?', html: `<p>La <b>inteligencia artificial</b> son programas que hacen tareas que antes solo hacían las personas: reconocer caras, entender la voz, traducir, recomendar videos.</p>
        <p class="apec-tip">💡 La IA <b>no piensa ni siente</b>: encuentra patrones en muchos datos.</p>` },
      { title: 'Machine Learning (aprendizaje automático)', html: `<p>En la programación común, <b>nosotros escribimos las reglas</b>. En ML, le damos a la computadora <b>muchos ejemplos</b> y ella <b>descubre las reglas</b> sola.</p>
        <div class="apec-flow"><span>📦 Ejemplos con etiqueta</span><i>→</i><span>🧠 Entrenamiento</span><i>→</i><span>🤖 Modelo</span></div>` },
      { title: 'Las etapas de un proyecto de ML', html: `<ol class="apec-steps">
          <li><b>Definir las clases</b>: ¿qué tiene que reconocer? (ej: 🍎 manzana / 🍌 banana)</li>
          <li><b>Juntar datos</b>: muchas fotos, sonidos o textos de cada clase.</li>
          <li><b>Etiquetar</b>: decir a qué clase pertenece cada ejemplo.</li>
          <li><b>Entrenar</b>: la computadora busca los patrones.</li>
          <li><b>Probar</b>: mostrarle ejemplos <b>nuevos</b> y ver si acierta.</li>
        </ol>
        <p>Herramientas como <b>Teachable Machine</b> o <b>Machine Learning for Kids</b> hacen esto en el navegador.</p>` },
      { title: 'Basura entra, basura sale', html: `<p>Un modelo aprende <b>de los datos que le damos</b>. Si las etiquetas están mal, o hay muchos ejemplos de una clase y muy pocos de otra, el modelo se equivoca.</p>
        <div class="apec-ex"><b>Sesgo:</b> si entrenas un reconocedor de caras solo con fotos de personas de pelo corto, va a fallar con las de pelo largo.</div>
        <p>Por eso los datos tienen que ser <b>variados, balanceados y bien etiquetados</b>.</p>` },
    ],
    cards: [
      { front: 'Machine Learning', back: 'La computadora aprende patrones a partir de muchos ejemplos, en vez de reglas escritas a mano.' },
      { front: 'Etiqueta', back: 'El nombre de la clase de cada ejemplo (ej: esta foto es "gato").' },
      { front: 'Entrenamiento', back: 'Etapa en que el modelo busca patrones en los datos etiquetados.' },
      { front: 'Sesgo', back: 'Error del modelo causado por datos incompletos, desbalanceados o mal etiquetados.' },
    ],
    phases: [
      {
        id: 'm6-a', title: 'Las etapas del ML', type: 'order',
        prompt: '<p>Tecla quiere entrenar un modelo que reconozca residuos para reciclar. Ordena las etapas.</p>',
        items: ['Definir las clases (papel, plástico, vidrio)', 'Juntar muchas fotos de residuos', 'Etiquetar cada foto con su clase', 'Entrenar el modelo', 'Probar el modelo con fotos nuevas'],
        fail: 'Antes de entrenar hay que tener los datos etiquetados, y la prueba siempre es al final, con ejemplos nuevos.',
      },
      {
        id: 'm6-b', title: 'Entrena el clasificador de frutas', type: 'ml',
        prompt: '<p>La feria de Santa Bruma quiere una balanza que reconozca la fruta sola. <b>Etiqueta</b> cada ejemplo de entrenamiento, después <b>entrena</b> y <b>prueba</b> el modelo con frutas nuevas.</p>',
        classes: ['🍎 Manzana', '🍌 Banana'],
        train: [
          { label: 'roja, redonda, chica', f: [1, 1, 0], cat: 0 },
          { label: 'amarilla, alargada, mediana', f: [0, 0, 1], cat: 1 },
          { label: 'verde, redonda, chica', f: [0.4, 1, 0], cat: 0 },
          { label: 'amarilla, alargada, grande', f: [0, 0, 1.4], cat: 1 },
          { label: 'roja, redonda, mediana', f: [1, 1, 0.5], cat: 0 },
          { label: 'verde, alargada, mediana', f: [0.4, 0, 1], cat: 1 },
        ],
        test: [
          { label: 'roja, redonda, grande', f: [1, 1, 1], cat: 0 },
          { label: 'amarilla, alargada, chica', f: [0, 0, 0.5], cat: 1 },
          { label: 'verde, redonda, mediana', f: [0.4, 1, 0.5], cat: 0 },
        ],
        fail: 'El modelo aprende de TUS etiquetas. Si una está mal, el modelo aprende mal. Revisa forma y color de cada ejemplo.',
      },
      {
        id: 'm6-c', title: 'Detectar el sesgo', type: 'choice',
        prompt: '<p>Un modelo para reconocer perros y gatos se entrenó con <b>200 fotos de perros</b> y solo <b>5 de gatos</b>. Ahora dice "perro" casi siempre. ¿Cuál es la mejor solución?</p>',
        options: ['Agregar muchas más fotos variadas de gatos para que las clases queden balanceadas.', 'Borrar las fotos de gatos.', 'Entrenarlo más veces con los mismos datos.', 'Usar una computadora más rápida.'],
        answer: 0,
        fail: 'El problema está en los DATOS: una clase tiene muchísimos ejemplos y la otra casi ninguno.',
      },
    ],
    reflection: '¿Dónde usas inteligencia artificial en tu vida diaria? Cuenta un ejemplo y un cuidado que hay que tener con ella.',
  },

  /* ---------------------------------------------------------------- 7 */
  {
    n: 7, area: 'py', icon: '🐍', title: 'Python: primeros pasos',
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

  /* ---------------------------------------------------------------- 8 */
  {
    n: 8, area: 'py', icon: '📦', title: 'Variables y entrada de datos',
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

  /* ---------------------------------------------------------------- 9 */
  {
    n: 9, area: 'py', icon: '🔎', title: 'Funciones de texto y math',
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

  /* ---------------------------------------------------------------- 10 */
  {
    n: 10, area: 'py', icon: '🔀', title: 'Decisiones: if / elif / else',
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
    id: 'b-iti-2', center: 'iti', title: 'Termómetro del taller', type: 'choice',
    prompt: '<p>¿Qué programa muestra la temperatura del taller <b>cada vez que se aprieta el botón B</b>?</p>',
    options: [
      'def al_presionar_b():\n    basic.show_number(input.temperature())\ninput.on_button_pressed(Button.B, al_presionar_b)',
      'def al_presionar_b():\n    basic.show_number(input.light_level())\ninput.on_button_pressed(Button.B, al_presionar_b)',
      'def al_presionar_a():\n    basic.show_number(input.temperature())\ninput.on_button_pressed(Button.A, al_presionar_a)',
      'basic.show_number(input.temperature())',
    ], code: true, answer: 0,
    fail: 'Necesitas el evento del botón B y el sensor de temperatura (temperature).',
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
    id: 'b-inet-1', center: 'inet', title: 'Circuito abierto o cerrado', type: 'classify',
    prompt: '<p>Profe Bit revisa cerraduras eléctricas. ¿El circuito está abierto o cerrado?</p>',
    categories: ['Cerrado (funciona)', 'Abierto (no funciona)'],
    items: [
      { text: 'Interruptor apretado y todos los cables conectados.', cat: 0 }, { text: 'Un cable suelto en la protoboard.', cat: 1 },
      { text: 'Interruptor apagado.', cat: 1 }, { text: 'Pila → resistencia → LED → pila, todo conectado.', cat: 0 },
    ],
    fail: 'Cerrado = la corriente tiene un camino completo de ida y vuelta a la pila.',
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
