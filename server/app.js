// Builds the Express app: middleware, API routes and the static website files.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import config from './config.js';
import publicRoutes from './routes/publicRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import manageRoutes from './routes/manageRoutes.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { apiNotFound, errorHandler } from './middleware/errorHandler.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function createApp() {
  const app = express();

  // Behind a hosting proxy, this makes req.ip the visitor's real IP (needed for rate limits).
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(express.json({ limit: '20kb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/manage', manageRoutes);
  app.use('/api', publicRoutes);
  app.use('/api', apiNotFound);

  // The website itself: plain HTML/CSS/JS files. "/submit" serves public/submit.html, "/manage" manage.html.
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

  app.use(errorHandler);
  return app;
}
