import React from 'react';
import { SelectField } from './Common.jsx';
import GrilleDisponibilites from './GrilleDisponibilites.jsx';

// Un bloc représentant une heure de cours souhaitée : préférence groupe ou
// individuel (avec taille de groupe ou durée selon le cas), préférence de
// prof, et grille de disponibilités filtrée par catégorie d'âge et par le
// prof choisi le cas échéant. Rendu plusieurs fois pour une même personne
// qui souhaite plusieurs heures de cours par semaine.
export default function CoursBlock({
  index,
  course,
  onChange,
  onRemove,
  canRemove,
  profs,
  allowedSlotsForCategory,
}) {
  const update = (patch) => onChange({ ...course, ...patch });

  // Créneaux affichés dans la grille : d'abord restreints à la catégorie
  // d'âge, puis, si un prof précis est choisi (pas "Indifférent"), encore
  // restreints aux seuls créneaux où CE prof est réellement disponible.
  const baseSlots = allowedSlotsForCategory;
  const selectedProf = course.profPrefere ? profs.find(p => p.name === course.profPrefere) : null;

  let effectiveSlots = baseSlots;
  if (selectedProf && baseSlots) {
    const profSlotKeys = new Set();
    (selectedProf.disponibilites || []).forEach(d => {
      const startH = parseInt(d.debut.split(':')[0], 10);
      const endH = parseInt(d.fin.split(':')[0], 10);
      for (let h = startH; h < endH; h++) {
        profSlotKeys.add(`${d.jour}|${h.toString().padStart(2, '0')}:00`);
      }
    });
    effectiveSlots = baseSlots.filter(s => profSlotKeys.has(`${s.jour}|${s.heure}`));
  } else if (selectedProf && !baseSlots) {
    const profSlots = [];
    (selectedProf.disponibilites || []).forEach(d => {
      const startH = parseInt(d.debut.split(':')[0], 10);
      const endH = parseInt(d.fin.split(':')[0], 10);
      for (let h = startH; h < endH; h++) {
        profSlots.push({ jour: d.jour, heure: `${h.toString().padStart(2, '0')}:00` });
      }
    });
    effectiveSlots = profSlots;
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 14, background: 'var(--surface-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Heure {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} style={{ fontSize: 12, padding: '2px 8px', color: 'var(--danger-text)' }}>
            Retirer
          </button>
        )}
      </div>

      <SelectField
        label="Préférence"
        value={course.preferenceGroupe}
        onChange={v => update({ preferenceGroupe: v, tailleGroupe: '', dureeMinutes: v === 'individuel' ? 60 : null })}
        options={[
          { value: 'indifferent', label: 'Pas de préférence' },
          { value: 'groupe', label: 'Cours en groupe' },
          { value: 'individuel', label: 'Cours individuel' },
        ]}
      />

      {course.preferenceGroupe === 'groupe' && (
        <SelectField
          label="Taille de groupe souhaitée"
          value={course.tailleGroupe}
          onChange={v => update({ tailleGroupe: v })}
          options={[
            { value: '', label: 'Loisir (pas de préférence)' },
            { value: '2', label: '2 personnes' },
            { value: '3', label: '3 personnes' },
            { value: '4', label: '4 personnes' },
          ]}
        />
      )}

      {course.preferenceGroupe === 'individuel' && (
        <SelectField
          label="Durée du cours"
          value={String(course.dureeMinutes || 60)}
          onChange={v => update({ dureeMinutes: parseInt(v, 10) })}
          options={[
            { value: '60', label: '1 heure' },
            { value: '90', label: '1 heure 30' },
          ]}
        />
      )}

      <SelectField
        label="Préférence de professeur (facultatif)"
        value={course.profPrefere}
        onChange={v => update({ profPrefere: v })}
        options={[
          { value: '', label: 'Indifférent' },
          ...profs.map(p => ({ value: p.name, label: p.name })),
        ]}
      />

      <div style={{ marginBottom: 4 }}>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Disponibilités</span>
        {effectiveSlots && effectiveSlots.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {selectedProf
              ? `${selectedProf.name} n'a pas de créneau disponible pour cette catégorie d'âge. Essayez un autre professeur ou "Indifférent".`
              : "Aucun créneau disponible pour cette catégorie d'âge pour le moment."}
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
