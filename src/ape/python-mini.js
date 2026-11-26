// Mini intérprete de Python para el juego (subconjunto de 9no: print, tipos, variables,
// input, conversiones, funciones de texto y math, if/elif/else, while/for básicos).
// No usa ninguna librería externa: corre en cualquier navegador y sin internet.
// Los errores imitan los mensajes reales de Python 3 y traen una pista corta en español.

export class PyError extends Error {
  constructor(type, message, line = null) {
    super(message);
    this.pyType = type;
    this.line = line;
    this.hint = hintFor(type, message);
  }
  toPython() {
    const where = this.line ? `  File "programa.py", line ${this.line}\n` : '';
    return `Traceback (most recent call last):\n${where}${this.pyType}: ${this.message}`;
  }
}

function hintFor(type, msg) {
  if (type === 'NameError') {
    const m = /name '([^']+)'/.exec(msg);
    const n = m ? m[1] : '';
    if (/^[A-Z]/.test(n) && ['Print', 'Input', 'Int', 'Str', 'Float', 'Len'].includes(n)) return `Python distingue mayúsculas: se escribe ${n.toLowerCase()}, todo en minúscula.`;
    if (['si', 'sino', 'imprimir', 'mostrar', 'leer'].includes(n)) return 'Las instrucciones de Python van en inglés: print, input, if, else…';
    return `Python no conoce "${n}". ¿Es una variable que todavía no creaste, o te faltan comillas porque es un texto?`;
  }
  if (type === 'TypeError') {
    if (/concatenate str/.test(msg) || /'int' and 'str'|'str' and 'int'|'float' and 'str'|'str' and 'float'/.test(msg)) return 'Estás mezclando texto con número. Convierte con str() para unir textos, o con int()/float() para hacer cuentas.';
    if (/not supported between/.test(msg)) return 'No se puede comparar texto con número. ¿Te olvidaste de convertir el input() con int()?';
    if (/argument/.test(msg)) return 'Revisa cuántos datos le pasas a la función dentro de los paréntesis.';
    return 'Revisa qué tipo de dato tiene cada valor (int, float, str, bool).';
  }
  if (type === 'ValueError') return 'int() solo convierte textos que son números enteros, como "15". Para "3.5" usa float().';
  if (type === 'SyntaxError') {
    if (/expected ':'/.test(msg)) return 'Después de if, elif, else, while y for van dos puntos (:).';
    if (/unterminated string/.test(msg)) return 'Un texto empieza y termina con comillas. Te falta cerrar una.';
    if (/never closed|unmatched|was not closed/.test(msg)) return 'Cuenta los paréntesis: cada ( necesita su ).';
    if (/'='/.test(msg) || /assign/.test(msg)) return 'Para comparar se usa == (dos iguales). Un solo = guarda un valor en una variable.';
    return 'Python no entiende cómo está escrita esa línea. Revisa comillas, paréntesis, comas y dos puntos.';
  }
  if (type === 'IndentationError') return 'Lo que va adentro de un if/else lleva sangría (4 espacios o Tab). Lo de afuera, no.';
  if (type === 'ZeroDivisionError') return 'No se puede dividir entre cero.';
  if (type === 'UnboundLocalError') return 'Dentro de una función (def), para cambiar una variable de afuera escribe "global nombre" en la primera línea de la función.';
  if (type === 'RecursionError') return 'La función se llama a sí misma sin parar.';
  if (type === 'AttributeError' && /^module '/.test(msg)) return 'Esa función no existe en ese módulo. Revisa cómo se escribe (por ejemplo basic.show_number) en la tabla de la explicación.';
  if (type === 'AttributeError') return 'Ese tipo de dato no tiene esa función. Las funciones de texto (upper, lower…) solo sirven con str.';
  if (type === 'IndexError') return 'Esa posición no existe. Recuerda que se empieza a contar desde 0.';
  if (type === 'TimeoutError') return 'El programa repite para siempre. Revisa que la condición del while en algún momento sea falsa.';
  if (type === 'ModuleNotFoundError') return 'En este juego puedes importar math y random.';
  return '';
}

/* ======================= valores ======================= */
export class PyFloat { constructor(v) { this.v = v; } }
class PyFunc { constructor(name, fn) { this.name = name; this.fn = fn; } }
class PyModule { constructor(name, attrs) { this.name = name; this.attrs = attrs; } }
class PyType { constructor(name, fn) { this.name = name; this.fn = fn; } }
class PyBound { constructor(self, name, fn) { this.self = self; this.name = name; this.fn = fn; } }
class PyRange { constructor(a, b, s) { this.a = a; this.b = b; this.s = s; } }
export class PyUserFunc { constructor(name, params, body) { this.name = name; this.params = params; this.body = body; this.scope = null; } }
class ReturnSig { constructor(v) { this.v = v; } }

/** Nombres que una función asigna (son locales salvo que se declaren global), como hace Python. */
function scanAssigned(body) {
  const assigned = new Set();
  const globals = new Set();
  const walk = (stmts) => {
    for (const st of stmts) {
      if (st.k === 'assign' && st.target.k === 'name') assigned.add(st.target.id);
      else if (st.k === 'multi') st.targets.forEach((t) => { if (t.k === 'name') assigned.add(t.id); });
      else if (st.k === 'for') { assigned.add(st.name); walk(st.body); }
      else if (st.k === 'if') { walk(st.body); walk(st.orelse); }
      else if (st.k === 'while') walk(st.body);
      else if (st.k === 'global') st.names.forEach((n) => globals.add(n));
      else if (st.k === 'def') assigned.add(st.name);
    }
  };
  walk(body);
  for (const g of globals) assigned.delete(g);
  return { assigned, globals };
}
/** Ayudas para que otros módulos (p. ej. el simulador de micro:bit) agreguen funciones y "módulos" de Python. */
export const pyApi = {
  func: (name, fn) => new PyFunc(name, fn),
  ns: (name, attrs) => new PyModule(name, attrs),
  float: (v) => new PyFloat(v),
  num: (x) => (x instanceof PyFloat ? x.v : typeof x === 'boolean' ? (x ? 1 : 0) : x),
};

const isInt = (x) => typeof x === 'number';
const isFloat = (x) => x instanceof PyFloat;
const isNum = (x) => isInt(x) || isFloat(x) || typeof x === 'boolean';
const num = (x) => (isFloat(x) ? x.v : typeof x === 'boolean' ? (x ? 1 : 0) : x);
const mkFloat = (v) => new PyFloat(v);

export function typeName(x) {
  if (x === null || x === undefined) return 'NoneType';
  if (typeof x === 'boolean') return 'bool';
  if (isInt(x)) return 'int';
  if (isFloat(x)) return 'float';
  if (typeof x === 'string') return 'str';
  if (Array.isArray(x)) return 'list';
  if (x instanceof PyRange) return 'range';
  if (x instanceof PyType) return 'type';
  if (x instanceof PyFunc || x instanceof PyBound) return 'builtin_function_or_method';
  if (x instanceof PyUserFunc) return 'function';
  if (x instanceof PyModule) return 'module';
  return 'object';
}

function floatStr(v) {
  if (Number.isNaN(v)) return 'nan';
  if (!Number.isFinite(v)) return v > 0 ? 'inf' : '-inf';
  if (Number.isInteger(v) && Math.abs(v) < 1e16) return v.toFixed(1);
  if (Math.abs(v) >= 1e16) return v.toExponential().replace(/e([+-])(\d)$/, 'e$10$2');
  let s = String(v);
  if (/e/.test(s)) {
    s = s.replace(/e([+-])(\d)$/, 'e$10$2');
  } else if (Math.abs(v) < 1e-4 && v !== 0) {
    s = v.toExponential().replace(/e([+-])(\d)$/, 'e$10$2');
  }
  return s;
}

