import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import documentsRoutes from './routes/documents';
import conversationsRoutes from './routes/conversations';
import usersRoutes from './routes/users';
import tenantsRoutes from './routes/tenants';
import botPersonaRoutes from './routes/botPersona';
import frdGenerateRoutes from './routes/frdGenerate';

const app = express();
const PORT = process.env.PORT || 8000;

// --------------- Middleware ---------------
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// --------------- Routes ---------------
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/bot-persona', botPersonaRoutes);
app.use('/api/frd-generate', frdGenerateRoutes);

// --------------- Health check ---------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --------------- Global error handler ---------------
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// --------------- Start ---------------
app.listen(PORT, () => {
  console.log(`🚀 YourAI backend running on http://localhost:${PORT}`);
});

export default app;
