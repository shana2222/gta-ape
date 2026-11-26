import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPython } from '../src/ape/python-mini.js';
import { MISSIONS, PHASES, BONUS, CENTERS, checkPython, phasesFor } from '../src/ape/content.js';
import { CityMap } from '../src/world/city-map.js';
import { parseStoryManifest, parseMissionMarkdown, parseEncounterMarkdown, parseItemMarkdown } from '../src/story/story-parser.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const storyDir = path.join(root, 'story');

/* ---------------- intérprete ---------------- */
test('intérprete: print, tipos, operaciones y f-strings', async () => {
  const r = await runPython('print("Hola", 5)\nprint(7/2, 7//2, 7%2, 2**3)\nprint(type(3.0), type("a"))\nx = 3\nprint(f"x={x*2:.1f}")');
  assert.equal(r.error, null);
  assert.equal(r.out, "Hola 5\n3.5 3 1 8\n<class 'float'> <class 'str'>\nx=6.0\n");
});

test('intérprete: input, int y el TypeError clásico', async () => {
  const ok = await runPython('e = int(input("Edad: "))\nprint(e + 1)', { inputs: ['14'] });
  assert.equal(ok.out, '15\n');
  const bad = await runPython('e = input()\nprint(e + 1)', { inputs: ['14'] });
  assert.equal(bad.error.pyType, 'TypeError');
  assert.match(bad.error.message, /can only concatenate str/);
  assert.ok(bad.error.hint.length > 10);
});

test('intérprete: if/elif/else, sangría y errores de sintaxis', async () => {
  const code = 'n = int(input())\nif n >= 10:\n    print("A")\nelif n >= 6:\n    print("B")\nelse:\n    print("C")';
  for (const [i, o] of [['11', 'A'], ['7', 'B'], ['2', 'C']]) assert.equal((await runPython(code, { inputs: [i] })).out, `${o}\n`);
  assert.equal((await runPython('if 1 > 0\n    print(1)')).error.pyType, 'SyntaxError');
  assert.equal((await runPython('if 1 > 0:\nprint(1)')).error.pyType, 'IndentationError');
  assert.equal((await runPython('Print(1)')).error.pyType, 'NameError');
  assert.equal((await runPython('int("3.5")')).error.pyType, 'ValueError');
  assert.equal((await runPython('x = 0\nwhile x < 1:\n    pass')).error.pyType, 'TimeoutError');
});

test('intérprete: funciones de texto y math', async () => {
  const r = await runPython('import math\ns = "  hola mundo "\nprint(s.strip().upper(), len(s.strip()), s.strip().title())\nprint(math.sqrt(16), round(math.pi, 2), max(3, 9), abs(-2))');
  assert.equal(r.error, null);
  assert.equal(r.out, 'HOLA MUNDO 10 Hola Mundo\n4.0 3.14 9 2\n');
});

/* ---------------- actividades ---------------- */
const SOLUTIONS = {
  'm7-a': ['print("Atención Santa Bruma")\nprint("La luz vuelve a las 20 horas")\nprint("Gracias por esperar")', 'print("Atención Santa Bruma")'],
  'm8-a': ['n = input("Nombre: ")\nb = input("Barrio: ")\nprint("Bienvenida", n + ", del barrio", b)', 'n = input()\nb = input()\nprint("Hola Ana del Cerro")'],
  'm8-b': ['edad = int(input("Edad: "))\nproximo = edad + 1\nprint("El año que viene vas a tener " + str(proximo) + " años")', null],
  'm8-c': ['p = int(input("Precio: "))\nc = int(input("Cantidad: "))\nprint("Total:", p * c)', 'p = input()\nc = input()\nprint("Total:", p + c)'],
  'm9-b': ['pista = "   el culpable está en el puerto   "\nlimpia = pista.strip().upper()\nprint(limpia)\nprint(len(limpia))', 'pista = "   el culpable está en el puerto   "\nprint(pista.upper())\nprint(len(pista))'],
  'm9-c': ['import math\nr = float(input("Radio: "))\narea = math.pi * r ** 2\nprint("Área:", round(area, 2))', 'import math\nr = int(input())\nprint(round(math.pi * r ** 2, 2))'],
  'm10-a': ['b = int(input())\nif b < 20:\n    print("Batería baja")\nelse:\n    print("Batería OK")', 'b = int(input())\nif b <= 20:\n    print("Batería baja")\nelse:\n    print("Batería OK")'],
  'm10-b': ['n = int(input("Nota: "))\nif n >= 10:\n    print("Excelente")\nelif n >= 6:\n    print("Aprobado")\nelse:\n    print("A recuperar")', 'n = int(input())\nif n >= 6:\n    print("Aprobado")\nelif n >= 10:\n    print("Excelente")\nelse:\n    print("A recuperar")'],
  'm10-c': ['print("Era una noche de apagón...")\nc = input("¿a o b? ")\nif c == "a":\n    print("Vas al faro.")\nelif c == "b":\n    print("Vas al puerto.")\nelse:\n    print("Te quedas quieto.")', 'print("Hola")\nc = input()\nif c == "a":\n    print("Fin")\nelif c == "b":\n    print("Fin")\nelse:\n    print("Otro")'],
  'b-liceo29-1': ['d = int(input())\nif d > 7:\n    print("Atrasado", d - 7, "días")\nelse:\n    print("En fecha")', 'd = int(input())\nprint("En fecha")'],
  'b-liceo29-2': ['n = input()\na = input()\nprint(n[0].upper() + "." + a[0].upper() + ".")', 'n = input()\na = input()\nprint(n[0] + "." + a[0] + ".")'],
};

