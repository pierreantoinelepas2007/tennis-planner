import React, { useState, useEffect } from 'react';
import { Card, TextField } from './Common.jsx';
import { api } from '../api.js';
import CoursBlockPadel from './CoursBlockPadel.jsx';

// Horaires officiels du club de padel (extraits du flyer d'inscription
// 2026-2027). Contrairement au tennis, certains créneaux démarrent à la
// demi-heure (16h30, 19h30...).
const PADEL_SCHEDULES = {
  mini: {
    Mercredi: ['14:00', '15:00', '16:00', '17:00'],
  },
  adulte: {
    Lundi: ['16:30', '18:00', '19:30'],
    Mardi: ['16:30', '18:00', '19:30'],
    Mercredi: ['18:00', '19:30'],
    Vendredi: ['18:00', '19:30'],
    Samedi: ['09:00', '10:30'],
  },
};

const CATEGORY_LABELS = {
  mini: 'Mini-Padel (2009 et après)',
  adulte: 'Padel Adulte (2009 et avant)',
};

const DUREE_PAR_CATEGORIE = {
  mini: 60,
  adulte: 90,
};

const MAX_COURSES = 5;

// Détermine la catégorie padel à partir d'une date de naissance : la
// coupure se fait sur l'année de naissance 2009, comme indiqué sur le
// flyer du club (contrairement au tennis qui utilise l'âge courant).
function computePadelCategory(dateNaissance) {
  if (!dateNaissance) return null;
  const birth = new Date(dateNaissance);
  if (Number.isNaN(birth.getTime())) return null;
  const birthYear = birth.getFullYear();
  return birthYear >= 2009 ? 'mini' : 'adulte';
}

function allowedSlotsForCategory(category) {
  const schedule = PADEL_SCHEDULES[category];
  if (!schedule) return null;
  const slots = [];
  Object.entries(schedule).forEach(([jour, heures]) => {
    heures.forEach(heure => slots.push({ jour, heure }));
  });
  return slots;
}

function makeEmptyCourse() {
  return {
    tailleGroupe: '2',
    jouerAvec: '',
    memeHoraireAvec: '',
    profPrefere: '',
    disponibilites: [],
  };
}

export default function FormulaireElevePadel({ onCreated }) {
  const [name, setName] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [adresse, setAdresse] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [courses, setCourses] = useState([makeEmptyCourse()]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [profs, setProfs] = useState([]);
  const [lastSubmittedName, setLastSubmittedName] = useState('');

  useEffect(() => {
    api.getPadelProfNames().then(setProfs).catch(() => setProfs([]));
  }, []);

  const category = computePadelCategory(dateNaissance);
  const baseSlots = category ? allowedSlotsForCategory(category) : null;
  const dureeMinutes = category ? DUREE_PAR_CATEGORIE[category] : null;

  const resetAll = () => {
    setName(''); setDateNaissance(''); setAdresse(''); setEmail(''); setTelephone('');
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
      await api.createPadelStudentBatch({
        name: name.trim(),
        dateNaissance: dateNaissance || null,
        adresse: adresse.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        courses: courses.map(c => ({
          preferenceGroupe: 'groupe',
          tailleGroupe: c.tailleGroupe,
          dureeMinutes,
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
              L'inscription de <b>{lastSubmittedName}</b> ({courses.length} séance{courses.length > 1 ? 's' : ''} de padel) a bien été enregistrée.
            </div>
            <button onClick={resetAll} style={{ width: '100%' }}>
              Nouvelle inscription
            </button>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Inscription à l'école de padel</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: -8, marginBottom: 20 }}>
              Si plusieurs séances par semaine sont souhaitées, ajoutez-les toutes ci-dessous avant de valider — tout est enregistré en une seule fois.
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
                {category && (
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Catégorie : {CATEGORY_LABELS[category]}
                  </span>
                )}
              </label>

              <TextField label="Adresse" value={adresse} onChange={setAdresse} placeholder="Rue, numéro, code postal, ville" />
              <TextField label="Email" value={email} onChange={setEmail} placeholder="exemple@email.com" />
              <TextField label="Numéro de téléphone" value={telephone} onChange={setTelephone} placeholder="Ex : 0470 12 34 56" />

              <h3 style={{ fontSize: 15, marginBottom: 4, marginTop: 24 }}>
                Vos séances ({courses.length} par semaine)
              </h3>

              {!dateNaissance ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Indiquez d'abord la date de naissance ci-dessus pour renseigner les séances souhaitées.
                </p>
              ) : (
                <>
                  {courses.map((course, i) => (
                    <CoursBlockPadel
                      key={i}
                      index={i}
                      course={course}
                      onChange={next => updateCourse(i, next)}
                      onRemove={() => removeCourse(i)}
                      canRemove={courses.length > 1}
                      profs={profs}
                      allowedSlotsForCategory={baseSlots}
                      dureeMinutes={dureeMinutes}
                    />
                  ))}

                  {courses.length < MAX_COURSES && (
                    <button type="button" onClick={addCourse} style={{ width: '100%', marginBottom: 18 }}>
                      <i className="ti ti-plus" style={{ marginRight: 6 }}></i>
                      Ajouter une séance ({courses.length}/{MAX_COURSES})
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
