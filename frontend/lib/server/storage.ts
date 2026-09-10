import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "./config";

function storageConfig() {
  const settings = config();
  if (!settings.S3_BUCKET) return null;
  if (!settings.S3_ACCESS_KEY_ID || !settings.S3_SECRET_ACCESS_KEY) {
    throw new Error("S3 credentials are required when S3_BUCKET is configured");
  }
  return settings;
}

function client() {
  const settings = storageConfig();
  if (!settings) return null;
  return new S3Client({
    region: settings.S3_REGION,
    endpoint: settings.S3_ENDPOINT_URL,
    forcePathStyle: Boolean(settings.S3_ENDPOINT_URL),
    credentials: {
      accessKeyId: settings.S3_ACCESS_KEY_ID!,
      secretAccessKey: settings.S3_SECRET_ACCESS_KEY!
    }
  });
}

export async function putRawFile(key: string, body: Buffer) {
  const settings = storageConfig();
  const s3 = client();
  if (!settings || !s3) return null;
  await s3.send(new PutObjectCommand({
    Bucket: settings.S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: "application/pdf",
    ServerSideEncryption: "AES256"
  }));
  return key;
}

export async function deleteRawFile(key: string | null) {
  if (!key) return;
  const settings = storageConfig();
  const s3 = client();
  if (!settings || !s3) return;
  await s3.send(new DeleteObjectCommand({ Bucket: settings.S3_BUCKET, Key: key }));
}
