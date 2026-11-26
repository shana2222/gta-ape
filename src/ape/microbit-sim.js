// Simulador de micro:bit para el juego: ejecuta programas en Python de MakeCode
// (basic, led, input, pins, Button, Gesture, IconNames, DigitalPin, randint) con el mini intérprete.
// Modo "realtime": anima la placa en pantalla. Modo rápido: avanza un reloj virtual para verificar.
import { Interpreter, PyError, PyUserFunc, pyApi, pyStr } from './python-mini.js';

const rows = (s) => s.trim().split('/').map((r) => [...r].map((c) => (c === '#' ? 1 : 0)));

export const ICONS = {
  HEART: '.#.#./#####/#####/.###./..#..',
  SMALL_HEART: '...../.#.#./.###./..#../.....',
  YES: '...../....#/...#./#.#../.#...',
  NO: '#...#/.#.#./..#../.#.#./#...#',
  HAPPY: '...../.#.#./...../#...#/.###.',
  SAD: '...../.#.#./...../.###./#...#',
  SURPRISED: '.#.#./...../..#../.#.#./..#..',
  ASLEEP: '...../##.##/...../.###./.....',
  SQUARE: '#####/#...#/#...#/#...#/#####',
  SMALL_SQUARE: '...../.###./.#.#./.###./.....',
  DIAMOND: '..#../.#.#./#...#/.#.#./..#..',
  TRIANGLE: '...../..#../.#.#./#####/.....',
  SKULL: '.###./#.#.#/#####/.###./.###.',
  GHOST: '.###./#.#.#/#####/#####/#.#.#',
  HOUSE: '..#../.###./#####/.###./.#.#.',
  UMBRELLA: '.###./#####/..#../#.#../.##..',
  SWORD: '..#../..#../..#../.###./..#..',
  CHESSBOARD: '.#.#./#.#.#/.#.#./#.#.#/.#.#.',
};

const FONT = {
  0: '.##../#..#./#..#./#..#./.##..', 1: '..#../.##../..#../..#../.###.', 2: '###../...#./.##../#..../####.',
  3: '####./...#./..#../#..#./.##..', 4: '..##./.#.#./#..#./####./...#.', 5: '####./#..../###../...#./###..',
  6: '..#../.#.../###../#..#./.##..', 7: '####./...#./..#../.#.../#....', 8: '.##../#..#./.##../#..#./.##..',
  9: '.##../#..#./.###./..#../.#...',
  A: '.##../#..#./####./#..#./#..#.', B: '###../#..#./###../#..#./###..', C: '.###./#..../#..../#..../.###.',
  D: '###../#..#./#..#./#..#./###..', E: '####./#..../###../#..../####.', F: '####./#..../###../#..../#....',
  G: '.###./#..../#.##./#..#./.##..', H: '#..#./#..#./####./#..#./#..#.', I: '###../.#.../.#.../.#.../###..',
  J: '####./...#./...#./#..#./.##..', K: '#..#./#.#../##.../#.#../#..#.', L: '#..../#..../#..../#..../####.',
  M: '#...#/##.##/#.#.#/#...#/#...#', N: '#..#./##.#./#.##./#..#./#..#.', O: '.##../#..#./#..#./#..#./.##..',
  P: '###../#..#./###../#..../#....', Q: '.##../#..#./#..#./.##../...#.', R: '###../#..#./###../#.#../#..#.',
  S: '.###./#..../.##../...#./###..', T: '#####/..#../..#../..#../..#..', U: '#..#./#..#./#..#./#..#./.##..',
  V: '#...#/#...#/#...#/.#.#./..#..', W: '#...#/#...#/#.#.#/##.##/#...#', X: '#..#./#..#./.##../#..#./#..#.',
  Y: '#...#/.#.#./..#../..#../..#..', Z: '####./..#../.#.../#..../####.',
  ' ': '...../...../...../...../.....', '-': '...../...../.###./...../.....', '.': '...../...../...../...../..#..',
  '!': '..#../..#../..#../...../..#..', '?': '.###./#...#/..##./...../..#..', ':': '...../.#.../...../.#.../.....',
};
const glyph = (ch) => rows(FONT[ch] || FONT[String(ch).toUpperCase()] || '...../.#.#./...../.#.#./.....');

