import React, { useState, useMemo } from 'react';
import { Card } from './Common.jsx';
import { api } from '../api.js';
import { normName, matchQuality } from '../nameMatching.js';
import { summarizeDisponibilites } from '../dispoFormat.js';

const STARS = [1, 2, 3, 4, 5];

export default function AdminEleves({ students, profs, onChanged }) {
  const [filter, setFilter] = useState('');

  const updateStudent = async (id, patch) => {
    try {
      await api.updateStudent(id, patch);
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const removeStudent = async (id) => {
    try {
      await api.deleteStudent(id);
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  // Compte le nombre de demandes par nom (les participants voulant plusieurs
  // cours par semaine remplissent le formulaire une fois par cours souhaité)
  // et attribue à chaque demande son numéro d'ordre (1ère, 2ème, ...).
  const { countByName, indexById } = useMemo(() => {
    const counts = {};
    students.forEach(s => {
      const key = normName(s.name);
      counts[key] = (counts[key] || 0) + 1;
    });
    const seen = {};
    const indexes = {};
    students.forEach(s => {
      const key = normName(s.name);
      seen[key] = (seen[key] || 0) + 1;
      indexes[s.id] = seen[key];
    });
    return { countByName: counts, indexById: indexes };
  }, [students]);

  const filtered = students.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));

  const profNames = useMemo(() => profs.map(p => p.name), [profs]);
  const studentNames = useMemo(() => students.map(s => s.name), [students]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Participants ({students.length})</h2>
        <input placeholder="Rechercher..." value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 220 }} />
      </div>

      {filtered.length === 0 && (
        <Card><p style={{ color: 'var(--text-secondary)', margin: 0 }}>Aucune inscription pour l'instant. Partagez le lien du formulaire.</p></Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(s => (
          <Card key={s.id} style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {s.name} {s.age && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>· {s.age} ans</span>}
                  {countByName[normName(s.name)] > 1 && (
                    <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                      {indexById[s.id]}ᵉ demande sur {countByName[normName(s.name)]}
                    </span>
                  )}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {s.classement && s.classement !== 'Non classé' ? `Classé : ${s.classement}` : 'Non classé'}
                  {' · '}
                  {s.preferenceGroupe === 'groupe' ? 'Préfère groupe' : s.preferenceGroupe === 'individuel' ? 'Préfère individuel' : 'Indifférent'}
                  {s.preferenceGroupe === 'groupe' && s.tailleGroupe && ` (${s.tailleGroupe} pers.)`}
                  {s.preferenceGroupe === 'groupe' && !s.tailleGroupe && ' (loisir)'}
                  {s.preferenceGroupe === 'individuel' && s.dureeMinutes === 90 && ' (1h30)'}
                </p>
                {(s.email || s.telephone) && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {[s.email, s.telephone].filter(Boolean).join(' · ')}
                  </p>
                )}
                {s.jouerAvec?.length > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    Veut jouer avec : {s.jouerAvec.map((name, i) => (
                      <NameWithAlert key={i} name={name} knownNames={studentNames} excludeSelf={s.name} isLast={i === s.jouerAvec.length - 1} />
                    ))}
                  </p>
                )}
                {s.memeHoraireAvec && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    Même horaire que : <NameWithAlert name={s.memeHoraireAvec} knownNames={studentNames} excludeSelf={s.name} isLast />
                  </p>
                )}
                {s.profPrefere && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    Préférence prof : <NameWithAlert name={s.profPrefere} knownNames={profNames} isLast />
                  </p>
                )}
                {s.disponibilites?.length > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    Dispo : {summarizeDisponibilites(s.disponibilites)}
                  </p>
                )}
              </div>
              <button onClick={() => removeStudent(s.id)} style={{ padding: '4px 8px' }} aria-label="Supprimer cette inscription">
                <i className="ti ti-trash" style={{ fontSize: 16 }}></i>
              </button>
            </div>

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Niveau (étoiles) :</span>
              <div style={{ display: 'flex', gap: 2 }}>
                {STARS.map(n => (
                  <button
                    key={n}
                    onClick={() => updateStudent(s.id, { niveauEtoile: s.niveauEtoile === n ? null : n })}
                    aria-label={`${n} étoiles`}
                    style={{ padding: '2px 4px', border: 'none', background: 'transparent', fontSize: 20, lineHeight: 1, color: s.niveauEtoile >= n ? 'var(--clay)' : 'var(--text-muted)' }}
                  >
                    {s.niveauEtoile >= n ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Affiche un nom saisi par un parent, avec une alerte visuelle si ce nom ne
// correspond (même approximativement) à personne de connu dans le système
// (aucun prof de ce nom, ou aucune autre personne inscrite de ce nom).
function NameWithAlert({ name, knownNames, excludeSelf, isLast }) {
  const relevantNames = excludeSelf ? knownNames.filter(n => normName(n) !== normName(excludeSelf)) : knownNames;
  const quality = matchQuality(name, relevantNames);
  return (
    <span>
      {name}
      {quality === 'none' && (
        <span
          title="Ce nom ne correspond à personne de connu dans le système. Vérifiez l'orthographe ou si la personne est bien enregistrée."
          style={{ marginLeft: 4, color: 'var(--warning-text)', fontWeight: 600, cursor: 'help' }}
        >
          ⚠
        </span>
      )}
      {!isLast && ', '}
    </span>
  );
}
