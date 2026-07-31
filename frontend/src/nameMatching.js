// Utilitaires de comparaison de noms tolérants aux petites fautes de frappe,
// utilisés pour détecter les correspondances (et les repérer visuellement
// quand un nom saisi par un parent ne correspond à personne de connu).

export function normName(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function namesMatch(a, b) {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen <= 3) return false;
  const threshold = maxLen <= 6 ? 1 : 2;
  return levenshteinDistance(na, nb) <= threshold;
}

// Retourne 'exact', 'approx' ou null selon que `name` correspond exactement,
// approximativement (faute de frappe tolérée), ou pas du tout à l'un des
// `knownNames` fournis.
export function matchQuality(name, knownNames) {
  if (!name) return null;
  const na = normName(name);
  if (knownNames.some(k => normName(k) === na)) return 'exact';
  if (knownNames.some(k => namesMatch(k, name))) return 'approx';
  return 'none';
}