export function pyStr(x) {
  if (x === null || x === undefined) return 'None';
  if (typeof x === 'boolean') return x ? 'True' : 'False';
  if (isInt(x)) return String(x);
  if (isFloat(x)) return floatStr(x.v);
  if (typeof x === 'string') return x;
  return pyRepr(x);
}

export function pyRepr(x) {
  if (typeof x === 'string') {
    const q = x.includes("'") && !x.includes('"') ? '"' : "'";
    return q + x.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(new RegExp(q, 'g'), `\\${q}`) + q;
  }
  if (Array.isArray(x)) return `[${x.map(pyRepr).join(', ')}]`;
  if (x instanceof PyRange) return `range(${x.a}, ${x.b}${x.s !== 1 ? `, ${x.s}` : ''})`;
  if (x instanceof PyType) return `<class '${x.name}'>`;
  if (x instanceof PyFunc) return `<built-in function ${x.name}>`;
  if (x instanceof PyUserFunc) return `<function ${x.name}>`;
  if (x instanceof PyBound) return `<built-in method ${x.name}>`;
  if (x instanceof PyModule) return `<module '${x.name}'>`;
  return pyStr(x);
}

function truthy(x) {
  if (x === null || x === undefined) return false;
  if (typeof x === 'boolean') return x;
  if (isInt(x)) return x !== 0;
  if (isFloat(x)) return x.v !== 0;
  if (typeof x === 'string' || Array.isArray(x)) return x.length > 0;
  return true;
}

/* ======================= tokenizer ======================= */
const KEYWORDS = new Set(['if', 'elif', 'else', 'while', 'for', 'in', 'and', 'or', 'not', 'True', 'False', 'None', 'import', 'from', 'as', 'pass', 'break', 'continue', 'def', 'return', 'is']);
const OPS3 = ['**=', '//=', '...'];
const OPS2 = ['==', '!=', '<=', '>=', '**', '//', '+=', '-=', '*=', '/=', '%=', '->'];
const OPS1 = '+-*/%<>=()[]{},:.;';

function tokenize(src) {
  const tokens = [];
  const lines = src.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const indents = [0];
  let depth = 0; // paréntesis abiertos (unión implícita de líneas)
  let openStack = [];
  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln];
    const lineNo = ln + 1;
    let i = 0;
    if (depth === 0) {
      // línea vacía o solo comentario
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;
      let col = 0;
      while (i < line.length && line[i] === ' ') { col++; i++; }
      const top = indents[indents.length - 1];
      if (col > top) { indents.push(col); tokens.push({ t: 'INDENT', line: lineNo }); }
      else if (col < top) {
        while (col < indents[indents.length - 1]) { indents.pop(); tokens.push({ t: 'DEDENT', line: lineNo }); }
        if (col !== indents[indents.length - 1]) throw new PyError('IndentationError', 'unindent does not match any outer indentation level', lineNo);
      }
    }
    while (i < line.length) {
      const c = line[i];
      if (c === ' ') { i++; continue; }
      if (c === '#') break;
      if (c === '\\' && i === line.length - 1) { i++; continue; }
      // strings (con prefijo f / r)
      let prefix = '';
      let j = i;
      if (/[fFrRbBuU]/.test(c) && (line[i + 1] === '"' || line[i + 1] === "'" || (/[fFrR]/.test(line[i + 1] || '') && (line[i + 2] === '"' || line[i + 2] === "'")))) {
        while (/[fFrRbBuU]/.test(line[j])) { prefix += line[j].toLowerCase(); j++; }
      }
      if (line[j] === '"' || line[j] === "'") {
        const q = line[j];
        const triple = line.slice(j, j + 3) === q.repeat(3);
        let k = j + (triple ? 3 : 1);
        let val = '';
        let raw = '';
        let closed = false;
        while (k < line.length) {
          const ch = line[k];
          if (triple ? line.slice(k, k + 3) === q.repeat(3) : ch === q) { k += triple ? 3 : 1; closed = true; break; }
          if (ch === '\\' && !prefix.includes('r')) {
            const nx = line[k + 1];
            const map = { n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"' };
            if (nx in map) { val += map[nx]; raw += ch + nx; k += 2; continue; }
          }
          val += ch; raw += ch; k++;
        }
        if (!closed) throw new PyError('SyntaxError', triple ? 'unterminated triple-quoted string literal (en este juego el texto debe cerrar en la misma línea)' : `unterminated string literal (detected at line ${lineNo})`, lineNo);
        tokens.push({ t: prefix.includes('f') ? 'FSTRING' : 'STRING', v: prefix.includes('f') ? raw : val, line: lineNo });
        i = k;
        continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(line[i + 1] || ''))) {
        let k = i;
        while (k < line.length && /[0-9_]/.test(line[k])) k++;
        let isF = false;
        if (line[k] === '.' && /[0-9]/.test(line[k + 1] || '')) { isF = true; k++; while (k < line.length && /[0-9_]/.test(line[k])) k++; }
        else if (line[k] === '.' && !/[a-zA-Z_]/.test(line[k + 1] || '')) { isF = true; k++; }
        if (/[eE]/.test(line[k] || '') && /[0-9+-]/.test(line[k + 1] || '')) { isF = true; k++; if (/[+-]/.test(line[k])) k++; while (/[0-9]/.test(line[k] || '')) k++; }
        const text = line.slice(i, k).replace(/_/g, '');
        tokens.push({ t: 'NUM', v: isF ? mkFloat(parseFloat(text)) : parseInt(text, 10), line: lineNo });
        if (/[a-zA-Z_]/.test(line[k] || '')) throw new PyError('SyntaxError', 'invalid decimal literal', lineNo);
        i = k;
        continue;
      }
      if (/[A-Za-z_áéíóúñÁÉÍÓÚÑü]/.test(c)) {
        let k = i;
        while (k < line.length && /[A-Za-z0-9_áéíóúñÁÉÍÓÚÑü]/.test(line[k])) k++;
        const w = line.slice(i, k);
        tokens.push({ t: KEYWORDS.has(w) ? 'KW' : 'NAME', v: w, line: lineNo });
        i = k;
        continue;
      }
      const three = line.slice(i, i + 3);
      const two = line.slice(i, i + 2);
      let op = null;
      if (OPS3.includes(three)) op = three; else if (OPS2.includes(two)) op = two; else if (OPS1.includes(c)) op = c;
      if (!op) {
        if (c === '"' || c === "'") throw new PyError('SyntaxError', 'unterminated string literal', lineNo);
        if (c === '“' || c === '”' || c === '‘' || c === '’') throw new PyError('SyntaxError', `invalid character '${c}' (usa comillas rectas " o ')`, lineNo);
        throw new PyError('SyntaxError', `invalid character '${c}'`, lineNo);
      }
      if ('([{'.includes(op)) { depth++; openStack.push({ op, line: lineNo }); }
      if (')]}'.includes(op)) {
        depth--;
        const o = openStack.pop();
        if (depth < 0) throw new PyError('SyntaxError', `unmatched '${op}'`, lineNo);
        const pair = { ')': '(', ']': '[', '}': '{' }[op];
        if (o && o.op !== pair) throw new PyError('SyntaxError', `closing parenthesis '${op}' does not match opening parenthesis '${o.op}'`, lineNo);
      }
      tokens.push({ t: 'OP', v: op, line: lineNo });
      i += op.length;
    }
    if (depth === 0) tokens.push({ t: 'NEWLINE', line: lineNo });
  }
  if (depth > 0) {
    const o = openStack[openStack.length - 1];
    throw new PyError('SyntaxError', `'${o.op}' was never closed`, o.line);
  }
  const last = lines.length;
  while (indents.length > 1) { indents.pop(); tokens.push({ t: 'DEDENT', line: last }); }
  tokens.push({ t: 'EOF', line: last });
  return tokens;
}

