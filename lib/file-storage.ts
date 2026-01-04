import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // ignore
  }
}

export async function saveBase64File(base64: string, originalName: string, maxBytes: number = 50 * 1024 * 1024) {
  // base64 may be data:[mime];base64,xxxxx
  const matches = base64.match(/^data:(.+);base64,([\s\S]*)$/);
  let b64Body: string;
  if (matches) {
    b64Body = matches[2];
  } else {
    b64Body = base64;
  }

  // Estimate decoded size and reject early if too large
  const approxBytes = Math.floor((b64Body.length * 3) / 4);
  if (approxBytes > maxBytes) {
    throw new Error(`File too large: ${Math.round(approxBytes / (1024 * 1024))} MB (max ${Math.round(maxBytes / (1024 * 1024))} MB)`);
  }

  const buffer = Buffer.from(b64Body, 'base64');
  if (buffer.length > maxBytes) {
    throw new Error(`File too large: ${Math.round(buffer.length / (1024 * 1024))} MB (max ${Math.round(maxBytes / (1024 * 1024))} MB)`);
  }

  const date = new Date();
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  const dir = path.join(UPLOAD_DIR, yyyy, mm, dd);
  await ensureDir(dir);

  const timestamp = Date.now();
  const sanitized = sanitizeFileName(originalName);
  const storedName = `${timestamp}_${sanitized}`;
  const filePath = path.join(dir, storedName);

  await fs.writeFile(filePath, buffer);

  // return relative path from public (used for preview/download routing)
  const relativePath = `/uploads/${yyyy}/${mm}/${dd}/${storedName}`;

  return { storedName, relativePath, size: buffer.length };
}

export async function deleteFileByPath(relativePath: string) {
  try {
    const filePath = path.join(process.cwd(), 'public', relativePath.replace(/^\//, ''));
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

export function getAbsolutePath(relativePath: string) {
  return path.join(process.cwd(), 'public', relativePath.replace(/^\//, ''));
}
