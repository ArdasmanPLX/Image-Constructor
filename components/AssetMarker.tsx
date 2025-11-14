
import React, { useState, useEffect } from 'react';
import type { AssetMarker } from '../types';
import { RegenerateIcon, CloseIcon } from './icons';

interface AssetMarkerProps {
    marker: AssetMarker;
    onRegenerate: (id: string) => void;
    onRemove: (id: string) => void;
    onDragStart: (id: string) => void;
    onUpdate: (id: string, newProps: Partial<AssetMarker>) => void;
    isDisabled: boolean;
}

export const AssetMarkerComponent: React.FC<AssetMarkerProps> = ({
    marker,
    onRegenerate,
    onRemove,
    onDragStart,
    onUpdate,
    isDisabled,
}) => {
    const [prompt, setPrompt] = useState(marker.prompt || '');

    useEffect(() => {
        setPrompt(marker.prompt || '');
    }, [marker.prompt]);

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(e.target.value);
    };

    const handleBlur = () => {
        if (prompt !== marker.prompt) {
            onUpdate(marker.id, { prompt });
        }
    };
    
    const handleRegenerateClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRegenerate(marker.id);
    };
    
    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove(marker.id);
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDragStart(marker.id);
    };

    const markerStyle = {
        left: `calc(${marker.x * 100}%)`,
        top: `calc(${marker.y * 100}%)`,
        zIndex: 15,
    };

    const dotStyle = {
        backgroundColor: marker.color
    };
    
    const pingStyle = {
        backgroundColor: marker.color
    };

    const yPositionClass = marker.y > 0.65 ? 'bottom-full mb-3' : 'top-full mt-3';
    const xPositionClass = marker.x > 0.75 ? 'right-0' : marker.x < 0.25 ? 'left-0' : 'left-1/2 -translate-x-1/2';


    return (
        <div
            className="absolute -translate-x-1/2 -translate-y-1/2 marker-container"
            style={markerStyle}
        >
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded-md whitespace-nowrap pointer-events-none">
                {marker.targetObjectLabel ? <strong>{marker.targetObjectLabel}</strong> : `x: ${marker.x.toFixed(3)}, y: ${marker.y.toFixed(3)}`}
            </div>
            <div
                onMouseDown={handleMouseDown}
                className="relative w-5 h-5 cursor-move focus:outline-none"
                aria-label="Asset point"
            >
                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={pingStyle}></span>
                <span className="relative inline-flex rounded-full h-5 w-5 border-2 border-white" style={dotStyle}></span>
            </div>
            
            <div 
                className={`absolute ${yPositionClass} ${xPositionClass} p-2 bg-gray-800 rounded-lg shadow-2xl flex flex-col gap-2 w-64`}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
            >
                {marker.targetObjectLabel && <p className="text-xs text-cyan-300 text-center border-b border-gray-700 pb-1 mb-1">Ассет для: <strong>{marker.targetObjectLabel}</strong></p>}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRegenerateClick}
                        className="flex-grow flex items-center justify-center gap-1.5 whitespace-nowrap bg-cyan-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold shadow-lg hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed transition-colors"
                        aria-label="Regenerate from asset"
                        disabled={isDisabled}
                    >
                        <RegenerateIcon className="w-4 h-4" />
                        Regenerate
                    </button>
                    <button
                        onClick={handleRemoveClick}
                        className="p-1.5 text-gray-400 hover:text-red-400 disabled:opacity-50 transition-colors"
                        aria-label="Remove marker"
                        disabled={isDisabled}
                    >
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>
                <textarea
                    placeholder="Refine with a prompt..."
                    value={prompt}
                    onChange={handlePromptChange}
                    onBlur={handleBlur}
                    disabled={isDisabled}
                    rows={2}
                    className="w-full p-2 bg-gray-700 text-white rounded-md text-sm resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
            </div>
        </div>
    );
};