/* ======================= parser ======================= */
class Parser {
  constructor(tokens) { this.toks = tokens; this.p = 0; }
  peek(o = 0) { return this.toks[this.p + o]; }
  next() { return this.toks[this.p++]; }
  isOp(v, o = 0) { const t = this.peek(o); return t.t === 'OP' && t.v === v; }
  isKw(v, o = 0) { const t = this.peek(o); return t.t === 'KW' && t.v === v; }
  expectOp(v, msg) {
    const t = this.peek();
    if (t.t === 'OP' && t.v === v) return this.next();
    throw new PyError('SyntaxError', msg || `expected '${v}'`, t.line);
  }

  program() {
    const body = [];
    while (this.peek().t !== 'EOF') {
      if (this.peek().t === 'NEWLINE') { this.next(); continue; }
      if (this.peek().t === 'INDENT') throw new PyError('IndentationError', 'unexpected indent', this.peek().line);
      body.push(...this.statement());
    }
    return body;
  }

  block(kind, headLine) {
    // después de ':'
    if (this.peek().t !== 'NEWLINE') {
      // bloque en la misma línea: if x: print(x)
      const stmts = this.simpleStatements();
      return stmts;
    }
    this.next();
    if (this.peek().t !== 'INDENT') throw new PyError('IndentationError', `expected an indented block after '${kind}' statement on line ${headLine}`, this.peek().line);
    this.next();
    const body = [];
    while (this.peek().t !== 'DEDENT' && this.peek().t !== 'EOF') {
      if (this.peek().t === 'NEWLINE') { this.next(); continue; }
      if (this.peek().t === 'INDENT') throw new PyError('IndentationError', 'unexpected indent', this.peek().line);
      body.push(...this.statement());
    }
    if (this.peek().t === 'DEDENT') this.next();
    return body;
  }

  statement() {
    const t = this.peek();
    if (t.t === 'KW') {
      if (t.v === 'if') return [this.ifStmt()];
      if (t.v === 'while') {
        this.next();
        const cond = this.expr();
        this.expectOp(':', "expected ':'");
        return [{ k: 'while', cond, body: this.block('while', t.line), line: t.line }];
      }
      if (t.v === 'for') {
        this.next();
        const nameTok = this.next();
        if (nameTok.t !== 'NAME') throw new PyError('SyntaxError', 'invalid syntax', nameTok.line);
        if (!this.isKw('in')) throw new PyError('SyntaxError', "expected 'in'", this.peek().line);
        this.next();
        const iter = this.expr();
        this.expectOp(':', "expected ':'");
        return [{ k: 'for', name: nameTok.v, iter, body: this.block('for', t.line), line: t.line }];
      }
      if (t.v === 'elif' || t.v === 'else') throw new PyError('SyntaxError', 'invalid syntax (¿falta el if antes, o la sangría está mal?)', t.line);
      if (t.v === 'def') {
        this.next();
        const nameTok = this.next();
        if (nameTok.t !== 'NAME') throw new PyError('SyntaxError', 'invalid syntax', nameTok.line);
        this.expectOp('(', "expected '('");
        const params = [];
        while (!this.isOp(')')) {
          const pt = this.next();
          if (pt.t !== 'NAME') throw new PyError('SyntaxError', 'invalid syntax', pt.line);
          params.push(pt.v);
          if (this.isOp(',')) this.next(); else break;
        }
        this.expectOp(')', "expected ')'");
        this.expectOp(':', "expected ':'");
        return [{ k: 'def', name: nameTok.v, params, body: this.block('function definition', t.line), line: t.line }];
      }
    }
    return this.simpleStatements();
  }

  ifStmt() {
    const t = this.next(); // if / elif
    const cond = this.expr();
    if (this.isOp('=')) throw new PyError('SyntaxError', "invalid syntax. Maybe you meant '==' or ':=' instead of '='?", this.peek().line);
    this.expectOp(':', "expected ':'");
    const body = this.block(t.v, t.line);
    let orelse = [];
    if (this.isKw('elif')) {
      orelse = [this.ifStmt()];
    } else if (this.isKw('else')) {
      const e = this.next();
      this.expectOp(':', "expected ':'");
      orelse = this.block('else', e.line);
    }
    return { k: 'if', cond, body, orelse, line: t.line };
  }

  simpleStatements() {
    const out = [this.simple()];
    while (this.isOp(';')) { this.next(); if (this.peek().t === 'NEWLINE') break; out.push(this.simple()); }
    const t = this.peek();
    if (t.t === 'NEWLINE') this.next();
    else if (t.t !== 'EOF' && t.t !== 'DEDENT') {
      if (t.t === 'STRING' || t.t === 'NAME' || t.t === 'NUM') throw new PyError('SyntaxError', 'invalid syntax. Perhaps you forgot a comma?', t.line);
      throw new PyError('SyntaxError', 'invalid syntax', t.line);
    }
    return out;
  }

  simple() {
    const t = this.peek();
    if (t.t === 'KW') {
      if (t.v === 'pass') { this.next(); return { k: 'pass', line: t.line }; }
      if (t.v === 'return') {
        this.next();
        const nt = this.peek();
        const e = nt.t === 'NEWLINE' || nt.t === 'EOF' || nt.t === 'DEDENT' || (nt.t === 'OP' && nt.v === ';') ? null : this.expr();
        return { k: 'return', e, line: t.line };
      }
      if (t.v === 'break') { this.next(); return { k: 'break', line: t.line }; }
      if (t.v === 'continue') { this.next(); return { k: 'continue', line: t.line }; }
      if (t.v === 'import') {
        this.next();
        const names = [];
        do {
          const n = this.next();
          let alias = n.v;
          if (this.isKw('as')) { this.next(); alias = this.next().v; }
          names.push({ name: n.v, alias });
        } while (this.isOp(',') && this.next());
        return { k: 'import', names, line: t.line };
      }
      if (t.v === 'from') {
        this.next();
        const mod = this.next().v;
        if (!this.isKw('import')) throw new PyError('SyntaxError', 'invalid syntax', t.line);
        this.next();
        const names = [];
        if (this.isOp('*')) { this.next(); names.push({ name: '*' }); } else {
          do { const n = this.next(); names.push({ name: n.v, alias: n.v }); } while (this.isOp(',') && this.next());
        }
        return { k: 'from', mod, names, line: t.line };
      }
    }
    if (t.t === 'NAME' && t.v === 'global' && this.peek(1).t === 'NAME') {
      this.next();
      const names = [this.next().v];
      while (this.isOp(',')) { this.next(); names.push(this.next().v); }
      return { k: 'global', names, line: t.line };
    }
    const target = this.expr();
    const op = this.peek();
    if (op.t === 'OP' && ['=', '+=', '-=', '*=', '/=', '//=', '%=', '**='].includes(op.v)) {
      this.next();
      if (target.k !== 'name' && target.k !== 'index') {
        if (target.k === 'call') throw new PyError('SyntaxError', "cannot assign to function call here. Maybe you meant '==' instead of '='?", op.line);
        if (target.k === 'const') throw new PyError('SyntaxError', "cannot assign to literal here. Maybe you meant '==' instead of '='?", op.line);
        throw new PyError('SyntaxError', 'cannot assign to expression', op.line);
      }
      const value = this.expr();
      if (this.isOp('=')) { // a = b = 3
        this.next();
        const v2 = this.expr();
        return { k: 'multi', targets: [target, value], value: v2, line: op.line };
      }
      return { k: 'assign', op: op.v, target, value, line: op.line };
    }
    return { k: 'expr', e: target, line: t.line };
  }