class StopSignal extends Error {}

export class MicrobitSim {
  /**
   * @param {object} opts
   * @param {boolean} opts.realtime  true = anima en pantalla con tiempo real
   * @param {(sim) => void} opts.onChange  se llama cada vez que cambia algo visible
   * @param {(text: string, kind?: string) => void} opts.onLog  mensajes para la consola
   */
  constructor({ realtime = false, onChange = () => {}, onLog = () => {}, seed = null, charMs = 420 } = {}) {
    this.realtime = realtime;
    this.onChange = onChange;
    this.onLog = onLog;
    this.charMs = charMs;
    this.leds = Array.from({ length: 5 }, () => Array(5).fill(0));
    this.temperature = 21;
    this.light = 128;
    this.extLight = 70; // % de luz que ve el sensor externo conectado en P1
    this.pins = { P0: 0, P1: 0, P2: 0 };
    this.pinLog = [];
    this.shown = []; // { kind, value, t }
    this.text = '';
    this.handlers = { A: [], B: [], AB: [], SHAKE: [], LOGO_UP: [], FOREVER: [] };
    this.held = { A: false, B: false };
    this.inputsUsed = new Set();
    this.clock = 0;
    this.stopped = false;
    this.error = null;
    let s = (seed ?? Math.floor(Math.random() * 1e9)) >>> 0;
    this.rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    this.it = new Interpreter({ globals: this.#api(), rng: this.rng, maxSteps: 6000, write: (t) => this.onLog(t) });
  }

  /* ---------------- API de MakeCode ---------------- */
  #api() {
    const { func, ns, num } = pyApi;
    const sim = this;
    const enumNs = (name, keys) => ns(name, Object.fromEntries(keys.map((k) => [k, `${name}.${k}`])));
    const xy = (x, y) => {
      const X = Math.trunc(num(x)); const Y = Math.trunc(num(y));
      if (typeof X !== 'number' || Number.isNaN(X) || typeof Y !== 'number') throw new PyError('TypeError', 'las coordenadas tienen que ser números');
      return [X, Y];
    };
    const inside = (X, Y) => X >= 0 && X < 5 && Y >= 0 && Y < 5;
    const handlerOf = (fn, name) => {
      if (!(fn instanceof PyUserFunc) && !fn?.fn) throw new PyError('TypeError', `${name}() necesita el nombre de una función (def) como segundo dato`);
      return fn;
    };
    const keyOf = (v, prefix) => String(v || '').replace(`${prefix}.`, '');
    return {
      Button: enumNs('Button', ['A', 'B', 'AB']),
      Gesture: enumNs('Gesture', ['SHAKE', 'LOGO_UP', 'LOGO_DOWN', 'TILT_LEFT', 'TILT_RIGHT', 'SCREEN_UP', 'SCREEN_DOWN']),
      IconNames: enumNs('IconNames', Object.keys(ICONS)),
      DigitalPin: enumNs('DigitalPin', ['P0', 'P1', 'P2']),
      AnalogPin: enumNs('AnalogPin', ['P0', 'P1', 'P2']),
      randint: func('randint', async ([a, b]) => { const lo = Math.trunc(num(a)); const hi = Math.trunc(num(b)); return lo + Math.floor(sim.rng() * (hi - lo + 1)); }),
      basic: ns('basic', {
        show_icon: func('show_icon', async ([icon]) => {
          const k = keyOf(icon, 'IconNames');
          if (!ICONS[k]) throw new PyError('ValueError', `ícono desconocido: ${pyStr(icon)}. Usa IconNames.HEART, IconNames.HAPPY…`);
          sim.#setMatrix(rows(ICONS[k]));
          sim.#record('icon', k);
          await sim.#sleep(600);
          return null;
        }),
        show_number: func('show_number', async ([n]) => { await sim.#showText(pyStr(n), 'number', n); return null; }),
        show_string: func('show_string', async ([t]) => { await sim.#showText(pyStr(t), 'string', pyStr(t)); return null; }),
        show_leds: func('show_leds', async ([pat]) => {
          const rowsStr = String(pat).replace(/\s+/g, '').split('/');
          const m = Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => ((rowsStr[y] || '')[x] === '#' ? 1 : 0)));
          sim.#setMatrix(m);
          sim.#record('leds', pyStr(pat));
          await sim.#sleep(400);
          return null;
        }),
        clear_screen: func('clear_screen', async () => { sim.#setMatrix(rows('...../...../...../...../.....')); sim.text = ''; sim.onChange(sim); return null; }),
        pause: func('pause', async ([ms]) => { await sim.#sleep(Math.max(0, num(ms))); return null; }),
        forever: func('forever', async ([fn]) => { sim.handlers.FOREVER.push(handlerOf(fn, 'basic.forever')); return null; }),
      }),
      loops: ns('loops', {
        every_interval: func('every_interval', async ([ms, fn]) => { sim.handlers.FOREVER.push({ fn: handlerOf(fn, 'loops.every_interval'), every: Math.max(20, num(ms)) }); return null; }),
      }),
      led: ns('led', {
        plot: func('plot', async ([x, y]) => { const [X, Y] = xy(x, y); if (inside(X, Y)) { sim.leds[Y][X] = 1; sim.onChange(sim); } return null; }),
        unplot: func('unplot', async ([x, y]) => { const [X, Y] = xy(x, y); if (inside(X, Y)) { sim.leds[Y][X] = 0; sim.onChange(sim); } return null; }),
        toggle: func('toggle', async ([x, y]) => { const [X, Y] = xy(x, y); if (inside(X, Y)) { sim.leds[Y][X] = sim.leds[Y][X] ? 0 : 1; sim.onChange(sim); } return null; }),
        point: func('point', async ([x, y]) => { const [X, Y] = xy(x, y); return inside(X, Y) && sim.leds[Y][X] === 1; }),
      }),
      input: ns('input', {
        on_button_pressed: func('on_button_pressed', async ([b, fn]) => { const k = keyOf(b, 'Button'); if (!sim.handlers[k]) throw new PyError('ValueError', 'usa Button.A, Button.B o Button.AB'); sim.handlers[k].push(handlerOf(fn, 'input.on_button_pressed')); return null; }),
        on_gesture: func('on_gesture', async ([g, fn]) => { const k = keyOf(g, 'Gesture'); sim.handlers[k] = sim.handlers[k] || []; sim.handlers[k].push(handlerOf(fn, 'input.on_gesture')); return null; }),
        button_is_pressed: func('button_is_pressed', async ([b]) => { const k = keyOf(b, 'Button'); return k === 'AB' ? sim.held.A && sim.held.B : Boolean(sim.held[k]); }),
        temperature: func('temperature', async () => { sim.inputsUsed.add('temperature'); return Math.round(sim.temperature); }),
        light_level: func('light_level', async () => { sim.inputsUsed.add('light'); return Math.round(sim.light); }),
        running_time: func('running_time', async () => Math.round(sim.clock)),
      }),
      pins: ns('pins', {
        digital_write_pin: func('digital_write_pin', async ([p, v]) => { sim.#writePin(keyOf(p, 'DigitalPin'), num(v) ? 1 : 0); return null; }),
        analog_write_pin: func('analog_write_pin', async ([p, v]) => { sim.#writePin(keyOf(p, 'AnalogPin'), Math.max(0, Math.min(1023, num(v))) / 1023); return null; }),
        digital_read_pin: func('digital_read_pin', async ([p]) => (sim.pins[keyOf(p, 'DigitalPin')] ? 1 : 0)),
        analog_read_pin: func('analog_read_pin', async ([p]) => {
          const k = keyOf(p, 'AnalogPin');
          if (k !== 'P1') return 0;
          sim.inputsUsed.add('sensor-p1');
          return Math.round(sim.extLight * 10.23); // sensor de luz externo en P1: 0 (oscuro) a 1023 (mucha luz)
        }),
      }),
      music: ns('music', {
        play_tone: func('play_tone', async ([, ms]) => { sim.#record('sound', 'tono'); await sim.#sleep(num(ms ?? 200)); return null; }),
      }),
    };
  }

  #record(kind, value) {
    this.shown.push({ kind, value, t: this.clock });
    this.onChange(this);
  }

  #setMatrix(m) {
    this.leds = m.map((r) => r.slice());
    this.onChange(this);
  }

  #writePin(pin, v) {
    if (!(pin in this.pins)) throw new PyError('ValueError', 'usa DigitalPin.P0, P1 o P2');
    this.pins[pin] = v;
    this.pinLog.push({ pin, v, t: this.clock });
    this.onChange(this);
  }

  async #showText(text, kind, raw) {
    this.text = text;
    this.#record(kind, raw);
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) {
      this.#setMatrix(glyph(chars[i]));
      await this.#sleep(this.charMs);
    }
    if (chars.length > 1) { this.#setMatrix(rows('...../...../...../...../.....')); }
  }

  async #sleep(ms) {
    if (this.stopped) throw new StopSignal();
    this.clock += ms;
    if (this.realtime) {
      await new Promise((r) => setTimeout(r, ms));
      if (this.stopped) throw new StopSignal();
    }
  }

  /* ---------------- ejecución ---------------- */
  async #runSafe(fn) {
    try { await fn(); return true; } catch (e) {
      if (e instanceof StopSignal) return false;
      const err = e instanceof PyError ? e : new PyError('RuntimeError', String(e?.message || e));
      if (!this.error) { this.error = err; this.onLog(null, err); }
      this.stopped = true;
      this.onChange(this);
      return false;
    }
  }

  /** Carga el programa: ejecuta "al iniciar" (todo el código de arriba) y registra los eventos. */
  async load(code) {
    return this.#runSafe(() => this.it.run(code));
  }

  async #call(fn) {
    const th = this.it.fork({ maxSteps: 6000 });
    return this.#runSafe(() => th.callFunction(fn, []));
  }

  /** Simula apretar un botón ('A', 'B', 'AB') o un gesto ('SHAKE'). */
  async trigger(key) {
    if (this.stopped && !this.realtime) return false;
    if (key === 'A' || key === 'B') { this.held[key] = true; this.onChange(this); }
    this.inputsUsed.add(key);
    for (const fn of this.handlers[key] || []) await this.#call(fn);
    if (key === 'A' || key === 'B') {
      if (this.realtime) setTimeout(() => { this.held[key] = false; this.onChange(this); }, 250);
      else this.held[key] = false;
    }
    return true;
  }

  setTemperature(v) { this.temperature = v; this.inputsUsed.add('temperature-set'); this.onChange(this); }
  setLight(v) { this.light = v; this.inputsUsed.add('light-set'); this.onChange(this); }
  setExtLight(v) { this.extLight = v; this.onChange(this); }

  /** Modo rápido: corre los "para siempre" durante `ms` de reloj virtual. */
  async advance(ms) {
    const end = this.clock + ms;
    const start = this.clock;
    let guard = 0;
    for (const h of this.handlers.FOREVER) {
      const fn = h.fn || h;
      this.clock = start;
      while (this.clock < end && !this.stopped && guard++ < 400) {
        const before = this.clock;
        await this.#call(fn);
        if (h.every) this.clock += h.every;
        else if (this.clock === before) this.clock += 20;
      }
    }
    this.clock = Math.max(this.clock, end);
  }

  /** Modo realtime: arranca los "para siempre" en paralelo hasta que se llame stop(). */
  startForever() {
    for (const h of this.handlers.FOREVER) {
      const fn = h.fn || h;
      (async () => {
        while (!this.stopped) {
          const before = this.clock;
          const ok = await this.#call(fn);
          if (!ok) break;
          try {
            if (h.every) await this.#sleep(h.every);
            else if (this.clock === before) await this.#sleep(20);
          } catch { break; }
        }
      })();
    }
  }

  stop() { this.stopped = true; }

  matrixString() { return this.leds.map((r) => r.map((v) => (v ? '#' : '.')).join('')).join('/'); }
  litCount() { return this.leds.flat().filter(Boolean).length; }
  lastShown(kind = null) { const l = this.shown.filter((x) => !kind || x.kind === kind); return l[l.length - 1] || null; }
}

/** Para comparar con un dibujo objetivo escrito como '.#.#./#####/…'. */
export const patternOf = (str) => rows(str).map((r) => r.map((v) => (v ? '#' : '.')).join('')).join('/');
