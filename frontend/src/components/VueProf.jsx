import React, { useState, useMemo, useRef } from 'react';
import { Card } from './Common.jsx';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export default function VueProf({ profs, planning, courts, students }) {
  const [selectedProfId, setSelectedProfId] = useState(profs[0]?.id || '');
  const exportRef = useRef(null);

  const studentsById = useMemo(() => Object.fromEntries(students.map(s => [s.id, s])), [students]);
  const courtsById = useMemo(() => Object.fromEntries(courts.map(c => [c.id, c])), [courts]);

  const profBlocks = useMemo(() => {
    const jourIndex = j => JOURS.indexOf(j);
    return planning
      .filter(b => b.profId === selectedProfId)
      .sort((a, b) => {
        if (jourIndex(a.jour) !== jourIndex(b.jour)) return jourIndex(a.jour) - jourIndex(b.jour);
        return timeToMinutes(a.debut) - timeToMinutes(b.debut);
      });
  }, [planning, selectedProfId]);

  const selectedProf = profs.find(p => p.id === selectedProfId);

  const printExport = () => {
    const content = exportRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(
      '<html><head><title>Planning ' + (selectedProf?.name || '') + '</title>' +
      '<style>' +
      'body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #222; }' +
      'h1 { font-size: 20px; margin-bottom: 4px; }' +
      'p.sub { color: #666; margin-top: 0; margin-bottom: 20px; font-size: 13px; }' +
      '.block { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }' +
      '.block .time { font-weight: 600; font-size: 14px; }' +
      '.block .meta { color: #666; font-size: 13px; margin: 2px 0 6px; }' +
      '.block .students { font-size: 13px; }' +
      '</style></head><body>' + content.innerHTML + '</body></html>'
    );
    win.document.close();
    win.focus();
    win.print();
  };

  if (profs.length === 0) {
    return <Card><p style={{ margin: 0, color: 'var(--text-secondary)' }}>Ajoutez d'abord des professeurs dans l'onglet Professeurs.</p></Card>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Vue par professeur</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={selectedProfId} onChange={e => setSelectedProfId(e.target.value)}>
            {profs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={printExport}>
            <i className="ti ti-download" style={{ marginRight: 6 }}></i>Exporter / imprimer
          </button>
        </div>
      </div>

      <div ref={exportRef}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>Planning de {selectedProf?.name}</h1>
        <p className="sub" style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 0, marginBottom: 20 }}>Saison septembre – mai</p>

        {profBlocks.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>Aucun cours planifié pour ce professeur pour l'instant.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profBlocks.map(b => (
            <div key={b.id} className="block" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
              <p className="time" style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{b.jour} {b.debut}–{b.fin}</p>
              <p className="meta" style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '2px 0 6px' }}>{courtsById[b.courtId]?.name || 'Terrain'}</p>
              <p className="students" style={{ fontSize: 13, margin: 0 }}>
                {b.studentIds.map(id => studentsById[id]?.name).filter(Boolean).join(', ') || 'Aucun élève'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
