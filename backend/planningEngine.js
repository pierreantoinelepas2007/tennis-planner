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

// Les disponibilités des élèves sont maintenant saisies via une grille
// cliquable (jour × heure), donc stockées comme une liste exacte de créneaux
// d'une heure cochés par le parent — plus de texte libre à interpréter. Un
// élève est disponible pour un créneau du planning (qui peut durer plus d'une
// heure) si TOUTES les heures qu'il couvre ont été cochées pour ce jour.
function studentAvailableForSlot(student, jour, debut, fin) {
  const disponibilites = student.disponibilites || [];
  const heuresCochees = new Set(
    disponibilites.filter(d => d.jour === jour).map(d => d.heure)
  );
  if (heuresCochees.size === 0) return false;
  const slotStart = timeToMinutes(debut);
  const slotEnd = timeToMinutes(fin);
  for (let m = slotStart; m < slotEnd; m += 60) {
    const h = Math.floor(m / 60);
    const heureLabel = `${h.toString().padStart(2, '0')}:00`;
    if (!heuresCochees.has(heureLabel)) return false;
  }
  return true;
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Distance de Levenshtein : nombre minimal d'insertions/suppressions/substitutions
// pour transformer une chaîne en une autre. Sert à tolérer les petites fautes
// de frappe (ex: "Gothier" vs "Gauthier") sans faire de faux positifs sur des
// noms réellement différents.
function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // suppression
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

// Deux noms "matchent" s'ils sont identiques après normalisation, ou si leur
// distance de Levenshtein reste faible par rapport à leur longueur (tolère 1
// faute sur un nom court, jusqu'à 2 sur un nom plus long).
function namesMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  // Noms très courts (3 caractères ou moins) : aucune tolérance, le risque de
  // confondre deux personnes différentes est trop élevé (ex: "Léa" vs "Léo").
  if (maxLen <= 3) return false;
  const threshold = maxLen <= 6 ? 1 : 2;
  return levenshteinDistance(na, nb) <= threshold;
}

function findStudentByName(students, name) {
  if (!name) return null;
  return students.find(s => namesMatch(s.name, name)) || null;
}

// Échelle des classements belges (AFT / Tennis Padel Wallonie-Bruxelles), du
// plus faible (index 0) au plus fort. Source : règlement AFT / Tennis Padel
// Wallonie-Bruxelles. NC (non classé) est équivalent à C30.5 en termes de
// niveau de départ.
const CLASSEMENT_ECHELLE = [
  'NC',
  'C30.6', 'C30.5', 'C30.4', 'C30.3', 'C30.2', 'C30.1', 'C30',
  'C15.5', 'C15.4', 'C15.3', 'C15.2', 'C15.1', 'C15',
  'B+4/6', 'B+2/6', 'B0', 'B-2/6', 'B-4/6',
  'B-15', 'B-15.1', 'B-15.2', 'B-15.4',
  'A national', 'A international',
];

// Normalise une chaîne de classement saisie librement par un parent pour la
// comparer à l'échelle ci-dessus : enlève espaces, met en majuscules, unifie
// virgule/point et slash, tolère l'omission du préfixe C/B/A pour les
// échelons de 3e série (le cas le plus courant, ex: "30/6" pour "C30.6").
function normClassement(raw) {
  if (!raw) return null;
  let s = raw.toString().trim().toUpperCase();
  if (!s || s === 'NON CLASSE' || s === 'NON CLASSÉ') return 'NC';
  if (s.includes('INTERNATIONAL')) return 'A international';
  if (s.includes('NATIONAL')) return 'A national';
  s = s.replace(/,/g, '.').replace(/\s+/g, '');
  // "30/6" ou "30.6" saisi sans préfixe -> on suppose la 3e série (C), la plus
  // courante chez les jeunes/débutants encadrés par une école de tennis.
  if (/^\d/.test(s)) {
    s = 'C' + s;
  }
  s = s.replace(/^C(\d+)\/(\d+)$/, 'C$1.$2');
  s = s.replace(/^B([+-]?)(\d+)\/(\d+)$/, 'B$1$2/$3');
  return s;
}

