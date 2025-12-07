import { useRef, useState, useCallback, useEffect } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Used to invalidate in-flight startCamera calls
  const startRequestIdRef = useRef(0);

  const startCamera = useCallback(async () => {
    setError(null);

    // Every call gets its own request ID
    const requestId = ++startRequestIdRef.current;

    // Stop any previous stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      // If a newer startCamera() has been called or stopCamera() ran,
      // this start is now "stale" -> immediately stop and bail out.
      if (requestId !== startRequestIdRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      mediaStreamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setIsActive(true);
    } catch (err) {
      console.error(err);
      // Only set error if this call is still current
      if (requestId === startRequestIdRef.current) {
        setError("Camera access denied or unavailable.");
        setIsActive(false);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    try {
      // Invalidate any in-flight startCamera calls
      startRequestIdRef.current++;

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        (videoRef.current.srcObject as MediaStream | null) = null;
      }
      setIsActive(false);
    } catch (err) {
      console.warn("Error stopping camera:", err);
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video) return null;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  }, []);

  useEffect(() => {
    return () => stopCamera(); // Cleanup on unmount
  }, [stopCamera]);

  return { videoRef, isActive, error, startCamera, stopCamera, captureFrame };
}
