const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Students
  getStudents: () => request('/students'),
  createStudent: (data) => request('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, patch) => request(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),

  // Profs
  getProfs: () => request('/profs'),
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
  generatePlanning: () => request('/planning/generate', { method: 'POST' }),
  updatePlanningBlock: (id, patch) => request(`/planning/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deletePlanningBlock: (id) => request(`/planning/${id}`, { method: 'DELETE' }),
};
