import mongoose from 'mongoose';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and serverless invocations on Vercel.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      '⚠️ MONGODB_URI environment variable is not defined. Please add it to your .env.local or Vercel environment variables.'
    );
    return null;
  }

  if (cached!.conn && mongoose.connection.readyState === 1) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached!.promise = mongoose.connect(uri, opts).then(async (m) => {
      console.log('✅ Connected to MongoDB Atlas successfully.');
      // Auto-seed admin user in MongoDB if not present
      try {
        const { ensureDefaultAdminInMongo } = await import('./models');
        await ensureDefaultAdminInMongo();
      } catch (err: any) {
        console.warn('Admin auto-seed error:', err.message);
      }
      return m;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e: any) {
    cached!.promise = null;
    console.error('❌ Failed to connect to MongoDB:', e.message);
    throw e;
  }

  return cached!.conn;
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
