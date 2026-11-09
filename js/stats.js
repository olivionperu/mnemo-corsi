// Registro local de partidas: alimenta la fase "Verificar" del ciclo PDCA de Deming.
const KEY = 'mnemo-corsi.v1';
const MAX_SESSIONS = 60;

function empty() {
  return { best: { directo: 0, inverso: 0 }, sessions: [] };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.sessions) && data.best) return data;
    }
  } catch { /* datos corruptos o almacenamiento bloqueado */ }
  return empty();
}

let data = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* sin persistencia */ }
}

export const getBest = (mode) => data.best[mode] ?? 0;
export const getSessions = () => [...data.sessions];

// Devuelve true si la partida supera el récord del modo.
export function recordSession(session) {
  data.sessions.push(session);
  if (data.sessions.length > MAX_SESSIONS) data.sessions = data.sessions.slice(-MAX_SESSIONS);
  const isRecord = session.span > (data.best[session.mode] ?? 0);
  if (isRecord) data.best[session.mode] = session.span;
  save();
  return isRecord;
}

export function toCSV(sessions) {
  const header = ['partida', 'fecha', 'modo', 'sala', 'bloques', 'intento', 'correcto', 'tiempo_respuesta_ms', 'secuencia', 'respuesta'];
  const rows = [header.join(',')];
  sessions.forEach((s, n) => {
    for (const t of s.trials) {
      rows.push([n + 1, s.date, s.mode, t.room, t.span, t.attempt, t.correct ? 1 : 0, t.rtMs, t.sequence, t.response].join(','));
    }
  });
  return rows.join('\n');
}

export function downloadCSV() {
  const blob = new Blob(['﻿' + toCSV(data.sessions)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mnemo-corsi-datos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
