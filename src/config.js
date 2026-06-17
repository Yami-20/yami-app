// Single source of truth for the backend URL.
// Production (Electron + Android) → Render-hosted backend.
// Local development → localhost, unless overridden.
//
// To point at your own backend (self-hosted, local dev override, etc.),
// set REACT_APP_BACKEND_URL at build time, e.g.:
//   REACT_APP_BACKEND_URL=http://localhost:3001 npm start

const PRODUCTION_BACKEND = 'https://yami-backend.onrender.com';

export const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : PRODUCTION_BACKEND);
