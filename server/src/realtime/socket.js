import { Server } from 'socket.io';
import { Bus } from '../models/Bus.js';
import { LiveLocation } from '../models/LiveLocation.js';
import { Route } from '../models/Route.js';
import { calculateStopETAs } from '../utils/geoUtils.js';

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

    // Join general campus map stream
    socket.on('join:campus_map', () => {
      socket.join('campus_map');
      console.log(`[Socket.IO] ${socket.id} subscribed to campus_map feed`);
    });

    // 1. Driver Starts Trip
    socket.on('driver:start_trip', async (data) => {
      try {
        const { busId, routeId, driverId, isSimulated } = data;
        if (!busId) return;

        const updateData = {
          isTripActive: true,
          isLive: true,
          isSimulated: !!isSimulated,
          status: 'active',
        };
        if (routeId) updateData.currentRoute = routeId;
        if (driverId) updateData.currentDriver = driverId;

        const bus = await Bus.findByIdAndUpdate(busId, updateData, { new: true })
          .populate('currentDriver', 'name email phone')
          .populate({
            path: 'currentRoute',
            populate: { path: 'stops.stop' },
          });

        console.log(`[Socket.IO] Trip started for ${bus?.busNumber || busId} (Simulated: ${!!isSimulated})`);

        io.emit('bus:trip_started', {
          busId,
          busNumber: bus?.busNumber,
          route: bus?.currentRoute,
          driver: bus?.currentDriver,
          isSimulated: !!isSimulated,
          timestamp: new Date(),
        });
      } catch (err) {
        console.error('[Socket.IO] Error handling start trip:', err.message);
      }
    });

    // 2. Driver Location Update (Browser Geolocation / Simulation Stream)
    socket.on('driver:location_update', async (data) => {
      try {
        const { busId, lat, lng, speed, heading, accuracy, altitude, driverId, isSimulated } = data;
        if (!busId || lat === undefined || lng === undefined) return;

        const locationObj = {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          speed: speed !== undefined && speed !== null ? parseFloat(speed) : 0,
          heading: heading !== undefined && heading !== null ? parseFloat(heading) : 0,
          accuracy: accuracy || 5,
          altitude: altitude || null,
          updatedAt: new Date(),
        };

        // Update bus in DB
        const bus = await Bus.findByIdAndUpdate(
          busId,
          {
            lastKnownLocation: locationObj,
            isLive: true,
            isTripActive: true,
            isSimulated: !!isSimulated,
          },
          { new: true }
        ).populate({
          path: 'currentRoute',
          populate: { path: 'stops.stop' },
        });

        // Write to LiveLocation history collection
        await LiveLocation.create({
          bus: busId,
          driver: driverId || bus?.currentDriver,
          route: bus?.currentRoute?._id,
          coordinates: { lat: locationObj.lat, lng: locationObj.lng },
          speed: locationObj.speed,
          heading: locationObj.heading,
        });

        // Compute Stop ETAs dynamically for downstream stops
        let etas = [];
        if (bus?.currentRoute?.stops && bus.currentRoute.stops.length > 0) {
          etas = calculateStopETAs(locationObj, bus.currentRoute.stops, bus.status);
        }

        // Broadcast to all clients (Student, Admin, Map viewers)
        const broadcastPayload = {
          busId,
          busNumber: bus?.busNumber,
          plateNumber: bus?.plateNumber,
          coordinates: { lat: locationObj.lat, lng: locationObj.lng },
          speed: locationObj.speed,
          heading: locationObj.heading,
          accuracy: locationObj.accuracy,
          status: bus?.status || 'active',
          statusMessage: bus?.statusMessage || 'Operating normally',
          isTripActive: true,
          isSimulated: !!isSimulated,
          route: bus?.currentRoute
            ? {
                _id: bus.currentRoute._id,
                name: bus.currentRoute.name,
                code: bus.currentRoute.code,
                color: bus.currentRoute.color,
              }
            : null,
          etas,
          timestamp: new Date(),
        };

        io.emit('bus:location_broadcast', broadcastPayload);
      } catch (err) {
        console.error('[Socket.IO] Error handling location update:', err.message);
      }
    });

    // 3. Driver Ends Trip
    socket.on('driver:end_trip', async (data) => {
      try {
        const { busId, driverId } = data;
        if (!busId) return;

        const bus = await Bus.findByIdAndUpdate(
          busId,
          {
            isTripActive: false,
            isLive: false,
            status: 'out_of_service',
            statusMessage: 'Trip completed — Vehicle off duty',
          },
          { new: true }
        );

        console.log(`[Socket.IO] Trip ended for ${bus?.busNumber || busId}`);

        io.emit('bus:trip_ended', {
          busId,
          busNumber: bus?.busNumber,
          timestamp: new Date(),
        });
      } catch (err) {
        console.error('[Socket.IO] Error handling end trip:', err.message);
      }
    });

    // 4. Status Change Event (Delayed / Active / Breakdown)
    socket.on('bus:status_change', async (data) => {
      try {
        const { busId, status, statusMessage } = data;
        const bus = await Bus.findByIdAndUpdate(
          busId,
          { status, statusMessage },
          { new: true }
        ).populate({
          path: 'currentRoute',
          populate: { path: 'stops.stop' },
        });

        // Recalculate ETAs with new status
        let etas = [];
        if (bus?.currentRoute?.stops && bus.lastKnownLocation) {
          etas = calculateStopETAs(bus.lastKnownLocation, bus.currentRoute.stops, status);
        }

        io.emit('bus:status_updated', {
          busId,
          status,
          statusMessage,
          etas,
          timestamp: new Date(),
        });
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
