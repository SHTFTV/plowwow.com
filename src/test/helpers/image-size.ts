// Minimal JPEG/PNG dimension parser (no deps). Returns { width, height } or null.
import { readFileSync } from "node:fs";

export function readImageSize(filePath: string): { width: number; height: number } | null {
  const buf = readFileSync(filePath);
  // PNG: 8-byte sig, IHDR at offset 16-24 (big-endian width/height)
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: 0xFFD8 SOI, then walk markers until SOF0-SOF15 (except DHT/DAC/DNL)
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      let marker = buf[i + 1];
      i += 2;
      // Skip fill bytes
      while (marker === 0xff && i < buf.length) marker = buf[i++];
      // Standalone markers (no length): SOI/EOI/RSTn
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const segLen = buf.readUInt16BE(i);
      // SOF0..SOF15 except 0xC4 (DHT), 0xC8 (JPG), 0xCC (DAC)
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        const height = buf.readUInt16BE(i + 3);
        const width = buf.readUInt16BE(i + 5);
        return { width, height };
      }
      i += segLen;
    }
  }
  return null;
}
