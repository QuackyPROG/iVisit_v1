// src/utils/ocrClient.ts
import { createWorker } from "tesseract.js";

// Type is `any` so TS won't fight us over the exact worker shape.
type TesseractWorker = any;

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await (createWorker as any)("eng");
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Run OCR on an image.
 * `image` can be a File, a data URL, a canvas, etc.
 */
export async function recognizeImage(image: File | string): Promise<string> {
  const worker = await getWorker();

  const result = await worker.recognize(image as any, {
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890- ",
  });

  return result?.data?.text ?? "";
}

export async function terminateOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