  expr() {
    const e = this.orExpr();
    if (this.isKw('if')) { // ternario
      this.next();
      const cond = this.orExpr();
      if (!this.isKw('else')) throw new PyError('SyntaxError', "expected 'else' after 'if' expression", this.peek().line);
      this.next();
      const other = this.expr();
      return { k: 'ternary', cond, a: e, b: other };
    }
    return e;
  }
  orExpr() { let l = this.andExpr(); while (this.isKw('or')) { this.next(); l = { k: 'or', l, r: this.andExpr() }; } return l; }
  andExpr() { let l = this.notExpr(); while (this.isKw('and')) { this.next(); l = { k: 'and', l, r: this.notExpr() }; } return l; }
  notExpr() { if (this.isKw('not')) { this.next(); return { k: 'not', e: this.notExpr() }; } return this.comparison(); }
  comparison() {
    const first = this.arith();
    const ops = [];
    const rest = [];
    for (;;) {
      const t = this.peek();
      if (t.t === 'OP' && ['==', '!=', '<', '>', '<=', '>='].includes(t.v)) { this.next(); ops.push(t.v); rest.push(this.arith()); continue; }
      if (t.t === 'KW' && t.v === 'in') { this.next(); ops.push('in'); rest.push(this.arith()); continue; }
      if (t.t === 'KW' && t.v === 'not' && this.isKw('in', 1)) { this.next(); this.next(); ops.push('not in'); rest.push(this.arith()); continue; }
      if (t.t === 'KW' && t.v === 'is') { this.next(); let o = 'is'; if (this.isKw('not')) { this.next(); o = 'is not'; } ops.push(o); rest.push(this.arith()); continue; }
      break;
    }
    if (!ops.length) return first;
    return { k: 'cmp', first, ops, rest };
  }
  arith() {
    let l = this.term();
    while (this.isOp('+') || this.isOp('-')) { const op = this.next(); l = { k: 'bin', op: op.v, l, r: this.term(), line: op.line }; }
    return l;
  }
  term() {
    let l = this.unary();
    while (this.isOp('*') || this.isOp('/') || this.isOp('//') || this.isOp('%')) { const op = this.next(); l = { k: 'bin', op: op.v, l, r: this.unary(), line: op.line }; }
    return l;
  }
  unary() {
    if (this.isOp('-') || this.isOp('+')) { const op = this.next(); return { k: 'unary', op: op.v, e: this.unary() }; }
    return this.power();
  }
  power() {
    const base = this.postfix();
    if (this.isOp('**')) { const op = this.next(); return { k: 'bin', op: '**', l: base, r: this.unary(), line: op.line }; }
    return base;
  }
  postfix() {
    let e = this.atom();
    for (;;) {
      if (this.isOp('(')) {
        const open = this.next();
        const args = [];
        const kwargs = {};
        while (!this.isOp(')')) {
          if (this.peek().t === 'NAME' && this.isOp('=', 1)) {
            const n = this.next().v; this.next();
            kwargs[n] = this.expr();
          } else {
            args.push(this.expr());
          }
          if (this.isOp(',')) { this.next(); continue; }
          if (!this.isOp(')')) {
            const t = this.peek();
            throw new PyError('SyntaxError', 'invalid syntax. Perhaps you forgot a comma?', t.line || open.line);
          }
        }
        this.next();
        e = { k: 'call', fn: e, args, kwargs, line: open.line };
        continue;
      }
      if (this.isOp('.')) {
        this.next();
        const n = this.next();
        if (n.t !== 'NAME' && n.t !== 'KW') throw new PyError('SyntaxError', 'invalid syntax', n.line);
        e = { k: 'attr', obj: e, name: n.v, line: n.line };
        continue;
      }
      if (this.isOp('[')) {
        const open = this.next();
        let a = null; let b = null; let isSlice = false;
        if (!this.isOp(':')) a = this.expr();
        if (this.isOp(':')) { isSlice = true; this.next(); if (!this.isOp(']')) b = this.expr(); }
        this.expectOp(']');
        e = isSlice ? { k: 'slice', obj: e, a, b, line: open.line } : { k: 'index', obj: e, idx: a, line: open.line };
        continue;
      }
      break;
    }
    return e;
  }
  atom() {
    const t = this.next();
    if (t.t === 'NUM') return { k: 'const', v: t.v };
    if (t.t === 'STRING' || t.t === 'FSTRING') {
      // concatenación implícita "a" "b"
      const parts = [t];
      while (this.peek().t === 'STRING' || this.peek().t === 'FSTRING') parts.push(this.next());
      if (parts.length === 1 && t.t === 'STRING') return { k: 'const', v: t.v };
      return { k: 'strcat', parts: parts.map((p) => (p.t === 'FSTRING' ? parseFString(p.v, p.line) : { k: 'const', v: p.v })) };
    }
    if (t.t === 'NAME') return { k: 'name', id: t.v, line: t.line };
    if (t.t === 'KW') {
      if (t.v === 'True') return { k: 'const', v: true };
      if (t.v === 'False') return { k: 'const', v: false };
      if (t.v === 'None') return { k: 'const', v: null };
      throw new PyError('SyntaxError', 'invalid syntax', t.line);
    }
    if (t.t === 'OP' && t.v === '(') {
      if (this.isOp(')')) { this.next(); return { k: 'list', items: [] }; }
      const e = this.expr();
      if (this.isOp(',')) { // tupla: la tratamos como lista
        const items = [e];
        while (this.isOp(',')) { this.next(); if (this.isOp(')')) break; items.push(this.expr()); }
        this.expectOp(')');
        return { k: 'list', items };
      }
      this.expectOp(')', "'(' was never closed");
      return e;
    }
    if (t.t === 'OP' && t.v === '[') {
      const items = [];
      while (!this.isOp(']')) { items.push(this.expr()); if (this.isOp(',')) this.next(); else break; }
      this.expectOp(']');
      return { k: 'list', items };
    }
    if (t.t === 'NEWLINE' || t.t === 'EOF') throw new PyError('SyntaxError', 'invalid syntax (la línea quedó incompleta)', t.line);
    if (t.t === 'INDENT') throw new PyError('IndentationError', 'unexpected indent', t.line);
    throw new PyError('SyntaxError', 'invalid syntax', t.line);
  }
}

