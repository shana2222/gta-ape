// Modelo de aprendizaje automático simplificado para los simuladores de IA.
// Cada clase se resume en el promedio de sus ejemplos (centroide). La confianza (%) sale de
// qué tan cerca está un objeto nuevo de cada clase, de cuántos ejemplos hay y de su balance.

/**
 * @param {Array<{ f: number[], cat: number }>} examples  ejemplos etiquetados (cat = clase que eligió el estudiante)
 * @param {number} k  cantidad de clases
 * @param {{ T?: number }} opts
 */
export function trainModel(examples, k, { T = 0.3, prior = 1 } = {}) {
  const counts = Array(k).fill(0);
  const sums = [];
  for (const ex of examples) {
    counts[ex.cat] += 1;
    sums[ex.cat] = (sums[ex.cat] || ex.f.map(() => 0)).map((v, i) => v + ex.f[i]);
  }
  const centroids = sums.map((s, c) => (s ? s.map((v) => v / counts[c]) : null));
  const total = counts.reduce((a, b) => a + b, 0);
  return {
    counts,
    predict(f) {
      const logits = centroids.map((cen, c) => {
        if (!cen) return -Infinity;
        const d2 = cen.reduce((acc, v, i) => acc + (v - f[i]) ** 2, 0);
        return -d2 / T + prior * Math.log(counts[c] / total); // la clase con más ejemplos "tira" más
      });
      const m = Math.max(...logits);
      const exps = logits.map((l) => (l === -Infinity ? 0 : Math.exp(l - m)));
      const sum = exps.reduce((a, b) => a + b, 0);
      const trained = counts.filter((n) => n > 0).length;
      // con pocos ejemplos el modelo duda: la confianza se acerca al reparto parejo
      const nmin = Math.min(...counts.filter((n) => n > 0));
      const probs = exps.map((e, c) => (counts[c] ? ((e / sum) * nmin + 1 / trained) / (nmin + 1) : 0));
      const pct = probs.map((p) => Math.round(p * 100));
      const best = pct.indexOf(Math.max(...pct));
      return { pct, best, conf: pct[best] };
    },
  };
}
