const crypto = require('crypto');
const uid = () => crypto.randomBytes(6).toString('hex');

// Données de départ pour le padel : un seul terrain générique pour
// l'instant (le club n'a qu'une structure de padel fermée, contrairement
// aux 3 terrains de tennis A/B/D). Le prof (Javier Rodriguez, Elite Padel
// Academy) n'est volontairement pas encore ajouté ici — à faire dans une
// prochaine étape une fois confirmé.
const SEED_PADEL_COURTS = [
  { name: 'Padel 1' },
];

async function seedPadelIfEmpty(pool) {
  const { rows: existingCourts } = await pool.query('SELECT name FROM padel_courts');
  const existingCourtNames = new Set(existingCourts.map(r => r.name));

  for (const court of SEED_PADEL_COURTS) {
    if (existingCourtNames.has(court.name)) continue;
    const courtId = uid();
    await pool.query('INSERT INTO padel_courts (id, name) VALUES ($1, $2)', [courtId, court.name]);
    console.log(`Terrain padel "${court.name}" créé.`);
  }
}

module.exports = { seedPadelIfEmpty };