const check = (p, code) => (p.custom ? p.custom(code) : checkPython(code, p));

test('cada actividad de Python acepta una solución correcta y rechaza una incorrecta', async () => {
  const pyPhases = [...PHASES, ...BONUS].filter((p) => p.type === 'python');
  assert.equal(pyPhases.length, Object.keys(SOLUTIONS).length, 'falta una solución de referencia');
  for (const p of pyPhases) {
    const [good, bad] = SOLUTIONS[p.id];
    const g = await check(p, good);
    assert.equal(g.ok, true, `${p.id}: la solución correcta no pasa → ${g.msg} ${g.error?.toPython?.() || ''}`);
    if (bad) assert.equal((await check(p, bad)).ok, false, `${p.id}: la solución incorrecta pasa`);
  }
  // el código inicial con error de m8-b no debe pasar
  const m8b = PHASES.find((p) => p.id === 'm8-b');
  assert.equal((await check(m8b, m8b.starter)).ok, false);
});

test('actividades de predicción: el programa corre sin errores', async () => {
  for (const p of PHASES.filter((x) => x.type === 'predict')) {
    const r = await runPython(p.code);
    assert.equal(r.error, null, p.id);
    assert.ok(r.out.trim().length > 0);
  }
});

test('estructura APE: cada misión tiene metas, explicación, tarjetas, 3 actividades y reflexión', () => {
  assert.equal(MISSIONS.length, 10);
  assert.equal(PHASES.length, 30);
  const ids = new Set();
  for (const m of MISSIONS) {
    assert.ok(m.goals.length >= 2, `metas misión ${m.n}`);
    assert.ok(m.lesson.length >= 3, `explicación misión ${m.n}`);
    assert.ok(m.cards.length >= 3, `tarjetas misión ${m.n}`);
    assert.equal(m.phases.length, 3);
    assert.ok(m.reflection.length > 20);
    for (const p of m.phases) {
      assert.ok(!ids.has(p.id), `id repetido ${p.id}`); ids.add(p.id);
      if (p.type === 'choice') assert.ok(p.answer >= 0 && p.answer < p.options.length);
      if (p.type === 'classify') assert.ok(p.items.every((it) => it.cat >= 0 && it.cat < p.categories.length));
    }
    assert.equal(phasesFor(`mision-${m.n}`).length, 3);
  }
  for (const c of Object.keys(CENTERS)) assert.ok(phasesFor(`nerd-${c}`).length >= 2, c);
});

/* ---------------- historia ---------------- */
test('toda la historia parsea y cada misión abre su consola APE', () => {
  const cityMap = new CityMap();
  const manifest = parseStoryManifest(fs.readFileSync(path.join(storyDir, 'story.md'), 'utf8'), 'story.md');
  for (const id of [...manifest.items, ...manifest.collectibles]) {
    const it = parseItemMarkdown(fs.readFileSync(path.join(storyDir, 'items', `${id}.md`), 'utf8'), `items/${id}.md`);
    assert.ok(fs.existsSync(path.join(storyDir, it.image)), `imagen ausente ${it.image}`);
  }
  manifest.missions.forEach((id, i) => {
    const m = parseMissionMarkdown(fs.readFileSync(path.join(storyDir, 'missions', `${id}.md`), 'utf8'), `missions/${id}.md`, cityMap);
    const steps = m.outroCutscene.steps;
    assert.ok(steps.some((s) => s.type === 'deliver' && s.itemId === m.giveItem), `${id} entrega`);
    assert.ok(steps.some((s) => s.type === 'sql' && s.challengeId === `mision-${i + 1}`), `${id} abre mision-${i + 1}`);
  });
  for (const id of manifest.encounters) {
    const e = parseEncounterMarkdown(fs.readFileSync(path.join(storyDir, 'missions', `${id}.md`), 'utf8'), `missions/${id}.md`, cityMap);
    assert.ok(e);
  }
});

/* ---------------- simuladores de placas y circuitos ---------------- */
import { MicrobitSim } from '../src/ape/microbit-sim.js';
import { solveCircuit, protoLinks } from '../src/ape/circuit-sim.js';
import { codeWithoutComments } from '../src/ape/python-mini.js';

async function verifyMb(p, code) {
  if (/___/.test(codeWithoutComments(code))) return false;
  let err = null;
  const sim = new MicrobitSim({ seed: 11, onLog: (t, e) => { if (e && !err) err = e; } });
  await sim.load(code);
  if (err) return false;
  const r = await p.check(sim);
  if (err || r !== true) return false;
  return (p.require || []).every((q) => q.re.test(codeWithoutComments(code)));
}

