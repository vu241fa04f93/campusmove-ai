import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || window.location.origin;

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.isConnected) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log(`[SocketService] Connected to real-time server (ID: ${this.socket.id})`);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.warn(`[SocketService] Disconnected from real-time server: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SocketService] Real-time connection error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Room Subscriptions
  joinBusRoom(busId) {
    if (this.socket) this.socket.emit('join:bus', busId);
  }

  leaveBusRoom(busId) {
    if (this.socket) this.socket.emit('leave:bus', busId);
  }

  joinCampusMap() {
    if (this.socket) this.socket.emit('join:campus_map');
  }

  // Driver Actions
  startTrip(busId, routeId, driverId, isSimulated = false) {
    if (!this.socket) this.connect();
    this.socket.emit('driver:start_trip', {
      busId,
      routeId,
      driverId,
      isSimulated,
    });
  }

  sendLocationUpdate(data) {
    if (!this.socket) this.connect();
    this.socket.emit('driver:location_update', data);
  }

  endTrip(busId, driverId) {
    if (!this.socket) this.connect();
    this.socket.emit('driver:end_trip', {
      busId,
      driverId,
    });
  }

  updateBusStatus(busId, status, statusMessage) {
    if (!this.socket) this.connect();
    this.socket.emit('bus:status_change', {
      busId,
      status,
      statusMessage,
    });
  }

  // Event Listeners
  onLocationBroadcast(callback) {
    if (!this.socket) this.connect();
    this.socket.on('bus:location_broadcast', callback);
    return () => this.socket.off('bus:location_broadcast', callback);
  }

  onTripStarted(callback) {
    if (!this.socket) this.connect();
    this.socket.on('bus:trip_started', callback);
    return () => this.socket.off('bus:trip_started', callback);
  }

  onTripEnded(callback) {
    if (!this.socket) this.connect();
    this.socket.on('bus:trip_ended', callback);
    return () => this.socket.off('bus:trip_ended', callback);
  }

  onStatusUpdated(callback) {
    if (!this.socket) this.connect();
    this.socket.on('bus:status_updated', callback);
    return () => this.socket.off('bus:status_updated', callback);
  }

  onAlertNew(callback) {
    if (!this.socket) this.connect();
    this.socket.on('alert:new', callback);
    return () => this.socket.off('alert:new', callback);
  }
}

export const socketService = new SocketService();
