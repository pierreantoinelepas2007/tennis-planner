const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { pool, initDb } = require('./db');
const { generatePlanningProposal } = require('./planningEngine');
const { seedIfEmpty } = require('./seed');
const { seedTestStudents } = require('./seedTestData');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uid = () => crypto.randomBytes(6).toString('hex');

// ---------- AUTHENTIFICATION ADMIN ----------
// Un seul mot de passe partagé (toi + le prof), stocké en variable
// d'environnement sur Render (jamais dans le code). Une fois connecté, le
// navigateur reçoit un jeton simple à renvoyer pour les routes protégées. Le
// formulaire d'inscription (POST /api/students) reste volontairement ouvert
// à tous, sans authentification, puisque c'est la seule route destinée au
// grand public.

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;
const ADMIN_TOKEN = crypto.randomBytes(24).toString('hex'); // régénéré à chaque démarrage du serveur

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: "Aucun mot de passe n'est configuré côté serveur." });
  }
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect.' });
  }
});

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!ADMIN_PASSWORD || token === ADMIN_TOKEN) {
    return next();
  }
  res.status(401).json({ error: 'Accès réservé, connexion requise.' });
}

// ---------- STUDENTS ----------

app.get('/api/students', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM students ORDER BY created_at ASC');
    const { rows: dispoRows } = await pool.query('SELECT * FROM student_disponibilites');
    const students = rows.map(r => ({
      id: r.id,
      name: r.name,
      age: r.age,
      classement: r.classement,
      niveauEtoile: r.niveau_etoile,
      preferenceGroupe: r.preference_groupe,
      jouerAvec: r.jouer_avec || [],
      memeHoraireAvec: r.terrain_adjacent_avec,
      profPrefere: r.prof_prefere,
      disponibilites: dispoRows.filter(d => d.student_id === r.id).map(d => ({ jour: d.jour, heure: d.heure })),
    }));
    res.json(students);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des élèves.' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const b = req.body;
    if (!b.name || !b.name.trim()) {
      return res.status(400).json({ error: 'Le nom est obligatoire.' });
    }
    const id = uid();
    await pool.query(
      `INSERT INTO students (id, name, age, classement, niveau_etoile, preference_groupe, jouer_avec, terrain_adjacent_avec, prof_prefere)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, b.name.trim(), b.age || null, b.classement || null, b.niveauEtoile || null, b.preferenceGroupe || 'indifferent',
        JSON.stringify(b.jouerAvec || []), b.memeHoraireAvec || null, b.profPrefere || null]
    );
    const disponibilites = Array.isArray(b.disponibilites) ? b.disponibilites : [];
    for (const d of disponibilites) {
      await pool.query(
        'INSERT INTO student_disponibilites (id, student_id, jour, heure) VALUES ($1, $2, $3, $4)',
        [uid(), id, d.jour, d.heure]
      );
    }
    res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement de l'élève." });
  }
});

app.patch('/api/students/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    if ('niveauEtoile' in b) {
      await pool.query('UPDATE students SET niveau_etoile = $1 WHERE id = $2', [b.niveauEtoile, req.params.id]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour.' });
  }
});

app.delete('/api/students/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

// ---------- PROFS ----------

app.get('/api/profs', requireAdmin, async (req, res) => {
  try {
    const { rows: profRows } = await pool.query('SELECT * FROM profs ORDER BY created_at ASC');
    const { rows: dispoRows } = await pool.query('SELECT * FROM prof_disponibilites');
    const profs = profRows.map(p => ({
      id: p.id,
      name: p.name,
      specialite: p.specialite,
      disponibilites: dispoRows.filter(d => d.prof_id === p.id).map(d => ({ id: d.id, jour: d.jour, debut: d.debut, fin: d.fin })),
    }));
    res.json(profs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des professeurs.' });
  }
});

// Route publique allégée (sans mot de passe), utilisée uniquement par le
// formulaire d'inscription pour proposer la liste des noms de profs dans un
// menu déroulant. Ne renvoie que les noms, aucune autre donnée.
app.get('/api/profs/names', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT name FROM profs ORDER BY created_at ASC');
    res.json(rows.map(r => r.name));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/profs', requireAdmin, async (req, res) => {
  try {
    const { name, specialite } = req.body;
    const id = uid();
    await pool.query('INSERT INTO profs (id, name, specialite) VALUES ($1, $2, $3)', [id, name, specialite || null]);
    res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement du professeur." });
  }
});

app.delete('/api/profs/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM planning_blocks WHERE prof_id = $1', [req.params.id]);
    if (parseInt(rows[0].count, 10) > 0) {
      return res.status(409).json({ error: "Ce professeur apparaît dans le planning actuel. Supprimez ou modifiez d'abord ses cours dans l'onglet Planning avant de le retirer." });
    }
    await pool.query('DELETE FROM profs WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

app.post('/api/profs/:id/disponibilites', requireAdmin, async (req, res) => {
  try {
    const { jour, debut, fin } = req.body;
    const id = uid();
    await pool.query('INSERT INTO prof_disponibilites (id, prof_id, jour, debut, fin) VALUES ($1, $2, $3, $4, $5)',
      [id, req.params.id, jour, debut, fin]);
    res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur lors de l'ajout du créneau." });
  }
});

app.delete('/api/profs/:profId/disponibilites/:dispoId', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM prof_disponibilites WHERE id = $1 AND prof_id = $2', [req.params.dispoId, req.params.profId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du créneau.' });
  }
});

// ---------- COURTS ----------

app.get('/api/courts', requireAdmin, async (req, res) => {
  try {
    const { rows: courtRows } = await pool.query('SELECT * FROM courts ORDER BY created_at ASC');
    const { rows: slotRows } = await pool.query('SELECT * FROM court_slots');
    const courts = courtRows.map(c => ({
      id: c.id,
      name: c.name,
      slots: slotRows.filter(s => s.court_id === c.id).map(s => ({ id: s.id, jour: s.jour, debut: s.debut, fin: s.fin })),
    }));
    res.json(courts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des terrains.' });
  }
});

app.post('/api/courts', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const id = uid();
    await pool.query('INSERT INTO courts (id, name) VALUES ($1, $2)', [id, name]);
    res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement du terrain." });
  }
});

app.delete('/api/courts/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM planning_blocks WHERE court_id = $1', [req.params.id]);
    if (parseInt(rows[0].count, 10) > 0) {
      return res.status(409).json({ error: "Ce terrain apparaît dans le planning actuel. Supprimez ou modifiez d'abord ses cours dans l'onglet Planning avant de le retirer." });
    }
    await pool.query('DELETE FROM courts WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

app.post('/api/courts/:id/slots', requireAdmin, async (req, res) => {
  try {
    const { jour, debut, fin } = req.body;
    const id = uid();
    await pool.query('INSERT INTO court_slots (id, court_id, jour, debut, fin) VALUES ($1, $2, $3, $4, $5)',
      [id, req.params.id, jour, debut, fin]);
    res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur lors de l'ajout du créneau." });
  }
});

app.delete('/api/courts/:courtId/slots/:slotId', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM court_slots WHERE id = $1 AND court_id = $2', [req.params.slotId, req.params.courtId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du créneau.' });
  }
});

// ---------- PLANNING ----------

app.get('/api/planning', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM planning_blocks ORDER BY created_at ASC');
    const blocks = rows.map(r => ({
      id: r.id,
      slotId: r.slot_id,
      courtId: r.court_id,
      profId: r.prof_id,
      jour: r.jour,
      debut: r.debut,
      fin: r.fin,
      studentIds: r.student_ids || [],
      score: r.score,
      locked: r.locked || false,
    }));
    res.json(blocks);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du planning.' });
  }
});

app.post('/api/planning/generate', requireAdmin, async (req, res) => {
  try {
    const { rows: studentRows } = await pool.query('SELECT * FROM students');
    const { rows: studentDispoRows } = await pool.query('SELECT * FROM student_disponibilites');
    const { rows: profRows } = await pool.query('SELECT * FROM profs');
    const { rows: dispoRows } = await pool.query('SELECT * FROM prof_disponibilites');
    const { rows: courtRows } = await pool.query('SELECT * FROM courts');
    const { rows: slotRows } = await pool.query('SELECT * FROM court_slots');
    const { rows: lockedBlocks } = await pool.query('SELECT * FROM planning_blocks WHERE locked = true');

    // Les personnes déjà placées dans un cours verrouillé ne sont plus
    // candidates pour le reste de la génération (cette demande de cours est
    // considérée réglée par le professeur).
    const lockedStudentIds = new Set(lockedBlocks.flatMap(b => b.student_ids || []));
    const students = studentRows
      .filter(s => !lockedStudentIds.has(s.id))
      .map(s => ({
        ...s,
        jouer_avec: s.jouer_avec || [],
        meme_horaire_avec: s.terrain_adjacent_avec,
        disponibilites: studentDispoRows.filter(d => d.student_id === s.id),
      }));
    const profs = profRows.map(p => ({
      ...p,
      disponibilites: dispoRows.filter(d => d.prof_id === p.id),
    }));

    // Les créneaux (terrain + jour + heure) déjà occupés par un cours
    // verrouillé ne sont plus proposés à l'algorithme, pour ne jamais
    // créer de double réservation avec un cours que le professeur a fixé.
    const lockedSlotKeys = new Set(
      lockedBlocks.map(b => `${b.court_id}|${b.jour}|${b.debut}|${b.fin}`)
    );
    const availableSlots = slotRows.filter(s =>
      !lockedSlotKeys.has(`${s.court_id}|${s.jour}|${s.debut}|${s.fin}`)
    );

    const proposal = generatePlanningProposal(students, profs, courtRows, availableSlots);

    await pool.query('DELETE FROM planning_blocks WHERE locked = false OR locked IS NULL');
    for (const b of proposal.blocks) {
      const id = uid();
      await pool.query(
        `INSERT INTO planning_blocks (id, slot_id, court_id, prof_id, jour, debut, fin, student_ids, score, locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)`,
        [id, b.slotId, b.courtId, b.profId, b.jour, b.debut, b.fin, JSON.stringify(b.studentIds), b.score]
      );
    }

    const unplacedStudents = students.filter(s => proposal.unplacedIds.includes(s.id)).map(s => ({ id: s.id, name: s.name }));

    res.json({
      blocksCount: proposal.blocks.length,
      unplacedStudents,
      sameScheduleUnresolved: proposal.sameScheduleUnresolved,
      conflicts: proposal.conflicts,
      lockedBlocksKept: lockedBlocks.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la génération du planning.' });
  }
});

app.patch('/api/planning/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    if ('courtId' in b) { fields.push(`court_id = $${idx++}`); values.push(b.courtId); }
    if ('profId' in b) { fields.push(`prof_id = $${idx++}`); values.push(b.profId); }
    if ('studentIds' in b) { fields.push(`student_ids = $${idx++}`); values.push(JSON.stringify(b.studentIds)); }
    if ('locked' in b) { fields.push(`locked = $${idx++}`); values.push(!!b.locked); }
    if (fields.length === 0) return res.json({ ok: true });
    values.push(req.params.id);
    await pool.query(`UPDATE planning_blocks SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du planning.' });
  }
});

