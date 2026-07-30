import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import Header from './components/Header.jsx';
import Accueil from './components/Accueil.jsx';
import FormulaireEleve from './components/FormulaireEleve.jsx';
import AdminEleves from './components/AdminEleves.jsx';
import AdminProfs from './components/AdminProfs.jsx';
import AdminTerrains from './components/AdminTerrains.jsx';
import Planning from './components/Planning.jsx';
import VueProf from './components/VueProf.jsx';

export default function App() {
  const [tab, setTab] = useState('accueil');
  const [students, setStudents] = useState([]);
  const [profs, setProfs] = useState([]);
  const [courts, setCourts] = useState([]);
  const [planning, setPlanning] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshAll = useCallback(async () => {
    try {
      setError(null);
      const [s, p, c, pl] = await Promise.all([
        api.getStudents(),
        api.getProfs(),
        api.getCourts(),
        api.getPlanning(),
      ]);
      setStudents(s);
      setProfs(p);
      setCourts(c);
      setPlanning(pl);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les données. Vérifiez la connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger-text)' }}>{error}</p>
        <button onClick={refreshAll}>Réessayer</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 48px' }}>
      <Header tab={tab} setTab={setTab} />
      <div>
        {tab === 'accueil' && <Accueil setTab={setTab} students={students} profs={profs} courts={courts} />}
        {tab === 'formulaire' && <FormulaireEleve onCreated={refreshAll} />}
        {tab === 'admin-eleves' && <AdminEleves students={students} onChanged={refreshAll} />}
        {tab === 'admin-profs' && <AdminProfs profs={profs} onChanged={refreshAll} />}
        {tab === 'admin-terrains' && <AdminTerrains courts={courts} onChanged={refreshAll} />}
        {tab === 'planning' && (
          <Planning
            students={students}
            profs={profs}
            courts={courts}
            planning={planning}
            onChanged={refreshAll}
          />
        )}
        {tab === 'vue-prof' && <VueProf profs={profs} planning={planning} courts={courts} students={students} />}
      </div>
    </div>
  );
}
