// File separato per tenere chiara la logica riserve.
// Il sorteggio usa questo helper per limitare il numero di scuderie con riserva.

function normalizeReserveTeamsCount(value, maxTeams) {
  const count = Number.parseInt(value, 10);
  if (!Number.isInteger(count)) return null;
  if (count < 0) return null;
  if (count > maxTeams) return null;
  return count;
}

module.exports = {
  normalizeReserveTeamsCount
};
