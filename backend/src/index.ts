import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { logger } from './logger';
import { loadSettings, getEffectiveConfig } from './services/settingsService';

import healthRouter      from './routes/health';
import weatherRouter     from './routes/weather';
import transportRouter   from './routes/transport';
import calendarRouter    from './routes/calendar';
import holidaysRouter    from './routes/holidays';
import rssRouter         from './routes/rss';
import metarRouter       from './routes/metar';
import settingsRouter    from './routes/settings';

// Load persisted user settings before anything else
loadSettings();

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET'],
}));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/health',      healthRouter);
app.use('/api/weather',     weatherRouter);
app.use('/api/transport',   transportRouter);
app.use('/api/calendar',    calendarRouter);
app.use('/api/holidays',    holidaysRouter);
app.use('/api/rss',         rssRouter);

app.use('/api/metar',      metarRouter);
app.use('/api/settings',   settingsRouter);

// ── Config endpoint — effective config (env defaults + saved settings) ───────
app.get('/api/config', (_req, res) => {
  const cfg = getEffectiveConfig();
  res.json(cfg);
});

// ── API 404 — catch unmatched /api/* before static fallback ──────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Static: React SPA ─────────────────────────────────────────────────────────
// In the Docker image the frontend build is copied to /app/public.
// Locally (dev) this folder won't exist, which is fine — Express skips it silently.
const frontendDist = path.resolve(__dirname, '../public');
app.use(express.static(frontendDist, { maxAge: '1y', immutable: true, index: false }));

// SPA fallback — any unmatched GET returns index.html
// Express v5 requires an explicit path parameter (wildcard '*' alone is deprecated)
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info(`TL-Dashboard API listening on port ${config.port} (${config.nodeEnv})`);
  logger.info(`Timezone: ${config.timezone}`);
  logger.info(`Station: ${config.transport.stationName}`);
});

export default app;
