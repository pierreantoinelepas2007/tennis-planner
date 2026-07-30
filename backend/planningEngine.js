const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const JOUR_ALIASES = {
  'lundi': 'Lundi', 'lun': 'Lundi',
  'mardi': 'Mardi', 'mar': 'Mardi',
  'mercredi': 'Mercredi', 'mer': 'Mercredi', 'merc': 'Mercredi',
  'jeudi': 'Jeudi', 'jeu': 'Jeudi',
  'vendredi': 'Vendredi', 'ven': 'Vendredi',
  'samedi': 'Samedi', 'sam': 'Samedi',
  'dimanche': 'Dimanche', 'dim': 'Dimanche',
};

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function parseDispoText(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const constraints = [];
  const dayRegex = new RegExp(Object.keys(JOUR_ALIASES).sort((a, b) => b.length - a.length).join('|'), 'g');
  let match;
  const dayPositions = [];
  while ((match = dayRegex.exec(lower)) !== null) {
    dayPositions.push({ day: JOUR_ALIASES[match[0]], index: match.index, len: match[0].length });
  }
  if (dayPositions.length === 0) {
    return [{ jour: null, minStart: 0, maxEnd: 24 * 60 }];
  }
  dayPositions.forEach((dp, i) => {
    const start = dp.index + dp.len;
    const end = i + 1 < dayPositions.length ? dayPositions[i + 1].index : lower.length;
    const segment = lower.slice(start, end);

    let minStart = 0, maxEnd = 24 * 60;

    const rangeMatch = segment.match(/(\d{1,2})h?(\d{2})?\s*(?:-|à|a)\s*(\d{1,2})h?(\d{2})?/);
    const afterMatch = segment.match(/apr[eè]s\s*(\d{1,2})h?(\d{2})?/);
    const beforeMatch = segment.match(/avant\s*(\d{1,2})h?(\d{2})?/);

    if (rangeMatch) {
      const h1 = parseInt(rangeMatch[1], 10), m1 = parseInt(rangeMatch[2] || '0', 10);
      const h2 = parseInt(rangeMatch[3], 10), m2 = parseInt(rangeMatch[4] || '0', 10);
      minStart = h1 * 60 + m1;
      maxEnd = h2 * 60 + m2;
    } else if (afterMatch) {
      const h1 = parseInt(afterMatch[1], 10), m1 = parseInt(afterMatch[2] || '0', 10);
      minStart = h1 * 60 + m1;
      maxEnd = 24 * 60;
    } else if (beforeMatch) {
      const h1 = parseInt(beforeMatch[1], 10), m1 = parseInt(beforeMatch[2] || '0', 10);
      minStart = 0;
      maxEnd = h1 * 60 + m1;
    } else if (segment.includes('matin')) {
      minStart = 6 * 60; maxEnd = 13 * 60;
    } else if (segment.includes('après-midi') || segment.includes('apres-midi') || segment.includes('après midi') || segment.includes('apres midi')) {
      minStart = 13 * 60; maxEnd = 20 * 60;
    } else if (segment.includes('soir')) {
      minStart = 17 * 60; maxEnd = 22 * 60;
    }

    constraints.push({ jour: dp.day, minStart, maxEnd });
  });
  return constraints;
}

