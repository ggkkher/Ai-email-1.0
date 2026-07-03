import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import betriebRoutes from './routes/betriebe.js';
import projektRoutes from './routes/projekte.js';
import angebotRoutes from './routes/angebote.js';
import angeboteAdvancedRoutes from './routes/angebote-advanced.js';

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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 GaLaBau API running on http://localhost:${PORT}`);
});

export default app;
