import React, { useState } from 'react';
import { api, setAdminToken } from '../api.js';

export default function AdminLogin({ onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await api.login(password);
      setAdminToken(token);
      onSuccess();
    } catch (err) {
      setError('Mot de passe incorrect.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', padding: '0 16px' }}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Accès professeur / gestion</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: -8, marginBottom: 16 }}>
          Cette partie du site est réservée à la gestion du club. Les familles n'ont besoin que du formulaire d'inscription.
        </p>
        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}
        <form onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe"
            autoFocus
            style={{ width: '100%', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? 'Connexion...' : 'Se connecter'}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel} style={{ flex: 1 }}>
                Retour au formulaire
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
