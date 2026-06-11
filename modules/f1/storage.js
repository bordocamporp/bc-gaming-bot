const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const driversPath = path.join(dataDir, 'drivers.json');
const drawPath = path.join(dataDir, 'draw.json');
const calendarPath = path.join(dataDir, 'calendar.json');
const resultsPath = path.join(dataDir, 'results.json');

function ensureFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(driversPath)) fs.writeFileSync(driversPath, '[]', 'utf8');
  if (!fs.existsSync(drawPath)) fs.writeFileSync(drawPath, '{}', 'utf8');
  if (!fs.existsSync(calendarPath)) fs.writeFileSync(calendarPath, '[]', 'utf8');
  if (!fs.existsSync(resultsPath)) fs.writeFileSync(resultsPath, '[]', 'utf8');
}

function readJson(filePath, fallback) {
  ensureFiles();
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureFiles();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function getDrivers() { return readJson(driversPath, []); }
function saveDrivers(drivers) { writeJson(driversPath, drivers); }

function upsertDriver(driver) {
  const drivers = getDrivers();
  const index = drivers.findIndex(d => d.discordId === driver.discordId);
  const finalDriver = { ...driver, updatedAt: new Date().toISOString() };

  if (index >= 0) drivers[index] = { ...drivers[index], ...finalDriver };
  else drivers.push({ ...finalDriver, createdAt: new Date().toISOString() });

  saveDrivers(drivers);
  return finalDriver;
}

function updateDriver(discordId, patch) {
  const drivers = getDrivers();
  const index = drivers.findIndex(d => d.discordId === discordId);
  if (index < 0) return null;
  drivers[index] = { ...drivers[index], ...patch, updatedAt: new Date().toISOString() };
  saveDrivers(drivers);
  return drivers[index];
}

function getApprovedDrivers() { return getDrivers().filter(d => d.status === 'approved'); }

function resetDrawAssignments() {
  const drivers = getDrivers().map(d => ({ ...d, team: null, isReserve: false, reserveForTeam: null }));
  saveDrivers(drivers);
}

function saveDraw(draw) { writeJson(drawPath, { ...draw, generatedAt: new Date().toISOString() }); }
function getDraw() { return readJson(drawPath, {}); }

function saveCalendar(calendar) { writeJson(calendarPath, calendar); }
function getCalendar() { return readJson(calendarPath, []); }

function saveRaceResult(result) {
  const results = getRaceResults();
  const index = results.findIndex(r => r.gpKey === result.gpKey);
  const finalResult = { ...result, savedAt: new Date().toISOString() };
  if (index >= 0) results[index] = finalResult;
  else results.push(finalResult);
  writeJson(resultsPath, results);
  return finalResult;
}

function getRaceResults() { return readJson(resultsPath, []); }

function resetF1Data() {
  writeJson(driversPath, []);
  writeJson(drawPath, {});
  writeJson(calendarPath, []);
  writeJson(resultsPath, []);
}

module.exports = {
  getDrivers,
  saveDrivers,
  upsertDriver,
  updateDriver,
  getApprovedDrivers,
  resetDrawAssignments,
  saveDraw,
  getDraw,
  saveCalendar,
  getCalendar,
  saveRaceResult,
  getRaceResults,
  resetF1Data
};
