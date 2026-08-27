import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import { connectDB } from './config/db.js';
import { initSocket } from './realtime/socket.js';
import { errorHandler } from './middleware/errorHandler.js';
import { seedDatabase } from './seed/seeder.js';
import { User } from './models/User.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import busRoutes from './routes/busRoutes.js';
import routeRoutes from './routes/routeRoutes.js';
import stopRoutes from './routes/stopRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'CampusMove AI - Real-Time Mobility & Trip Planning Platform',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/agent', assistantRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/incidents', incidentRoutes);

// 404 Route handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.originalUrl}` });
});

// Error handling middleware
app.use(errorHandler);

// Initialize Socket.IO
initSocket(server, process.env.CORS_ORIGIN || '*');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed if database is freshly created / empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Fresh database detected. Auto-seeding initial campus data...');
      await seedDatabase();
    }

    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 CampusMove AI API Server running on port ${PORT}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
