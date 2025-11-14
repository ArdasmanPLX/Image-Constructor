import React, { useState } from 'react';
import { AssetThumbnail } from './AssetThumbnail';
import type { ImageFile } from '../types';
import { UploadIcon, TrashIcon } from './icons';

interface AssetPanelProps {
    insertImages: ImageFile[];
    onInsertImageAdd: (files: FileList) => void;
    onClear: () => void;
    isDisabled: boolean;
    assetIdToColorMap: Record<string, string>;
}

export const AssetPanel: React.FC<AssetPanelProps> = ({ insertImages, onInsertImageAdd, onClear, isDisabled, assetIdToColorMap }) => {
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onInsertImageAdd(e.target.files);
            e.target.value = ''; // Reset input to allow re-uploading the same file
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (isDisabled) return;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDraggingFile(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
        if (isDisabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onInsertImageAdd(e.dataTransfer.files);
        }
    };
    
    return (
        <footer 
            className="bg-gray-800 rounded-lg p-4 flex-shrink-0 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">Asset Panel</h2>
                {insertImages.length > 0 && (
                     <button onClick={onClear} disabled={isDisabled} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 disabled:opacity-50 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                        Clear All
                    </button>
                )}
            </div>
            <div className={`flex flex-wrap content-start items-start gap-4 p-2 bg-gray-900/50 rounded-md min-h-48 transition-colors ${isDraggingFile ? 'border-2 border-dashed border-cyan-400' : ''}`}>
                {insertImages.map((image) => (
                    <AssetThumbnail 
                        key={image.id} 
                        imageFile={image} 
                        isDisabled={isDisabled}
                        color={assetIdToColorMap[image.id]}
                    />
                ))}
                 <label htmlFor="insert-upload" className="flex-shrink-0 w-28 h-28 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 hover:text-cyan-400 transition-colors text-gray-500">
                    <UploadIcon className="w-8 h-8" />
                    <span className="text-xs mt-1">Add Asset</span>
                </label>
                <input id="insert-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} disabled={isDisabled} />
            </div>

            {isDraggingFile && (
                <div className="absolute inset-0 bg-gray-900/80 border-4 border-dashed border-cyan-400 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                    <div className="text-center text-white">
                        <UploadIcon className="w-16 h-16 mx-auto" />
                        <h3 className="text-2xl font-semibold mt-4">Drop to add assets</h3>
                    </div>
                </div>
            )}
        </footer>
    );
};