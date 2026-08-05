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

// Deux noms "matchent" s'ils sont identiques après normalisation, si leur
// distance de Levenshtein reste faible par rapport à leur longueur (tolère 1
// faute sur un nom court, jusqu'à 2 sur un nom plus long), ou si les mêmes
// mots apparaissent dans un ordre différent (ex: "Jean-Yves Lepas" vs "Lepas
// Jean-Yves") — un parent qui inscrit son enfant et un autre qui tape ce même
// nom dans "veut jouer avec" n'écrivent pas toujours prénom puis nom dans le
// même ordre.
function namesMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const wordsA = na.split(/\s+/).filter(Boolean).sort();
  const wordsB = nb.split(/\s+/).filter(Boolean).sort();
  if (wordsA.length > 1 && wordsA.length === wordsB.length && wordsA.every((w, i) => w === wordsB[i])) {
    return true;
  }

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

// Correspondance entre le niveau étoile (saisi par le prof, 1 à 5) et un
// échelon approximatif de l'échelle de classement belge, pour permettre de
// comparer directement un élève classé à un élève seulement noté en étoiles
// (ex: un 5★ peut être proche d'un joueur classé B0, en début de 2e série).
const ETOILE_TO_CLASSEMENT_INDEX = {
  1: CLASSEMENT_ECHELLE.indexOf('NC'),      // débutant complet
  2: CLASSEMENT_ECHELLE.indexOf('C30.3'),   // débutant avec des bases
  3: CLASSEMENT_ECHELLE.indexOf('C30'),     // intermédiaire
  4: CLASSEMENT_ECHELLE.indexOf('C15.2'),   // bon niveau
  5: CLASSEMENT_ECHELLE.indexOf('B0'),      // très bon niveau club
};

// Indice de niveau unifié pour une personne, quelle que soit la façon dont
// son niveau est connu : classement officiel en priorité, sinon conversion
// de son étoile vers l'échelle de classement, sinon null (niveau inconnu).
function levelIndex(student) {
  const fromClassement = classementIndex(student.classement);
  if (fromClassement != null) return fromClassement;
  if (student.niveau_etoile != null && ETOILE_TO_CLASSEMENT_INDEX[student.niveau_etoile] != null) {
    return ETOILE_TO_CLASSEMENT_INDEX[student.niveau_etoile];
  }
  return null;
}

