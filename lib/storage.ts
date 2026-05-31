import { mkdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { appConfig } from "./config";
import { ratioForOption } from "./image-options";

const supportedImageMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export class ImageValidationError extends Error {
  status = 400;
}

export function assertSupportedImage(type: string | null): void {
  if (!type || !supportedImageMimeTypes.has(type)) {
    throw new ImageValidationError("仅支持 PNG、JPG、WEBP 图片");
  }
}

export function assertSupportedImageBytes(bytes: Uint8Array, mimeType: string | null): void {
  assertSupportedImage(mimeType);

  if (mimeType === "image/png" && bytes.length >= 8) {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (pngSignature.every((byte, index) => bytes[index] === byte)) {
      return;
    }
  }

  if (mimeType === "image/jpeg" && bytes.length >= 3) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return;
    }
  }

  if (mimeType === "image/webp" && bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") {
      return;
    }
  }

  throw new ImageValidationError("图片内容与文件类型不匹配");
}

export function extensionForMime(type: string | null): string {
  if (type === "image/jpeg") {
    return "jpg";
  }
  if (type === "image/webp") {
    return "webp";
  }
  return "png";
}

export function mimeFromFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "image/png";
}

export function parseSize(size: string): { width: number; height: number } {
  return ratioForOption(size);
}

// 解析图片字节的真实像素宽高（PNG/JPEG/WebP）。解析失败返回 null。
export function readImageDimensions(
  bytes: Uint8Array,
  mimeType: string | null,
): { width: number; height: number } | null {
  try {
    if ((mimeType === "image/png" || isPngBytes(bytes)) && bytes.length >= 24) {
      const width = readUint32BE(bytes, 16);
      const height = readUint32BE(bytes, 20);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
    if (mimeType === "image/jpeg" || isJpegBytes(bytes)) {
      return readJpegDimensions(bytes);
    }
    if (mimeType === "image/webp" || isWebpBytes(bytes)) {
      return readWebpDimensions(bytes);
    }
  } catch {
    // 解析失败回退到调用方默认值
  }
  return null;
}

function readUint32BE(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function isPngBytes(b: Uint8Array): boolean {
  return b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

function isJpegBytes(b: Uint8Array): boolean {
  return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

function isWebpBytes(b: Uint8Array): boolean {
  return (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // WEBP
  );
}

function readJpegDimensions(b: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = b[i + 1];
    // SOF0..SOF15（排除 DHT 0xC4、JPG 0xC8、DAC 0xCC）
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (b[i + 5] << 8) | b[i + 6];
      const width = (b[i + 7] << 8) | b[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    const segLen = (b[i + 2] << 8) | b[i + 3];
    if (segLen < 2) {
      return null;
    }
    i += 2 + segLen;
  }
  return null;
}

function readWebpDimensions(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 30) {
    return null;
  }
  const fourcc = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (fourcc === "VP8 ") {
    const width = ((b[27] << 8) | b[26]) & 0x3fff;
    const height = ((b[29] << 8) | b[28]) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (fourcc === "VP8L") {
    const b1 = b[22];
    const b2 = b[23];
    const b3 = b[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b[21]);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }
  if (fourcc === "VP8X") {
    const width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    const height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
    return { width, height };
  }
  return null;
}

export function datedPathParts(date = new Date()): string[] {
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ];
}

export async function saveGeneratedImageFile(input: {
  taskId: string;
  imageId: string;
  bytes: Uint8Array;
  mimeType: string | null;
}): Promise<string> {
  const extension = extensionForMime(input.mimeType);
  const relativePath = path.posix.join(
    ...datedPathParts(),
    input.taskId,
    `${input.imageId}.${extension}`,
  );
  await writeStorageFile(relativePath, input.bytes);
  return relativePath;
}

export async function saveSourceImageFile(input: {
  sourceId: string;
  fileName: string;
  bytes: Uint8Array;
  mimeType: string | null;
}): Promise<string> {
  assertSupportedImage(input.mimeType);
  const extension = extensionForMime(input.mimeType);
  const relativePath = path.posix.join(
    "source",
    ...datedPathParts(),
    `${input.sourceId}.${extension}`,
  );
  await writeStorageFile(relativePath, input.bytes);
  return relativePath;
}

export async function readStorageFile(relativePath: string): Promise<{
  bytes: Uint8Array;
  mimeType: string;
}> {
  const absolutePath = resolveStoragePath(relativePath);
  const bytes = await readFile(absolutePath);
  return { bytes: new Uint8Array(bytes), mimeType: mimeFromFileName(relativePath) };
}

export async function deleteStorageFile(relativePath: string): Promise<void> {
  const absolutePath = resolveStoragePath(relativePath);
  await rm(absolutePath, { force: true });
  await removeEmptyParentDirectories(path.dirname(absolutePath));
}

export function resolveStoragePath(relativePath: string): string {
  if (path.isAbsolute(relativePath) || relativePath.includes("..")) {
    throw new Error("图片路径不合法");
  }

  const absolutePath = path.resolve(appConfig.imageStorageDir, relativePath);
  const root = path.resolve(appConfig.imageStorageDir);
  if (!absolutePath.startsWith(`${root}${path.sep}`) && absolutePath !== root) {
    throw new Error("图片路径不合法");
  }
  return absolutePath;
}

async function writeStorageFile(relativePath: string, bytes: Uint8Array): Promise<void> {
  const absolutePath = resolveStoragePath(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
}

async function removeEmptyParentDirectories(directory: string): Promise<void> {
  const root = path.resolve(appConfig.imageStorageDir);
  let current = path.resolve(directory);
  while (current !== root && current.startsWith(`${root}${path.sep}`)) {
    try {
      await rmdir(current);
    } catch {
      break;
    }
    current = path.dirname(current);
  }
}
