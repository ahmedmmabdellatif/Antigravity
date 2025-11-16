import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env';
import parseRoutes from './routes/parse.routes';
import planRoutes from './routes/plan.routes';
import prisma from './db/client';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// API Routes
app.use('/api/parse', parseRoutes);
app.use('/api/plans', planRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const PORT = config.PORT;

app.listen(PORT, () => {
  console.log('==========================================');
  console.log(`🚀 Fitness PDF Parser Backend v2`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 Worker URL: ${config.WORKER_URL}`);
  console.log('==========================================');
  console.log(`\n✅ Ready to accept requests at http://localhost:${PORT}`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   POST   /api/parse         - Upload and parse PDF`);
  console.log(`   GET    /api/plans         - List all parsed plans`);
  console.log(`   GET    /api/plans/:id     - Get plan by ID`);
  console.log(`   GET    /api/plans/:id/debug - Get debug data`);
  console.log(`   GET    /health            - Health check`);
  console.log('\n');
});

export default app;
