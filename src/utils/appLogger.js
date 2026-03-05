/**
 * Remote logger — POSTs log entries to the local log server over WiFi.
 * Set VITE_LOG_SERVER in .env.local to your machine's local IP:port, e.g.:
 *   VITE_LOG_SERVER=http://192.168.1.42:4000
 *
 * Falls back silently if server is unreachable.
 */

const SERVER = import.meta.env.VITE_LOG_SERVER || null;

function log(level, location, message, data = {}) {
  if (!SERVER) return;
  const entry = {
    level,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  fetch(`${SERVER}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

export const appLog = {
  info:  (location, message, data) => log('INFO',  location, message, data),
  warn:  (location, message, data) => log('WARN',  location, message, data),
  error: (location, message, data) => log('ERROR', location, message, data),
};
