import React from 'react';

interface CoordinateGridProps {
    zoom: number;
}

export const CoordinateGrid: React.FC<CoordinateGridProps> = ({ zoom }) => {
    const gridStep = 0.01; // 1%
    const numLines = Math.floor(1 / gridStep);
    const lines = [];

    // To prevent visual clutter at low zoom levels, we can adjust line density
    const zoomThreshold = 0.8;
    const showMinorLines = zoom > zoomThreshold;
    const majorLineStep = 10;

    for (let i = 1; i < numLines; i++) {
        const pos = `${i * gridStep * 100}%`;
        const isMajor = i % majorLineStep === 0;
        
        if (isMajor) {
            const strokeColor = 'rgba(255, 255, 255, 0.25)';
            const strokeWidth = 0.7 / zoom;
            lines.push(<line key={`v-major-${i}`} x1={pos} y1="0" x2={pos} y2="100%" stroke={strokeColor} strokeWidth={strokeWidth} />);
            lines.push(<line key={`h-major-${i}`} x1="0" y1={pos} x2="100%" y2={pos} stroke={strokeColor} strokeWidth={strokeWidth} />);
        } else if (showMinorLines) {
            const strokeColor = 'rgba(255, 255, 255, 0.1)';
            const strokeWidth = 0.4 / zoom;
            lines.push(<line key={`v-minor-${i}`} x1={pos} y1="0" x2={pos} y2="100%" stroke={strokeColor} strokeWidth={strokeWidth} />);
            lines.push(<line key={`h-minor-${i}`} x1="0" y1={pos} x2="100%" y2={pos} stroke={strokeColor} strokeWidth={strokeWidth} />);
        }
    }

    return (
        <svg width="100%" height="100%" className="absolute top-0 left-0 pointer-events-none z-[5]">
            {lines}
        </svg>
    );
};
