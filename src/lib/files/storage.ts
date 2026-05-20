import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export interface StoredFile {
  key: string;
  size: number;
  mimeType: string;
}

export interface StorageAdapter {
  put(filename: string, mimeType: string, data: Buffer): Promise<StoredFile>;
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
  private readonly baseDir = path.resolve(process.env.LOCAL_STORAGE_DIR ?? "./uploads");

  async put(filename: string, mimeType: string, data: Buffer): Promise<StoredFile> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const fullPath = path.join(this.baseDir, key);
    await fs.writeFile(fullPath, data);
    return { key, size: data.byteLength, mimeType };
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    const expires = Date.now() + ttlSeconds * 1000;
    return `/api/uploads?key=${encodeURIComponent(key)}&expires=${expires}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    await fs.rm(fullPath, { force: true });
  }
}

export const storageAdapter: StorageAdapter = new LocalStorageAdapter();
