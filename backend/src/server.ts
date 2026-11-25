import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import { getPool } from './config/db';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '150', 10);

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// No-cache headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Serve Frontend (built assets or static assets)
const frontendDist = path.join(__dirname, '../../frontend/dist');
const legacyStatic = path.join(__dirname, '../../static');

app.use(express.static(frontendDist));
app.use('/static', express.static(legacyStatic));
app.use('/assets', express.static(path.join(legacyStatic, 'assets')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexDist = path.join(frontendDist, 'index.html');
  res.sendFile(indexDist, (err) => {
    if (err) {
      // Fallback to legacy index if dist not yet built
      res.sendFile(path.join(__dirname, '../../templates/index.html'));
    }
  });
});

async function start() {
  try {
    console.log('==================================================');
    console.log(' Sensus - SystemTracabilie (TypeScript Backend)');
    console.log(` Target Port: ${PORT}`);
    console.log('==================================================');

    await getPool();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SystemTracabilie Server running on http://localhost:${PORT}`);
      console.log(`🚀 Network access: http://127.0.0.1:${PORT}`);
    });
  } catch (err: any) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

