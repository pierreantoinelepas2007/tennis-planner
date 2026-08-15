import React from 'react';
import { SelectField, TextField } from './Common.jsx';
import GrilleDisponibilites from './GrilleDisponibilites.jsx';

// Convertit une heure "HH:MM" en minutes depuis minuit, pour comparer des
// horaires qui peuvent tomber sur une demi-heure (16h30, 19h30...).
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Un bloc représentant une heure (ou séance) de padel souhaitée. Contrairement
// au tennis, le padel n'a pas de "loisir" ni de vrai "individuel" : c'est
// toujours un groupe de 2 à 4 joueurs, avec une durée fixée par la catégorie
// (1h pour Mini-Padel, 1h30 pour Padel Adulte).
export default function CoursBlockPadel({
  index,
  course,
  onChange,
  onRemove,
  canRemove,
  profs,
  allowedSlotsForCategory,
  dureeMinutes,
}) {
  const update = (patch) => onChange({ ...course, ...patch });

  const baseSlots = allowedSlotsForCategory;
  const selectedProf = course.profPrefere ? profs.find(p => p.name === course.profPrefere) : null;

  // Créneaux affichés : restreints à la catégorie, puis, si un prof précis
  // est choisi, encore restreints à ses vraies disponibilités (en tenant
  // compte des demi-heures, contrairement au tennis).
  let effectiveSlots = baseSlots;
  if (selectedProf) {
    const profSlotKeys = new Set();
    (selectedProf.disponibilites || []).forEach(d => {
      const startMin = toMinutes(d.debut);
      const endMin = toMinutes(d.fin);
      for (let m = startMin; m < endMin; m += 30) {
        profSlotKeys.add(`${d.jour}|${toHHMM(m)}`);
      }
    });
    if (baseSlots) {
      effectiveSlots = baseSlots.filter(s => profSlotKeys.has(`${s.jour}|${s.heure}`));
    } else {
      effectiveSlots = Array.from(profSlotKeys).map(k => {
        const [jour, heure] = k.split('|');
        return { jour, heure };
      });
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 14, background: 'var(--surface-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Séance {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} style={{ fontSize: 12, padding: '2px 8px', color: 'var(--danger-text)' }}>
            Retirer
          </button>
        )}
      </div>

      <SelectField
        label="Nombre de joueurs souhaité"
        value={course.tailleGroupe}
        onChange={v => update({ tailleGroupe: v })}
        options={[
          { value: '2', label: '2 joueurs' },
          { value: '3', label: '3 joueurs' },
          { value: '4', label: '4 joueurs' },
        ]}
      />

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -10, marginBottom: 14 }}>
        Durée du cours : {dureeMinutes === 90 ? '1h30' : '1h'}
      </p>

      <SelectField
        label="Préférence de professeur (facultatif)"
        value={course.profPrefere}
        onChange={v => update({ profPrefere: v })}
        options={[
          { value: '', label: 'Indifférent' },
          ...profs.map(p => ({ value: p.name, label: p.name })),
        ]}
      />

      <TextField
        label="Souhaite jouer avec (facultatif)"
        value={course.jouerAvec}
        onChange={v => update({ jouerAvec: v })}
        placeholder="Noms séparés par une virgule, ex : Léa Dupont, Tom Martin"
      />

      <TextField
        label="Souhaite le même horaire que (facultatif)"
        value={course.memeHoraireAvec}
        onChange={v => update({ memeHoraireAvec: v })}
        placeholder="Nom de la personne (ex : conjoint, ami...)"
      />

      <div style={{ marginBottom: 4 }}>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Disponibilités</span>
        {effectiveSlots && effectiveSlots.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {selectedProf
              ? `${selectedProf.name} n'a pas de créneau disponible pour cette catégorie. Essayez un autre professeur ou "Indifférent".`
              : "Aucun créneau disponible pour cette catégorie pour le moment."}
          </p>
        ) : (
          <GrilleDisponibilites
            value={course.disponibilites}
            onChange={v => update({ disponibilites: v })}
            allowedSlots={effectiveSlots}
          />
        )}
      </div>
    </div>
  );
}
