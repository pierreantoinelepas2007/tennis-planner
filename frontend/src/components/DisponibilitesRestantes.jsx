import React, { useMemo, useState } from 'react';
import { Card } from './Common.jsx';
import { api } from '../api.js';
import { summarizeDisponibilites } from '../dispoFormat.js';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HEURES = Array.from({ length: 14 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`);

// Palette de couleurs distinctes assignées aux profs dans l'ordre, pour un
// repérage visuel rapide dans le calendrier (se répète si plus de profs que
// de couleurs, ce qui reste rare pour un petit club).
const PROF_COLORS = [
  '#B5572B', '#4C7A5E', '#5B6EAE', '#A0522D', '#7A6FA0', '#3E7C7C', '#A8763E', '#6B8E4E',
];

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export default function DisponibilitesRestantes({ students, profs, courts, planning, onChanged }) {
  const [assigning, setAssigning] = useState(null); // { jour, heure, courtId, profId } | null
  const [error, setError] = useState(null);

  const profColor = useMemo(() => {
    const map = {};
    profs.forEach((p, i) => { map[p.id] = PROF_COLORS[i % PROF_COLORS.length]; });
    return map;
  }, [profs]);

  const courtsById = useMemo(() => Object.fromEntries(courts.map(c => [c.id, c])), [courts]);
  const profsById = useMemo(() => Object.fromEntries(profs.map(p => [p.id, p])), [profs]);

  const placedIds = useMemo(() => new Set(planning.flatMap(b => b.studentIds)), [planning]);
  const unplacedStudents = useMemo(() => students.filter(s => !placedIds.has(s.id)), [students, placedIds]);

  // Pour chaque (jour, heure), la liste des créneaux (terrain + prof) encore
  // libres : le terrain a un créneau déclaré à ce moment, un prof y est
  // disponible, et ce terrain n'est pas déjà occupé dans le planning actuel.
  const freeByTime = useMemo(() => {
    const map = {};
    JOURS.forEach(jour => { HEURES.forEach(heure => { map[`${jour}|${heure}`] = []; }); });

    courts.forEach(court => {
      (court.slots || []).forEach(slot => {
        const heure = slot.debut;
        const key = `${slot.jour}|${heure}`;
        if (!(key in map)) return; // hors de la grille affichée (avant 8h ou après 21h)

        const alreadyUsed = planning.some(b =>
          b.courtId === court.id && b.jour === slot.jour && b.debut === slot.debut && b.fin === slot.fin
        );
        if (alreadyUsed) return;

        profs.forEach(prof => {
          const profAvailable = (prof.disponibilites || []).some(d =>
            d.jour === slot.jour &&
            timeToMinutes(d.debut) <= timeToMinutes(slot.debut) &&
            timeToMinutes(d.fin) >= timeToMinutes(slot.fin)
          );
          if (!profAvailable) return;
          const profAlreadyUsed = planning.some(b =>
            b.profId === prof.id && b.jour === slot.jour && b.debut === slot.debut && b.fin === slot.fin
          );
          if (profAlreadyUsed) return;
          map[key].push({ courtId: court.id, profId: prof.id, jour: slot.jour, debut: slot.debut, fin: slot.fin });
        });
      });
    });

    return map;
  }, [courts, profs, planning]);

  const assignStudent = async (studentId) => {
    if (!assigning) return;
    setError(null);
    try {
      await api.createPlanningBlock({
        courtId: assigning.courtId,
        profId: assigning.profId,
        jour: assigning.jour,
        debut: assigning.debut,
        fin: assigning.fin,
        studentIds: [studentId],
      });
      setAssigning(null);
      onChanged();
    } catch (e) {
      setError("Impossible d'assigner ce participant. Réessayez.");
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Disponibilités restantes</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: -8 }}>
        Créneaux encore libres (terrain + professeur disponible, pas déjà utilisés dans le planning). Cliquez sur un créneau libre pour y placer un participant non casé.
      </p>

      {error && (
        <Card style={{ marginBottom: 14, background: 'var(--danger-bg)' }}>
          <p style={{ margin: 0, color: 'var(--danger-text)', fontSize: 14 }}>{error}</p>
        </Card>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {profs.map(p => (
          <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: profColor[p.id], display: 'inline-block' }}></span>
            {p.name}
          </span>
        ))}
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)' }}></th>
              {JOURS.map(jour => (
                <th key={jour} style={{ padding: '4px 6px', fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>{jour.slice(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEURES.map(heure => (
              <tr key={heure}>
                <td style={{ padding: '2px 6px', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{heure}</td>
                {JOURS.map(jour => {
                  const key = `${jour}|${heure}`;
                  const free = freeByTime[key] || [];
                  return (
                    <td key={jour} style={{ border: '1px solid var(--border)', padding: 3, minWidth: 70, verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {free.map((f, i) => (
                          <button
                            key={i}
                            onClick={() => setAssigning(f)}
                            style={{
                              fontSize: 10, padding: '2px 4px', border: 'none', borderRadius: 4,
                              background: profColor[f.profId], color: 'white', cursor: 'pointer',
                            }}
                            title={`${courtsById[f.courtId]?.name} · ${profsById[f.profId]?.name}`}
                          >
                            {courtsById[f.courtId]?.name} · {profsById[f.profId]?.name}
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Participants non casés ({unplacedStudents.length})</h3>
        {unplacedStudents.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Tout le monde a un créneau.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unplacedStudents.map(s => (
              <div key={s.id} style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                {s.disponibilites?.length > 0 ? (
                  <span> — {summarizeDisponibilites(s.disponibilites)}</span>
                ) : (
                  <span> — aucune disponibilité renseignée</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {assigning && (
        <div
          onClick={() => setAssigning(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 20, maxWidth: 360, width: '90%' }}>
            <h3 style={{ marginTop: 0, fontSize: 16 }}>
              {assigning.jour} {assigning.debut} — {courtsById[assigning.courtId]?.name} avec {profsById[assigning.profId]?.name}
            </h3>
            {unplacedStudents.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Aucun participant non casé à assigner ici.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                {unplacedStudents.map(s => (
                  <button key={s.id} onClick={() => assignStudent(s.id)} style={{ textAlign: 'left', fontSize: 14, padding: '8px 12px' }}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setAssigning(null)} style={{ marginTop: 12, width: '100%', fontSize: 13 }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
