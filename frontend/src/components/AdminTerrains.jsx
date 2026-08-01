import React, { useState } from 'react';
import { Card, TextField, DispoAdder } from './Common.jsx';
import { api } from '../api.js';

export default function AdminTerrains({ courts, onChanged }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const addCourt = async () => {
    if (!name.trim()) return;
    try {
      await api.createCourt({ name: name.trim() });
      setName('');
      setError(null);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeCourt = async (id) => {
    try {
      await api.deleteCourt(id);
      setError(null);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  const addSlot = async (courtId, jour, debut, fin) => {
    try {
      await api.addCourtSlot(courtId, { jour, debut, fin });
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const removeSlot = async (courtId, slotId) => {
    try {
      await api.removeCourtSlot(courtId, slotId);
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Terrains ({courts.length})</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: -8 }}>
        Renseignez ici uniquement les créneaux que le professeur vous indique comme disponibles pour l'école (hors location).
      </p>

      {error && (
        <Card style={{ marginBottom: 14, background: 'var(--danger-bg)' }}>
          <p style={{ margin: 0, color: 'var(--danger-text)', fontSize: 14 }}>{error}</p>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Ajouter un terrain</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <TextField label="Nom du terrain" value={name} onChange={setName} placeholder="Ex : Terrain 1, Terrain couvert A..." />
          </div>
          <button onClick={addCourt} style={{ marginBottom: 14 }}>Ajouter</button>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {courts.map(c => (
          <Card key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{c.name}</p>
              <button onClick={() => removeCourt(c.id)} aria-label="Supprimer le terrain">
                <i className="ti ti-trash" style={{ fontSize: 16 }}></i>
              </button>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Créneaux disponibles pour l'école</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {c.slots.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun créneau renseigné</span>}
                {c.slots.map(s => (
                  <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}>
                    {s.jour} {s.debut}-{s.fin}
                    <button onClick={() => removeSlot(c.id, s.id)} style={{ padding: 0, border: 'none', background: 'transparent' }} aria-label="Retirer ce créneau">
                      <i className="ti ti-x" style={{ fontSize: 13 }}></i>
                    </button>
                  </span>
                ))}
              </div>
              <DispoAdder onAdd={(jour, debut, fin) => addSlot(c.id, jour, debut, fin)} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
