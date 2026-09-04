// Rough loudness report for a 16-bit stereo WAV: true peak (dBFS), integrated RMS (dBFS), and per-second RMS.
import { readFileSync } from "node:fs";
const buf = readFileSync(process.argv[2]);
const sr = buf.readUInt32LE(24);
const ch = buf.readUInt16LE(22);
let off = 12;
while (off < buf.length) { const id = buf.toString("ascii", off, off + 4); const sz = buf.readUInt32LE(off + 4); if (id === "data") { off += 8; break; } off += 8 + sz; }
const n = Math.floor((buf.length - off) / 2 / ch);
let peak = 0, sum = 0;
const perSec = [];
let secSum = 0, secN = 0;
for (let i = 0; i < n; i++) {
  let m = 0;
  for (let c = 0; c < ch; c++) { const v = buf.readInt16LE(off + (i * ch + c) * 2) / 32768; peak = Math.max(peak, Math.abs(v)); m += v * v; }
  m /= ch; sum += m; secSum += m; secN++;
  if (secN === sr) { perSec.push(10 * Math.log10(secSum / secN + 1e-12)); secSum = 0; secN = 0; }
}
const db = (x) => (10 * Math.log10(x + 1e-12)).toFixed(1);
console.log("duration s", (n / sr).toFixed(2), "| peak dBFS", (20 * Math.log10(peak + 1e-12)).toFixed(1), "| integrated RMS dBFS", db(sum / n));
console.log("per-second RMS dBFS:");
console.log(perSec.map((v, i) => `${String(i).padStart(2)}:${v.toFixed(0)}`).join("  "));
// top peaks with timestamps
{
  const peaks = [];
  for (let i = 0; i < n; i++) { let m = 0; for (let c = 0; c < ch; c++) m = Math.max(m, Math.abs(buf.readInt16LE(off + (i * ch + c) * 2) / 32768)); if (m > 0.8) peaks.push([i / sr, m]); }
  const merged = [];
  for (const [t, m] of peaks) { const last = merged[merged.length - 1]; if (last && t - last[0] < 0.25) { if (m > last[1]) last[1] = m; } else merged.push([t, m]); }
  console.log("samples above 0.8 (t s : peak):", merged.map(([t, m]) => `${t.toFixed(2)}:${(20 * Math.log10(m)).toFixed(1)}dB`).join("  ") || "none");
}
