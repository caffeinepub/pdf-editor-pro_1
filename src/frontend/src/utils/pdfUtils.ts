import { PDFDocument, degrees } from "pdf-lib";
import type { PageState } from "../types/editor";

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: Number.parseInt(result[1], 16) / 255,
    g: Number.parseInt(result[2], 16) / 255,
    b: Number.parseInt(result[3], 16) / 255,
  };
}

export async function exportEditedPdf(
  originalBytes: Uint8Array,
  pages: PageState[],
  canvasRefs: Array<HTMLCanvasElement | null>,
  filename: string,
): Promise<void> {
  const pdfDoc = await PDFDocument.load(originalBytes, {
    ignoreEncryption: true,
  });
  const existingPages = pdfDoc.getPages();

  for (let i = 0; i < existingPages.length; i++) {
    const page = existingPages[i];
    const canvas = canvasRefs[i];
    if (!canvas) continue;

    const pageState = pages[i];
    if (pageState?.rotation) {
      page.setRotation(degrees(pageState.rotation));
    }

    const pngBytes = await new Promise<Uint8Array>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(new Uint8Array());
          return;
        }
        const ab = await blob.arrayBuffer();
        resolve(new Uint8Array(ab));
      }, "image/png");
    });

    if (pngBytes.length > 0) {
      const pngImage = await pdfDoc.embedPng(pngBytes);
      const { width, height } = page.getSize();
      page.drawImage(pngImage, { x: 0, y: 0, width, height });
    }
  }

  const pdfBytes = await pdfDoc.save();
  downloadBytes(
    pdfBytes,
    filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
    "application/pdf",
  );
}

export async function createBlankPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([595, 842]);
  return pdfDoc.save();
}

export async function addBlankPage(
  originalBytes: Uint8Array,
  afterIndex: number,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes, {
    ignoreEncryption: true,
  });
  pdfDoc.insertPage(afterIndex + 1, [595, 842]);
  return pdfDoc.save();
}

export async function deletePage(
  originalBytes: Uint8Array,
  pageIndex: number,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes, {
    ignoreEncryption: true,
  });
  pdfDoc.removePage(pageIndex);
  return pdfDoc.save();
}

export async function reorderPages(
  originalBytes: Uint8Array,
  newOrder: number[],
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalBytes, {
    ignoreEncryption: true,
  });
  const newDoc = await PDFDocument.create();
  for (const idx of newOrder) {
    const [page] = await newDoc.copyPages(srcDoc, [idx]);
    newDoc.addPage(page);
  }
  return newDoc.save();
}

export async function mergePdfs(
  pdfBytesArray: Uint8Array[],
): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();
  for (const bytes of pdfBytesArray) {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageCount = doc.getPageCount();
    const docPages = await mergedDoc.copyPages(
      doc,
      Array.from({ length: pageCount }, (_, i) => i),
    );
    for (const page of docPages) mergedDoc.addPage(page);
  }
  return mergedDoc.save();
}

export async function splitPdf(
  originalBytes: Uint8Array,
  ranges: Array<[number, number]>,
): Promise<Uint8Array[]> {
  const srcDoc = await PDFDocument.load(originalBytes, {
    ignoreEncryption: true,
  });
  const results: Uint8Array[] = [];
  for (const [start, end] of ranges) {
    const newDoc = await PDFDocument.create();
    const indices = Array.from(
      { length: end - start + 1 },
      (_, i) => start + i,
    );
    const docPages = await newDoc.copyPages(srcDoc, indices);
    for (const page of docPages) newDoc.addPage(page);
    results.push(await newDoc.save());
  }
  return results;
}

export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mime: string,
): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
