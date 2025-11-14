import React from 'react';
import type { ImageContextPanelProps } from '../types';
import { MagicWandIcon } from './icons';

export const ImageContextPanel: React.FC<ImageContextPanelProps> = ({ context }) => {
    return (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
                <MagicWandIcon className="w-6 h-6 mr-3 text-cyan-400 flex-shrink-0" />
                <h2 className="text-xl font-semibold">Контекст изображения (AI)</h2>
            </div>
            <div className="max-h-24 overflow-y-auto pr-2 text-gray-300 text-sm">
                <p className="whitespace-pre-wrap">{context}</p>
            </div>
        </div>
    );
};