// Retourne l'indice de classement (position dans l'échelle, plus haut = plus
// fort) ou null si le texte ne correspond à aucun échelon reconnu.
function classementIndex(raw) {
  const norm = normClassement(raw);
  if (!norm) return null;
  const idx = CLASSEMENT_ECHELLE.indexOf(norm);
  return idx === -1 ? null : idx;
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
  const conflicts = [];
  // Jours déjà utilisés par personne (regroupée par nom normalisé), pour éviter
  // de placer deux demandes de cours de la même personne le même jour quand
  // elle a demandé plusieurs cours par semaine (plusieurs soumissions du formulaire).
  const daysUsedByName = {};

  // Pour les élèves ayant plusieurs demandes de cours (même nom, plusieurs
  // entrées dans `students`), on calcule à l'avance le nombre de jours
  // distincts disponibles au total pour ce nom. Si une demande de cours (par
  // exemple un groupe réciproque en phase 1) n'a qu'une seule journée
  // possible en commun avec les autres demandes du même nom, cette
  // information permet d'éviter de "gâcher" ce jour rare sur un autre besoin
  // moins contraint. Concrètement : on compte, par nom, les jours disponibles
  // pour CHAQUE demande séparée, pour repérer les jours "rares" à préserver.
  const namesSeen = {};
  students.forEach(s => {
    const key = norm(s.name);
    namesSeen[key] = (namesSeen[key] || 0) + 1;
  });
  const multiDemandNames = new Set(Object.keys(namesSeen).filter(k => namesSeen[k] > 1));

  const scoreProf = (s, prof) => s.prof_prefere && namesMatch(prof.name, s.prof_prefere) ? 3 : 0;

  const wantsToPlayWith = (a, b) =>
    (a.jouer_avec || []).some(n => namesMatch(n, b.name)) ||
    (b.jouer_avec || []).some(n => namesMatch(n, a.name));

  // Deux élèves sont de niveau proche si leurs classements officiels (quand
  // les deux en ont un reconnu) sont à 2 échelons d'écart maximum sur
  // l'échelle belge ; à défaut, on se rabat sur l'écart d'étoiles (saisies
  // par le prof), à 1 étoile d'écart maximum ; si aucune des deux infos n'est
  // disponible pour l'un des deux, on ne bloque pas le rapprochement.
  const levelClose = (a, b) => {
    const ca = classementIndex(a.classement);
    const cb = classementIndex(b.classement);
    if (ca != null && cb != null) {
      return Math.abs(ca - cb) <= 2;
    }
    if (a.niveau_etoile == null || b.niveau_etoile == null) return true;
    return Math.abs(a.niveau_etoile - b.niveau_etoile) <= 1;
  };

  // Jours où `student` a au moins un créneau coché dans sa grille de
  // disponibilités, en excluant les jours déjà retenus pour une autre de ses
  // demandes de cours (pertinent seulement s'il a plusieurs demandes).
  const availableDaysFor = (student) => {
    const days = new Set((student.disponibilites || []).map(d => d.jour));
    return days;
  };

  // ---------- Phase 1 : priorité aux groupes réciproques "veut jouer avec" ----------
  // On identifie d'abord les élèves qui se veulent mutuellement (et qui ne sont
  // pas en préférence individuelle, incompatible avec un cours partagé), puis on
  // cherche pour chaque groupe le meilleur créneau commun où TOUS les membres
  // sont disponibles en même temps, avant de traiter le reste des élèves au fil
  // des créneaux. Ça évite qu'un des deux se fasse caser ailleurs en premier et
  // casse la demande de jouer ensemble.
  const groupable = students.filter(s => s.preference_groupe !== 'individuel');
  const visited = new Set();
  const reciprocalGroups = [];

  groupable.forEach(s => {
    if (visited.has(s.id)) return;
    // Composante connexe simple : s + tous ceux qui se veulent mutuellement
    // avec s ou avec un membre déjà inclus (limité à un groupe de 4 maximum,
    // comme pour les groupes formés au fil de l'eau).
    const members = [s];
    visited.add(s.id);
    let changed = true;
    while (changed && members.length < 4) {
      changed = false;
      for (const candidate of groupable) {
        if (visited.has(candidate.id)) continue;
        if (members.some(m => wantsToPlayWith(m, candidate)) && members.every(m => levelClose(m, candidate))) {
          members.push(candidate);
          visited.add(candidate.id);
          changed = true;
          if (members.length >= 4) break;
        }
      }
    }
    if (members.length > 1) {
      reciprocalGroups.push(members);
    }
  });

  reciprocalGroups.forEach(members => {
    // Tous les créneaux où l'ensemble des membres du groupe sont disponibles,
    // avec un prof compatible, où aucun membre n'a déjà un cours ce jour-là,
    // et où ni le terrain ni le prof ne sont déjà réservés à ce moment par un
    // groupe réciproque traité juste avant (dans cette même phase 1).
    const candidateSlots = possibleSlots.filter(({ slot, prof }) => {
      const dayAlreadyUsedByAMember = members.some(m => {
        const usedDays = daysUsedByName[norm(m.name)];
        return usedDays && usedDays.has(slot.jour);
      });
      if (dayAlreadyUsedByAMember) return false;
      const courtTaken = result.some(r =>
        r.courtId === slot.court_id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin
      );
      if (courtTaken) return false;
      const profTaken = result.some(r =>
        r.profId === prof.id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin
      );
      if (profTaken) return false;
      return members.every(m => studentAvailableForSlot(m, slot.jour, slot.debut, slot.fin));
    });
    if (candidateSlots.length === 0) return; // pas de créneau commun : traités en phase 2 séparément

    const scored = candidateSlots.map(({ slot, prof }) => {
      const stabilityBonus = lastCourtForProf[prof.id] === slot.court_id ? 2 : 0;
      const profScore = members.reduce((acc, m) => acc + scoreProf(m, prof), 0);
      // Pénalité si ce jour est aussi utile (voire indispensable) à une autre
      // demande de cours non encore traitée du même nom qu'un des membres
      // (élève ayant demandé plusieurs cours par semaine). On regarde combien
      // de jours alternatifs restent disponibles pour cette autre demande :
      // moins il y en a, plus la pénalité est forte, pour préserver ce jour
      // rare à l'autre demande plutôt que de le "gâcher" ici s'il existe une
      // meilleure option pour ce groupe.
      let otherDemandPenalty = 0;
      members.forEach(m => {
        const key = norm(m.name);
        if (!multiDemandNames.has(key)) return;
        const otherEntries = students.filter(s2 =>
          norm(s2.name) === key && s2.id !== m.id && unplaced.has(s2.id)
        );
        otherEntries.forEach(other => {
          const otherDays = availableDaysFor(other);
          if (otherDays.has(slot.jour)) {
            // Ce jour compte pour l'autre demande : pénalité inversement
            // proportionnelle au nombre de jours alternatifs qu'elle a.
            otherDemandPenalty += Math.max(0, 6 - otherDays.size);
          }
        });
      });
      return { slot, prof, score: profScore + stabilityBonus - otherDemandPenalty };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    members.forEach(m => {
      unplaced.delete(m.id);
      const key = norm(m.name);
      if (!daysUsedByName[key]) daysUsedByName[key] = new Set();
      daysUsedByName[key].add(best.slot.jour);
    });
    result.push({
      slotId: best.slot.id,
      courtId: best.slot.court_id,
      profId: best.prof.id,
      jour: best.slot.jour,
      debut: best.slot.debut,
      fin: best.slot.fin,
      studentIds: members.map(m => m.id),
      score: 10 + best.score,
    });
    lastCourtForProf[best.prof.id] = best.slot.court_id;
  });

  // ---------- Phase 2 : priorité aux préférences de professeur ----------
  // Pour les élèves restants (non casés en phase 1) qui ont exprimé une
  // préférence de professeur reconnue, on cherche activement le meilleur
  // créneau disponible avec CE prof précis, avant de les laisser au hasard de
  // l'ordre des créneaux en phase 3. Sans cette étape, un élève peut se faire
  // caser avec un autre prof simplement parce que son créneau était examiné
  // en premier dans la boucle, même si son prof préféré avait de la place.
  const withProfPreference = students.filter(s =>
    unplaced.has(s.id) && s.prof_prefere && profs.some(p => namesMatch(p.name, s.prof_prefere))
  );

  withProfPreference.forEach(s => {
    if (!unplaced.has(s.id)) return; // peut avoir été casé entre-temps (cours multiple du même nom)
    const preferredProf = profs.find(p => namesMatch(p.name, s.prof_prefere));
    if (!preferredProf) return;

    const candidateSlots = possibleSlots.filter(({ slot, prof }) => {
      if (prof.id !== preferredProf.id) return false;
      const usedDays = daysUsedByName[norm(s.name)];
      if (usedDays && usedDays.has(slot.jour)) return false;
      const courtTaken = result.some(r =>
        r.courtId === slot.court_id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin
      );
      if (courtTaken) return false;
      const profTaken = result.some(r =>
        r.profId === prof.id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin
      );
      if (profTaken) return false;
      return studentAvailableForSlot(s, slot.jour, slot.debut, slot.fin);
    });
    if (candidateSlots.length === 0) return; // pas de créneau dispo avec ce prof : phase 3 s'en chargera

    // Parmi les créneaux possibles avec le prof préféré, on privilégie celui
    // qui préserve le mieux les jours dont ce même élève pourrait avoir besoin
    // pour une autre de ses demandes de cours (même logique que phase 1).
    const scored = candidateSlots.map(({ slot, prof }) => {
      const stabilityBonus = lastCourtForProf[prof.id] === slot.court_id ? 2 : 0;
      let otherDemandPenalty = 0;
      const key = norm(s.name);
      if (multiDemandNames.has(key)) {
        const otherEntries = students.filter(s2 => norm(s2.name) === key && s2.id !== s.id && unplaced.has(s2.id));
        otherEntries.forEach(other => {
          const otherDays = availableDaysFor(other);
          if (otherDays.has(slot.jour)) {
            otherDemandPenalty += Math.max(0, 6 - otherDays.size);
          }
        });
      }
      return { slot, prof, score: stabilityBonus - otherDemandPenalty };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    unplaced.delete(s.id);
    const key = norm(s.name);
    if (!daysUsedByName[key]) daysUsedByName[key] = new Set();
    daysUsedByName[key].add(best.slot.jour);
    result.push({
      slotId: best.slot.id,
      courtId: best.slot.court_id,
      profId: best.prof.id,
      jour: best.slot.jour,
      debut: best.slot.debut,
      fin: best.slot.fin,
      studentIds: [s.id],
      score: 8 + best.score,
    });
    lastCourtForProf[best.prof.id] = best.slot.court_id;
  });

  // ---------- Phase 3 : reste des élèves, créneau par créneau ----------
  possibleSlots.forEach(({ slot, prof }) => {
    // Ce terrain est-il déjà occupé à ce jour/heure (par une phase précédente
    // ou par un bloc déjà posé plus tôt dans cette même phase 3) ?
    const courtAlreadyUsed = result.some(r =>
      r.courtId === slot.court_id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin
    );
    if (courtAlreadyUsed) return;
    // Ce prof est-il déjà occupé à ce jour/heure, sur un autre terrain ?
    const profAlreadyUsed = result.some(r =>
      r.profId === prof.id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin
    );
    if (profAlreadyUsed) return;

    const candidates = students.filter(s => {
      if (!unplaced.has(s.id)) return false;
      if (!studentAvailableForSlot(s, slot.jour, slot.debut, slot.fin)) return false;
      const key = norm(s.name);
      const usedDays = daysUsedByName[key];
      if (usedDays && usedDays.has(slot.jour)) return false;
      return true;
    });
    if (candidates.length === 0) return;

    const used = new Set();
    const groups = [];

    candidates.sort((a, b) => scoreProf(b, prof) - scoreProf(a, prof));

    candidates.forEach(s => {
      if (used.has(s.id)) return;
      if (s.preference_groupe === 'individuel') {
        groups.push({ members: [s], score: 10 + scoreProf(s, prof) });
        used.add(s.id);
        return;
      }
      const partners = candidates.filter(o =>
        o.id !== s.id && !used.has(o.id) &&
        o.preference_groupe !== 'individuel' &&
        wantsToPlayWith(s, o) && levelClose(s, o)
      );
      // On ne fige un groupe ici QUE s'il y a une vraie réciprocité "veut
      // jouer avec" trouvée. Sans partenaire réciproque, on laisse cet élève
      // disponible pour la boucle de repli ci-dessous, qui regroupe par
      // simple proximité de niveau (sans exiger de réciprocité).
      if (partners.length === 0) return;
      const members = [s, ...partners].slice(0, 4);
      members.forEach(m => used.add(m.id));
      const score = 5 + members.length + members.reduce((acc, m) => acc + scoreProf(m, prof), 0) + 5;
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
      groups.push({ members, score: 1 + members.reduce((acc, m) => acc + scoreProf(m, prof), 0) });
    });

    if (groups.length === 0) return;

    const stabilityBonus = lastCourtForProf[prof.id] === slot.court_id ? 2 : 0;
    groups.sort((a, b) => b.score - a.score);
    const chosen = groups[0];
    const rejectedGroups = groups.slice(1);

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

    // Un vrai conflit : d'autres personnes étaient disponibles et candidates
    // sur ce même créneau/prof mais n'ont pas pu être regroupées avec les
    // retenues (préférence individuel, niveau trop éloigné, pas de
    // réciprocité). On exclut les cas où le "rejeté" est en fait la même
    // personne que la "retenue" (deux demandes de cours différentes du même
    // nom, ex: un cours groupe et un cours individuel) : ce n'est pas un vrai
    // arbitrage à faire, l'autre demande sera simplement recasée ailleurs.
    const placedNamesNorm = new Set(chosen.members.map(m => norm(m.name)));
    const rejectedNames = rejectedGroups
      .flatMap(g => g.members.map(m => m.name))
      .filter(name => !placedNamesNorm.has(norm(name)));

    if (rejectedNames.length > 0) {
      conflicts.push({
        jour: slot.jour,
        debut: slot.debut,
        fin: slot.fin,
        profName: prof.name,
        placedNames: chosen.members.map(m => m.name),
        rejectedNames,
      });
    }
  });

  const siblingHints = [];
  const seenPairs = new Set();
  students.forEach(s => {
    if (!s.terrain_adjacent_avec) return;
    const sibling = findStudentByName(students, s.terrain_adjacent_avec);
    if (!sibling) return;
    const sBlock = result.find(r => r.studentIds.includes(s.id));
    const sibBlock = result.find(r => r.studentIds.includes(sibling.id));
    if (sBlock && sibBlock && sBlock.jour === sibBlock.jour) {
      const gap = Math.abs(timeToMinutes(sBlock.debut) - timeToMinutes(sibBlock.debut));
      if (sBlock.courtId !== sibBlock.courtId && gap <= 60) {
        const pairKey = [norm(s.name), norm(sibling.name)].sort().join('|');
        if (seenPairs.has(pairKey)) return;
        seenPairs.add(pairKey);
        siblingHints.push({ a: s.name, b: sibling.name, sameDay: true, gapMinutes: gap });
      }
    }
  });

  return {
    blocks: result,
    unplacedIds: Array.from(unplaced),
    siblingHints,
    conflicts,
  };
}

module.exports = { generatePlanningProposal, JOURS };
