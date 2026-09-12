import { Router, Request, Response } from 'express';
import { fetchMetar } from '../services/metarService';
import { getEffectiveConfig } from '../services/settingsService';
import { logger } from '../logger';

const router = Router();

/** GET /api/metar — fetch decoded METAR for the configured (or query-param) ICAO */
router.get('/', async (req: Request, res: Response) => {
  const icao = ((req.query.icao as string) || getEffectiveConfig().metarIcao || '').trim();

  if (!icao) {
    res.status(400).json({ error: 'No ICAO code configured. Set METAR_ICAO or configure it in Settings.' });
    return;
  }

  if (!/^[A-Za-z0-9]{3,4}$/.test(icao)) {
    res.status(400).json({ error: `Invalid ICAO code: "${icao}". Must be 3–4 alphanumeric characters.` });
    return;
  }

  try {
    const data = await fetchMetar(icao);
    res.json(data);
  } catch (err) {
    logger.error(`METAR route error for ${icao}: ${err}`);
    res.status(502).json({ error: `Failed to fetch METAR for ${icao}`, detail: String(err) });
  }
});

export default router;
