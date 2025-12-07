// src/utils/opencvReady.ts

declare global {
  interface Window {
    cv: any;
  }
}

export function waitForOpencv(): Promise<void> {
  return new Promise((resolve, reject) => {
    const maxAttempts = 50;
    let attempts = 0;

    const check = () => {
      attempts++;
      if (window.cv && typeof window.cv.imread === "function") {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error("OpenCV (opencv.js) failed to load"));
      } else {
        setTimeout(check, 100);
      }
    };

    check();
  });
}
