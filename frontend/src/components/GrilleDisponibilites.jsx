import React, { useState, useRef, useCallback } from 'react';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HEURES = Array.from({ length: 14 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`);

function cellKey(jour, heure) {
  return `${jour}|${heure}`;
}

// Grille cliquable jour × heure pour saisir les disponibilités d'un participant.
// value : tableau de { jour, heure }. onChange : appelé avec le nouveau tableau.
// Le glisser-cliquer permet de cocher/décocher plusieurs cases d'affilée.
export default function GrilleDisponibilites({ value, onChange }) {
  const selected = new Set((value || []).map(d => cellKey(d.jour, d.heure)));
  const [dragMode, setDragMode] = useState(null); // 'select' | 'deselect' | null
  const isDragging = useRef(false);

  const toggleCell = useCallback((jour, heure, forceMode) => {
    const key = cellKey(jour, heure);
    const isSelected = selected.has(key);
    const shouldSelect = forceMode ? forceMode === 'select' : !isSelected;
    if (shouldSelect === isSelected) return;

    let next;
    if (shouldSelect) {
      next = [...(value || []), { jour, heure }];
    } else {
      next = (value || []).filter(d => !(d.jour === jour && d.heure === heure));
    }
    onChange(next);
  }, [value, onChange, selected]);

  const handleMouseDown = (jour, heure) => {
    const key = cellKey(jour, heure);
    const mode = selected.has(key) ? 'deselect' : 'select';
    setDragMode(mode);
    isDragging.current = true;
    toggleCell(jour, heure, mode);
  };

  const handleMouseEnter = (jour, heure) => {
    if (isDragging.current && dragMode) {
      toggleCell(jour, heure, dragMode);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    setDragMode(null);
  };

  // Sur mobile, un `touchstart` est suivi peu après d'un `mousedown` simulé
  // par le navigateur pour la compatibilité avec le code souris — sans
  // `preventDefault()`, la cellule serait cochée puis aussitôt décochée (ou
  // l'inverse) par ce doublon d'événement, ce qui donne l'impression que le
  // clic ne "prend" pas sur téléphone.
  const handleTouchStart = (e, jour, heure) => {
    e.preventDefault();
    handleMouseDown(jour, heure);
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.dataset && target.dataset.jour && target.dataset.heure) {
      handleMouseEnter(target.dataset.jour, target.dataset.heure);
    }
  };

  return (
    <div
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleTouchMove}
      style={{ userSelect: 'none', overflowX: 'auto', touchAction: 'none' }}
    >
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', fontSize: 11 }}></th>
            {JOURS.map(jour => (
              <th key={jour} style={{ padding: '4px 2px', fontWeight: 600, color: 'var(--text-primary)', fontSize: 11 }}>
                {jour.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HEURES.map(heure => (
            <tr key={heure}>
              <td style={{ padding: '2px 6px', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>
                {heure}
              </td>
              {JOURS.map(jour => {
                const key = cellKey(jour, heure);
                const isSelected = selected.has(key);
                return (
                  <td
                    key={jour}
                    data-jour={jour}
                    data-heure={heure}
                    onMouseDown={() => handleMouseDown(jour, heure)}
                    onMouseEnter={() => handleMouseEnter(jour, heure)}
                    onTouchStart={(e) => handleTouchStart(e, jour, heure)}
                    style={{
                      width: 32,
                      height: 28,
                      border: '1px solid var(--border)',
                      background: isSelected ? 'var(--clay)' : 'var(--surface-1)',
                      cursor: 'pointer',
                      transition: 'background 0.08s ease',
                    }}
                    aria-label={`${jour} ${heure}`}
                    role="button"
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        Touchez (ou glissez) sur les créneaux d'une heure où la personne est disponible.
      </p>
    </div>
  );
}
