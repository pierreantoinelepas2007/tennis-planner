import React, { useState } from 'react';

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem', ...style }}>
      {children}
    </div>
  );
}

export function StatCard({ label, value }) {
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', flex: 1 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 600 }}>{value}</p>
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={{ width: '100%' }} />
    </label>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function DispoAdder({ onAdd }) {
  const [jour, setJour] = useState(JOURS[0]);
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');

  const submit = () => {
    if (!debut || !fin) return;
    onAdd(jour, debut, fin);
    setDebut(''); setFin('');
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={jour} onChange={e => setJour(e.target.value)} style={{ width: 130 }}>
        {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
      </select>
      <input type="time" value={debut} onChange={e => setDebut(e.target.value)} style={{ width: 110 }} />
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>à</span>
      <input type="time" value={fin} onChange={e => setFin(e.target.value)} style={{ width: 110 }} />
      <button onClick={submit} style={{ padding: '6px 12px' }}>
        <i className="ti ti-plus" style={{ fontSize: 14 }}></i>
      </button>
    </div>
  );
}
