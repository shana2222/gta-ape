// Solucionador de circuitos simples de corriente continua para las actividades de electrónica.
// Trabaja con "terminales" (puntos donde se conecta algo). Los cables y las filas de la protoboard
// unen terminales en "nodos"; los componentes (resistencia, LED, interruptor) unen nodos entre sí.

class UnionFind {
  constructor() { this.p = new Map(); }
  find(x) {
    if (!this.p.has(x)) this.p.set(x, x);
    let r = x;
    while (this.p.get(r) !== r) r = this.p.get(r);
    let c = x;
    while (this.p.get(c) !== r) { const n = this.p.get(c); this.p.set(c, r); c = n; }
    return r;
  }
  union(a, b) { this.p.set(this.find(a), this.find(b)); }
}

export const STATUS_TEXT = {
  on: '🔴 ¡El LED prende! El circuito está cerrado, tiene una resistencia y el LED está bien conectado.',
  short: '⚠️ ¡Cortocircuito! La corriente vuelve a la pila sin pasar por nada que la frene. La pila se calienta.',
  burnt: '💥 ¡El LED se quemó! La corriente pasa por el LED sin ninguna resistencia que la limite.',
  reversed: '⚫ El LED no prende: está conectado al revés. La pata larga (ánodo) tiene que ir hacia el +.',
  bypass: '⚫ La corriente circula, pero no pasa por el LED. El LED tiene que estar en el camino de la corriente.',
  ledShorted: '⚫ El LED no prende: sus dos patas están conectadas al mismo punto, así que la corriente lo esquiva.',
  open: '⚫ No pasa nada: el circuito está abierto. La corriente necesita un camino completo de + a −.',
};

/**
 * @param {object} c
 * @param {Array<[string,string]>} c.links  pares de terminales unidos por cables o por la protoboard
 * @param {Array<{type:'R'|'LED'|'SW', a:string, b:string, closed?:boolean}>} c.comps  en el LED, a = ánodo y b = cátodo
 * @param {string} c.pos  terminal + de la pila
 * @param {string} c.neg  terminal − de la pila
 * @returns {{ status: string, message: string }}
 */
export function solveCircuit({ links = [], comps = [], pos, neg }) {
  const uf = new UnionFind();
  uf.find(pos); uf.find(neg);
  for (const [a, b] of links) uf.union(a, b);
  const P = uf.find(pos);
  const N = uf.find(neg);
  const done = (status) => ({ status, message: STATUS_TEXT[status] });
  if (P === N) return done('short');

  const edges = [];
  for (const c of comps) {
    if (c.type === 'SW' && !c.closed) continue;
    const a = uf.find(c.a); const b = uf.find(c.b);
    if (a === b) { if (c.type === 'LED') edges.ledShorted = true; continue; }
    edges.push({ type: c.type, a, b });
  }

  // todos los caminos simples de P a N (los circuitos del juego son chicos)
  const paths = [];
  const visit = (node, seen, tags) => {
    if (paths.length > 200) return;
    if (node === N) { paths.push(tags.slice()); return; }
    edges.forEach((e, i) => {
      let next = null; let tag = e.type;
      if (e.a === node) next = e.b;
      else if (e.b === node) { next = e.a; if (e.type === 'LED') tag = 'LED_REV'; }
      if (next === null || seen.has(next) || tags.includes(`#${i}`)) return;
      seen.add(next); tags.push(tag, `#${i}`);
      visit(next, seen, tags);
      tags.pop(); tags.pop(); seen.delete(next);
    });
  };
  visit(P, new Set([P]), []);

  const conducts = paths.filter((t) => !t.includes('LED_REV'));
  if (conducts.some((t) => !t.includes('R') && !t.includes('LED'))) return done('short');
  if (conducts.some((t) => t.includes('LED') && !t.includes('R'))) return done('burnt');
  if (conducts.some((t) => t.includes('LED') && t.includes('R'))) return done('on');
  if (paths.some((t) => t.includes('LED_REV'))) return done('reversed');
  if (edges.ledShorted) return done('ledShorted');
  if (conducts.length) return done('bypass');
  return done('open');
}

/* ---------------- protoboard ---------------- */
export const PROTO_COLS = 12;
export const PROTO_TOP = ['a', 'b', 'c', 'd', 'e'];
export const PROTO_BOTTOM = ['f', 'g', 'h', 'i', 'j'];

/** Uniones internas de la protoboard: columnas de 5 (arriba y abajo por separado) y los dos rieles. */
export function protoLinks() {
  const links = [];
  for (let c = 1; c <= PROTO_COLS; c++) {
    for (const half of [PROTO_TOP, PROTO_BOTTOM]) {
      for (let i = 1; i < half.length; i++) links.push([`${half[0]}${c}`, `${half[i]}${c}`]);
    }
    if (c > 1) { links.push(['+1', `+${c}`]); links.push(['-1', `-${c}`]); }
  }
  return links;
}

/** Devuelve todos los agujeros conectados con uno (para resaltar al pasar el mouse). */
export function protoNet(hole) {
  const m = /^([a-j+-])(\d+)$/.exec(hole);
  if (!m) return [hole];
  const [, r, c] = m;
  if (r === '+' || r === '-') return Array.from({ length: PROTO_COLS }, (_, i) => `${r}${i + 1}`);
  const half = PROTO_TOP.includes(r) ? PROTO_TOP : PROTO_BOTTOM;
  return half.map((x) => `${x}${c}`);
}
