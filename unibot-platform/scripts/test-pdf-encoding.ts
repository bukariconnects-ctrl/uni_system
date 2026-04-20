/**
 * Diagnose PDF encoding and find the best extraction method for Arabic PDFs.
 * Run: npx tsx scripts/test-pdf-encoding.ts
 */
import * as fs from "fs";
import * as path from "path";

const PDF_URL =
  "https://leduumxihcngowpaujkr.supabase.co/storage/v1/object/public/course-materials/bf1649ad-66c3-4b25-a9b1-795f0315df14/knowledge/1776356720996.pdf";

async function main() {
  console.log("Downloading PDF...");
  const res = await fetch(PDF_URL);
  const buffer = await res.arrayBuffer();
  const buf = Buffer.from(buffer);

  // Save locally for inspection
  const outPath = path.join(process.cwd(), "scripts", "test.pdf");
  fs.writeFileSync(outPath, buf);
  console.log(`Saved to ${outPath} (${buf.length} bytes)`);

  // Method 1: pdf-parse
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buf);
    console.log("\n=== pdf-parse result ===");
    console.log("Pages:", data.numpages);
    console.log("Chars:", data.text.length);
    console.log("First 500 chars:", data.text.substring(0, 500));
    console.log("Has Arabic?", /[\u0600-\u06ff]/.test(data.text));
  } catch (e) {
    console.error("pdf-parse failed:", e);
  }

  // Method 2: Check raw bytes for BOM / encoding hints
  const byteStr = buf.slice(0, 20).toString("hex");
  console.log("\nFirst 20 bytes (hex):", byteStr);
  const pdfHeader = buf.slice(0, 10).toString("ascii");
  console.log("PDF header:", pdfHeader);
}

main().catch(console.error);
