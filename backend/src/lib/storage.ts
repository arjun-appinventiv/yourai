// config — reads from .env
// File storage — local for dev, S3 for prod.
// Switch by changing STORAGE_PROVIDER in .env.

import fs from 'fs';
import path from 'path';

const LOCAL_DIR = '/tmp/yourai-uploads';

export interface UploadResult {
  url: string;
  size: number;
}

/**
 * Save a file to storage (local or S3 based on env).
 */
export async function saveFile(
  orgId: string,
  fileName: string,
  buffer: Buffer
): Promise<UploadResult> {
  // config — reads from .env
  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 's3') {
    return saveToS3(orgId, fileName, buffer);
  }

  return saveToLocal(orgId, fileName, buffer);
}

async function saveToLocal(
  orgId: string,
  fileName: string,
  buffer: Buffer
): Promise<UploadResult> {
  const dir = path.join(LOCAL_DIR, orgId);
  fs.mkdirSync(dir, { recursive: true });

  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(dir, safeName);
  fs.writeFileSync(filePath, buffer);

  return {
    url: `/uploads/${orgId}/${safeName}`,
    size: buffer.length,
  };
}

async function saveToS3(
  orgId: string,
  fileName: string,
  buffer: Buffer
): Promise<UploadResult> {
  // config — reads from .env
  // @ts-expect-error — @aws-sdk/client-s3 installed only in production
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const key = `${orgId}/${Date.now()}-${fileName}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: buffer,
  }));

  return {
    url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`,
    size: buffer.length,
  };
}

/**
 * Read a file from storage (for ingestion pipeline).
 */
export async function readFile(url: string): Promise<Buffer> {
  if (url.startsWith('/uploads/')) {
    const filePath = path.join(LOCAL_DIR, url.replace('/uploads/', ''));
    return fs.readFileSync(filePath);
  }
  // S3 URL — fetch from S3
  const response = await fetch(url);
  return Buffer.from(await response.arrayBuffer());
}
