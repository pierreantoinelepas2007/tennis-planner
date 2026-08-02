// Regroupe une liste de créneaux {jour, heure} en un résumé lisible, en
// fusionnant les heures consécutives d'un même jour en plages (ex: "14:00,
// 15:00, 16:00" -> "14h-17h") pour un affichage compact. Partagé entre les
// vues qui doivent afficher les disponibilités d'un participant (admin des
// participants, calendrier des disponibilités restantes).

const JOURS_ORDRE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function summarizeDisponibilites(disponibilites) {
  const byJour = {};
  (disponibilites || []).forEach(d => {
    if (!byJour[d.jour]) byJour[d.jour] = [];
    byJour[d.jour].push(d.heure);
  });

  const parts = JOURS_ORDRE.filter(j => byJour[j]).map(jour => {
    const heures = byJour[jour].map(h => parseInt(h, 10)).sort((a, b) => a - b);
    const ranges = [];
    let rangeStart = heures[0];
    let prev = heures[0];
    for (let i = 1; i <= heures.length; i++) {
      if (i < heures.length && heures[i] === prev + 1) {
        prev = heures[i];
        continue;
      }
      ranges.push(`${rangeStart}h-${prev + 1}h`);
      if (i < heures.length) {
        rangeStart = heures[i];
        prev = heures[i];
      }
    }
    return `${jour} ${ranges.join(', ')}`;
  });

  return parts.join(' · ');
}
