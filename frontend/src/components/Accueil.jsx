import React from 'react';
import { Card, StatCard } from './Common.jsx';

export default function Accueil({ setTab, students, profs, courts }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <StatCard label="Participants inscrits" value={students.length} />
        <StatCard label="Professeurs" value={profs.length} />
        <StatCard label="Terrains" value={courts.length} />
      </div>

      <Card>
        <h2 style={{ marginTop: 0 }}>Comment ça marche</h2>
        <ol style={{ fontSize: 15, lineHeight: 1.8, paddingLeft: 20, color: 'var(--text-secondary)' }}>
          <li>Partagez le lien de ce site sur le groupe WhatsApp du club, en demandant à chacun d'aller dans l'onglet <b style={{ color: 'var(--text-primary)' }}>Formulaire</b> pour chaque cours souhaité.</li>
          <li>Renseignez dans <b style={{ color: 'var(--text-primary)' }}>Terrains</b> les créneaux que le professeur vous communique comme disponibles.</li>
          <li>Renseignez dans <b style={{ color: 'var(--text-primary)' }}>Professeurs</b> les horaires de chaque professeur.</li>
          <li>Dans <b style={{ color: 'var(--text-primary)' }}>Participants</b>, complétez le niveau étoile de chacun (pas rempli via le formulaire).</li>
          <li>Allez dans <b style={{ color: 'var(--text-primary)' }}>Planning</b> pour générer une proposition, puis ajustez-la à la main si besoin.</li>
          <li>Utilisez <b style={{ color: 'var(--text-primary)' }}>Vue par prof</b> pour envoyer à chaque professeur son planning.</li>
        </ol>
      </Card>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => setTab('formulaire')} style={{ flex: 1 }}>
          <i className="ti ti-clipboard-list" style={{ marginRight: 6 }}></i>Ouvrir le formulaire
        </button>
        <button onClick={() => setTab('planning')} style={{ flex: 1 }}>
          <i className="ti ti-calendar" style={{ marginRight: 6 }}></i>Générer le planning
        </button>
      </div>
    </div>
  );
}
