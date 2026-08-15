// Routes API dédiées au padel, entièrement séparées du tennis (tables
// préfixées padel_*). Exportent une fonction qui reçoit l'app Express, le
// pool PostgreSQL, la fonction uid(), et le middleware requireAdmin, pour
// rester cohérentes avec le reste de server.js sans dépendre de variables
// globales.

function computeAgeFromBirthDate(dateNaissance) {
  if (!dateNaissance) return null;
  const birth = new Date(dateNaissance);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}

function registerPadelRoutes(app, pool, uid, requireAdmin) {
  // ---------- STUDENTS (participants padel) ----------

  app.get('/api/padel/students', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM padel_students ORDER BY created_at ASC');
      const { rows: dispoRows } = await pool.query('SELECT * FROM padel_student_disponibilites');
      const students = rows.map(r => ({
        id: r.id,
        name: r.name,
        age: r.age,
        dateNaissance: r.date_naissance ? r.date_naissance.toISOString().slice(0, 10) : null,
        adresse: r.adresse,
        email: r.email,
        telephone: r.telephone,
        preferenceGroupe: r.preference_groupe,
        tailleGroupe: r.taille_groupe,
        dureeMinutes: r.duree_minutes,
        jouerAvec: r.jouer_avec || [],
        memeHoraireAvec: r.meme_horaire_avec,
        profPrefere: r.prof_prefere,
        disponibilites: dispoRows.filter(d => d.student_id === r.id).map(d => ({ jour: d.jour, heure: d.heure })),
      }));
      res.json(students);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des participants padel.' });
    }
  });

  app.post('/api/padel/students/batch', async (req, res) => {
    const client = await pool.connect();
    try {
      const b = req.body;
      if (!b.name || !b.name.trim()) {
        return res.status(400).json({ error: 'Le nom est obligatoire.' });
      }
      const courses = Array.isArray(b.courses) ? b.courses : [];
      if (courses.length === 0) {
        return res.status(400).json({ error: 'Au moins une heure de cours doit être renseignée.' });
      }
      if (courses.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 heures de cours par semaine.' });
      }

      const computedAge = computeAgeFromBirthDate(b.dateNaissance);
      const createdIds = [];

      await client.query('BEGIN');
      for (const course of courses) {
        const id = uid();
        await client.query(
          `INSERT INTO padel_students (id, name, age, date_naissance, adresse, email, telephone, preference_groupe, taille_groupe, duree_minutes, jouer_avec, meme_horaire_avec, prof_prefere)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [id, b.name.trim(), computedAge, b.dateNaissance || null, b.adresse || null, b.email || null, b.telephone || null,
            course.preferenceGroupe || 'indifferent', course.tailleGroupe || null, course.dureeMinutes || null,
            JSON.stringify(course.jouerAvec || []), course.memeHoraireAvec || null, course.profPrefere || null]
        );
        const disponibilites = Array.isArray(course.disponibilites) ? course.disponibilites : [];
        for (const d of disponibilites) {
          await client.query(
            'INSERT INTO padel_student_disponibilites (id, student_id, jour, heure) VALUES ($1, $2, $3, $4)',
            [uid(), id, d.jour, d.heure]
          );
        }
        createdIds.push(id);
      }
      await client.query('COMMIT');
      res.status(201).json({ ids: createdIds });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(e);
      res.status(500).json({ error: "Erreur serveur lors de l'enregistrement de l'inscription padel." });
    } finally {
      client.release();
    }
  });

  app.delete('/api/padel/students/:id', requireAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM padel_students WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
    }
  });

  // ---------- PROFS ----------

  app.get('/api/padel/profs', requireAdmin, async (req, res) => {
    try {
      const { rows: profRows } = await pool.query('SELECT * FROM padel_profs ORDER BY created_at ASC');
      const { rows: dispoRows } = await pool.query('SELECT * FROM padel_prof_disponibilites');
      const profs = profRows.map(p => ({
        id: p.id,
        name: p.name,
        specialite: p.specialite,
        disponibilites: dispoRows.filter(d => d.prof_id === p.id).map(d => ({ id: d.id, courtId: d.court_id, jour: d.jour, debut: d.debut, fin: d.fin })),
      }));
      res.json(profs);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des professeurs padel.' });
    }
  });

  app.get('/api/padel/profs/names', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, name FROM padel_profs ORDER BY created_at ASC');
      const { rows: dispoRows } = await pool.query('SELECT * FROM padel_prof_disponibilites');
      const profs = rows.map(p => ({
        name: p.name,
        disponibilites: dispoRows.filter(d => d.prof_id === p.id).map(d => ({ courtId: d.court_id, jour: d.jour, debut: d.debut, fin: d.fin })),
      }));
      res.json(profs);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  });

  app.post('/api/padel/profs', requireAdmin, async (req, res) => {
    try {
      const { name, specialite } = req.body;
      const id = uid();
      await pool.query('INSERT INTO padel_profs (id, name, specialite) VALUES ($1, $2, $3)', [id, name, specialite || null]);
      res.status(201).json({ id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erreur serveur lors de l'ajout du professeur." });
    }
  });

  app.delete('/api/padel/profs/:id', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT COUNT(*) FROM padel_planning_blocks WHERE prof_id = $1', [req.params.id]);
      if (parseInt(rows[0].count, 10) > 0) {
        return res.status(409).json({ error: "Ce professeur apparaît dans le planning padel actuel. Supprimez ou modifiez d'abord ses cours avant de le retirer." });
      }
      await pool.query('DELETE FROM padel_profs WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
    }
  });

  app.post('/api/padel/profs/:id/disponibilites', requireAdmin, async (req, res) => {
    try {
      const { jour, debut, fin, courtId } = req.body;
      if (!courtId) {
        return res.status(400).json({ error: 'Le terrain est obligatoire pour un créneau de professeur.' });
      }
      const id = uid();
      await pool.query('INSERT INTO padel_prof_disponibilites (id, prof_id, court_id, jour, debut, fin) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, req.params.id, courtId, jour, debut, fin]);
      res.status(201).json({ id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erreur serveur lors de l'ajout du créneau." });
    }
  });

  app.delete('/api/padel/profs/:profId/disponibilites/:dispoId', requireAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM padel_prof_disponibilites WHERE id = $1 AND prof_id = $2', [req.params.dispoId, req.params.profId]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
    }
  });

  // ---------- COURTS (terrains padel) ----------

  app.get('/api/padel/courts', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM padel_courts ORDER BY created_at ASC');
      res.json(rows.map(c => ({ id: c.id, name: c.name })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des terrains padel.' });
    }
  });

  app.post('/api/padel/courts', requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      const id = uid();
      await pool.query('INSERT INTO padel_courts (id, name) VALUES ($1, $2)', [id, name]);
      res.status(201).json({ id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erreur serveur lors de l'ajout du terrain." });
    }
  });

  app.delete('/api/padel/courts/:id', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT COUNT(*) FROM padel_planning_blocks WHERE court_id = $1', [req.params.id]);
      if (parseInt(rows[0].count, 10) > 0) {
        return res.status(409).json({ error: "Ce terrain apparaît dans le planning padel actuel. Supprimez ou modifiez d'abord ses cours avant de le retirer." });
      }
      await pool.query('DELETE FROM padel_courts WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
    }
  });

  // ---------- PLANNING ----------

  app.get('/api/padel/planning', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM padel_planning_blocks ORDER BY created_at ASC');
      const blocks = rows.map(r => ({
        id: r.id,
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
      res.status(500).json({ error: 'Erreur serveur lors de la récupération du planning padel.' });
    }
  });

  app.post('/api/padel/planning', requireAdmin, async (req, res) => {
    try {
      const b = req.body;
      if (!b.courtId || !b.profId || !b.jour || !b.debut || !b.fin) {
        return res.status(400).json({ error: 'Informations de créneau incomplètes.' });
      }
      const { rows: courtConflict } = await pool.query(
        'SELECT id FROM padel_planning_blocks WHERE court_id = $1 AND jour = $2 AND debut = $3 AND fin = $4',
        [b.courtId, b.jour, b.debut, b.fin]
      );
      if (courtConflict.length > 0) {
        return res.status(409).json({ error: 'Ce terrain est déjà utilisé à ce créneau.' });
      }
      const { rows: profConflict } = await pool.query(
        'SELECT id FROM padel_planning_blocks WHERE prof_id = $1 AND jour = $2 AND debut = $3 AND fin = $4',
        [b.profId, b.jour, b.debut, b.fin]
      );
      if (profConflict.length > 0) {
        return res.status(409).json({ error: 'Ce professeur est déjà occupé à ce créneau.' });
      }
      const id = uid();
      await pool.query(
        `INSERT INTO padel_planning_blocks (id, court_id, prof_id, jour, debut, fin, student_ids, score, locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
        [id, b.courtId, b.profId, b.jour, b.debut, b.fin, JSON.stringify(b.studentIds || []), 0]
      );
      res.status(201).json({ id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la création du cours padel.' });
    }
  });

  app.patch('/api/padel/planning/:id', requireAdmin, async (req, res) => {
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
      await pool.query(`UPDATE padel_planning_blocks SET ${fields.join(', ')} WHERE id = $${idx}`, values);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la mise à jour.' });
    }
  });

  app.delete('/api/padel/planning/:id', requireAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM padel_planning_blocks WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
    }
  });
}

module.exports = { registerPadelRoutes };
