// lib/mongodb.ts
import mongoose from "mongoose";
import type { Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_URI_FALLBACK =
  process.env.MONGODB_URI_FALLBACK || "mongodb://127.0.0.1:27017/mareye";

/**
 * Remove unsupported query params from Mongo URI (e.g. tlsMinVersion)
 * This avoids MongoParseError when the installed driver/version doesn't accept them.
 */
function stripUnsupportedMongoOptions(uri: string) {
  const idx = uri.indexOf("?");
  if (idx === -1) return uri;
  const base = uri.substring(0, idx);
  const query = uri.substring(idx + 1);
  const keep = query
    .split("&")
    .filter((p) => {
      const key = p.split("=")[0].toLowerCase();
      // filter out options that older/newer drivers sometimes don't accept
      return !(
        key === "tlsminversion" ||
        key === "tlsversion" ||
        key === "sslminversion"
      );
    });
  return keep.length ? `${base}?${keep.join("&")}` : base;
}

function getCandidateMongoUris(): string[] {
  const uris = [MONGODB_URI, MONGODB_URI_FALLBACK]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => stripUnsupportedMongoOptions(value.trim()));

  return [...new Set(uris)];
}

interface GlobalWithMongoose {
  mongoose?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
    connectedUri?: string | null;
  };
}
declare const global: GlobalWithMongoose;

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null, connectedUri: null };
}
const cached = global.mongoose;

async function connectDB() {
  if (cached.conn) return cached.conn;

  const candidates = getCandidateMongoUris();
  if (candidates.length === 0) {
    throw new Error(
      "Please define MONGODB_URI or MONGODB_URI_FALLBACK inside .env.local"
    );
  }

  // minimal, safe options — don't force TLS options in the URI or here
  const opts = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 1,
  } as mongoose.ConnectOptions;

  // avoid deprecation warnings
  mongoose.set("strictQuery", true);

  let lastError: unknown = null;

  for (const uri of candidates) {
    if (!cached.promise || cached.connectedUri !== uri) {
      cached.promise = mongoose.connect(uri, opts);
      cached.connectedUri = uri;
    }

    try {
      cached.conn = await cached.promise;
      const isLocal = uri.includes("127.0.0.1") || uri.includes("localhost");
      console.log(
        `✅ MongoDB connected successfully${isLocal ? " (local fallback)" : ""}`
      );
      return cached.conn;
    } catch (e) {
      lastError = e;
      cached.promise = null;
      cached.connectedUri = null;
      cached.conn = null;
      console.error("❌ MongoDB connection error:", e);
      try {
        await mongoose.disconnect();
      } catch {
        // ignore disconnect errors while failing over
      }
    }
  }

  throw lastError;

}

/** Backwards-compatible helpers some examples use */
export async function connectToDatabase(): Promise<{ db: Db | null; connection: typeof mongoose }> {
  await connectDB();
  return { db: (mongoose.connection.db ?? null) as unknown as Db | null, connection: mongoose };
}

/** Get native `mongodb` Db instance */
export async function getDatabase(): Promise<Db> {
  await connectDB();
  if (!mongoose.connection.db) throw new Error("MongoDB not connected (no native db)");
  return mongoose.connection.db as unknown as Db;
}

export default connectDB;