// students: lignes de la table students, avec jouer_avec déjà parsé en tableau JS
// profs: lignes de profs, chacune avec .disponibilites (tableau de {jour, debut, fin, courtId})
// courts: lignes de courts
// slots: lignes de court_slots, chacune avec .court_id
function generatePlanningProposal(students, profs, courts, slots) {
  const possibleSlots = [];
  slots.forEach(slot => {
    profs.forEach(prof => {
      const overlaps = (prof.disponibilites || []).some(d => {
        const sameTime = d.jour === slot.jour &&
          timeToMinutes(d.debut) <= timeToMinutes(slot.debut) &&
          timeToMinutes(d.fin) >= timeToMinutes(slot.fin);
        if (!sameTime) return false;
        // Si la disponibilité précise un terrain (cas normal désormais, un
        // prof est attitré à un terrain précis à chaque créneau selon le
        // planning du club), elle ne compte que pour CE terrain. Les
        // disponibilités plus anciennes, sans terrain renseigné, restent
        // valables sur n'importe quel terrain (comportement de repli).
        const courtIdField = d.court_id !== undefined ? d.court_id : d.courtId;
        if (courtIdField) return courtIdField === slot.court_id;
        return true;
      });
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

  // Deux personnes liées par "même horaire que" ont explicitement demandé
  // des cours SÉPARÉS mais au même horaire (ex: deux parents qui viennent
  // ensemble) — cette relation est distincte de "veut jouer avec" et ne doit
  // jamais les faire fusionner dans le même cours, même si leur niveau est
  // proche par ailleurs.
  const isSameScheduleLinked = (a, b) =>
    namesMatch(a.meme_horaire_avec || '', b.name) ||
    namesMatch(b.meme_horaire_avec || '', a.name);

  // Deux personnes sont de niveau proche si leur indice de niveau unifié
  // (classement officiel en priorité, sinon étoile convertie sur la même
  // échelle) est à 2 échelons d'écart maximum. Ça permet par exemple à un 5★
  // de jouer avec un classé B0, puisque 5★ correspond justement à ce niveau.
  // Si le niveau est inconnu pour l'un des deux, on ne bloque pas le
  // rapprochement (pas assez d'information pour juger).
  const levelClose = (a, b) => {
    const la = levelIndex(a);
    const lb = levelIndex(b);
    if (la == null || lb == null) return true;
    return Math.abs(la - lb) <= 2;
  };

  // Catégorie d'âge officielle du club (Baby-tennis / Mini-tennis / Tennis),
  // déterminée à partir de l'âge saisi dans le formulaire. Le club exige des
  // groupes strictement homogènes en âge, en plus du niveau : jamais un
  // Baby-tennis avec un Mini-tennis, même si leur niveau de jeu est proche.
  // Si l'âge n'est pas renseigné ou n'est pas un nombre exploitable, on ne
  // bloque pas le rapprochement (pas assez d'information pour juger).
  const ageCategory = (student) => {
    const age = parseInt(student.age, 10);
    if (Number.isNaN(age)) return null;
    if (age <= 4) return 'baby';
    if (age <= 8) return 'mini';
    return 'tennis';
  };

  const sameAgeCategory = (a, b) => {
    const ca = ageCategory(a);
    const cb = ageCategory(b);
    if (ca == null || cb == null) return true;
    return ca === cb;
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
        if (members.some(m => wantsToPlayWith(m, candidate)) && members.every(m => levelClose(m, candidate)) && members.every(m => sameAgeCategory(m, candidate)) && members.every(m => !isSameScheduleLinked(m, candidate))) {
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

  // ---------- Phase 2 : priorité aux paires "même horaire que" ----------
  // Deux personnes qui souhaitent le même horaire (sans forcément jouer
  // ensemble ni être sur des terrains adjacents — par exemple deux parents
  // qui viennent ensemble) doivent être sur des cours SÉPARÉS, mais on
  // cherche activement à les caser sur le même créneau horaire, avant de les
  // laisser au hasard de l'ordre des créneaux en phase 4.
  const sameScheduleUnresolved = [];
  const processedSchedulePairs = new Set();

  // Regroupe les créneaux possibles par (jour, début, fin), pour examiner
  // chaque horaire une seule fois plutôt que de reconstruire artificiellement
  // une grille 0h-24h indépendante des vrais créneaux du club.
  const slotsByTime = {};
  possibleSlots.forEach(entry => {
    const key = `${entry.slot.jour}|${entry.slot.debut}|${entry.slot.fin}`;
    if (!slotsByTime[key]) slotsByTime[key] = [];
    slotsByTime[key].push(entry);
  });
  const timeKeysSorted = Object.keys(slotsByTime).sort((a, b) => {
    const [jourA, debutA] = a.split('|');
    const [jourB, debutB] = b.split('|');
    if (jourA !== jourB) return JOURS.indexOf(jourA) - JOURS.indexOf(jourB);
    return timeToMinutes(debutA) - timeToMinutes(debutB);
  });

  const isSlotFree = (slot, prof) =>
    !result.some(r => r.courtId === slot.court_id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin) &&
    !result.some(r => r.profId === prof.id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin);

  students.forEach(s => {
    if (!unplaced.has(s.id)) return;
    if (!s.meme_horaire_avec) return;
    const partner = findStudentByName(students, s.meme_horaire_avec);
    if (!partner || !unplaced.has(partner.id)) return;
    const pairKey = [s.id, partner.id].sort().join('|');
    if (processedSchedulePairs.has(pairKey)) return;
    processedSchedulePairs.add(pairKey);

    let placed = false;
    for (const timeKey of timeKeysSorted) {
      const [jour] = timeKey.split('|');
      const usedDaysS = daysUsedByName[norm(s.name)];
      if (usedDaysS && usedDaysS.has(jour)) continue;
      const usedDaysP = daysUsedByName[norm(partner.name)];
      if (usedDaysP && usedDaysP.has(jour)) continue;

      const entriesHere = slotsByTime[timeKey].filter(({ slot, prof }) => isSlotFree(slot, prof));
      const sEntry = entriesHere.find(({ slot, prof }) => studentAvailableForSlot(s, slot.jour, slot.debut, slot.fin));
      if (!sEntry) continue;
      const pEntry = entriesHere.find(({ slot, prof }) =>
        slot.court_id !== sEntry.slot.court_id && prof.id !== sEntry.prof.id &&
        studentAvailableForSlot(partner, slot.jour, slot.debut, slot.fin)
      );
      if (!pEntry) continue;

      [{ student: s, entry: sEntry }, { student: partner, entry: pEntry }].forEach(({ student, entry }) => {
        unplaced.delete(student.id);
        const key = norm(student.name);
        if (!daysUsedByName[key]) daysUsedByName[key] = new Set();
        daysUsedByName[key].add(entry.slot.jour);
        result.push({
          slotId: entry.slot.id,
          courtId: entry.slot.court_id,
          profId: entry.prof.id,
          jour: entry.slot.jour,
          debut: entry.slot.debut,
          fin: entry.slot.fin,
          studentIds: [student.id],
          score: 9,
        });
        lastCourtForProf[entry.prof.id] = entry.slot.court_id;
      });
      placed = true;
      break;
    }
    if (!placed) {
      sameScheduleUnresolved.push({ a: s.name, b: partner.name });
    }
  });

  // ---------- Phase 3 : priorité aux préférences de professeur ----------
  // Pour les élèves restants (non casés en phase 1 ou 2) qui ont exprimé une
  // préférence de professeur reconnue, on cherche activement le meilleur
  // créneau disponible avec CE prof précis, avant de les laisser au hasard de
  // l'ordre des créneaux en phase 4. Sans cette étape, un élève peut se faire
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

  // ---------- Phase 4 : reste des élèves, créneaux triés par potentiel de remplissage ----------
  // Plutôt que de traiter les créneaux dans un ordre fixe (jour puis heure),
  // ce qui peut "disperser" des personnes groupables sur des petits groupes
  // formés tôt alors qu'un autre créneau aurait pu réunir davantage de monde
  // compatible, on retraite à chaque itération le nombre de candidats
  // groupables potentiels de chaque créneau restant et on traite en premier
  // celui qui peut accueillir le plus grand groupe cohérent. Ça maximise le
  // taux de remplissage global, particulièrement visible à grande échelle
  // (plusieurs centaines de personnes).

  function countGroupablePotential(slot, prof) {
    const availableHere = students.filter(s => {
      if (!unplaced.has(s.id)) return false;
      if (!studentAvailableForSlot(s, slot.jour, slot.debut, slot.fin)) return false;
      const usedDays = daysUsedByName[norm(s.name)];
      if (usedDays && usedDays.has(slot.jour)) return false;
      return true;
    });
    if (availableHere.length === 0) return 0;
    // Estimation rapide : le plus grand sous-groupe de niveau mutuellement
    // proche parmi les disponibles ici (sans calculer le regroupement complet,
    // juste pour classer les créneaux entre eux).
    let best = 1;
    availableHere.forEach(s => {
      if (s.preference_groupe === 'individuel') return;
      const compatibles = availableHere.filter(o =>
        o.id !== s.id && o.preference_groupe !== 'individuel' &&
        levelClose(s, o) && sameAgeCategory(s, o) && !isSameScheduleLinked(s, o)
      );
      best = Math.max(best, Math.min(4, compatibles.length + 1));
    });
    return best;
  }

  // Regroupe les créneaux possibles par horaire (jour+heure), indépendamment
  // du terrain : à un même horaire, plusieurs terrains/profs peuvent être
  // disponibles simultanément, et il faut répartir les candidats entre eux
  // de façon coordonnée pour éviter que deux personnes compatibles se
  // retrouvent chacune seule sur un terrain différent alors qu'elles
  // auraient dû être réunies sur un seul terrain (libérant l'autre terrain
  // pour d'autres personnes).
  const entriesByTime = {};
  possibleSlots.forEach(entry => {
    const key = `${entry.slot.jour}|${entry.slot.debut}`;
    if (!entriesByTime[key]) entriesByTime[key] = [];
    entriesByTime[key].push(entry);
  });

  function countAvailableAtTime(entries) {
    if (entries.length === 0) return 0;
    const { slot } = entries[0];
    return students.filter(s => {
      if (!unplaced.has(s.id)) return false;
      if (!studentAvailableForSlot(s, slot.jour, slot.debut, slot.fin)) return false;
      const usedDays = daysUsedByName[norm(s.name)];
      if (usedDays && usedDays.has(slot.jour)) return false;
      return true;
    }).length;
  }

  const timeKeys = Object.keys(entriesByTime);

  while (timeKeys.some(k => entriesByTime[k].length > 0)) {
    // Retirer, pour chaque horaire, les entrées dont le terrain ou le prof
    // est déjà occupé par un bloc posé précédemment.
    timeKeys.forEach(key => {
      entriesByTime[key] = entriesByTime[key].filter(({ slot, prof }) => {
        const courtUsed = result.some(r =>
          r.courtId === slot.court_id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin
        );
        const profUsed = result.some(r =>
          r.profId === prof.id && r.jour === slot.jour && r.debut === slot.debut && r.fin === slot.fin
        );
        return !courtUsed && !profUsed;
      });
    });

    // Choisir l'horaire avec le plus de candidats disponibles au total (plus
    // il y a de monde disponible en même temps, plus il y a de chances de
    // former de gros groupes cohérents sur les différents terrains offerts).
    let bestKey = null;
    let bestCount = -1;
    timeKeys.forEach(key => {
      const entries = entriesByTime[key];
      if (entries.length === 0) return;
      const count = countAvailableAtTime(entries);
      if (count > bestCount) {
        bestCount = count;
        bestKey = key;
      }
    });
    if (!bestKey || bestCount <= 0) break;

    const entries = entriesByTime[bestKey];
    const { slot: anySlot } = entries[0];

    // Un même terrain peut apparaître plusieurs fois dans `entries` si
    // plusieurs profs sont chacun disponibles dessus à cet horaire dans les
    // données déclarées (un club peut associer plusieurs profs possibles à
    // un même terrain/heure sans figer qui l'occupera). Physiquement, ce
    // terrain ne peut recevoir qu'un seul cours : on ne garde qu'une entrée
    // par terrain pour cet horaire.
    const seenCourts = new Set();
    const dedupedEntries = entries.filter(({ slot }) => {
      if (seenCourts.has(slot.court_id)) return false;
      seenCourts.add(slot.court_id);
      return true;
    });

    // Tous les candidats disponibles à cet horaire, indépendamment du terrain.
    const candidates = students.filter(s => {
      if (!unplaced.has(s.id)) return false;
      if (!studentAvailableForSlot(s, anySlot.jour, anySlot.debut, anySlot.fin)) return false;
      const usedDays = daysUsedByName[norm(s.name)];
      if (usedDays && usedDays.has(anySlot.jour)) return false;
      return true;
    });

    const used = new Set();
    const formedGroups = []; // { members }

    // 1) Priorité aux réciprocités "veut jouer avec" parmi les candidats de cet horaire.
    candidates.forEach(s => {
      if (used.has(s.id) || s.preference_groupe === 'individuel') return;
      const partners = candidates.filter(o =>
        o.id !== s.id && !used.has(o.id) && o.preference_groupe !== 'individuel' &&
        wantsToPlayWith(s, o) && levelClose(s, o) && sameAgeCategory(s, o) && !isSameScheduleLinked(s, o)
      );
      if (partners.length === 0) return;
      const members = [s, ...partners].slice(0, 4);
      members.forEach(m => used.add(m.id));
      formedGroups.push({ members });
    });

    // 2) Regroupement par niveau proche parmi les candidats restants, triés
    // pour placer les niveaux voisins côte à côte dans la liste.
    const remaining = candidates.filter(s => !used.has(s.id) && s.preference_groupe !== 'individuel');
    const remainingSorted = [...remaining].sort((a, b) => {
      const la = levelIndex(a), lb = levelIndex(b);
      if (la == null && lb == null) return 0;
      if (la == null) return 1;
      if (lb == null) return -1;
      return la - lb;
    });
    remainingSorted.forEach(s => {
      if (used.has(s.id)) return;
      const similarLevel = remainingSorted.filter(o =>
        o.id !== s.id && !used.has(o.id) && levelClose(s, o) && sameAgeCategory(s, o) && !isSameScheduleLinked(s, o)
      );
      const members = [s, ...similarLevel].slice(0, 4);
      members.forEach(m => used.add(m.id));
      formedGroups.push({ members });
    });

    // 3) Les personnes en préférence individuelle forment chacune leur propre groupe.
    candidates.filter(s => !used.has(s.id) && s.preference_groupe === 'individuel').forEach(s => {
      used.add(s.id);
      formedGroups.push({ members: [s] });
    });

    // Score de chaque groupe formé (réutilisé pour trier et pour les conflits).
    // Le score de préférence de prof est calculé séparément lors de
    // l'assignation à un terrain/prof précis (voir plus bas), puisqu'aucun
    // prof n'est encore attribué à ce stade.
    // Priorité : réciprocité "jouer avec" (engagement explicite entre deux
    // personnes) > taille du groupe (maximise le remplissage, un groupe de 4
    // occupe un terrain aussi efficacement qu'un individuel mais case 4x plus
    // de monde) > demande individuelle seule (n'occupe le terrain que pour
    // une personne, à ne privilégier que s'il ne reste pas assez de groupes
    // pour remplir tous les terrains disponibles à cet horaire).
    const scoredGroups = formedGroups.map(g => {
      const isIndividuelSolo = g.members.length === 1 && g.members[0].preference_groupe === 'individuel';
      const hasReciprocity = g.members.length > 1 && g.members.some((m, i) =>
        g.members.some((o, j) => i !== j && wantsToPlayWith(m, o))
      );
      const reciprocityBonus = hasReciprocity ? 20 : 0;
      const base = isIndividuelSolo ? 1 : 0;
      const score = reciprocityBonus + base + g.members.length * 5;
      return { ...g, score };
    });
    scoredGroups.sort((a, b) => b.score - a.score);

    // Assignation des groupes formés aux terrains disponibles à cet horaire,
    // en donnant la priorité aux terrains où le prof correspond à une
    // préférence exprimée par un membre du groupe, puis à la stabilité.
    const availableCourtEntries = [...dedupedEntries];
    const unassignedGroups = [];

    scoredGroups.forEach(group => {
      if (availableCourtEntries.length === 0) {
        unassignedGroups.push(group);
        return;
      }
      // Meilleur terrain/prof pour ce groupe précis.
      let bestEntryIndex = 0;
      let bestEntryScore = -Infinity;
      availableCourtEntries.forEach((entry, idx) => {
        const profScore = group.members.reduce((acc, m) => acc + scoreProf(m, entry.prof), 0);
        const stabilityBonus = lastCourtForProf[entry.prof.id] === entry.slot.court_id ? 2 : 0;
        const entryScore = profScore + stabilityBonus;
        if (entryScore > bestEntryScore) {
          bestEntryScore = entryScore;
          bestEntryIndex = idx;
        }
      });
      const { slot, prof } = availableCourtEntries[bestEntryIndex];
      // Un même prof ne peut occuper qu'un seul terrain à cet horaire : on
      // retire de la liste des terrains encore disponibles pour ce tour
      // toutes les entrées liées à ce terrain OU à ce prof.
      for (let i = availableCourtEntries.length - 1; i >= 0; i--) {
        const e = availableCourtEntries[i];
        if (e.slot.court_id === slot.court_id || e.prof.id === prof.id) {
          availableCourtEntries.splice(i, 1);
        }
      }

      group.members.forEach(m => {
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
        studentIds: group.members.map(m => m.id),
        score: group.score + bestEntryScore,
      });
      lastCourtForProf[prof.id] = slot.court_id;

      // Retire toutes les entrées de ce terrain à cet horaire (y compris les
      // doublons avec un autre prof potentiel qu'on avait dédupliqués), ce
      // terrain étant maintenant occupé pour de bon.
      entriesByTime[bestKey] = entriesByTime[bestKey].filter(e => e.slot.court_id !== slot.court_id);
    });

    // Les groupes qui n'ont pas pu être assignés à un terrain (plus de
    // groupes formés que de terrains disponibles à cet horaire) restent
    // non casés pour l'instant : la phase 5 de consolidation ou un autre
    // horaire pourra éventuellement les accueillir.
    if (unassignedGroups.length > 0 && scoredGroups.length > 0) {
      const placedNames = scoredGroups
        .filter(g => !unassignedGroups.includes(g))
        .flatMap(g => g.members.map(m => m.name));
      const rejectedNames = unassignedGroups.flatMap(g => g.members.map(m => m.name));
      if (placedNames.length > 0 && rejectedNames.length > 0) {
        conflicts.push({
          jour: anySlot.jour,
          debut: anySlot.debut,
          fin: anySlot.debut, // approximation, plusieurs profs possibles à cet horaire
          profName: 'plusieurs professeurs',
          placedNames,
          rejectedNames,
        });
      }
    }

    // Empêche de re-choisir indéfiniment le même horaire s'il ne reste plus
    // de terrain disponible dessus mais que des personnes n'ont pas pu être
    // casées (elles seront retentées à un autre horaire, ou en phase 5).
    if (entriesByTime[bestKey].length === 0) {
      // rien à faire, la boucle passera naturellement à un autre horaire au tour suivant
    }
  }


  // ---------- Phase 5 : consolidation, faire rejoindre les non-casés ----------
  // À ce stade, certaines personnes peuvent rester non casées alors qu'un
  // groupe déjà formé, au même horaire, avait de la place et un niveau
  // compatible — l'algo glouton des phases précédentes traite les créneaux
  // dans un ordre fixe et ne revient jamais en arrière pour optimiser le
  // remplissage. Cette dernière passe répare ce cas : pour chaque personne
  // encore non casée, on cherche le meilleur bloc existant (non verrouillé,
  // pas individuel, moins de 4 membres, niveau compatible, disponibilité
  // confirmée) qu'elle pourrait rejoindre, et on l'y ajoute.
  const studentsById = Object.fromEntries(students.map(s => [s.id, s]));

  Array.from(unplaced).forEach(studentId => {
    const s = studentsById[studentId];
    if (!s) return;
    if (s.preference_groupe === 'individuel') return; // ne rejoint jamais un cours groupe existant

    const key = norm(s.name);
    const usedDays = daysUsedByName[key];

    const candidateBlocks = result.filter(block => {
      if (block.locked) return false;
      if (block.studentIds.length === 0 || block.studentIds.length >= 4) return false;
      if (usedDays && usedDays.has(block.jour)) return false;
      if (!studentAvailableForSlot(s, block.jour, block.debut, block.fin)) return false;
      const members = block.studentIds.map(id => studentsById[id]).filter(Boolean);
      if (members.length === 0) return false;
      // Le bloc existant doit être un vrai cours de groupe (pas un individuel
      // déjà occupé) et le niveau doit rester cohérent avec TOUS ses membres.
      if (members.some(m => m.preference_groupe === 'individuel')) return false;
      if (!members.every(m => levelClose(s, m) && sameAgeCategory(s, m) && !isSameScheduleLinked(s, m))) return false;
      return true;
    });

    if (candidateBlocks.length === 0) return;

    // Priorité au bloc le moins rempli en premier (répartit mieux), puis à
    // la meilleure correspondance de préférence de prof.
    candidateBlocks.sort((a, b) => {
      const scoreA = a.studentIds.length + (s.prof_prefere && namesMatch(profs.find(p => p.id === a.profId)?.name || '', s.prof_prefere) ? -0.5 : 0);
      const scoreB = b.studentIds.length + (s.prof_prefere && namesMatch(profs.find(p => p.id === b.profId)?.name || '', s.prof_prefere) ? -0.5 : 0);
      return scoreA - scoreB;
    });

    const target = candidateBlocks[0];
    target.studentIds.push(s.id);
    unplaced.delete(s.id);
    if (!daysUsedByName[key]) daysUsedByName[key] = new Set();
    daysUsedByName[key].add(target.jour);
  });

  return {
    blocks: result,
    unplacedIds: Array.from(unplaced),
    sameScheduleUnresolved,
    conflicts,
  };
}

module.exports = { generatePlanningProposal, JOURS };
