// Builds the Express app: middleware, API routes and the static website files.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { MAX_PHOTOS, MAX_UPLOAD_BYTES } from '../public/js/photo-rules.js';
import config from './config.js';
import publicRoutes from './routes/publicRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import manageRoutes from './routes/manageRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { apiNotFound, errorHandler } from './middleware/errorHandler.js';

// Photos arrive as base64 text, which is a third bigger than the files themselves.
const PHOTO_FORM_LIMIT = `${Math.ceil((MAX_PHOTOS * MAX_UPLOAD_BYTES * 4) / 3 / 1024 + 64)}kb`;

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function createApp() {
  const app = express();

  // Behind a hosting proxy, this makes req.ip the visitor's real IP (needed for rate limits).
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(securityHeaders);

  // Forms that can carry photos get a larger size limit; every other request stays small.
  const photoForm = express.json({ limit: PHOTO_FORM_LIMIT });
  app.post('/api/listings', photoForm);
  app.post('/api/manage/edit', photoForm);
  app.put('/api/admin/listings/:id', photoForm);
  app.use(express.json({ limit: '20kb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/manage', manageRoutes);
  app.use('/api', publicRoutes);
  app.use('/api', apiNotFound);
  app.use('/photos', photoRoutes);

  // The website itself: plain HTML/CSS/JS files. "/submit" serves public/submit.html, "/manage" manage.html.
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

  app.use(errorHandler);
  return app;
}
