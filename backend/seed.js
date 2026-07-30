// Données initiales du club (terrains et disponibilités des professeurs),
// extraites du planning Excel fourni par le professeur.
// Ce script insère ces données UNE SEULE FOIS : si un terrain ou un
// professeur du même nom existe déjà, il n'est pas dupliqué.

const crypto = require('crypto');
const uid = () => crypto.randomBytes(6).toString('hex');

const SEED_COURTS = [
  {
    name: 'A',
    slots: [
      { jour: 'Mardi', debut: '16:00', fin: '17:00' },
      { jour: 'Mardi', debut: '17:00', fin: '18:00' },
      { jour: 'Mardi', debut: '18:00', fin: '19:00' },
      { jour: 'Mercredi', debut: '12:00', fin: '13:00' },
      { jour: 'Mercredi', debut: '13:00', fin: '14:00' },
      { jour: 'Mercredi', debut: '14:00', fin: '15:00' },
      { jour: 'Mercredi', debut: '15:00', fin: '16:00' },
      { jour: 'Mercredi', debut: '16:00', fin: '17:00' },
      { jour: 'Jeudi', debut: '16:00', fin: '17:00' },
      { jour: 'Jeudi', debut: '17:00', fin: '18:00' },
      { jour: 'Vendredi', debut: '16:00', fin: '17:00' },
      { jour: 'Vendredi', debut: '17:00', fin: '18:00' },
      { jour: 'Samedi', debut: '12:00', fin: '13:00' },
      { jour: 'Samedi', debut: '13:00', fin: '14:00' },
      { jour: 'Samedi', debut: '14:00', fin: '15:00' },
      { jour: 'Samedi', debut: '15:00', fin: '16:00' },
      { jour: 'Samedi', debut: '16:00', fin: '17:00' },
      { jour: 'Samedi', debut: '17:00', fin: '18:00' },
      { jour: 'Samedi', debut: '18:00', fin: '19:00' },
    ],
  },
  {
    name: 'B',
    slots: [
      { jour: 'Lundi', debut: '16:00', fin: '17:00' },
      { jour: 'Lundi', debut: '17:00', fin: '18:00' },
      { jour: 'Lundi', debut: '18:00', fin: '19:00' },
      { jour: 'Lundi', debut: '19:00', fin: '20:00' },
      { jour: 'Mercredi', debut: '12:00', fin: '13:00' },
      { jour: 'Mercredi', debut: '13:00', fin: '14:00' },
      { jour: 'Mercredi', debut: '14:00', fin: '15:00' },
      { jour: 'Mercredi', debut: '15:00', fin: '16:00' },
      { jour: 'Mercredi', debut: '16:00', fin: '17:00' },
      { jour: 'Mercredi', debut: '17:00', fin: '18:00' },
      { jour: 'Vendredi', debut: '16:00', fin: '17:00' },
      { jour: 'Vendredi', debut: '17:00', fin: '18:00' },
      { jour: 'Vendredi', debut: '18:00', fin: '19:00' },
      { jour: 'Samedi', debut: '09:00', fin: '10:00' },
      { jour: 'Samedi', debut: '10:00', fin: '11:00' },
      { jour: 'Samedi', debut: '11:00', fin: '12:00' },
      { jour: 'Samedi', debut: '12:00', fin: '13:00' },
      { jour: 'Samedi', debut: '13:00', fin: '14:00' },
      { jour: 'Samedi', debut: '14:00', fin: '15:00' },
    ],
  },
  {
    name: 'D',
    slots: [
      { jour: 'Lundi', debut: '16:00', fin: '17:00' },
      { jour: 'Lundi', debut: '17:00', fin: '18:00' },
      { jour: 'Lundi', debut: '18:00', fin: '19:00' },
      { jour: 'Lundi', debut: '19:00', fin: '20:00' },
      { jour: 'Lundi', debut: '20:00', fin: '21:00' },
      { jour: 'Mardi', debut: '16:00', fin: '17:00' },
      { jour: 'Mardi', debut: '17:00', fin: '18:00' },
      { jour: 'Mardi', debut: '18:00', fin: '19:00' },
      { jour: 'Mardi', debut: '19:00', fin: '20:00' },
      { jour: 'Mercredi', debut: '09:00', fin: '10:00' },
      { jour: 'Mercredi', debut: '10:00', fin: '11:00' },
      { jour: 'Mercredi', debut: '11:00', fin: '12:00' },
      { jour: 'Mercredi', debut: '12:00', fin: '13:00' },
      { jour: 'Mercredi', debut: '13:00', fin: '14:00' },
      { jour: 'Mercredi', debut: '14:00', fin: '15:00' },
      { jour: 'Mercredi', debut: '15:00', fin: '16:00' },
      { jour: 'Mercredi', debut: '16:00', fin: '17:00' },
      { jour: 'Mercredi', debut: '17:00', fin: '18:00' },
      { jour: 'Mercredi', debut: '18:00', fin: '19:00' },
      { jour: 'Mercredi', debut: '19:00', fin: '20:00' },
      { jour: 'Jeudi', debut: '16:00', fin: '17:00' },
      { jour: 'Jeudi', debut: '17:00', fin: '18:00' },
      { jour: 'Jeudi', debut: '18:00', fin: '19:00' },
      { jour: 'Vendredi', debut: '16:00', fin: '17:00' },
      { jour: 'Vendredi', debut: '17:00', fin: '18:00' },
      { jour: 'Vendredi', debut: '18:00', fin: '19:00' },
      { jour: 'Vendredi', debut: '19:00', fin: '20:00' },
      { jour: 'Samedi', debut: '09:00', fin: '10:00' },
      { jour: 'Samedi', debut: '10:00', fin: '11:00' },
      { jour: 'Samedi', debut: '11:00', fin: '12:00' },
      { jour: 'Samedi', debut: '12:00', fin: '13:00' },
      { jour: 'Samedi', debut: '13:00', fin: '14:00' },
      { jour: 'Samedi', debut: '14:00', fin: '15:00' },
      { jour: 'Samedi', debut: '15:00', fin: '16:00' },
      { jour: 'Samedi', debut: '16:00', fin: '17:00' },
      { jour: 'Samedi', debut: '17:00', fin: '18:00' },
      { jour: 'Samedi', debut: '18:00', fin: '19:00' },
    ],
  },
];

