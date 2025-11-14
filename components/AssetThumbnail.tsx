import React from 'react';
import type { ImageFile } from '../types';

interface AssetThumbnailProps {
    imageFile: ImageFile;
    isDisabled: boolean;
    color?: string;
}

export const AssetThumbnail: React.FC<AssetThumbnailProps> = ({ imageFile, isDisabled, color }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (isDisabled) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('application/x-asset-id', imageFile.id);
        e.dataTransfer.effectAllowed = 'copy';

        const img = e.currentTarget.querySelector('img');
        if (img) {
            const canvas = document.createElement('canvas');
            const size = e.currentTarget.offsetWidth;
            canvas.width = size;
            canvas.height = size;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Apply transparency
                ctx.globalAlpha = 0.6;

                // Simple draw, will stretch image to fit the square canvas.
                // This is a good enough approximation for the drag preview.
                ctx.drawImage(img, 0, 0, size, size);
            }

            // Set the custom, semi-transparent canvas as the drag preview.
            // The offset is half the size to center it on the cursor.
            e.dataTransfer.setDragImage(canvas, size / 2, size / 2);
        }
    };

    const style = color ? { '--tw-ring-color': color } as React.CSSProperties : {};

    return (
        <div
            draggable={!isDisabled}
            onDragStart={handleDragStart}
            className={`flex-shrink-0 w-28 h-28 bg-gray-700 rounded-lg overflow-hidden transition-all duration-200 ease-in-out relative ${!isDisabled ? 'cursor-grab active:cursor-grabbing hover:scale-105' : 'cursor-not-allowed opacity-50'} ${color ? 'ring-2 ring-offset-2 ring-offset-gray-900/50' : ''}`}
            title="Drag onto canvas to use"
            style={style}
        >
            <img src={imageFile.dataUrl} alt="Insert asset" className="w-full h-full object-cover" />
        </div>
    );
};
