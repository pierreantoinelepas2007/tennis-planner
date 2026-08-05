const BASE = '/api';
const TOKEN_KEY = 'tp:admin-token';

export function getAdminToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setAdminToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    // ignore, l'utilisateur devra se reconnecter si le stockage est indisponible
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    // ignore
  }
}

async function request(path, options = {}) {
  const token = getAdminToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-admin-token': token } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch (e) {
      // ignore
    }
    if (res.status === 401) {
      clearAdminToken();
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Authentification
  login: (password) => request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),

  // Students
  getStudents: () => request('/students'),
  createStudent: (data) => request('/students', { method: 'POST', body: JSON.stringify(data) }),
  createStudentBatch: (data) => request('/students/batch', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, patch) => request(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),

  // Profs
  getProfs: () => request('/profs'),
  getProfNames: () => request('/profs/names'),
  createProf: (data) => request('/profs', { method: 'POST', body: JSON.stringify(data) }),
  deleteProf: (id) => request(`/profs/${id}`, { method: 'DELETE' }),
  addProfDispo: (profId, data) => request(`/profs/${profId}/disponibilites`, { method: 'POST', body: JSON.stringify(data) }),
  removeProfDispo: (profId, dispoId) => request(`/profs/${profId}/disponibilites/${dispoId}`, { method: 'DELETE' }),

  // Courts
  getCourts: () => request('/courts'),
  createCourt: (data) => request('/courts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCourt: (id) => request(`/courts/${id}`, { method: 'DELETE' }),
  addCourtSlot: (courtId, data) => request(`/courts/${courtId}/slots`, { method: 'POST', body: JSON.stringify(data) }),
  removeCourtSlot: (courtId, slotId) => request(`/courts/${courtId}/slots/${slotId}`, { method: 'DELETE' }),

  // Planning
  getPlanning: () => request('/planning'),
  createPlanningBlock: (data) => request('/planning', { method: 'POST', body: JSON.stringify(data) }),
  generatePlanning: () => request('/planning/generate', { method: 'POST' }),
  updatePlanningBlock: (id, patch) => request(`/planning/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deletePlanningBlock: (id) => request(`/planning/${id}`, { method: 'DELETE' }),
};
