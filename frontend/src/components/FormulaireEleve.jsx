import React, { useState } from 'react';
import { Card, TextField, SelectField } from './Common.jsx';
import { api } from '../api.js';

export default function FormulaireEleve({ onCreated }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [classement, setClassement] = useState('');
  const [preference, setPreference] = useState('indifferent');
  const [jouerAvec, setJouerAvec] = useState('');
  const [terrainAdjacentAvec, setTerrainAdjacentAvec] = useState('');
  const [profPrefere, setProfPrefere] = useState('');
  const [dispoText, setDispoText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setName(''); setAge(''); setClassement(''); setPreference('indifferent');
    setJouerAvec(''); setTerrainAdjacentAvec(''); setProfPrefere(''); setDispoText('');
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
        classement: classement.trim(),
        preferenceGroupe: preference,
        jouerAvec: jouerAvec.split(',').map(s => s.trim()).filter(Boolean),
        terrainAdjacentAvec: terrainAdjacentAvec.trim(),
        profPrefere: profPrefere.trim(),
        dispoText: dispoText.trim(),
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
        <h2 style={{ marginTop: 0 }}>Inscription d'un élève</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: -8, marginBottom: 20 }}>
          À remplir une fois par enfant. Les informations seront utilisées pour construire le planning des cours.
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
          <TextField label="Nom de l'élève" value={name} onChange={setName} placeholder="Prénom et nom" />
          <TextField label="Âge" value={age} onChange={setAge} placeholder="Ex : 11" />
          <TextField label="Classement officiel (si l'élève est classé)" value={classement} onChange={setClassement} placeholder="Ex : 30/1, ou laisser vide si non classé" />

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
            label="Souhaite un terrain à côté de (frère/sœur, facultatif)"
            value={terrainAdjacentAvec}
            onChange={setTerrainAdjacentAvec}
            placeholder="Nom du frère ou de la sœur"
          />

          <TextField
            label="Préférence de professeur (facultatif)"
            value={profPrefere}
            onChange={setProfPrefere}
            placeholder="Nom du professeur, ou laisser vide"
          />

          <label style={{ display: 'block', marginBottom: 18 }}>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Disponibilités</span>
            <textarea
              value={dispoText}
              onChange={e => setDispoText(e.target.value)}
              placeholder="Ex : mercredi après-midi, vendredi après 17h, samedi 10h-12h"
              style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
            />
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Précisez les jours et, si possible, une heure ou une plage horaire (ex : "après 17h", "mercredi après-midi", "mardi 18h-19h").
            </span>
          </label>

          <button type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Enregistrement...' : "Enregistrer l'inscription"}
          </button>
        </form>
      </Card>
    </div>
  );
}