const MB_SOLUTIONS = {
  'm3-b': ['led.plot(2, 0)\nfor x in range(1, 4):\n    led.plot(x, 1)\nled.plot(0, 2)\nled.plot(2, 2)\nled.plot(4, 2)\nled.plot(2, 3)\nled.plot(2, 4)', 'led.plot(2, 0)\nled.plot(2, 1)'],
  'm3-c': ['def al_sacudir():\n    basic.show_number(randint(1, 6))\ninput.on_gesture(Gesture.SHAKE, al_sacudir)', 'def al_sacudir():\n    basic.show_number(randint(0, 9))\ninput.on_gesture(Gesture.SHAKE, al_sacudir)'],
  'm5-c': ['def para_siempre():\n    pins.digital_write_pin(DigitalPin.P0, 1)\n    basic.pause(500)\n    pins.digital_write_pin(DigitalPin.P0, 0)\n    basic.pause(500)\nbasic.forever(para_siempre)', 'def para_siempre():\n    pins.digital_write_pin(DigitalPin.P0, 1)\n    basic.pause(500)\n    pins.digital_write_pin(DigitalPin.P0, 0)\nbasic.forever(para_siempre)'],
  'b-iti-2': ['def al_presionar_b():\n    basic.show_number(input.temperature())\ninput.on_button_pressed(Button.B, al_presionar_b)', 'def al_presionar_b():\n    basic.show_number(21)\ninput.on_button_pressed(Button.B, al_presionar_b)'],
};

test('cada actividad de micro:bit acepta una solución y rechaza otra incorrecta', async () => {
  const mb = [...PHASES, ...BONUS].filter((p) => p.type === 'mbsim' && p.mode === 'code');
  assert.equal(mb.length, Object.keys(MB_SOLUTIONS).length);
  for (const p of mb) {
    const [good, bad] = MB_SOLUTIONS[p.id];
    assert.equal(await verifyMb(p, good), true, `${p.id}: la solución correcta no pasa`);
    assert.equal(await verifyMb(p, bad), false, `${p.id}: la incorrecta pasa`);
    assert.equal(await verifyMb(p, p.starter), false, `${p.id}: el código inicial ya pasa`);
  }
});

test('explorar la placa: el programa cargado cumple las 4 metas con sus entradas', async () => {
  const p = PHASES.find((x) => x.id === 'm3-a');
  const sim = new MicrobitSim({ seed: 3 });
  assert.equal(await sim.load(p.code), true);
  await sim.trigger('A'); await sim.trigger('B'); await sim.trigger('SHAKE');
  sim.setTemperature(35); await sim.advance(3000);
  assert.ok(p.goals.every((g) => g.done(sim)));
});

test('micro:bit: falta de global da UnboundLocalError con pista', async () => {
  let err = null;
  const sim = new MicrobitSim({ onLog: (t, e) => { err = e; } });
  await sim.load('c = 0\ndef a():\n    c += 1\ninput.on_button_pressed(Button.A, a)');
  await sim.trigger('A');
  assert.equal(err.pyType, 'UnboundLocalError');
  assert.match(err.hint, /global/);
});

test('solucionador de circuitos: cerrado, abierto, invertido, quemado, corto y protoboard', () => {
  const comps = (closed) => [{ type: 'R', a: 'R1', b: 'R2' }, { type: 'LED', a: 'LA', b: 'LK' }, { type: 'SW', a: 'S1', b: 'S2', closed }];
  const solve = (links, closed = true) => solveCircuit({ links, comps: comps(closed), pos: 'B+', neg: 'B-' }).status;
  const ok = [['B+', 'S1'], ['S2', 'R1'], ['R2', 'LA'], ['LK', 'B-']];
  assert.equal(solve(ok), 'on');
  assert.equal(solve(ok, false), 'open');
  assert.equal(solve([['B+', 'S1'], ['S2', 'R1'], ['R2', 'LK'], ['LA', 'B-']]), 'reversed');
  assert.equal(solve([['B+', 'LA'], ['LK', 'B-']]), 'burnt');
  assert.equal(solve([['B+', 'S1'], ['S2', 'B-']]), 'short');
  assert.equal(solve([['B+', 'R1'], ['R2', 'B-']]), 'bypass');
  const led = { type: 'LED', a: 'e5', b: 'e7' };
  const proto = (r, w) => solveCircuit({ links: [...protoLinks(), w], comps: [led, { type: 'R', a: r[0], b: r[1] }], pos: '+1', neg: '-1' }).status;
  assert.equal(proto(['+3', 'c5'], ['b7', '-9']), 'on');
  assert.equal(proto(['+3', 'f5'], ['b7', '-9']), 'open');
  assert.equal(proto(['+3', 'c5'], ['f7', '-9']), 'open');
  assert.equal(proto(['c7', '-2'], ['a5', '+4']), 'on');
});
