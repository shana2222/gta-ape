// Insignias que se ganan con el avance del APE (se muestran en el inventario y en el PDF).
import { MISSIONS, PHASES, BONUS, CENTERS, AREAS } from './content.js';
import { STREET_CHALLENGES } from './street-challenges.js';

const AREA_BADGES = {
  pc: { icon: '🧠', name: 'Pensadora computacional' },
  hw: { icon: '🔧', name: 'Maker de circuitos' },
  ia: { icon: '🤖', name: 'Entrenadora de IA' },
  py: { icon: '🐍', name: 'Pythonista' },
};

export function computeBadges(progress) {
  const done = (p) => Boolean(progress?.completed?.[p.id]);
  const list = [];
  for (const m of MISSIONS) {
    const d = m.phases.filter(done).length;
    const refl = Boolean(progress?.reflections?.[m.n]?.text);
    const earned = d === m.phases.length && refl;
    list.push({
      id: `mision-${m.n}`, group: 'Misiones', icon: m.icon, name: `Misión ${m.n}`, title: m.title,
      earned, progress: `${d}/${m.phases.length}${refl ? ' + reflexión' : ''}`,
      desc: earned ? `Completaste la misión ${m.n}: ${m.title}.` : `Completa las ${m.phases.length} actividades y la reflexión de la misión ${m.n} (${m.title}).`,
    });
  }
  for (const [k, a] of Object.entries(AREAS)) {
    const ph = PHASES.filter((p) => p.area === k);
    const d = ph.filter(done).length;
    const info = AREA_BADGES[k];
    list.push({ id: `area-${k}`, group: 'Áreas', icon: info.icon, name: info.name, title: a.name, earned: d === ph.length, progress: `${d}/${ph.length}`, desc: d === ph.length ? `Lograste todas las actividades de ${a.name}.` : `Logra las ${ph.length} actividades de ${a.name} (llevas ${d}).` });
  }
  for (const [key, c] of Object.entries(CENTERS)) {
    const ph = BONUS.filter((p) => p.center === key);
    const d = ph.filter(done).length;
    list.push({ id: `nerd-${key}`, group: 'Misiones nerds', icon: c.icon, name: c.name, title: c.full, earned: d === ph.length && ph.length > 0, progress: `${d}/${ph.length}`, desc: d === ph.length ? `Completaste la misión nerd de ${c.full}.` : `Habla con ${c.npc} en ${c.full} y resuelve sus ${ph.length} retos.` });
  }
  const st = progress?.street || {};
  const distinct = Object.keys(st.solved || {}).length;
  const helped = st.helped || 0;
  list.push({ id: 'calle-vecino', group: 'Calle', icon: '🤝', name: 'Buen vecino', title: 'Mini retos de la calle', earned: helped >= 5, progress: `${Math.min(helped, 5)}/5`, desc: helped >= 5 ? 'Ayudaste a 5 personas en la calle.' : `Ayuda a 5 personas que te pidan ayuda en la calle (llevas ${helped}).` });
  list.push({ id: 'calle-heroe', group: 'Calle', icon: '🦸', name: 'Héroe de Santa Bruma', title: 'Mini retos de la calle', earned: distinct >= STREET_CHALLENGES.length, progress: `${distinct}/${STREET_CHALLENGES.length}`, desc: distinct >= STREET_CHALLENGES.length ? 'Resolviste todos los mini retos de la calle.' : `Resuelve los ${STREET_CHALLENGES.length} mini retos distintos de la calle (llevas ${distinct}).` });
  return list;
}

export function earnedIds(progress) {
  return new Set(computeBadges(progress).filter((b) => b.earned).map((b) => b.id));
}
