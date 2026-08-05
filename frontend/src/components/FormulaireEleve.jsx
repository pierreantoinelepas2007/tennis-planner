import React, { useState, useEffect } from 'react';
import { Card, TextField, SelectField } from './Common.jsx';
import { api } from '../api.js';
import CoursBlock from './CoursBlock.jsx';

// Échelle des classements belges (AFT / Tennis Padel Wallonie-Bruxelles), du
// plus faible au plus fort, telle qu'affichée dans le formulaire. "Non
// classé" est la valeur par défaut pour les participants qui n'ont jamais participé
// à une compétition officielle.
const CLASSEMENT_OPTIONS = [
  { value: '', label: 'Non classé' },
  { value: 'C30.6', label: 'C30.6' },
  { value: 'C30.5', label: 'C30.5' },
  { value: 'C30.4', label: 'C30.4' },
  { value: 'C30.3', label: 'C30.3' },
  { value: 'C30.2', label: 'C30.2' },
  { value: 'C30.1', label: 'C30.1' },
  { value: 'C30', label: 'C30' },
  { value: 'C15.5', label: 'C15.5' },
  { value: 'C15.4', label: 'C15.4' },
  { value: 'C15.3', label: 'C15.3' },
  { value: 'C15.2', label: 'C15.2' },
  { value: 'C15.1', label: 'C15.1' },
  { value: 'C15', label: 'C15' },
  { value: 'B+4/6', label: 'B+4/6' },
  { value: 'B+2/6', label: 'B+2/6' },
  { value: 'B0', label: 'B0' },
  { value: 'B-2/6', label: 'B-2/6' },
  { value: 'B-4/6', label: 'B-4/6' },
  { value: 'B-15', label: 'B-15' },
  { value: 'B-15.1', label: 'B-15.1' },
  { value: 'B-15.2', label: 'B-15.2' },
  { value: 'B-15.4', label: 'B-15.4' },
  { value: 'A national', label: 'A national' },
  { value: 'A international', label: 'A international' },
];

// Horaires officiels du club par catégorie d'âge (extraits du flyer
// d'inscription 2026-2027). Chaque entrée liste les heures de DÉBUT des
// créneaux d'une heure disponibles ce jour-là pour la catégorie.
const CATEGORY_SCHEDULES = {
  baby: { Samedi: [10, 11] },
  mini: {
    Mardi: [16, 17, 18],
    Mercredi: [13, 14, 15, 16, 17],
    Jeudi: [16, 17],
    Vendredi: [16, 17, 18],
    Samedi: [10, 11, 12, 13, 14, 15, 16],
  },
  tennis: {
    Lundi: [18],
    Mardi: [16, 17, 18, 19],
    Mercredi: [13, 14, 15, 16, 17, 18, 19],
    Jeudi: [16, 17, 18],
    Vendredi: [16, 17, 18, 19],
    Samedi: [12, 13, 14, 15, 16, 17],
  },
};

const CATEGORY_LABELS = {
  baby: 'Baby-tennis (2022 et après)',
  mini: 'Mini-tennis (2018-2021)',
  tennis: 'Tennis (2017 et avant)',
};

const MAX_COURSES = 5;

// Détermine la catégorie d'âge officielle du club à partir d'une date de
// naissance, cohérent avec le calcul fait côté serveur (voir
// backend/planningEngine.js, fonction ageCategory).
function computeAgeCategory(dateNaissance) {
  if (!dateNaissance) return null;
  const birth = new Date(dateNaissance);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  if (age <= 4) return 'baby';
  if (age <= 8) return 'mini';
  return 'tennis';
}

function allowedSlotsForCategory(category) {
  const schedule = CATEGORY_SCHEDULES[category];
  if (!schedule) return null;
  const slots = [];
  Object.entries(schedule).forEach(([jour, heures]) => {
    heures.forEach(h => slots.push({ jour, heure: `${h.toString().padStart(2, '0')}:00` }));
  });
  return slots;
}

function makeEmptyCourse() {
  return {
    preferenceGroupe: 'indifferent',
    tailleGroupe: '',
    dureeMinutes: null,
    jouerAvec: '',
    memeHoraireAvec: '',
    profPrefere: '',
    disponibilites: [],
  };
}

