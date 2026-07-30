const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { pool, initDb } = require('./db');
const { generatePlanningProposal } = require('./planningEngine');
const { seedIfEmpty } = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uid = () => crypto.randomBytes(6).toString('hex');

// ---------- STUDENTS ----------

app.get('/api/students', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM students ORDER BY created_at ASC');
    const students = rows.map(r => ({
      id: r.id,
      name: r.name,
      age: r.age,
      classement: r.classement,
      niveauEtoile: r.niveau_etoile,
      preferenceGroupe: r.preference_groupe,
      jouerAvec: r.jouer_avec || [],
      terrainAdjacentAvec: r.terrain_adjacent_avec,
      profPrefere: r.prof_prefere,
      dispoText: r.dispo_text,
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
    const id = uid();
    await pool.query(
      `INSERT INTO students (id, name, age, classement, niveau_etoile, preference_groupe, jouer_avec, terrain_adjacent_avec, prof_prefere, dispo_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, b.name, b.age || null, b.classement || null, b.niveauEtoile || null, b.preferenceGroupe || 'indifferent',
        JSON.stringify(b.jouerAvec || []), b.terrainAdjacentAvec || null, b.profPrefere || null, b.dispoText || null]
    );
    res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement de l'élève." });
  }
});

app.patch('/api/students/:id', async (req, res) => {
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

app.delete('/api/students/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

// ---------- PROFS ----------

app.get('/api/profs', async (req, res) => {
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

app.post('/api/profs', async (req, res) => {
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

app.delete('/api/profs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM profs WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

app.post('/api/profs/:id/disponibilites', async (req, res) => {
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

app.delete('/api/profs/:profId/disponibilites/:dispoId', async (req, res) => {
  try {
    await pool.query('DELETE FROM prof_disponibilites WHERE id = $1 AND prof_id = $2', [req.params.dispoId, req.params.profId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du créneau.' });
  }
});

// ---------- COURTS ----------

app.get('/api/courts', async (req, res) => {
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

app.post('/api/courts', async (req, res) => {
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

app.delete('/api/courts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM courts WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

app.post('/api/courts/:id/slots', async (req, res) => {
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

app.delete('/api/courts/:courtId/slots/:slotId', async (req, res) => {
  try {
    await pool.query('DELETE FROM court_slots WHERE id = $1 AND court_id = $2', [req.params.slotId, req.params.courtId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du créneau.' });
  }
});

// ---------- PLANNING ----------

app.get('/api/planning', async (req, res) => {
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
    }));
    res.json(blocks);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du planning.' });
  }
});

app.post('/api/planning/generate', async (req, res) => {
  try {
    const { rows: studentRows } = await pool.query('SELECT * FROM students');
    const { rows: profRows } = await pool.query('SELECT * FROM profs');
    const { rows: dispoRows } = await pool.query('SELECT * FROM prof_disponibilites');
    const { rows: courtRows } = await pool.query('SELECT * FROM courts');
    const { rows: slotRows } = await pool.query('SELECT * FROM court_slots');

    const students = studentRows.map(s => ({ ...s, jouer_avec: s.jouer_avec || [] }));
    const profs = profRows.map(p => ({
      ...p,
      disponibilites: dispoRows.filter(d => d.prof_id === p.id),
    }));

    const proposal = generatePlanningProposal(students, profs, courtRows, slotRows);

    await pool.query('DELETE FROM planning_blocks');
    for (const b of proposal.blocks) {
      const id = uid();
      await pool.query(
        `INSERT INTO planning_blocks (id, slot_id, court_id, prof_id, jour, debut, fin, student_ids, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, b.slotId, b.courtId, b.profId, b.jour, b.debut, b.fin, JSON.stringify(b.studentIds), b.score]
      );
    }

    const unplacedStudents = students.filter(s => proposal.unplacedIds.includes(s.id)).map(s => ({ id: s.id, name: s.name }));

    res.json({
      blocksCount: proposal.blocks.length,
      unplacedStudents,
      siblingHints: proposal.siblingHints,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la génération du planning.' });
  }
});

app.patch('/api/planning/:id', async (req, res) => {
  try {
    const b = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    if ('courtId' in b) { fields.push(`court_id = $${idx++}`); values.push(b.courtId); }
    if ('profId' in b) { fields.push(`prof_id = $${idx++}`); values.push(b.profId); }
    if ('studentIds' in b) { fields.push(`student_ids = $${idx++}`); values.push(JSON.stringify(b.studentIds)); }
    if (fields.length === 0) return res.json({ ok: true });
    values.push(req.params.id);
    await pool.query(`UPDATE planning_blocks SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du planning.' });
  }
});

app.delete('/api/planning/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM planning_blocks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

// ---------- Frontend statique (build React) ----------

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
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