function parseFString(raw, line) {
  const parts = [];
  let i = 0;
  let lit = '';
  const unescape = (s) => s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\(["'\\])/g, '$1');
  while (i < raw.length) {
    const c = raw[i];
    if (c === '{' && raw[i + 1] === '{') { lit += '{'; i += 2; continue; }
    if (c === '}' && raw[i + 1] === '}') { lit += '}'; i += 2; continue; }
    if (c === '{') {
      if (lit) { parts.push({ k: 'const', v: unescape(lit) }); lit = ''; }
      let depth = 1; let j = i + 1; let inner = '';
      while (j < raw.length && depth > 0) {
        if (raw[j] === '{') depth++;
        else if (raw[j] === '}') { depth--; if (depth === 0) break; }
        inner += raw[j]; j++;
      }
      if (depth !== 0) throw new PyError('SyntaxError', "f-string: expecting '}'", line);
      let spec = '';
      // separar formato :.2f (ignorando ':' dentro de corchetes/paréntesis)
      let d = 0;
      for (let k = 0; k < inner.length; k++) {
        const ch = inner[k];
        if ('([{'.includes(ch)) d++;
        else if (')]}'.includes(ch)) d--;
        else if (ch === ':' && d === 0) { spec = inner.slice(k + 1); inner = inner.slice(0, k); break; }
      }
      if (!inner.trim()) throw new PyError('SyntaxError', 'f-string: valid expression required before \'}\'', line);
      const toks = tokenize(inner.trim());
      const p = new Parser(toks.filter((tk) => tk.t !== 'NEWLINE'));
      const e = p.expr();
      parts.push({ k: 'fmt', e, spec });
      i = j + 1;
      continue;
    }
    lit += c; i++;
  }
  if (lit) parts.push({ k: 'const', v: unescape(lit) });
  return { k: 'strcat', parts };
}

function formatSpec(v, spec) {
  if (!spec) return pyStr(v);
  const m = /^(?:(.)?([<>^]))?(\d+)?(?:,)?(?:\.(\d+))?([dfs%])?$/.exec(spec);
  if (!m) throw new PyError('ValueError', `Invalid format specifier '${spec}'`);
  const [, fill = ' ', align, width, prec, type] = m;
  let s;
  if (type === 'f' || (prec !== undefined && type !== 's')) {
    if (!isNum(v)) throw new PyError('ValueError', `Unknown format code 'f' for object of type '${typeName(v)}'`);
    s = num(v).toFixed(prec !== undefined ? Number(prec) : 6);
  } else if (type === '%') {
    s = `${(num(v) * 100).toFixed(prec !== undefined ? Number(prec) : 6)}%`;
  } else if (type === 'd') {
    if (!isInt(v)) throw new PyError('ValueError', `Unknown format code 'd' for object of type '${typeName(v)}'`);
    s = String(v);
  } else s = pyStr(v);
  if (width) {
    const w = Number(width);
    const a = align || (isNum(v) ? '>' : '<');
    if (s.length < w) {
      const pad = w - s.length;
      if (a === '<') s += fill.repeat(pad);
      else if (a === '>') s = fill.repeat(pad) + s;
      else s = fill.repeat(Math.floor(pad / 2)) + s + fill.repeat(Math.ceil(pad / 2));
    }
  }
  return s;
}

/* ======================= intérprete ======================= */
class BreakSig {}
class ContinueSig {}

function err(type, msg) { return new PyError(type, msg); }

function binop(op, a, b) {
  const ta = typeName(a); const tb = typeName(b);
  const unsupported = () => err('TypeError', `unsupported operand type(s) for ${op}: '${ta}' and '${tb}'`);
  if (op === '+') {
    if (typeof a === 'string' && typeof b === 'string') return a + b;
    if (typeof a === 'string') throw err('TypeError', `can only concatenate str (not "${tb}") to str`);
    if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
    if (isNum(a) && isNum(b)) return arith(a, b, (x, y) => x + y);
    throw unsupported();
  }
  if (op === '*') {
    if (typeof a === 'string' && (isInt(b) || typeof b === 'boolean')) return a.repeat(Math.max(0, num(b)));
    if (typeof b === 'string' && (isInt(a) || typeof a === 'boolean')) return b.repeat(Math.max(0, num(a)));
    if (typeof a === 'string' || typeof b === 'string') {
      if (isFloat(a) || isFloat(b)) throw err('TypeError', "can't multiply sequence by non-int of type 'float'");
      throw err('TypeError', `can't multiply sequence by non-int of type '${typeof a === 'string' ? tb : ta}'`);
    }
    if (isNum(a) && isNum(b)) return arith(a, b, (x, y) => x * y);
    throw unsupported();
  }
  if (!isNum(a) || !isNum(b)) throw unsupported();
  const x = num(a); const y = num(b);
  const bothInt = !isFloat(a) && !isFloat(b);
  switch (op) {
    case '-': return arith(a, b, (p, q) => p - q);
    case '/':
      if (y === 0) throw err('ZeroDivisionError', 'division by zero');
      return mkFloat(x / y);
    case '//':
      if (y === 0) throw err('ZeroDivisionError', bothInt ? 'integer division or modulo by zero' : 'float floor division by zero');
      return bothInt ? Math.floor(x / y) : mkFloat(Math.floor(x / y));
    case '%': {
      if (y === 0) throw err('ZeroDivisionError', bothInt ? 'integer modulo by zero' : 'float modulo');
      const r = ((x % y) + y) % y;
      return bothInt ? r : mkFloat(r);
    }
    case '**': {
      const r = x ** y;
      return bothInt && y >= 0 ? r : mkFloat(r);
    }
    default: throw unsupported();
  }
}
function arith(a, b, f) {
  const r = f(num(a), num(b));
  return isFloat(a) || isFloat(b) ? mkFloat(r) : r;
}

function pyEq(a, b) {
  if (isNum(a) && isNum(b)) return num(a) === num(b);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => pyEq(x, b[i]));
  return a === b;
}
function compare(op, a, b) {
  if (op === '==') return pyEq(a, b);
  if (op === '!=') return !pyEq(a, b);
  if (op === 'in' || op === 'not in') {
    let r;
    if (typeof b === 'string') {
      if (typeof a !== 'string') throw err('TypeError', `'in <string>' requires string as left operand, not ${typeName(a)}`);
      r = b.includes(a);
    } else if (Array.isArray(b)) r = b.some((x) => pyEq(x, a));
    else if (b instanceof PyRange) r = isInt(a) && rangeList(b).includes(a);
    else throw err('TypeError', `argument of type '${typeName(b)}' is not iterable`);
    return op === 'in' ? r : !r;
  }
  if (op === 'is') return a === b || (a === null && b === null);
  if (op === 'is not') return !(a === b || (a === null && b === null));
  let x; let y;
  if (isNum(a) && isNum(b)) { x = num(a); y = num(b); } else if (typeof a === 'string' && typeof b === 'string') { x = a; y = b; } else {
    throw err('TypeError', `'${op}' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`);
  }
  switch (op) {
    case '<': return x < y;
    case '>': return x > y;
    case '<=': return x <= y;
    case '>=': return x >= y;
    default: return false;
  }
}

function rangeList(r) {
  const out = [];
  if (r.s > 0) for (let i = r.a; i < r.b; i += r.s) out.push(i);
  else for (let i = r.a; i > r.b; i += r.s) out.push(i);
  return out;
}

function toIntStrict(v, fname) {
  if (isInt(v)) return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  throw err('TypeError', `'${typeName(v)}' object cannot be interpreted as an integer`);
}

function pyRound(x, nd) {
  // como Python: los empates exactos (2.5, 0.125) van al par; el resto usa el valor decimal real
  const f = 10 ** nd;
  const v = x * f;
  if (Number.isInteger(v * 2) && !Number.isInteger(v)) {
    const fl = Math.floor(v);
    return (fl % 2 === 0 ? fl : fl + 1) / f;
  }
  if (nd >= 0 && nd <= 20) return parseFloat(x.toFixed(nd));
  return Math.round(v) / f;
}

function makeBuiltins(io) {
  const B = {};
  const fn = (name, f) => { B[name] = new PyFunc(name, f); };
  fn('print', async (args, kw) => {
    const sep = kw.sep !== undefined ? pyStr(kw.sep) : ' ';
    const end = kw.end !== undefined ? pyStr(kw.end) : '\n';
    io.write(args.map(pyStr).join(sep) + end);
    return null;
  });
  fn('input', async (args) => {
    const prompt = args.length ? pyStr(args[0]) : '';
    if (prompt) io.write(prompt, 'prompt');
    const v = await io.input(prompt);
    if (v === null || v === undefined) throw err('EOFError', 'EOF when reading a line (el programa pidió más datos de los que hay)');
    io.write(`${v}\n`, 'echo');
    return String(v);
  });
  B.int = new PyType('int', async (args) => {
    if (!args.length) return 0;
    const v = args[0];
    if (typeof v === 'string') {
      const s = v.trim().replace(/_/g, '');
      if (!/^[+-]?\d+$/.test(s)) throw err('ValueError', `invalid literal for int() with base 10: ${pyRepr(v)}`);
      return parseInt(s, 10);
    }
    if (isFloat(v)) return Math.trunc(v.v);
    if (isNum(v)) return num(v);
    throw err('TypeError', `int() argument must be a string, a bytes-like object or a real number, not '${typeName(v)}'`);
  });
  B.float = new PyType('float', async (args) => {
    if (!args.length) return mkFloat(0);
    const v = args[0];
    if (typeof v === 'string') {
      const s = v.trim();
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) throw err('ValueError', `could not convert string to float: ${pyRepr(v)}`);
      return mkFloat(parseFloat(s));
    }
    if (isNum(v)) return mkFloat(num(v));
    throw err('TypeError', `float() argument must be a string or a real number, not '${typeName(v)}'`);
  });
  B.str = new PyType('str', async (args) => (args.length ? pyStr(args[0]) : ''));
  B.bool = new PyType('bool', async (args) => (args.length ? truthy(args[0]) : false));
  B.list = new PyType('list', async (args) => (args.length ? iterate(args[0]) : []));
  fn('type', async (args) => {
    const n = typeName(args[0]);
    return B[n] instanceof PyType ? B[n] : new PyType(n);
  });
  fn('len', async (args) => {
    const v = args[0];
    if (typeof v === 'string' || Array.isArray(v)) return v.length;
    if (v instanceof PyRange) return rangeList(v).length;
    throw err('TypeError', `object of type '${typeName(v)}' has no len()`);
  });
  fn('round', async (args) => {
    const v = args[0];
    if (!isNum(v)) throw err('TypeError', `type ${typeName(v)} doesn't define __round__ method`);
    if (args.length < 2 || args[1] === null) return Math.round(pyRound(num(v), 0));
    const r = pyRound(num(v), toIntStrict(args[1]));
    return isFloat(v) ? mkFloat(r) : Math.round(r);
  });
  fn('abs', async (args) => { const v = args[0]; if (!isNum(v)) throw err('TypeError', `bad operand type for abs(): '${typeName(v)}'`); return isFloat(v) ? mkFloat(Math.abs(v.v)) : Math.abs(num(v)); });
  const minmax = (name, better) => fn(name, async (args) => {
    const list = args.length === 1 ? iterate(args[0]) : args;
    if (!list.length) throw err('ValueError', `${name}() arg is an empty sequence`);
    let best = list[0];
    for (const x of list.slice(1)) if (better(compare('<', x, best), compare('>', x, best))) best = x;
    return best;
  });
  minmax('max', (lt, gt) => gt);
  minmax('min', (lt) => lt);
  fn('sum', async (args) => iterate(args[0]).reduce((acc, x) => binop('+', acc, x), 0));
  fn('range', async (args) => {
    const n = args.map((a) => toIntStrict(a));
    if (n.length === 1) return new PyRange(0, n[0], 1);
    if (n.length === 2) return new PyRange(n[0], n[1], 1);
    if (n[2] === 0) throw err('ValueError', 'range() arg 3 must not be zero');
    return new PyRange(n[0], n[1], n[2]);
  });
  fn('chr', async (args) => String.fromCharCode(toIntStrict(args[0])));
  fn('ord', async (args) => String(args[0]).charCodeAt(0));
  return B;
}

