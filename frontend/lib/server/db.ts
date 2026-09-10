import { MongoClient, type Db } from "mongodb";
import { config } from "./config";

declare global {
  // eslint-disable-next-line no-var
  var __medinotesMongoPromise: Promise<MongoClient> | undefined;
}

function clientPromise() {
  if (!global.__medinotesMongoPromise) {
    global.__medinotesMongoPromise = new MongoClient(config().MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000
    }).connect();
  }
  return global.__medinotesMongoPromise;
}

export async function db(): Promise<Db> {
  return (await clientPromise()).db(config().MONGODB_DATABASE);
}
