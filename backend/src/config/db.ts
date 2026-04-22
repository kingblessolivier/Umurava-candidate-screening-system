import mongoose from "mongoose";

let listenersRegistered = false;

function registerConnectionListeners() {
  if (listenersRegistered) return;

  mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
  mongoose.connection.on("error", (err) => console.error("❌ MongoDB error:", err));
  mongoose.connection.on("disconnected", () => console.warn("⚠️  MongoDB disconnected"));

  listenersRegistered = true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined in environment variables");

  registerConnectionListeners();

  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  const maxRetries = Number(process.env.MONGODB_MAX_RETRIES ?? 8);
  const baseDelayMs = Number(process.env.MONGODB_RETRY_DELAY_MS ?? 2000);
  const maxDelayMs = Number(process.env.MONGODB_RETRY_MAX_DELAY_MS ?? 30000);
  const serverSelectionTimeoutMS = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 30000);
  const connectTimeoutMS = Number(process.env.MONGODB_CONNECT_TIMEOUT_MS ?? 30000);
  const socketTimeoutMS = Number(process.env.MONGODB_SOCKET_TIMEOUT_MS ?? 45000);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS,
        socketTimeoutMS,
        connectTimeoutMS,
      });
      return;
    } catch (err) {
      lastError = err;
      const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) break;

      console.warn(
        `⚠️  MongoDB connection attempt ${attempt}/${maxRetries} failed. Retrying in ${Math.round(delayMs / 1000)}s...`
      );
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to connect to MongoDB after retries");
}
