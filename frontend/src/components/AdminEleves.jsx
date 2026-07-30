import React, { useState, useMemo } from 'react';
import { Card } from './Common.jsx';
import { api } from '../api.js';

const STARS = [1, 2, 3, 4, 5];

function normName(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export default function AdminEleves({ students, onChanged }) {
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

  // Compte le nombre de demandes par nom (élèves voulant plusieurs cours par
  // semaine remplissent le formulaire une fois par cours souhaité) et attribue
  // à chaque demande son numéro d'ordre (1ère, 2ème, ...).
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Élèves ({students.length})</h2>
        <input placeholder="Rechercher un élève..." value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 220 }} />
      </div>

      {filtered.length === 0 && (
        <Card><p style={{ color: 'var(--text-secondary)', margin: 0 }}>Aucun élève pour l'instant. Partagez le lien du formulaire aux parents.</p></Card>
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
                  {s.classement ? `Classé : ${s.classement}` : 'Non classé'}
                  {' · '}
                  {s.preferenceGroupe === 'groupe' ? 'Préfère groupe' : s.preferenceGroupe === 'individuel' ? 'Préfère individuel' : 'Indifférent'}
                </p>
                {s.jouerAvec?.length > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Veut jouer avec : {s.jouerAvec.join(', ')}</p>
                )}
                {s.terrainAdjacentAvec && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Terrain à côté de : {s.terrainAdjacentAvec}</p>
                )}
                {s.profPrefere && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Préférence prof : {s.profPrefere}</p>
                )}
                {s.dispoText && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Dispo : {s.dispoText}</p>
                )}
              </div>
              <button onClick={() => removeStudent(s.id)} style={{ padding: '4px 8px' }} aria-label="Supprimer l'élève">
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
                    style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}
                  >
                    <i
                      className={`ti ${s.niveauEtoile >= n ? 'ti-star-filled' : 'ti-star'}`}
                      style={{ fontSize: 18, color: s.niveauEtoile >= n ? 'var(--clay)' : 'var(--text-muted)' }}
                    ></i>
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
