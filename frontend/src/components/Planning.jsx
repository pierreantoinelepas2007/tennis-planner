import React, { useState, useMemo } from 'react';
import { Card } from './Common.jsx';
import { api } from '../api.js';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export default function Planning({ students, profs, courts, planning, onChanged }) {
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const studentsById = useMemo(() => Object.fromEntries(students.map(s => [s.id, s])), [students]);
  const profsById = useMemo(() => Object.fromEntries(profs.map(p => [p.id, p])), [profs]);
  const courtsById = useMemo(() => Object.fromEntries(courts.map(c => [c.id, c])), [courts]);

  const totalSlots = courts.reduce((acc, c) => acc + c.slots.length, 0);
  const canGenerate = students.length > 0 && profs.length > 0 && courts.length > 0 && totalSlots > 0;

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generatePlanning();
      setLastResult(res);
      await onChanged();
    } catch (e) {
      setError("La génération du planning a échoué. Réessayez dans un instant.");
    } finally {
      setGenerating(false);
    }
  };

  const removeBlock = async (blockId) => {
    try {
      await api.deletePlanningBlock(blockId);
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStudentInBlock = async (block, studentId) => {
    const has = block.studentIds.includes(studentId);
    if (!has) {
      // On ajoute cet élève : vérifier s'il est déjà pris ailleurs au même
      // jour/horaire (un autre bloc du planning, hors celui-ci).
      const conflictingBlock = planning.find(b =>
        b.id !== block.id &&
        b.jour === block.jour &&
        b.debut === block.debut &&
        b.fin === block.fin &&
        b.studentIds.includes(studentId)
      );
      if (conflictingBlock) {
        const studentName = studentsById[studentId]?.name || 'Cet élève';
        const confirmed = window.confirm(
          `${studentName} est déjà prévu ${block.jour} ${block.debut}–${block.fin} sur un autre cours. Voulez-vous quand même l'ajouter ici (il sera alors sur deux cours en même temps) ?`
        );
        if (!confirmed) return;
      }
    }
    const nextIds = has ? block.studentIds.filter(id => id !== studentId) : [...block.studentIds, studentId];
    try {
      await api.updatePlanningBlock(block.id, { studentIds: nextIds });
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const changeBlockField = async (blockId, field, value) => {
    try {
      await api.updatePlanningBlock(blockId, { [field]: value });
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const sortedPlanning = useMemo(() => {
    const jourIndex = j => JOURS.indexOf(j);
    return [...planning].sort((a, b) => {
      if (jourIndex(a.jour) !== jourIndex(b.jour)) return jourIndex(a.jour) - jourIndex(b.jour);
      return timeToMinutes(a.debut) - timeToMinutes(b.debut);
    });
  }, [planning]);

  const placedIds = new Set(planning.flatMap(b => b.studentIds));
  const unplacedStudents = students.filter(s => !placedIds.has(s.id));

  // Alertes fratrie recalculées en direct à partir de l'état actuel du planning
  // (contrairement à lastResult.siblingHints, figé au moment de la dernière
  // génération automatique), pour rester à jour après une modification manuelle.
  const liveSiblingHints = useMemo(() => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const findByName = (name) => students.find(s => norm(s.name) === norm(name));
    const hints = [];
    students.forEach(s => {
      if (!s.terrainAdjacentAvec) return;
      const sibling = findByName(s.terrainAdjacentAvec);
      if (!sibling) return;
      const sBlock = planning.find(b => b.studentIds.includes(s.id));
      const sibBlock = planning.find(b => b.studentIds.includes(sibling.id));
      if (sBlock && sibBlock && sBlock.jour === sibBlock.jour) {
        const gap = Math.abs(timeToMinutes(sBlock.debut) - timeToMinutes(sibBlock.debut));
        if (sBlock.courtId !== sibBlock.courtId && gap <= 60) {
          hints.push({ a: s.name, b: sibling.name });
        }
      }
    });
    return hints;
  }, [planning, students]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Planning</h2>
        <button onClick={generate} disabled={!canGenerate || generating}>
          <i className="ti ti-refresh" style={{ marginRight: 6 }}></i>
          {generating ? 'Génération...' : planning.length > 0 ? 'Régénérer une proposition' : 'Générer une proposition'}
        </button>
      </div>

      {!canGenerate && (
        <Card><p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Il faut au moins un élève, un professeur avec ses horaires, un terrain avec ses créneaux pour générer une proposition.
        </p></Card>
      )}

      {error && (
        <Card style={{ marginBottom: 14, background: 'var(--danger-bg)' }}>
          <p style={{ margin: 0, color: 'var(--danger-text)', fontSize: 14 }}>{error}</p>
        </Card>
      )}

      {liveSiblingHints.length > 0 && (
        <Card style={{ marginBottom: 14, background: 'var(--warning-bg)' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 14, color: 'var(--warning-text)' }}>À vérifier : terrains non côte à côte</p>
          {liveSiblingHints.map((h, i) => (
            <p key={i} style={{ margin: '2px 0', fontSize: 13, color: 'var(--warning-text)' }}>
              {h.a} et {h.b} jouent le même jour à des horaires proches mais pas sur des terrains adjacents. Vérifiez l'attribution des terrains.
            </p>
          ))}
        </Card>
      )}

      {lastResult && lastResult.conflicts?.length > 0 && (
        <Card style={{ marginBottom: 14, background: 'var(--warning-bg)' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 14, color: 'var(--warning-text)' }}>À trancher : créneaux avec plusieurs élèves possibles</p>
          {lastResult.conflicts.map((c, i) => (
            <p key={i} style={{ margin: '2px 0 8px', fontSize: 13, color: 'var(--warning-text)' }}>
              {c.jour} {c.debut}–{c.fin} avec {c.profName} : retenu(s) {c.placedNames.join(', ')} — également disponible(s) et non retenu(s) : {c.rejectedNames.join(', ')}. Modifiez le cours ci-dessous si vous préférez un autre choix.
            </p>
          ))}
        </Card>
      )}

      {sortedPlanning.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {sortedPlanning.map(b => (
            <PlanningBlock
              key={b.id}
              block={b}
              studentsById={studentsById}
              allStudents={students}
              onRemove={() => removeBlock(b.id)}
              onToggleStudent={(sid) => toggleStudentInBlock(b, sid)}
              onChangeField={(field, value) => changeBlockField(b.id, field, value)}
              profs={profs}
              courts={courts}
            />
          ))}
        </div>
      )}

      {planning.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Élèves non casés ({unplacedStudents.length})</h3>
          {unplacedStudents.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Tous les élèves ont un créneau.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {unplacedStudents.map(s => (
                <span key={s.id} style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function PlanningBlock({ block, studentsById, allStudents, onRemove, onToggleStudent, onChangeField, profs, courts }) {
  const [showAddStudent, setShowAddStudent] = useState(false);
  const blockStudents = block.studentIds.map(id => studentsById[id]).filter(Boolean);
  const notInBlock = allStudents.filter(s => !block.studentIds.includes(s.id));

  return (
    <Card style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{block.jour} {block.debut}–{block.fin}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Terrain :</span>
            <select value={block.courtId} onChange={e => onChangeField('courtId', e.target.value)} style={{ fontSize: 13, padding: '2px 6px' }}>
              {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Prof :</span>
            <select value={block.profId} onChange={e => onChangeField('profId', e.target.value)} style={{ fontSize: 13, padding: '2px 6px' }}>
              {profs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={onRemove} aria-label="Supprimer ce cours">
          <i className="ti ti-trash" style={{ fontSize: 16 }}></i>
        </button>
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {blockStudents.map(s => (
          <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}>
            {s.name}
            {s.niveauEtoile && <span style={{ color: 'var(--text-muted)' }}>({s.niveauEtoile}★)</span>}
            <button onClick={() => onToggleStudent(s.id)} style={{ padding: 0, border: 'none', background: 'transparent' }} aria-label={`Retirer ${s.name}`}>
              <i className="ti ti-x" style={{ fontSize: 13 }}></i>
            </button>
          </span>
        ))}
        {blockStudents.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun élève</span>}
      </div>

      <div style={{ marginTop: 10 }}>
        {!showAddStudent ? (
          <button onClick={() => setShowAddStudent(true)} style={{ fontSize: 13, padding: '4px 10px' }}>
            <i className="ti ti-plus" style={{ fontSize: 13, marginRight: 4 }}></i>Ajouter un élève
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              defaultValue=""
              onChange={e => { if (e.target.value) { onToggleStudent(e.target.value); setShowAddStudent(false); } }}
              style={{ fontSize: 13 }}
            >
              <option value="" disabled>Choisir un élève...</option>
              {notInBlock.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={() => setShowAddStudent(false)} style={{ fontSize: 13, padding: '4px 8px' }}>Annuler</button>
          </div>
        )}
      </div>
    </Card>
  );
}