export default function FormulaireEleve({ onCreated }) {
  const [name, setName] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [adresse, setAdresse] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [classement, setClassement] = useState('');
  const [courses, setCourses] = useState([makeEmptyCourse()]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [profs, setProfs] = useState([]);
  const [lastSubmittedName, setLastSubmittedName] = useState('');

  useEffect(() => {
    api.getProfNames().then(setProfs).catch(() => setProfs([]));
  }, []);

  const ageCategory = computeAgeCategory(dateNaissance);
  const baseSlots = ageCategory ? allowedSlotsForCategory(ageCategory) : null;

  const resetAll = () => {
    setName(''); setDateNaissance(''); setAdresse(''); setEmail(''); setTelephone(''); setClassement('');
    setCourses([makeEmptyCourse()]);
  };

  const updateCourse = (index, nextCourse) => {
    setCourses(prev => prev.map((c, i) => (i === index ? nextCourse : c)));
  };

  const addCourse = () => {
    if (courses.length >= MAX_COURSES) return;
    setCourses(prev => [...prev, makeEmptyCourse()]);
  };

  const removeCourse = (index) => {
    setCourses(prev => prev.filter((_, i) => i !== index));
  };

  const doSubmit = async () => {
    if (!name.trim() || submitting) return;
    if (!adresse.trim()) {
      setError("L'adresse est obligatoire.");
      return;
    }
    if (!email.trim()) {
      setError("L'adresse email est obligatoire.");
      return;
    }
    if (!telephone.trim()) {
      setError('Le numéro de téléphone est obligatoire.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createStudentBatch({
        name: name.trim(),
        dateNaissance: dateNaissance || null,
        adresse: adresse.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        classement: classement || 'Non classé',
        courses: courses.map(c => ({
          preferenceGroupe: c.preferenceGroupe,
          tailleGroupe: c.tailleGroupe || null,
          dureeMinutes: c.dureeMinutes,
          jouerAvec: c.jouerAvec.split(',').map(s => s.trim()).filter(Boolean),
          memeHoraireAvec: c.memeHoraireAvec.trim(),
          profPrefere: c.profPrefere.trim(),
          disponibilites: c.disponibilites,
        })),
      });
      setLastSubmittedName(name.trim());
      setSubmitted(true);
      if (onCreated) onCreated();
    } catch (err) {
      setError("L'inscription n'a pas pu être enregistrée. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    doSubmit();
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Card>
        {submitted ? (
          <>
            <h2 style={{ marginTop: 0 }}>Inscription enregistrée</h2>
            <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 20 }}>
              L'inscription de <b>{lastSubmittedName}</b> ({courses.length} heure{courses.length > 1 ? 's' : ''} de cours) a bien été enregistrée.
            </div>
            <button onClick={resetAll} style={{ width: '100%' }}>
              Nouvelle inscription
            </button>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Inscription à l'école de tennis</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: -8, marginBottom: 20 }}>
              Si plusieurs heures de cours sont souhaitées par semaine, ajoutez-les toutes ci-dessous avant de valider — tout est enregistré en une seule fois.
            </p>

            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <h3 style={{ fontSize: 15, marginBottom: 4 }}>Informations personnelles</h3>
              <TextField label="Nom" value={name} onChange={setName} placeholder="Prénom et nom" />

              <label style={{ display: 'block', marginBottom: 18 }}>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Date de naissance</span>
                <input
                  type="date"
                  value={dateNaissance}
                  onChange={e => setDateNaissance(e.target.value)}
                  style={{ width: '100%' }}
                />
                {ageCategory && (
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Catégorie : {CATEGORY_LABELS[ageCategory]}
                  </span>
                )}
              </label>

              <TextField label="Adresse" value={adresse} onChange={setAdresse} placeholder="Rue, numéro, code postal, ville" />
              <TextField label="Email" value={email} onChange={setEmail} placeholder="exemple@email.com" />
              <TextField label="Numéro de téléphone" value={telephone} onChange={setTelephone} placeholder="Ex : 0470 12 34 56" />

              <SelectField
                label="Classement officiel"
                value={classement}
                onChange={setClassement}
                options={CLASSEMENT_OPTIONS}
              />

              <h3 style={{ fontSize: 15, marginBottom: 4, marginTop: 24 }}>
                Vos cours ({courses.length} heure{courses.length > 1 ? 's' : ''} par semaine)
              </h3>

              {!dateNaissance ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Indiquez d'abord la date de naissance ci-dessus pour renseigner les cours souhaités.
                </p>
              ) : (
                <>
                  {courses.map((course, i) => (
                    <CoursBlock
                      key={i}
                      index={i}
                      course={course}
                      onChange={next => updateCourse(i, next)}
                      onRemove={() => removeCourse(i)}
                      canRemove={courses.length > 1}
                      profs={profs}
                      allowedSlotsForCategory={baseSlots}
                    />
                  ))}

                  {courses.length < MAX_COURSES && (
                    <button type="button" onClick={addCourse} style={{ width: '100%', marginBottom: 18 }}>
                      <i className="ti ti-plus" style={{ marginRight: 6 }}></i>
                      Ajouter une heure de cours ({courses.length}/{MAX_COURSES})
                    </button>
                  )}
                </>
              )}

              <button type="submit" disabled={submitting || !dateNaissance} style={{ width: '100%' }}>
                {submitting ? 'Enregistrement...' : "Enregistrer l'inscription"}
              </button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
