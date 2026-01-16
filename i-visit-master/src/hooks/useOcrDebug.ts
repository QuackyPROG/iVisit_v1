/**
 * Hook for OCR debug mode control (Sprint 07)
 * Checks environment variable to determine if debug features are enabled
 */
export function useOcrDebug() {
    const isEnabled = import.meta.env.VITE_OCR_DEBUG_MODE === 'true';

    return {
        isDebugMode: isEnabled,
        canShowTestPage: isEnabled,
    };
}
