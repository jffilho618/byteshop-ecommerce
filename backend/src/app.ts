import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isDevelopment } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares';
import routes from './routes';

// Criar aplicação Express
const app: Application = express();

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger (apenas em desenvolvimento)
if (isDevelopment) {
  app.use(morgan('dev'));
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ============================================
// ROTAS DA API
// ============================================
app.use('/api', routes);

// ============================================
// ERROR HANDLERS
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
