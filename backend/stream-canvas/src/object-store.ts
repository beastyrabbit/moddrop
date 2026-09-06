import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Readable } from "node:stream";
import { Client as MinioClient } from "minio";
import { config, validateObjectStorageConfig } from "./config.ts";
import { ObjectStoreTransport } from "./object-store-transport.ts";

validateObjectStorageConfig();

export interface StoredObjectStat {
  size: number;
}

interface ObjectStore {
  check(): Promise<void>;
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  stat(key: string): Promise<StoredObjectStat | null>;
  read(
    key: string,
    range?: { start: number; length: number },
  ): Promise<Readable>;
}

class FilesystemObjectStore implements ObjectStore {
  async check(): Promise<void> {
    await mkdir(config.uploadsDir, { recursive: true });
  }

  private pathFor(key: string): string {
    return join(config.uploadsDir, ...key.split("/"));
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  async stat(key: string): Promise<StoredObjectStat | null> {
    try {
      const result = await stat(this.pathFor(key));
      return { size: result.size };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async read(
    key: string,
    range?: { start: number; length: number },
  ): Promise<Readable> {
    return createReadStream(
      this.pathFor(key),
      range
        ? { start: range.start, end: range.start + range.length - 1 }
        : undefined,
    );
  }
}

class S3ObjectStore implements ObjectStore {
  private readonly client: MinioClient;
  private readonly requests: ObjectStoreTransport;
  private checking: Promise<void> | null = null;

  constructor() {
    const endpoint = new URL(config.s3Endpoint);
    this.requests = new ObjectStoreTransport(endpoint.protocol === "https:");
    this.client = new MinioClient({
      transport: this.requests.transport,
      endPoint: endpoint.hostname,
      port: endpoint.port
        ? Number(endpoint.port)
        : endpoint.protocol === "https:"
          ? 443
          : 80,
      useSSL: endpoint.protocol === "https:",
      accessKey: config.s3AccessKey,
      secretKey: config.s3SecretKey,
      region: config.s3Region,
      pathStyle: true,
      retryOptions: { disableRetry: true },
    });
  }

  check(): Promise<void> {
    // Finish before /ready's overall deadline, cancelling actual S3 work.
    this.checking ??= this.requests
      .run(async () => {
        if (!(await this.client.bucketExists(config.s3Bucket))) {
          throw new Error(`S3 bucket ${config.s3Bucket} does not exist`);
        }
      }, 2_500)
      .finally(() => {
        this.checking = null;
      });
    return this.checking;
  }

  async put(key: string, bytes: Buffer, contentType: string): Promise<void> {
    await this.requests.run(
      () =>
        this.client.putObject(config.s3Bucket, key, bytes, bytes.byteLength, {
          "Content-Type": contentType,
        }),
      30_000,
    );
  }

  async remove(key: string): Promise<void> {
    await this.requests.run(
      () => this.client.removeObject(config.s3Bucket, key),
      10_000,
    );
  }

  async stat(key: string): Promise<StoredObjectStat | null> {
    try {
      const result = await this.requests.run(
        () => this.client.statObject(config.s3Bucket, key),
        10_000,
      );
      return { size: result.size };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async read(
    key: string,
    range?: { start: number; length: number },
  ): Promise<Readable> {
    if (range) {
      return this.requests.run(
        () =>
          this.client.getPartialObject(
            config.s3Bucket,
            key,
            range.start,
            range.length,
          ),
        120_000,
      );
    }
    return this.requests.run(
      () => this.client.getObject(config.s3Bucket, key),
      120_000,
    );
  }
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  return code === "ENOENT" || code === "NoSuchKey" || code === "NotFound";
}

export const objectStore: ObjectStore =
  config.objectStorageMode === "s3"
    ? new S3ObjectStore()
    : new FilesystemObjectStore();