const SEED_PROFS = [
  {
    name: 'Fabio',
    disponibilites: [
      { jour: 'Vendredi', debut: '16:00', fin: '17:00' },
      { jour: 'Vendredi', debut: '17:00', fin: '18:00' },
    ],
  },
  {
    name: 'Flavian',
    disponibilites: [
      { jour: 'Lundi', debut: '16:00', fin: '17:00' },
      { jour: 'Lundi', debut: '17:00', fin: '18:00' },
      { jour: 'Lundi', debut: '18:00', fin: '19:00' },
      { jour: 'Lundi', debut: '19:00', fin: '20:00' },
      { jour: 'Lundi', debut: '20:00', fin: '21:00' },
      { jour: 'Mardi', debut: '16:00', fin: '17:00' },
      { jour: 'Mardi', debut: '17:00', fin: '18:00' },
      { jour: 'Mardi', debut: '18:00', fin: '19:00' },
      { jour: 'Vendredi', debut: '16:00', fin: '17:00' },
      { jour: 'Vendredi', debut: '17:00', fin: '18:00' },
      { jour: 'Vendredi', debut: '18:00', fin: '19:00' },
      { jour: 'Samedi', debut: '09:00', fin: '10:00' },
      { jour: 'Samedi', debut: '10:00', fin: '11:00' },
      { jour: 'Samedi', debut: '11:00', fin: '12:00' },
      { jour: 'Samedi', debut: '12:00', fin: '13:00' },
      { jour: 'Samedi', debut: '13:00', fin: '14:00' },
      { jour: 'Samedi', debut: '14:00', fin: '15:00' },
      { jour: 'Samedi', debut: '15:00', fin: '16:00' },
      { jour: 'Samedi', debut: '16:00', fin: '17:00' },
      { jour: 'Samedi', debut: '17:00', fin: '18:00' },
      { jour: 'Samedi', debut: '18:00', fin: '19:00' },
    ],
  },
  {
    name: 'Gauthier',
    disponibilites: [
      { jour: 'Lundi', debut: '16:00', fin: '17:00' },
      { jour: 'Lundi', debut: '17:00', fin: '18:00' },
      { jour: 'Lundi', debut: '18:00', fin: '19:00' },
      { jour: 'Lundi', debut: '19:00', fin: '20:00' },
      { jour: 'Mardi', debut: '16:00', fin: '17:00' },
      { jour: 'Mardi', debut: '17:00', fin: '18:00' },
      { jour: 'Mardi', debut: '18:00', fin: '19:00' },
      { jour: 'Mardi', debut: '19:00', fin: '20:00' },
      { jour: 'Mercredi', debut: '12:00', fin: '13:00' },
      { jour: 'Mercredi', debut: '13:00', fin: '14:00' },
      { jour: 'Mercredi', debut: '14:00', fin: '15:00' },
      { jour: 'Mercredi', debut: '15:00', fin: '16:00' },
      { jour: 'Mercredi', debut: '16:00', fin: '17:00' },
      { jour: 'Mercredi', debut: '17:00', fin: '18:00' },
      { jour: 'Mercredi', debut: '18:00', fin: '19:00' },
      { jour: 'Mercredi', debut: '19:00', fin: '20:00' },
      { jour: 'Jeudi', debut: '16:00', fin: '17:00' },
      { jour: 'Jeudi', debut: '17:00', fin: '18:00' },
      { jour: 'Samedi', debut: '09:00', fin: '10:00' },
      { jour: 'Samedi', debut: '10:00', fin: '11:00' },
      { jour: 'Samedi', debut: '11:00', fin: '12:00' },
      { jour: 'Samedi', debut: '12:00', fin: '13:00' },
      { jour: 'Samedi', debut: '13:00', fin: '14:00' },
      { jour: 'Samedi', debut: '14:00', fin: '15:00' },
    ],
  },
  {
    name: 'Nick',
    disponibilites: [
      { jour: 'Mercredi', debut: '09:00', fin: '10:00' },
      { jour: 'Mercredi', debut: '10:00', fin: '11:00' },
      { jour: 'Mercredi', debut: '11:00', fin: '12:00' },
      { jour: 'Mercredi', debut: '12:00', fin: '13:00' },
      { jour: 'Mercredi', debut: '13:00', fin: '14:00' },
      { jour: 'Mercredi', debut: '14:00', fin: '15:00' },
      { jour: 'Mercredi', debut: '15:00', fin: '16:00' },
      { jour: 'Mercredi', debut: '16:00', fin: '17:00' },
    ],
  },
  {
    name: 'Philippe',
    disponibilites: [
      { jour: 'Mercredi', debut: '12:00', fin: '13:00' },
      { jour: 'Mercredi', debut: '13:00', fin: '14:00' },
      { jour: 'Mercredi', debut: '14:00', fin: '15:00' },
      { jour: 'Mercredi', debut: '15:00', fin: '16:00' },
      { jour: 'Mercredi', debut: '16:00', fin: '17:00' },
      { jour: 'Mercredi', debut: '17:00', fin: '18:00' },
      { jour: 'Jeudi', debut: '16:00', fin: '17:00' },
      { jour: 'Jeudi', debut: '17:00', fin: '18:00' },
      { jour: 'Jeudi', debut: '18:00', fin: '19:00' },
      { jour: 'Vendredi', debut: '16:00', fin: '17:00' },
      { jour: 'Vendredi', debut: '17:00', fin: '18:00' },
      { jour: 'Vendredi', debut: '18:00', fin: '19:00' },
      { jour: 'Vendredi', debut: '19:00', fin: '20:00' },
      { jour: 'Samedi', debut: '12:00', fin: '13:00' },
      { jour: 'Samedi', debut: '13:00', fin: '14:00' },
      { jour: 'Samedi', debut: '14:00', fin: '15:00' },
      { jour: 'Samedi', debut: '15:00', fin: '16:00' },
      { jour: 'Samedi', debut: '16:00', fin: '17:00' },
      { jour: 'Samedi', debut: '17:00', fin: '18:00' },
      { jour: 'Samedi', debut: '18:00', fin: '19:00' },
    ],
  },
];

