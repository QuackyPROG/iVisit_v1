import { useEffect, useState } from 'react';

interface ScanGuideOverlayProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Visual scanning guide overlay for ID card alignment (Sprint 05)
 * Shows a card-shaped guide with corner markers to help users position IDs correctly
 */
export default function ScanGuideOverlay({ containerRef }: ScanGuideOverlayProps) {
    const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, height: rect.height });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        // Also observe the container for size changes
        const observer = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateDimensions);
            observer.disconnect();
        };
    }, [containerRef]);

    const { width, height } = dimensions;

    // ID card aspect ratio (ISO/IEC 7810 ID-1: 85.60mm × 53.98mm ≈ 1.586)
    const cardAspect = 1.586;

    // Calculate guide dimensions (75% of view width, max height considered)
    let guideWidth = width * 0.75;
    let guideHeight = guideWidth / cardAspect;

    // If guide is too tall for the view, constrain by height instead
    if (guideHeight > height * 0.7) {
        guideHeight = height * 0.7;
        guideWidth = guideHeight * cardAspect;
    }

    // Center position
    const x = (width - guideWidth) / 2;
    const y = (height - guideHeight) / 2;

    // Corner marker size (proportional to guide size)
    const cornerSize = Math.min(guideWidth, guideHeight) * 0.1;
    const strokeWidth = 3;

    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
            style={{ zIndex: 10 }}
        >
            {/* Semi-transparent overlay outside guide area */}
            <defs>
                <mask id="guideMask">
                    <rect width="100%" height="100%" fill="white" />
                    <rect
                        x={x}
                        y={y}
                        width={guideWidth}
                        height={guideHeight}
                        fill="black"
                        rx="8"
                    />
                </mask>
            </defs>
            <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.4)"
                mask="url(#guideMask)"
            />

            {/* Guide border (yellow dashed) */}
            <rect
                x={x}
                y={y}
                width={guideWidth}
                height={guideHeight}
                fill="none"
                stroke="#FFD700"
                strokeWidth={strokeWidth}
                strokeDasharray="8,4"
                rx="8"
            />

            {/* Corner markers (green solid) */}
            {/* Top-left */}
            <path
                d={`M${x},${y + cornerSize} L${x},${y} L${x + cornerSize},${y}`}
                fill="none"
                stroke="#00FF00"
                strokeWidth={strokeWidth + 1}
                strokeLinecap="round"
            />
            {/* Top-right */}
            <path
                d={`M${x + guideWidth - cornerSize},${y} L${x + guideWidth},${y} L${x + guideWidth},${y + cornerSize}`}
                fill="none"
                stroke="#00FF00"
                strokeWidth={strokeWidth + 1}
                strokeLinecap="round"
            />
            {/* Bottom-left */}
            <path
                d={`M${x},${y + guideHeight - cornerSize} L${x},${y + guideHeight} L${x + cornerSize},${y + guideHeight}`}
                fill="none"
                stroke="#00FF00"
                strokeWidth={strokeWidth + 1}
                strokeLinecap="round"
            />
            {/* Bottom-right */}
            <path
                d={`M${x + guideWidth - cornerSize},${y + guideHeight} L${x + guideWidth},${y + guideHeight} L${x + guideWidth},${y + guideHeight - cornerSize}`}
                fill="none"
                stroke="#00FF00"
                strokeWidth={strokeWidth + 1}
                strokeLinecap="round"
            />

            {/* Instruction text */}
            <text
                x={width / 2}
                y={y - 12}
                textAnchor="middle"
                fill="#FFD700"
                fontSize="14"
                fontWeight="bold"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
                Position ID card within the frame
            </text>
        </svg>
    );
}