function iterate(v) {
  if (typeof v === 'string') return [...v];
  if (Array.isArray(v)) return v.slice();
  if (v instanceof PyRange) return rangeList(v);
  throw err('TypeError', `'${typeName(v)}' object is not iterable`);
}

function makeModules(rng) {
  const f = (name, g) => new PyFunc(name, g);
  const needNum = (v, name) => { if (!isNum(v)) throw err('TypeError', `must be real number, not ${typeName(v)}`); return num(v); };
  return {
    math: () => new PyModule('math', {
      pi: mkFloat(Math.PI),
      e: mkFloat(Math.E),
      sqrt: f('sqrt', async ([x]) => { const v = needNum(x); if (v < 0) throw err('ValueError', 'math domain error'); return mkFloat(Math.sqrt(v)); }),
      floor: f('floor', async ([x]) => Math.floor(needNum(x))),
      ceil: f('ceil', async ([x]) => Math.ceil(needNum(x))),
      trunc: f('trunc', async ([x]) => Math.trunc(needNum(x))),
      pow: f('pow', async ([x, y]) => mkFloat(needNum(x) ** needNum(y))),
      fabs: f('fabs', async ([x]) => mkFloat(Math.abs(needNum(x)))),
    }),
    random: () => new PyModule('random', {
      randint: f('randint', async ([a, b]) => toIntStrict(a) + Math.floor(rng() * (toIntStrict(b) - toIntStrict(a) + 1))),
      random: f('random', async () => mkFloat(rng())),
      choice: f('choice', async ([seq]) => { const l = iterate(seq); if (!l.length) throw err('IndexError', 'Cannot choose from an empty sequence'); return l[Math.floor(rng() * l.length)]; }),
    }),
  };
}

const STR_METHODS = {
  upper: (s) => s.toUpperCase(),
  lower: (s) => s.toLowerCase(),
  title: (s) => s.toLowerCase().replace(/(^|[^a-záéíóúñü])([a-záéíóúñü])/gi, (m, p, c) => p + c.toUpperCase()),
  capitalize: (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s),
  swapcase: (s) => [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
  strip: (s, [c]) => (c ? s.replace(new RegExp(`^[${escRe(c)}]+|[${escRe(c)}]+$`, 'g'), '') : s.trim()),
  lstrip: (s, [c]) => (c ? s.replace(new RegExp(`^[${escRe(c)}]+`), '') : s.replace(/^\s+/, '')),
  rstrip: (s, [c]) => (c ? s.replace(new RegExp(`[${escRe(c)}]+$`), '') : s.replace(/\s+$/, '')),
  replace: (s, [a, b]) => { needStr(a); needStr(b); return a === '' ? s : s.split(a).join(b); },
  count: (s, [a]) => { needStr(a); return a === '' ? s.length + 1 : s.split(a).length - 1; },
  find: (s, [a]) => { needStr(a); return s.indexOf(a); },
  index: (s, [a]) => { needStr(a); const i = s.indexOf(a); if (i < 0) throw err('ValueError', 'substring not found'); return i; },
  startswith: (s, [a]) => { needStr(a); return s.startsWith(a); },
  endswith: (s, [a]) => { needStr(a); return s.endsWith(a); },
  isdigit: (s) => s.length > 0 && /^\d+$/.test(s),
  isnumeric: (s) => s.length > 0 && /^\d+$/.test(s),
  isalpha: (s) => s.length > 0 && /^[A-Za-záéíóúñÁÉÍÓÚÑü]+$/.test(s),
  isupper: (s) => /[A-ZÁÉÍÓÚÑ]/.test(s) && s === s.toUpperCase(),
  islower: (s) => /[a-záéíóúñ]/.test(s) && s === s.toLowerCase(),
  split: (s, [sep]) => (sep === undefined || sep === null ? s.trim().split(/\s+/).filter(Boolean) : s.split(sep)),
  join: (s, [lst]) => iterate(lst).map((x) => { if (typeof x !== 'string') throw err('TypeError', `sequence item: expected str instance, ${typeName(x)} found`); return x; }).join(s),
  center: (s, [w, f = ' ']) => { const pad = Math.max(0, w - s.length); return f.repeat(Math.ceil(pad / 2)) + s + f.repeat(Math.floor(pad / 2)); },
  zfill: (s, [w]) => s.padStart(w, '0'),
  format: (s, args) => { let i = 0; return s.replace(/\{(\d*)(?::([^}]*))?\}/g, (m, n, spec) => formatSpec(args[n === '' ? i++ : Number(n)], spec || '')); },
};
function escRe(s) { return String(s).replace(/[\\\]^-]/g, '\\$&'); }
function needStr(a) { if (typeof a !== 'string') throw err('TypeError', `must be str, not ${typeName(a)}`); }
const LIST_METHODS = {
  append: (l, [x]) => { l.push(x); return null; },
  pop: (l, [i]) => { if (!l.length) throw err('IndexError', 'pop from empty list'); return i === undefined ? l.pop() : l.splice(i, 1)[0]; },
  count: (l, [x]) => l.filter((y) => pyEq(x, y)).length,
  index: (l, [x]) => { const i = l.findIndex((y) => pyEq(x, y)); if (i < 0) throw err('ValueError', `${pyRepr(x)} is not in list`); return i; },
};

