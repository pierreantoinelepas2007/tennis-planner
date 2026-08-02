import React, { useState, useEffect, useCallback } from 'react';
import { api, getAdminToken, clearAdminToken } from './api.js';
import Header from './components/Header.jsx';
import Accueil from './components/Accueil.jsx';
import FormulaireEleve from './components/FormulaireEleve.jsx';
import AdminEleves from './components/AdminEleves.jsx';
import AdminProfs from './components/AdminProfs.jsx';
import AdminTerrains from './components/AdminTerrains.jsx';
import Planning from './components/Planning.jsx';
import VueProf from './components/VueProf.jsx';
import AdminLogin from './components/AdminLogin.jsx';

const VALID_TABS = ['accueil', 'formulaire', 'admin-eleves', 'admin-profs', 'admin-terrains', 'planning', 'vue-prof'];

function getInitialTab() {
  try {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('tab');
    if (requested && VALID_TABS.includes(requested)) return requested;
  } catch (e) {
    // ignore, repli sur l'accueil
  }
  return 'accueil';
}

export default function App() {
  const [tab, setTab] = useState(getInitialTab);
  // Le formulaire est la seule partie accessible sans connexion. Si l'onglet
  // demandé dans l'URL est le formulaire, on n'affiche pas l'écran de
  // connexion par défaut ; pour tout autre onglet (y compris l'accueil), la
  // connexion est requise.
  const [showLogin, setShowLogin] = useState(getInitialTab() !== 'formulaire');
  const [isAdmin, setIsAdmin] = useState(!!getAdminToken());
  const [students, setStudents] = useState([]);
  const [profs, setProfs] = useState([]);
  const [courts, setCourts] = useState([]);
  const [planning, setPlanning] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
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
      if (e.message && e.message.includes('401')) {
        // Le jeton n'est plus valide (ex : serveur redémarré) : retour à l'écran de connexion.
        clearAdminToken();
        setIsAdmin(false);
      } else {
        setError("Impossible de charger les données. Vérifiez la connexion au serveur.");
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) refreshAll();
  }, [isAdmin, refreshAll]);

  // Le formulaire d'inscription est utilisable par tout le monde, sans
  // connexion, et sans afficher le reste de la navigation du site.
  if (!isAdmin && tab === 'formulaire' && !showLogin) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 48px' }}>
        <div style={{ paddingTop: 24, marginBottom: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>Planificateur école de tennis</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Inscription à un cours</p>
        </div>
        <FormulaireEleve onCreated={() => {}} />
        <p style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => setShowLogin(true)} style={{ fontSize: 12, padding: '4px 10px', color: 'var(--text-muted)' }}>
            Accès professeur
          </button>
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLogin
        onSuccess={() => { setIsAdmin(true); setShowLogin(false); setTab('accueil'); }}
        onCancel={() => { setShowLogin(false); setTab('formulaire'); }}
      />
    );
  }

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
        {tab === 'admin-eleves' && <AdminEleves students={students} profs={profs} onChanged={refreshAll} />}
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