app.delete('/api/planning/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM planning_blocks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

// ---------- TEMPORAIRE : jeu de données de test (à retirer après validation) ----------
// Déclenché manuellement via /api/test/seed?key=demo pour insérer 21 participants
// fictifs variés, et /api/test/clear?key=demo pour tout retirer proprement.

app.post('/api/test/seed', requireAdmin, async (req, res) => {
  if (req.query.key !== 'demo') return res.status(403).json({ error: 'Clé invalide.' });
  try {
    const ids = await seedTestStudents(pool);
    res.json({ ok: true, count: ids.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de l\'insertion des données de test.' });
  }
});

app.post('/api/test/clear', requireAdmin, async (req, res) => {
  if (req.query.key !== 'demo') return res.status(403).json({ error: 'Clé invalide.' });
  try {
    const testNames = [
      'Léa Dupont', 'Tom Dupont', 'Manon Petit', 'Hugo Petit', 'Emma Lefevre', 'Chloé Bernard',
      'Nathan Girard', 'Louis Girard', 'Adam Roux', 'Zoé Martin', 'Noah Simon', 'Sarah Moreau',
      'Gabriel Laurent', 'Inès Fabre', 'Théo Blanc', 'Rose Fontaine', 'Sacha Perrin', 'Louna Dubois',
      'Mathis Renard', 'Alice Colin', 'Ethan Faure',
    ];
    const { rows } = await pool.query('SELECT id FROM students WHERE name = ANY($1)', [testNames]);
    const ids = rows.map(r => r.id);
    if (ids.length > 0) {
      await pool.query('DELETE FROM students WHERE id = ANY($1)', [ids]);
    }
    await pool.query('DELETE FROM planning_blocks');
    res.json({ ok: true, removed: ids.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors du nettoyage des données de test.' });
  }
});

// ---------- Frontend statique (build React) ----------

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist, {
  setHeaders: (res, filePath) => {
    // index.html ne doit jamais être mis en cache par le navigateur : c'est
    // lui qui référence les fichiers JS/CSS buildés (avec un nom unique par
    // build), donc une version mise en cache pointerait vers d'anciens
    // fichiers qui n'existent plus après un nouveau déploiement, laissant
    // l'utilisateur bloqué sur une ancienne version du site sans le savoir.
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ---------- Démarrage ----------

initDb()
  .then(() => seedIfEmpty(pool))
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Erreur lors de l\'initialisation de la base de données :', err);
    process.exit(1);
  });
