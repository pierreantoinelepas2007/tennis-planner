import React, { useState } from 'react';
import { Card, TextField, DispoAdder } from './Common.jsx';
import { api } from '../api.js';

export default function AdminProfs({ profs, courts, onChanged }) {
  const [name, setName] = useState('');
  const [specialite, setSpecialite] = useState('');
  const [error, setError] = useState(null);

  const addProf = async () => {
    if (!name.trim()) return;
    try {
      await api.createProf({ name: name.trim(), specialite: specialite.trim() });
      setName(''); setSpecialite('');
      setError(null);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeProf = async (id) => {
    try {
      await api.deleteProf(id);
      setError(null);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  const addDispo = async (profId, jour, debut, fin, courtId) => {
    try {
      await api.addProfDispo(profId, { jour, debut, fin, courtId });
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const removeDispo = async (profId, dispoId) => {
    try {
      await api.removeProfDispo(profId, dispoId);
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Professeurs ({profs.length})</h2>

      {error && (
        <Card style={{ marginBottom: 14, background: 'var(--danger-bg)' }}>
          <p style={{ margin: 0, color: 'var(--danger-text)', fontSize: 14 }}>{error}</p>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Ajouter un professeur</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <TextField label="Nom" value={name} onChange={setName} placeholder="Nom du professeur" />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <TextField label="Spécialité (facultatif)" value={specialite} onChange={setSpecialite} placeholder="Ex : jeunes débutants" />
          </div>
          <button onClick={addProf} style={{ marginBottom: 14 }}>Ajouter</button>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {profs.map(p => (
          <Card key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{p.name}</p>
                {p.specialite && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{p.specialite}</p>}
              </div>
              <button onClick={() => removeProf(p.id)} aria-label="Supprimer le professeur">
                <i className="ti ti-trash" style={{ fontSize: 16 }}></i>
              </button>
            </div>

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Créneaux disponibles</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {p.disponibilites.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun créneau renseigné</span>}
                {p.disponibilites.map(d => (
                  <span key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}>
                    {d.jour} {d.debut}-{d.fin} {d.courtId && `· ${courts.find(c => c.id === d.courtId)?.name || '?'}`}
                    <button onClick={() => removeDispo(p.id, d.id)} style={{ padding: 0, border: 'none', background: 'transparent' }} aria-label="Retirer ce créneau">
                      <i className="ti ti-x" style={{ fontSize: 13 }}></i>
                    </button>
                  </span>
                ))}
              </div>
              <DispoAdder onAdd={(jour, debut, fin, courtId) => addDispo(p.id, jour, debut, fin, courtId)} courts={courts} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
