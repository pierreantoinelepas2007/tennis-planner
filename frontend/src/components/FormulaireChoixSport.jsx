import React, { useState } from 'react';
import { Card } from './Common.jsx';
import FormulaireEleve from './FormulaireEleve.jsx';
import FormulaireElevePadel from './FormulaireElevePadel.jsx';

// Premier écran du formulaire public : la personne choisit d'abord son
// sport avant de voir quoi que ce soit d'autre. Les deux formulaires qui
// suivent (tennis et padel) sont entièrement indépendants l'un de l'autre,
// jusqu'à leurs propres tables en base de données.
export default function FormulaireChoixSport({ onCreated }) {
  const [sport, setSport] = useState(null); // null | 'tennis' | 'padel'

  if (sport === 'tennis') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <button onClick={() => setSport(null)} style={{ fontSize: 13, marginBottom: 12, padding: '4px 10px' }}>
          ← Changer de sport
        </button>
        <FormulaireEleve onCreated={onCreated} />
      </div>
    );
  }

  if (sport === 'padel') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <button onClick={() => setSport(null)} style={{ fontSize: 13, marginBottom: 12, padding: '4px 10px' }}>
          ← Changer de sport
        </button>
        <FormulaireElevePadel onCreated={onCreated} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <Card>
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>Pour quelle activité souhaitez-vous vous inscrire ?</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          <button onClick={() => setSport('tennis')} style={{ padding: '18px', fontSize: 16, fontWeight: 600 }}>
            🎾 Tennis
          </button>
          <button onClick={() => setSport('padel')} style={{ padding: '18px', fontSize: 16, fontWeight: 600 }}>
            🏓 Padel
          </button>
        </div>
      </Card>
    </div>
  );
}