export class Interpreter {
  constructor({ input, write, maxSteps = 20000, maxOutput = 12000, rng = Math.random, globals = null } = {}) {
    let written = 0;
    const rawWrite = write || (() => {});
    this.io = {
      input: input || (async () => null),
      write: (text, kind) => {
        written += text.length;
        if (written > maxOutput) throw new PyError('TimeoutError', 'el programa mostró demasiado texto (¿bucle infinito?)');
        rawWrite(text, kind);
      },
    };
    this.maxSteps = maxSteps;
    this.steps = 0;
    this.builtins = makeBuiltins(this.io);
    this.modules = makeModules(rng);
    this.vars = Object.create(null);
    if (globals) Object.assign(this.builtins, globals);
    this.frame = null; // { locals, globals: Set } dentro de una función
    this.depth = 0;
  }

  /** Copia que comparte variables globales y funciones, con su propio contador de pasos (un "hilo" de eventos). */
  fork({ maxSteps } = {}) {
    const f = Object.create(Interpreter.prototype);
    Object.assign(f, this);
    f.frame = null;
    f.depth = 0;
    f.steps = 0;
    if (maxSteps) f.maxSteps = maxSteps;
    return f;
  }

  setVar(name, v) {
    if (this.frame && !this.frame.globals.has(name)) this.frame.locals[name] = v;
    else this.vars[name] = v;
  }

  /** Llama una función de Python (del estudiante o incorporada) desde JavaScript. */
  async callFunction(f, args = []) {
    if (f instanceof PyUserFunc) return this.callUser(f, args);
    if (f instanceof PyFunc) return f.fn(args, {});
    throw new PyError('TypeError', `'${typeName(f)}' object is not callable`);
  }

  async callUser(f, args, line) {
    if (args.length !== f.params.length) {
      throw new PyError('TypeError', `${f.name}() takes ${f.params.length} positional argument${f.params.length === 1 ? '' : 's'} but ${args.length} ${args.length === 1 ? 'was' : 'were'} given`, line);
    }
    if (this.depth > 60) throw new PyError('RecursionError', 'maximum recursion depth exceeded', line);
    const saved = this.frame;
    const locals = Object.create(null);
    f.params.forEach((pn, i) => { locals[pn] = args[i]; });
    if (!f.scope) f.scope = scanAssigned(f.body);
    this.frame = { locals, globals: new Set(f.scope.globals), assigned: f.scope.assigned };
    this.depth += 1;
    try {
      await this.execBlock(f.body);
      return null;
    } catch (e) {
      if (e instanceof ReturnSig) return e.v;
      if (e instanceof BreakSig || e instanceof ContinueSig) throw new PyError('SyntaxError', "'break' outside loop", line);
      throw e;
    } finally {
      this.frame = saved;
      this.depth -= 1;
    }
  }

  lookup(name, line) {
    if (this.frame && !this.frame.globals.has(name) && name in this.frame.locals) return this.frame.locals[name];
    if (this.frame && !this.frame.globals.has(name) && this.frame.assigned?.has(name)) {
      throw new PyError('UnboundLocalError', `cannot access local variable '${name}' where it is not associated with a value`, line);
    }
    if (name in this.vars) return this.vars[name];
    if (name in this.builtins) return this.builtins[name];
    const e = new PyError('NameError', `name '${name}' is not defined`, line);
    throw e;
  }

  async run(code) {
    const tokens = tokenize(code);
    const ast = new Parser(tokens).program();
    await this.execBlock(ast);
  }

  async execBlock(stmts) { for (const s of stmts) await this.exec(s); }

  tick(line) {
    this.steps += 1;
    if (this.steps > this.maxSteps) throw new PyError('TimeoutError', `el programa repitió más de ${this.maxSteps} pasos (¿bucle infinito?)`, line);
  }

  async exec(s) {
    try {
      switch (s.k) {
        case 'expr': await this.eval(s.e); return;
        case 'pass': return;
        case 'def': this.setVar(s.name, new PyUserFunc(s.name, s.params, s.body)); return;
        case 'return': throw new ReturnSig(s.e ? await this.eval(s.e) : null);
        case 'global': {
          if (!this.frame) return;
          for (const n of s.names) this.frame.globals.add(n);
          return;
        }
        case 'break': throw new BreakSig();
        case 'continue': throw new ContinueSig();
        case 'assign': {
          let v = await this.eval(s.value);
          if (s.op !== '=') {
            const cur = await this.eval(s.target);
            v = binop(s.op.slice(0, -1), cur, v);
          }
          await this.assign(s.target, v);
          return;
        }
        case 'multi': {
          const v = await this.eval(s.value);
          for (const t of s.targets) await this.assign(t, v);
          return;
        }
        case 'if': {
          if (truthy(await this.eval(s.cond))) await this.execBlock(s.body);
          else await this.execBlock(s.orelse);
          return;
        }
        case 'while': {
          while (truthy(await this.eval(s.cond))) {
            this.tick(s.line);
            try { await this.execBlock(s.body); } catch (e) {
              if (e instanceof BreakSig) break;
              if (e instanceof ContinueSig) continue;
              throw e;
            }
          }
          return;
        }
        case 'for': {
          const items = iterate(await this.eval(s.iter));
          for (const it of items) {
            this.tick(s.line);
            this.setVar(s.name, it);
            try { await this.execBlock(s.body); } catch (e) {
              if (e instanceof BreakSig) break;
              if (e instanceof ContinueSig) continue;
              throw e;
            }
          }
          return;
        }
        case 'import': {
          for (const n of s.names) {
            const m = this.modules[n.name];
            if (!m) throw new PyError('ModuleNotFoundError', `No module named '${n.name}'`, s.line);
            this.vars[n.alias] = m();
          }
          return;
        }
        case 'from': {
          const mk = this.modules[s.mod];
          if (!mk) throw new PyError('ModuleNotFoundError', `No module named '${s.mod}'`, s.line);
          const m = mk();
          for (const n of s.names) {
            if (n.name === '*') { Object.assign(this.vars, m.attrs); continue; }
            if (!(n.name in m.attrs)) throw new PyError('ImportError', `cannot import name '${n.name}' from '${s.mod}'`, s.line);
            this.vars[n.alias] = m.attrs[n.name];
          }
          return;
        }
        default: throw new PyError('SyntaxError', 'invalid syntax', s.line);
      }
    } catch (e) {
      if (e instanceof PyError && !e.line) e.line = s.line;
      throw e;
    }
  }

