import { Server } from 'socket.io';
import { Bus } from '../models/Bus.js';
import { LiveLocation } from '../models/LiveLocation.js';

let ioInstance = null;

export const initSocket = (httpServer, corsOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join bus specific room
    socket.on('join:bus', (busId) => {
      socket.join(`bus:${busId}`);
      console.log(`[Socket.IO] ${socket.id} joined room bus:${busId}`);
    });

    // Leave bus room
    socket.on('leave:bus', (busId) => {
      socket.leave(`bus:${busId}`);
      console.log(`[Socket.IO] ${socket.id} left room bus:${busId}`);
    });

    // Join route room
    socket.on('join:route', (routeId) => {
      socket.join(`route:${routeId}`);
    });

    // Driver location update (Prepared for Phase 2 Live Tracking)
    socket.on('driver:location_update', async (data) => {
      try {
        const { busId, lat, lng, speed, heading, driverId } = data;
        if (!busId || lat === undefined || lng === undefined) return;

        // Update bus record
        await Bus.findByIdAndUpdate(busId, {
          lastKnownLocation: {
            lat,
            lng,
            speed: speed || 0,
            heading: heading || 0,
            updatedAt: new Date(),
          },
        });

        // Store live location history record
        await LiveLocation.create({
          bus: busId,
          driver: driverId,
          coordinates: { lat, lng },
          speed: speed || 0,
          heading: heading || 0,
        });

        // Broadcast to all clients watching this bus or campus map
        io.emit('bus:location_broadcast', {
          busId,
          coordinates: { lat, lng },
          speed,
          heading,
          timestamp: new Date(),
        });
      } catch (err) {
        console.error('[Socket.IO] Error handling location update:', err.message);
      }
    });

    // Status change event
    socket.on('bus:status_change', async (data) => {
      try {
        const { busId, status, statusMessage } = data;
        await Bus.findByIdAndUpdate(busId, { status, statusMessage });
        io.emit('bus:status_updated', { busId, status, statusMessage });
      } catch (err) {
        console.error('[Socket.IO] Error handling bus status change:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
};