async function seedIfEmpty(pool) {
  const { rows: existingCourts } = await pool.query('SELECT name FROM courts');
  const existingCourtNames = new Set(existingCourts.map(r => r.name));

  for (const court of SEED_COURTS) {
    if (existingCourtNames.has(court.name)) continue;
    const courtId = uid();
    await pool.query('INSERT INTO courts (id, name) VALUES ($1, $2)', [courtId, court.name]);
    for (const slot of court.slots) {
      const slotId = uid();
      await pool.query(
        'INSERT INTO court_slots (id, court_id, jour, debut, fin) VALUES ($1, $2, $3, $4, $5)',
        [slotId, courtId, slot.jour, slot.debut, slot.fin]
      );
    }
    console.log(`Terrain "${court.name}" créé avec ${court.slots.length} créneaux.`);
  }

  const { rows: existingProfs } = await pool.query('SELECT name FROM profs');
  const existingProfNames = new Set(existingProfs.map(r => r.name));

  for (const prof of SEED_PROFS) {
    if (existingProfNames.has(prof.name)) continue;
    const profId = uid();
    await pool.query('INSERT INTO profs (id, name, specialite) VALUES ($1, $2, $3)', [profId, prof.name, null]);
    for (const dispo of prof.disponibilites) {
      const dispoId = uid();
      await pool.query(
        'INSERT INTO prof_disponibilites (id, prof_id, jour, debut, fin) VALUES ($1, $2, $3, $4, $5)',
        [dispoId, profId, dispo.jour, dispo.debut, dispo.fin]
      );
    }
    console.log(`Professeur "${prof.name}" créé avec ${prof.disponibilites.length} créneaux.`);
  }
}

module.exports = { seedIfEmpty };