  async assign(target, v) {
    if (target.k === 'name') { this.setVar(target.id, v); return; }
    if (target.k === 'index') {
      const obj = await this.eval(target.obj);
      const i = await this.eval(target.idx);
      if (typeof obj === 'string') throw err('TypeError', "'str' object does not support item assignment");
      if (!Array.isArray(obj)) throw err('TypeError', `'${typeName(obj)}' object does not support item assignment`);
      const k = i < 0 ? obj.length + i : i;
      if (k < 0 || k >= obj.length) throw err('IndexError', 'list assignment index out of range');
      obj[k] = v;
    }
  }

  async eval(e) {
    switch (e.k) {
      case 'const': return e.v;
      case 'name': return this.lookup(e.id, e.line);
      case 'strcat': {
        let out = '';
        for (const p of e.parts) {
          if (p.k === 'const') out += p.v;
          else if (p.k === 'fmt') out += formatSpec(await this.eval(p.e), p.spec);
          else out += pyStr(await this.eval(p));
        }
        return out;
      }
      case 'list': { const out = []; for (const it of e.items) out.push(await this.eval(it)); return out; }
      case 'ternary': return truthy(await this.eval(e.cond)) ? this.eval(e.a) : this.eval(e.b);
      case 'or': { const l = await this.eval(e.l); return truthy(l) ? l : this.eval(e.r); }
      case 'and': { const l = await this.eval(e.l); return truthy(l) ? this.eval(e.r) : l; }
      case 'not': return !truthy(await this.eval(e.e));
      case 'unary': {
        const v = await this.eval(e.e);
        if (!isNum(v)) throw err('TypeError', `bad operand type for unary ${e.op}: '${typeName(v)}'`);
        if (e.op === '+') return typeof v === 'boolean' ? num(v) : v;
        return isFloat(v) ? mkFloat(-v.v) : -num(v);
      }
      case 'bin': {
        const a = await this.eval(e.l);
        const b = await this.eval(e.r);
        try { return binop(e.op, a, b); } catch (x) { if (x instanceof PyError && !x.line) x.line = e.line; throw x; }
      }
      case 'cmp': {
        let left = await this.eval(e.first);
        for (let i = 0; i < e.ops.length; i++) {
          const right = await this.eval(e.rest[i]);
          if (!compare(e.ops[i], left, right)) return false;
          left = right;
        }
        return true;
      }
      case 'attr': {
        const obj = await this.eval(e.obj);
        if (obj instanceof PyModule) {
          if (!(e.name in obj.attrs)) throw new PyError('AttributeError', `module '${obj.name}' has no attribute '${e.name}'`, e.line);
          return obj.attrs[e.name];
        }
        if (typeof obj === 'string' && STR_METHODS[e.name]) return new PyBound(obj, e.name, STR_METHODS[e.name]);
        if (Array.isArray(obj) && LIST_METHODS[e.name]) return new PyBound(obj, e.name, LIST_METHODS[e.name]);
        throw new PyError('AttributeError', `'${typeName(obj)}' object has no attribute '${e.name}'`, e.line);
      }
      case 'index': {
        const obj = await this.eval(e.obj);
        const i = await this.eval(e.idx);
        if (typeof obj !== 'string' && !Array.isArray(obj)) throw new PyError('TypeError', `'${typeName(obj)}' object is not subscriptable`, e.line);
        if (!isInt(i)) throw new PyError('TypeError', `${typeName(obj)} indices must be integers, not ${typeName(i)}`, e.line);
        const k = i < 0 ? obj.length + i : i;
        if (k < 0 || k >= obj.length) throw new PyError('IndexError', `${typeName(obj)} index out of range`, e.line);
        return obj[k];
      }
      case 'slice': {
        const obj = await this.eval(e.obj);
        if (typeof obj !== 'string' && !Array.isArray(obj)) throw new PyError('TypeError', `'${typeName(obj)}' object is not subscriptable`, e.line);
        const norm = (v, d) => { if (v === null) return d; const n = toIntStrict(v); return n < 0 ? Math.max(0, obj.length + n) : Math.min(n, obj.length); };
        const a = norm(e.a ? await this.eval(e.a) : null, 0);
        const b = norm(e.b ? await this.eval(e.b) : null, obj.length);
        return obj.slice(a, b);
      }
      case 'call': {
        const f = await this.eval(e.fn);
        const args = [];
        for (const a of e.args) args.push(await this.eval(a));
        const kw = {};
        for (const [k, v] of Object.entries(e.kwargs)) kw[k] = await this.eval(v);
        this.tick(e.line);
        try {
          if (f instanceof PyFunc) return await f.fn(args, kw);
          if (f instanceof PyType) {
            if (!f.fn) throw err('TypeError', `cannot create '${f.name}' instances`);
            return await f.fn(args, kw);
          }
          if (f instanceof PyBound) return f.fn(f.self, args, kw);
          if (f instanceof PyUserFunc) return await this.callUser(f, args, e.line);
        } catch (x) {
          if (x instanceof PyError && !x.line) x.line = e.line;
          throw x;
        }
        const callee = e.fn.k === 'name' ? e.fn.id : '';
        throw new PyError('TypeError', `'${typeName(f)}' object is not callable${callee ? '' : ''}`, e.line);
      }
      default: throw new PyError('SyntaxError', 'invalid syntax');
    }
  }
}

/**
 * Corre un programa con entradas fijas (para verificar actividades).
 * @returns {Promise<{ out: string, error: PyError|null, vars: object, inputsUsed: number, transcript: string }>}
 */
export async function runPython(code, { inputs = [], maxSteps = 20000, seed = null } = {}) {
  let out = '';
  let transcript = '';
  let used = 0;
  let rng = Math.random;
  if (seed !== null) { let s = seed >>> 0; rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const it = new Interpreter({
    maxSteps,
    rng,
    write: (text, kind) => { transcript += text; if (kind !== 'echo' && kind !== 'prompt') out += text; },
    input: async () => { if (used >= inputs.length) return null; return String(inputs[used++]); },
  });
  let error = null;
  try { await it.run(code); } catch (e) {
    if (e instanceof PyError) error = e;
    else if (e instanceof BreakSig || e instanceof ContinueSig) error = new PyError('SyntaxError', "'break' outside loop");
    else if (e instanceof ReturnSig) error = new PyError('SyntaxError', "'return' outside function");
    else error = new PyError('RuntimeError', String(e?.message || e));
  }
  return { out, error, vars: it.vars, inputsUsed: used, transcript };
}

/** Quita comentarios y strings para buscar palabras en el código del estudiante. */
export function codeWithoutComments(code) {
  return String(code).split('\n').map((l) => {
    let inS = null;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (inS) { if (c === '\\') { i++; continue; } if (c === inS) inS = null; continue; }
      if (c === '"' || c === "'") { inS = c; continue; }
      if (c === '#') return l.slice(0, i);
    }
    return l;
  }).join('\n');
}