function studentAvailableForSlot(student, jour, debut, fin) {
  const constraints = parseDispoText(student.dispo_text);
  if (constraints.length === 0) return false;
  const slotStart = timeToMinutes(debut);
  const slotEnd = timeToMinutes(fin);
  return constraints.some(c => {
    if (c.jour !== null && c.jour !== jour) return false;
    return slotStart >= c.minStart - 30 && slotEnd <= c.maxEnd + 30;
  });
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function namesMatch(a, b) {
  return norm(a) === norm(b);
}

function findStudentByName(students, name) {
  if (!name) return null;
  return students.find(s => namesMatch(s.name, name)) || null;
}

// students: lignes de la table students, avec jouer_avec déjà parsé en tableau JS
// profs: lignes de profs, chacune avec .disponibilites (tableau de {jour, debut, fin})
// courts: lignes de courts
// slots: lignes de court_slots, chacune avec .court_id
function generatePlanningProposal(students, profs, courts, slots) {
  const possibleSlots = [];
  slots.forEach(slot => {
    profs.forEach(prof => {
      const overlaps = (prof.disponibilites || []).some(d =>
        d.jour === slot.jour &&
        timeToMinutes(d.debut) <= timeToMinutes(slot.debut) &&
        timeToMinutes(d.fin) >= timeToMinutes(slot.fin)
      );
      if (overlaps) {
        possibleSlots.push({ slot, prof });
      }
    });
  });

  const jourIndex = j => JOURS.indexOf(j);
  possibleSlots.sort((a, b) => {
    if (jourIndex(a.slot.jour) !== jourIndex(b.slot.jour)) return jourIndex(a.slot.jour) - jourIndex(b.slot.jour);
    return timeToMinutes(a.slot.debut) - timeToMinutes(b.slot.debut);
  });

  const unplaced = new Set(students.map(s => s.id));
  const result = [];
  const lastCourtForProf = {};
  // Jours déjà utilisés par personne (regroupée par nom normalisé), pour éviter
  // de placer deux demandes de cours de la même personne le même jour quand
  // elle a demandé plusieurs cours par semaine (plusieurs soumissions du formulaire).
  const daysUsedByName = {};

  possibleSlots.forEach(({ slot, prof }) => {
    const candidates = students.filter(s => {
      if (!unplaced.has(s.id)) return false;
      if (!studentAvailableForSlot(s, slot.jour, slot.debut, slot.fin)) return false;
      const key = norm(s.name);
      const usedDays = daysUsedByName[key];
      if (usedDays && usedDays.has(slot.jour)) return false;
      return true;
    });
    if (candidates.length === 0) return;

    const scoreProf = (s) => s.prof_prefere && namesMatch(prof.name, s.prof_prefere) ? 3 : 0;

    const wantsToPlayWith = (a, b) =>
      (a.jouer_avec || []).some(n => namesMatch(n, b.name)) ||
      (b.jouer_avec || []).some(n => namesMatch(n, a.name));

    const levelClose = (a, b) => {
      if (a.niveau_etoile == null || b.niveau_etoile == null) return true;
      return Math.abs(a.niveau_etoile - b.niveau_etoile) <= 1;
    };

    const used = new Set();
    const groups = [];

    candidates.sort((a, b) => scoreProf(b) - scoreProf(a));

    candidates.forEach(s => {
      if (used.has(s.id)) return;
      if (s.preference_groupe === 'individuel') {
        groups.push({ members: [s], score: 10 + scoreProf(s) });
        used.add(s.id);
        return;
      }
      const partners = candidates.filter(o =>
        o.id !== s.id && !used.has(o.id) &&
        o.preference_groupe !== 'individuel' &&
        wantsToPlayWith(s, o) && levelClose(s, o)
      );
      const members = [s, ...partners].slice(0, 4);
      members.forEach(m => used.add(m.id));
      const score = 5 + members.length + members.reduce((acc, m) => acc + scoreProf(m), 0) + (partners.length > 0 ? 5 : 0);
      groups.push({ members, score });
    });

    const remaining = candidates.filter(s => !used.has(s.id));
    remaining.forEach(s => {
      if (used.has(s.id)) return;
      const similarLevel = remaining.filter(o =>
        o.id !== s.id && !used.has(o.id) && levelClose(s, o)
      );
      const members = [s, ...similarLevel].slice(0, 4);
      members.forEach(m => used.add(m.id));
      groups.push({ members, score: 1 + members.reduce((acc, m) => acc + scoreProf(m), 0) });
    });

    if (groups.length === 0) return;

    const stabilityBonus = lastCourtForProf[prof.id] === slot.court_id ? 2 : 0;
    groups.sort((a, b) => b.score - a.score);
    const chosen = groups[0];

    chosen.members.forEach(m => {
      unplaced.delete(m.id);
      const key = norm(m.name);
      if (!daysUsedByName[key]) daysUsedByName[key] = new Set();
      daysUsedByName[key].add(slot.jour);
    });
    result.push({
      slotId: slot.id,
      courtId: slot.court_id,
      profId: prof.id,
      jour: slot.jour,
      debut: slot.debut,
      fin: slot.fin,
      studentIds: chosen.members.map(m => m.id),
      score: chosen.score + stabilityBonus,
    });
    lastCourtForProf[prof.id] = slot.court_id;
  });

  const siblingHints = [];
  students.forEach(s => {
    if (!s.terrain_adjacent_avec) return;
    const sibling = findStudentByName(students, s.terrain_adjacent_avec);
    if (!sibling) return;
    const sBlock = result.find(r => r.studentIds.includes(s.id));
    const sibBlock = result.find(r => r.studentIds.includes(sibling.id));
    if (sBlock && sibBlock && sBlock.jour === sibBlock.jour) {
      const gap = Math.abs(timeToMinutes(sBlock.debut) - timeToMinutes(sibBlock.debut));
      if (sBlock.courtId !== sibBlock.courtId && gap <= 60) {
        siblingHints.push({ a: s.name, b: sibling.name, sameDay: true, gapMinutes: gap });
      }
    }
  });

  return {
    blocks: result,
    unplacedIds: Array.from(unplaced),
    siblingHints,
  };
}

module.exports = { generatePlanningProposal, JOURS };
