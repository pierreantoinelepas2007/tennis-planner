import React from 'react';

const TABS = [
  { id: 'accueil', label: 'Accueil', icon: 'ti-home' },
  { id: 'formulaire', label: 'Formulaire élève', icon: 'ti-clipboard-list' },
  { id: 'admin-eleves', label: 'Élèves', icon: 'ti-users' },
  { id: 'admin-profs', label: 'Professeurs', icon: 'ti-user' },
  { id: 'admin-terrains', label: 'Terrains', icon: 'ti-square' },
  { id: 'planning', label: 'Planning', icon: 'ti-calendar' },
  { id: 'vue-prof', label: 'Vue par prof', icon: 'ti-file-export' },
];

export default function Header({ tab, setTab }) {
  return (
    <div style={{ marginBottom: '1.5rem', paddingTop: 24 }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Planificateur école de tennis</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Cours, groupes et terrains — saison septembre à mai</p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13,
              background: tab === t.id ? 'var(--accent-soft)' : 'var(--surface-1)',
              borderColor: tab === t.id ? 'var(--clay)' : 'var(--border-strong)',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: 16 }} aria-hidden="true"></i>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
