import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import betriebRoutes from './routes/betriebe.js';
import projektRoutes from './routes/projekte.js';
import angebotRoutes from './routes/angebote.js';
import angeboteAdvancedRoutes from './routes/angebote-advanced.js';
import workerRoutes, { initWorkerRoutes } from './routes/workers.js';
import AutomationOrchestrator from './workers/automationOrchestrator.js';

dotenv.config();

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/galabau'
});

app.use(cors());
app.use(express.json());

// Middleware: Database pool
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Routes
app.use('/api/betriebe', betriebRoutes);
app.use('/api/projekte', projektRoutes);
app.use('/api/angebote', angebotRoutes);
app.use('/api/angebote', angeboteAdvancedRoutes);

// Worker Recruitment Routes
initWorkerRoutes(pool);
app.use('/api/workers', workerRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Starte Automation Orchestrator wenn ENABLE_AUTOMATION=true
const startAutomation = async () => {
  if (process.env.ENABLE_AUTOMATION === 'true') {
    const orchestrator = new AutomationOrchestrator(pool);
    await orchestrator.start();

    // Graceful Shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutdown signal received...');
      await orchestrator.stop();
      process.exit(0);
    });
  }
};

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 GaLaBau API running on http://localhost:${PORT}`);
  startAutomation();
});

export default app;
