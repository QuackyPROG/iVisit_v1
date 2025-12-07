// src/utils/cardCropper.ts
import { waitForOpencv } from "./opencvReady";

type CvMat = any;

interface CropResult {
  success: boolean;
  dataUrl?: string;
  reason?: string;
}

/**
 * Helper: load a dataURL into an offscreen <canvas> and return its 2D context.
 */
async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = dataUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width || 640;
  canvas.height = img.height || 480;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context for canvas");

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Orders 4 points into [topLeft, topRight, bottomRight, bottomLeft]
 */
function orderPoints(pts: CvMat): CvMat {
  const cv = window.cv;
  const ordered = cv.Mat.zeros(4, 1, cv.CV_32FC2);

  // Extract points
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const x = pts.data32F[i * 2];
    const y = pts.data32F[i * 2 + 1];
    points.push({ x, y });
  }

  // Sum and diff to find corners
  const sum = points.map((p) => p.x + p.y);
  const diff = points.map((p) => p.x - p.y);

  const tlIndex = sum.indexOf(Math.min(...sum));
  const brIndex = sum.indexOf(Math.max(...sum));
  const trIndex = diff.indexOf(Math.min(...diff));
  const blIndex = diff.indexOf(Math.max(...diff));

  const orderedArray = [
    points[tlIndex], // top-left
    points[trIndex], // top-right
    points[brIndex], // bottom-right
    points[blIndex], // bottom-left
  ];

  for (let i = 0; i < 4; i++) {
    ordered.data32F[i * 2] = orderedArray[i].x;
    ordered.data32F[i * 2 + 1] = orderedArray[i].y;
  }

  return ordered;
}

/**
 * Try to detect an ID card in an image and return a warped, cropped data URL.
 */
export async function cropIdCardFromDataUrl(
  dataUrl: string
): Promise<CropResult> {
  try {
    await waitForOpencv();
    const cv = window.cv;

    const canvas = await dataUrlToCanvas(dataUrl);

    // Read into OpenCV Mat
    let src = cv.imread(canvas);
    const original = src.clone();

    // Resize large images for performance
    const maxDim = 1000;
    let scale = 1;
    if (src.cols > maxDim || src.rows > maxDim) {
      const fx = maxDim / src.cols;
      const fy = maxDim / src.rows;
      scale = Math.min(fx, fy);
      const dsize = new cv.Size(
        Math.round(src.cols * scale),
        Math.round(src.rows * scale)
      );
      const resized = new cv.Mat();
      cv.resize(src, resized, dsize, 0, 0, cv.INTER_AREA);
      src.delete();
      src = resized;
    }

    // Grayscale
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // Blur
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Edge detection
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 75, 200);

    // Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE
    );

    let cardContour: CvMat | null = null;
    let maxArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

      if (approx.rows === 4) {
        const area = cv.contourArea(approx);
        if (area > maxArea) {
          maxArea = area;
          if (cardContour) cardContour.delete();
          cardContour = approx;
        } else {
          approx.delete();
        }
      } else {
        approx.delete();
      }
      cnt.delete();
    }

    // Clean up some mats
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();

    if (!cardContour || maxArea < 3000) {
      // No decent card-like contour found, return original image
      src.delete();
      original.delete();
      if (cardContour) cardContour.delete();
      return {
        success: false,
        reason: "Card contour not found – using original image",
      };
    }

    // Order points and scale back to original coordinates
    const ordered = orderPoints(cardContour);

    const scaledSrcPts = new cv.Mat(4, 1, cv.CV_32FC2);
    for (let i = 0; i < 4; i++) {
      scaledSrcPts.data32F[i * 2] = ordered.data32F[i * 2] / scale;
      scaledSrcPts.data32F[i * 2 + 1] = ordered.data32F[i * 2 + 1] / scale;
    }

    // Target card size (tweak these for your card aspect ratio)
    const dstWidth = 1000;
    const dstHeight = 600;
    const dst = cv.Mat.zeros(dstHeight, dstWidth, cv.CV_8UC4);

    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0, // top-left
      dstWidth - 1,
      0, // top-right
      dstWidth - 1,
      dstHeight - 1, // bottom-right
      0,
      dstHeight - 1, // bottom-left
    ]);

    const M = cv.getPerspectiveTransform(scaledSrcPts, dstPts);
    cv.warpPerspective(original, dst, M, new cv.Size(dstWidth, dstHeight));

    // Convert warped Mat back to dataURL
    const warpCanvas = document.createElement("canvas");
    warpCanvas.width = dstWidth;
    warpCanvas.height = dstHeight;
    cv.imshow(warpCanvas, dst);
    const croppedDataUrl = warpCanvas.toDataURL("image/png");

    // Cleanup
    src.delete();
    original.delete();
    cardContour.delete();
    ordered.delete();
    scaledSrcPts.delete();
    dstPts.delete();
    M.delete();
    dst.delete();

    return { success: true, dataUrl: croppedDataUrl };
  } catch (err) {
    console.error("Error in cropIdCardFromDataUrl:", err);
    return { success: false, reason: "OpenCV error, using original image" };
  }
}
