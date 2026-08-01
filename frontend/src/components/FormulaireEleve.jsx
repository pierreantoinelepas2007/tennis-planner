import React, { useState } from 'react';
import { Card, TextField, SelectField } from './Common.jsx';
import { api } from '../api.js';
import GrilleDisponibilites from './GrilleDisponibilites.jsx';

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

export default function FormulaireEleve({ onCreated }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [classement, setClassement] = useState('');
  const [preference, setPreference] = useState('indifferent');
  const [jouerAvec, setJouerAvec] = useState('');
  const [memeHoraireAvec, setMemeHoraireAvec] = useState('');
  const [profPrefere, setProfPrefere] = useState('');
  const [disponibilites, setDisponibilites] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setName(''); setAge(''); setClassement(''); setPreference('indifferent');
    setJouerAvec(''); setMemeHoraireAvec(''); setProfPrefere(''); setDisponibilites([]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createStudent({
        name: name.trim(),
        age: age.trim(),
        classement: classement || 'Non classé',
        preferenceGroupe: preference,
        jouerAvec: jouerAvec.split(',').map(s => s.trim()).filter(Boolean),
        memeHoraireAvec: memeHoraireAvec.trim(),
        profPrefere: profPrefere.trim(),
        disponibilites,
      });
      setSubmitted(true);
      reset();
      if (onCreated) onCreated();
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError("L'inscription n'a pas pu être enregistrée. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <Card>
        <h2 style={{ marginTop: 0 }}>Inscription à un cours</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: -8, marginBottom: 20 }}>
          Si plusieurs cours par semaine sont souhaités (par exemple un cours en groupe et un cours individuel), remplissez ce formulaire une fois pour chaque cours souhaité.
        </p>

        {submitted && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
            Inscription enregistrée. Merci !
          </div>
        )}
        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <TextField label="Nom" value={name} onChange={setName} placeholder="Prénom et nom" />
          <TextField label="Âge" value={age} onChange={setAge} placeholder="Ex : 11" />
          <SelectField
            label="Classement officiel"
            value={classement}
            onChange={setClassement}
            options={CLASSEMENT_OPTIONS}
          />

          <SelectField
            label="Préférence"
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'indifferent', label: 'Pas de préférence' },
              { value: 'groupe', label: 'Cours en groupe' },
              { value: 'individuel', label: 'Cours individuel' },
            ]}
          />

          <TextField
            label="Souhaite jouer avec (facultatif)"
            value={jouerAvec}
            onChange={setJouerAvec}
            placeholder="Noms séparés par une virgule, ex : Léa Dupont, Tom Martin"
          />

          <TextField
            label="Souhaite le même horaire que (facultatif)"
            value={memeHoraireAvec}
            onChange={setMemeHoraireAvec}
            placeholder="Nom de la personne (ex : frère, sœur, conjoint...)"
          />

          <TextField
            label="Préférence de professeur (facultatif)"
            value={profPrefere}
            onChange={setProfPrefere}
            placeholder="Nom du professeur, ou laisser vide"
          />

          <div style={{ marginBottom: 18 }}>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Disponibilités</span>
            <GrilleDisponibilites value={disponibilites} onChange={setDisponibilites} />
          </div>

          <button type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Enregistrement...' : "Enregistrer l'inscription"}
          </button>
        </form>
      </Card>
    </div>
  );
}
