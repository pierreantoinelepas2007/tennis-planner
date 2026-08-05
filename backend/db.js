const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERREUR : la variable d\'environnement DATABASE_URL n\'est pas définie.');
  console.error('Sur Render, elle est fournie automatiquement si une base PostgreSQL est reliée au service.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('render.com')
    ? { rejectUnauthorized: false }
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age TEXT,
      date_naissance DATE,
      classement TEXT,
      niveau_etoile INTEGER,
      preference_groupe TEXT,
      jouer_avec JSONB DEFAULT '[]',
      terrain_adjacent_avec TEXT,
      prof_prefere TEXT,
      dispo_text TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // Migration : ajoute la colonne "date_naissance" si la table existait déjà
  // avant son introduction (ne fait rien si elle est déjà présente).
  await pool.query(`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS date_naissance DATE;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_disponibilites (
      id TEXT PRIMARY KEY,
      student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
      jour TEXT NOT NULL,
      heure TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      specialite TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prof_disponibilites (
      id TEXT PRIMARY KEY,
      prof_id TEXT REFERENCES profs(id) ON DELETE CASCADE,
      jour TEXT NOT NULL,
      debut TEXT NOT NULL,
      fin TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS courts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS court_slots (
      id TEXT PRIMARY KEY,
      court_id TEXT REFERENCES courts(id) ON DELETE CASCADE,
      jour TEXT NOT NULL,
      debut TEXT NOT NULL,
      fin TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS planning_blocks (
      id TEXT PRIMARY KEY,
      slot_id TEXT,
      court_id TEXT,
      prof_id TEXT,
      jour TEXT NOT NULL,
      debut TEXT NOT NULL,
      fin TEXT NOT NULL,
      student_ids JSONB DEFAULT '[]',
      score REAL,
      locked BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // Migration : ajoute la colonne "locked" si la table existait déjà avant
  // son introduction (ne fait rien si elle est déjà présente).
  await pool.query(`
    ALTER TABLE planning_blocks ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;
  `);

  console.log('Base de données initialisée (tables vérifiées/créées).');
}

module.exports = { pool, initDb };
