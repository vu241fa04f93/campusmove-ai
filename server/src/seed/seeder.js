import dotenv from 'dotenv';
dotenv.config();

import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { DriverProfile } from '../models/DriverProfile.js';
import { Stop } from '../models/Stop.js';
import { Route } from '../models/Route.js';
import { Bus } from '../models/Bus.js';
import { Schedule } from '../models/Schedule.js';

export const seedDatabase = async () => {
  try {
    console.log('[Seeder] Clearing old records...');
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await DriverProfile.deleteMany({});
    await Stop.deleteMany({});
    await Route.deleteMany({});
    await Bus.deleteMany({});
    await Schedule.deleteMany({});

    console.log('[Seeder] Creating Demo Users...');
    // 1. Create Users
    const studentUser = await User.create({
      name: 'Alex Chen',
      email: 'student@campusmove.edu',
      password: 'student123',
      role: 'student',
      phone: '+1 (555) 234-5678',
    });

    const driverUser = await User.create({
      name: 'John Smith',
      email: 'driver@campusmove.edu',
      password: 'driver123',
      role: 'driver',
      phone: '+1 (555) 345-6789',
    });

    const adminUser = await User.create({
      name: 'Chief Sharma',
      email: 'admin@campusmove.edu',
      password: 'admin123',
      role: 'admin',
      phone: '+1 (555) 987-6543',
    });

    console.log('[Seeder] Creating Campus Stops...');
    // 2. Create Stops (Clustered realistically around campus coordinate 28.545, 77.192)
    const stopsData = [
      {
        name: 'Main Campus Gate (Gate 1)',
        code: 'GATE-1',
        coordinates: { lat: 28.5385, lng: 77.1900 },
        campusZone: 'Main Entrance',
        description: 'Primary campus entrance, city transit connection & security checkpost',
        amenities: ['Covered Shelter', 'Security Kiosk', 'Digital Board', 'Seating'],
        orderIndex: 1,
      },
      {
        name: 'Hostel 3 (Men’s Residence)',
        code: 'H3',
        coordinates: { lat: 28.5415, lng: 77.1895 },
        campusZone: 'Hostels',
        description: 'North hostel cluster stop serving Hostel 3 & Hostel 4',
        amenities: ['Covered Shelter', 'Bicycle Rack', 'Night Lighting'],
        orderIndex: 2,
      },
      {
        name: 'Hostel 7 (Women’s Residence)',
        code: 'H7',
        coordinates: { lat: 28.5422, lng: 77.1880 },
        campusZone: 'Hostels',
        description: 'West hostel quad stop serving Hostel 7 & Dining Hall B',
        amenities: ['Covered Shelter', 'Emergency Call Box', 'Seating'],
        orderIndex: 3,
      },
      {
        name: 'Administrative Building',
        code: 'ADMIN',
        coordinates: { lat: 28.5448, lng: 77.1905 },
        campusZone: 'Administrative',
        description: 'Registrar, Dean offices, Finance, and Central Plaza',
        amenities: ['ATM', 'Covered Walkway', 'Drinking Water', 'Digital Board'],
        orderIndex: 4,
      },
      {
        name: 'Central Library & Knowledge Hub',
        code: 'LIB',
        coordinates: { lat: 28.5460, lng: 77.1920 },
        campusZone: 'Academic Zone',
        description: 'Main campus library, study center, and cafeteria lawn',
        amenities: ['Cafe Kiosk', 'Covered Shelter', 'Seating', 'Wi-Fi Hotspot'],
        orderIndex: 5,
      },
      {
        name: 'Block C (Computer Science)',
        code: 'BLK-C',
        coordinates: { lat: 28.5475, lng: 77.1942 },
        campusZone: 'Academic Zone',
        description: 'School of Computing, AI Labs, and Robotics Center',
        amenities: ['Covered Shelter', 'Digital Timetable Display', 'Ramp Access'],
        orderIndex: 6,
      },
      {
        name: 'Engineering Block A & Labs',
        code: 'ENG-A',
        coordinates: { lat: 28.5485, lng: 77.1915 },
        campusZone: 'Academic Zone',
        description: 'Mechanical, Electrical, and Civil Engineering workshops',
        amenities: ['Covered Shelter', 'Seating', 'Lighting'],
        orderIndex: 7,
      },
      {
        name: 'Sports Complex & Student Arena',
        code: 'SPORTS',
        coordinates: { lat: 28.5402, lng: 77.1950 },
        campusZone: 'Recreational',
        description: 'Indoor stadium, gymnasium, athletic tracks & pool',
        amenities: ['Bicycle Parking', 'Drinking Water', 'Shelter'],
        orderIndex: 8,
      },
    ];

    const createdStops = await Stop.insertMany(stopsData);
    const stopMap = {};
    createdStops.forEach((s) => {
      stopMap[s.code] = s;
    });

    console.log('[Seeder] Creating Campus Bus Routes...');
    // 3. Create Routes
    const route1 = await Route.create({
      name: 'North-South Campus Express',
      code: 'R-101',
      description: 'Direct main corridor connecting Gate 1, Hostels, Admin, Library and Block C',
      color: '#2563eb', // Blue
      totalDistanceKm: 3.2,
      estimatedDurationMinutes: 12,
      stops: [
        { stop: stopMap['GATE-1']._id, sequence: 1, distanceFromStartKm: 0, estimatedMinutesFromStart: 0 },
        { stop: stopMap['H3']._id, sequence: 2, distanceFromStartKm: 0.8, estimatedMinutesFromStart: 3 },
        { stop: stopMap['ADMIN']._id, sequence: 3, distanceFromStartKm: 1.6, estimatedMinutesFromStart: 6 },
        { stop: stopMap['LIB']._id, sequence: 4, distanceFromStartKm: 2.2, estimatedMinutesFromStart: 8 },
        { stop: stopMap['BLK-C']._id, sequence: 5, distanceFromStartKm: 2.8, estimatedMinutesFromStart: 10 },
        { stop: stopMap['ENG-A']._id, sequence: 6, distanceFromStartKm: 3.2, estimatedMinutesFromStart: 12 },
      ],
      pathCoordinates: [
        [28.5385, 77.1900],
        [28.5415, 77.1895],
        [28.5448, 77.1905],
        [28.5460, 77.1920],
        [28.5475, 77.1942],
        [28.5485, 77.1915],
      ],
    });

    const route2 = await Route.create({
      name: 'Hostel Shuttle Loop',
      code: 'R-102',
      description: 'Dedicated residential loop connecting all hostels with sports complex and academics',
      color: '#10b981', // Emerald
      totalDistanceKm: 4.1,
      estimatedDurationMinutes: 16,
      stops: [
        { stop: stopMap['H7']._id, sequence: 1, distanceFromStartKm: 0, estimatedMinutesFromStart: 0 },
        { stop: stopMap['H3']._id, sequence: 2, distanceFromStartKm: 0.6, estimatedMinutesFromStart: 3 },
        { stop: stopMap['ADMIN']._id, sequence: 3, distanceFromStartKm: 1.4, estimatedMinutesFromStart: 6 },
        { stop: stopMap['LIB']._id, sequence: 4, distanceFromStartKm: 2.1, estimatedMinutesFromStart: 9 },
        { stop: stopMap['BLK-C']._id, sequence: 5, distanceFromStartKm: 2.7, estimatedMinutesFromStart: 11 },
        { stop: stopMap['SPORTS']._id, sequence: 6, distanceFromStartKm: 4.1, estimatedMinutesFromStart: 16 },
      ],
      pathCoordinates: [
        [28.5422, 77.1880],
        [28.5415, 77.1895],
        [28.5448, 77.1905],
        [28.5460, 77.1920],
        [28.5475, 77.1942],
        [28.5402, 77.1950],
      ],
    });

    const route3 = await Route.create({
      name: 'Tech Circuit Shuttle',
      code: 'R-103',
      description: 'Fast circular connector between Administrative plaza, Science and Tech blocks',
      color: '#8b5cf6', // Violet
      totalDistanceKm: 2.5,
      estimatedDurationMinutes: 10,
      stops: [
        { stop: stopMap['ADMIN']._id, sequence: 1, distanceFromStartKm: 0, estimatedMinutesFromStart: 0 },
        { stop: stopMap['LIB']._id, sequence: 2, distanceFromStartKm: 0.7, estimatedMinutesFromStart: 3 },
        { stop: stopMap['BLK-C']._id, sequence: 3, distanceFromStartKm: 1.3, estimatedMinutesFromStart: 5 },
        { stop: stopMap['ENG-A']._id, sequence: 4, distanceFromStartKm: 1.8, estimatedMinutesFromStart: 7 },
        { stop: stopMap['SPORTS']._id, sequence: 5, distanceFromStartKm: 2.5, estimatedMinutesFromStart: 10 },
      ],
      pathCoordinates: [
        [28.5448, 77.1905],
        [28.5460, 77.1920],
        [28.5475, 77.1942],
        [28.5485, 77.1915],
        [28.5402, 77.1950],
      ],
    });

    console.log('[Seeder] Creating Campus Bus Fleet...');
    // 4. Create Buses
    const bus12 = await Bus.create({
      busNumber: 'Bus 12',
      plateNumber: 'KA-01-EXP-1012',
      model: 'Tata Ultra Electric 45-Seater',
      capacity: 45,
      status: 'active',
      currentDriver: driverUser._id,
      currentRoute: route1._id,
      lastKnownLocation: {
        lat: 28.5412,
        lng: 77.1896,
        speed: 22,
        heading: 35,
        updatedAt: new Date(),
      },
      currentPassengerCount: 24,
      statusMessage: 'Approaching Hostel 3 stop on schedule',
    });

    const bus07 = await Bus.create({
      busNumber: 'Bus 07',
      plateNumber: 'KA-01-EXP-1007',
      model: 'Ashok Leyland Campus Shuttle 35',
      capacity: 35,
      status: 'active',
      currentRoute: route2._id,
      lastKnownLocation: {
        lat: 28.5422,
        lng: 77.1880,
        speed: 18,
        heading: 85,
        updatedAt: new Date(),
      },
      currentPassengerCount: 14,
      statusMessage: 'Boarding passengers at Hostel 7',
    });

    const bus04 = await Bus.create({
      busNumber: 'Bus 04',
      plateNumber: 'KA-01-EXP-1004',
      model: 'Volvo 9400 Low Floor',
      capacity: 50,
      status: 'delayed',
      currentRoute: route3._id,
      lastKnownLocation: {
        lat: 28.5445,
        lng: 77.1901,
        speed: 5,
        heading: 45,
        updatedAt: new Date(),
      },
      currentPassengerCount: 38,
      statusMessage: 'Minor 6 min delay due to pedestrian crossing rush',
    });

    const bus09 = await Bus.create({
      busNumber: 'Bus 09',
      plateNumber: 'KA-01-EXP-1009',
      model: 'Eicher Skyline Pro EV',
      capacity: 40,
      status: 'active',
      currentRoute: route1._id,
      lastKnownLocation: {
        lat: 28.5475,
        lng: 77.1942,
        speed: 0,
        heading: 180,
        updatedAt: new Date(),
      },
      currentPassengerCount: 8,
      statusMessage: 'At Block C terminal, preparing southbound return',
    });

    // 5. Create Profiles
    await StudentProfile.create({
      user: studentUser._id,
      studentId: 'CS-2024-8831',
      department: 'Computer Science & Engineering',
      hostel: 'Hostel 3',
      savedStops: [stopMap['H3']._id, stopMap['BLK-C']._id, stopMap['LIB']._id],
      defaultRoute: route1._id,
    });

    await DriverProfile.create({
      user: driverUser._id,
      licenseNumber: 'DL-2024-9988-KA',
      assignedBus: bus12._id,
      dutyStatus: 'on_trip',
      emergencyContact: '+1 (555) 111-2233',
    });

    console.log('[Seeder] Creating Timetable Schedules...');
    // 6. Create Schedules
    const scheduleEntries = [
      // Route 1 Schedules
      { route: route1._id, bus: bus12._id, departureTime: '08:15', estimatedArrivalTime: '08:27', frequencyMinutes: 15, direction: 'outbound' },
      { route: route1._id, bus: bus12._id, departureTime: '08:45', estimatedArrivalTime: '08:57', frequencyMinutes: 15, direction: 'outbound' },
      { route: route1._id, bus: bus09._id, departureTime: '09:15', estimatedArrivalTime: '09:27', frequencyMinutes: 15, direction: 'outbound' },
      { route: route1._id, bus: bus09._id, departureTime: '09:45', estimatedArrivalTime: '09:57', frequencyMinutes: 15, direction: 'outbound' },
      { route: route1._id, bus: bus12._id, departureTime: '13:00', estimatedArrivalTime: '13:12', frequencyMinutes: 20, direction: 'outbound' },
      { route: route1._id, bus: bus12._id, departureTime: '17:15', estimatedArrivalTime: '17:27', frequencyMinutes: 15, direction: 'inbound' },

      // Route 2 Schedules
      { route: route2._id, bus: bus07._id, departureTime: '08:20', estimatedArrivalTime: '08:36', frequencyMinutes: 20, direction: 'circular' },
      { route: route2._id, bus: bus07._id, departureTime: '08:50', estimatedArrivalTime: '09:06', frequencyMinutes: 20, direction: 'circular' },
      { route: route2._id, bus: bus07._id, departureTime: '09:20', estimatedArrivalTime: '09:36', frequencyMinutes: 20, direction: 'circular' },

      // Route 3 Schedules
      { route: route3._id, bus: bus04._id, departureTime: '08:30', estimatedArrivalTime: '08:40', frequencyMinutes: 15, direction: 'circular' },
      { route: route3._id, bus: bus04._id, departureTime: '09:00', estimatedArrivalTime: '09:10', frequencyMinutes: 15, direction: 'circular' },
      { route: route3._id, bus: bus04._id, departureTime: '09:30', estimatedArrivalTime: '09:40', frequencyMinutes: 15, direction: 'circular' },
    ];

    await Schedule.insertMany(scheduleEntries);

    console.log('----------------------------------------------------');
    console.log('✅ [Seeder] CampusMove AI Foundation Database Seeded Successfully!');
    console.log('   - 3 Users (Student, Driver, Admin)');
    console.log('   - 8 Campus Stops (Hostel 3, Block C, Library, etc.)');
    console.log('   - 3 Bus Routes');
    console.log('   - 4 Fleet Buses (Bus 12, Bus 07, Bus 04, Bus 09)');
    console.log('   - 12 Timetable Schedules');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ [Seeder] Seeding error:', error);
    throw error;
  }
};

// If run directly via CLI
if (process.argv[1]?.endsWith('seeder.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await closeDB();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}
