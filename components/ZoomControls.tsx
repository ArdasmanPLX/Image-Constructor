import React from 'react';
import { ZoomInIcon, ZoomOutIcon, ResetZoomIcon, GridIcon, CompareIcon } from './icons';

interface ZoomControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    zoomLevel: number;
    isDisabled: boolean;
    showGrid: boolean;
    onToggleGrid: () => void;
    isCompareMode: boolean;
    onToggleCompare: () => void;
    isCompareDisabled: boolean;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
    onZoomIn, onZoomOut, onReset, zoomLevel, isDisabled, showGrid, onToggleGrid,
    isCompareMode, onToggleCompare, isCompareDisabled,
}) => {
    return (
        <div className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm rounded-lg p-1.5 flex items-center gap-1 shadow-lg z-20">
            <button onClick={onZoomOut} disabled={isDisabled} className="p-2 text-gray-300 hover:bg-gray-700 rounded-md disabled:opacity-50 transition-colors" aria-label="Zoom out">
                <ZoomOutIcon className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white w-14 text-center" title="Zoom level">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={onZoomIn} disabled={isDisabled} className="p-2 text-gray-300 hover:bg-gray-700 rounded-md disabled:opacity-50 transition-colors" aria-label="Zoom in">
                <ZoomInIcon className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-gray-600 mx-1"></div>
            <button onClick={onReset} disabled={isDisabled} className="p-2 text-gray-300 hover:bg-gray-700 rounded-md disabled:opacity-50 transition-colors" aria-label="Reset zoom">
                <ResetZoomIcon className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-gray-600 mx-1"></div>
            <button 
                onClick={onToggleGrid} 
                disabled={isDisabled} 
                className={`p-2 rounded-md disabled:opacity-50 transition-colors ${showGrid ? 'text-cyan-300 bg-cyan-500/30' : 'text-gray-300 hover:bg-gray-700'}`} 
                aria-label="Toggle grid"
                title="Toggle Coordinate Grid"
            >
                <GridIcon className="w-5 h-5" />
            </button>
            <button 
                onClick={onToggleCompare} 
                disabled={isDisabled || isCompareDisabled} 
                className={`p-2 rounded-md disabled:opacity-50 transition-colors ${isCompareMode ? 'text-cyan-300 bg-cyan-500/30' : 'text-gray-300 hover:bg-gray-700'}`} 
                aria-label="Toggle compare mode"
                title="Toggle Before/After Compare"
            >
                <CompareIcon className="w-5 h-5" />
            </button>
        </div>
    );
};