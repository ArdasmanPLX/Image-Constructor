import React from 'react';
import { ChevronDownIcon } from './icons';

interface ControlsProps {
    numVariations: number;
    setNumVariations: (value: number) => void;
    creativity: number;
    setCreativity: (value: number) => void;
    aspectRatio: string;
    setAspectRatio: (value: string) => void;
    isDisabled: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ numVariations, setNumVariations, creativity, setCreativity, aspectRatio, setAspectRatio, isDisabled }) => {
    return (
        <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1 w-48">
                <label htmlFor="variations" className="text-sm font-medium text-gray-300">Variations: <span className="font-bold text-cyan-400">{numVariations}</span></label>
                <input
                    id="variations"
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={numVariations}
                    onChange={(e) => setNumVariations(Number(e.target.value))}
                    disabled={isDisabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
            </div>
            <div className="flex flex-col gap-1 w-48">
                 <label htmlFor="creativity" className="text-sm font-medium text-gray-300">Creativity: <span className="font-bold text-cyan-400">{creativity.toFixed(2)}</span></label>
                 <input
                    id="creativity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={creativity}
                    onChange={(e) => setCreativity(Number(e.target.value))}
                    disabled={isDisabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
            </div>
            <div className="flex flex-col gap-1 w-44">
                <label htmlFor="aspect-ratio" className="text-sm font-medium text-gray-300">Aspect Ratio</label>
                <div className="relative">
                    <select
                        id="aspect-ratio"
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        disabled={isDisabled}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md text-sm py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50 appearance-none transition-colors"
                    >
                        <option value="freeform">Freeform</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="4:3">4:3 (Landscape)</option>
                        <option value="3:4">3:4 (Portrait)</option>
                        <option value="16:9">16:9 (Widescreen)</option>
                        <option value="9:16">9:16 (Tall)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <ChevronDownIcon className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};
