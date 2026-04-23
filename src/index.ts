import express, { Request, Response } from 'express';
import logger from './logger';
import { registerShutdownHandlers, CloseableConnection, WorkerLike } from './shutdown';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'talenttrust-backend' });
});

app.get('/api/v1/contracts', (_req: Request, res: Response) => {
  res.json({ contracts: [] });
});

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'server_started');
});

// ── Downstream connections ────────────────────────────────────────────────────
const connections: CloseableConnection[] = [];

// ── BullMQ workers ────────────────────────────────────────────────────────────
const workers: WorkerLike[] = [];

registerShutdownHandlers(server, workers, connections);
