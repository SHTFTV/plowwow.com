// Minimal JPEG/PNG dimension + format + integrity parser (no deps).
import { readFileSync } from "node:fs";

export type ImageFormat = "png" | "jpeg";
export type ImageMeta = {
  width: number;
  height: number;
  format: ImageFormat;
  mime: string;
  truncated: boolean;
};

export function readImageMeta(filePath: string): ImageMeta | null {
  const buf = readFileSync(filePath);
  if (buf.length < 24) return null;

  // PNG: 8-byte sig, IHDR at 16-24; must end with IEND chunk (last 8 bytes: 49 45 4E 44 AE 42 60 82)
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const tail = buf.subarray(buf.length - 8);
    const iend = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
    return {
      width,
      height,
      format: "png",
      mime: "image/png",
      truncated: !tail.equals(iend),
    };
  }

  // JPEG: 0xFFD8 SOI ... 0xFFD9 EOI. Walk markers to SOFn for dimensions.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let width = 0;
    let height = 0;
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) break;
      let marker = buf[i + 1];
      i += 2;
      while (marker === 0xff && i < buf.length) marker = buf[i++];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (i + 2 > buf.length) break;
      const segLen = buf.readUInt16BE(i);
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        height = buf.readUInt16BE(i + 3);
        width = buf.readUInt16BE(i + 5);
        break;
      }
      i += segLen;
    }
    if (!width || !height) return null;
    const truncated = !(buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9);
    return { width, height, format: "jpeg", mime: "image/jpeg", truncated };
  }

  return null;
}

// Back-compat shim: earlier tests used readImageSize.
export function readImageSize(filePath: string): { width: number; height: number } | null {
  const m = readImageMeta(filePath);
  return m ? { width: m.width, height: m.height } : null;
}

export function formatFromExtension(pathOrUrl: string): ImageFormat | null {
  const ext = pathOrUrl.toLowerCase().replace(/[?#].*$/, "").split(".").pop();
  if (ext === "png") return "png";
  if (ext === "jpg" || ext === "jpeg") return "jpeg";
  return null;
}
