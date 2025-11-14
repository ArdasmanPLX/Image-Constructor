import React from 'react';

interface CompareSliderProps {
    beforeImage: string;
    afterImage: string;
    sliderPosition: number; // 0 to 1
    onDragStart: () => void;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({ beforeImage, afterImage, sliderPosition, onDragStart }) => {
    
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStart();
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStart();
    };

    return (
        <div 
            className="w-full h-full relative overflow-hidden select-none"
        >
            <img src={beforeImage} alt="Before" className="absolute top-0 left-0 w-full h-full pointer-events-none" />
            <div 
                className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition * 100}% 0 0)` }}
            >
                <img src={afterImage} alt="After" className="absolute top-0 left-0 w-full h-full" />
            </div>
            <div
                className="absolute top-0 h-full w-1 bg-white/70 transform -translate-x-1/2 z-10 cursor-ew-resize"
                style={{ left: `${sliderPosition * 100}%` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div 
                    className="absolute top-1/2 left-1/2 w-10 h-10 rounded-full bg-white/70 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-gray-800"><path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25L18.75 12 15 15.75m-6-7.5L5.25 12 9 15.75" /></svg>
                </div>
            </div>
        </div>
    );
};