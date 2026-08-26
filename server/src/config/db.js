import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusmove';

  try {
    // Attempt standard connection with 3s timeout
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] MongoDB connected successfully to: ${uri}`);
  } catch (err) {
    console.warn(`[Database] Could not connect to primary MongoDB at ${uri}.`);
    console.log(`[Database] Initializing embedded MongoDB in-memory server fallback...`);

    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[Database] In-memory MongoDB connected successfully at: ${memUri}`);
    } catch (memErr) {
      console.error('[Database] Failed to start in-memory MongoDB fallback:', memErr.message);
      throw memErr;
    }
  }
};

export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (err) {
    console.error('[Database] Error closing DB:', err.message);
  }
};
