import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { GeneratedResult } from '../types';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface ResultModalProps {
    results: GeneratedResult[];
    initialResult: GeneratedResult;
    onClose: () => void;
    onNavigate: (newResultId: string) => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ results, initialResult, onClose, onNavigate }) => {
    const initialIndex = useMemo(() => results.findIndex(r => r.id === initialResult.id), [results, initialResult]);
    const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

    useEffect(() => {
        const result = results[currentIndex];
        if (result) {
            onNavigate(result.id);
        }
    }, [currentIndex, results, onNavigate]);

    const handleNext = useCallback(() => {
        setCurrentIndex(prevIndex => (prevIndex + 1) % results.length);
    }, [results.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex(prevIndex => (prevIndex - 1 + results.length) % results.length);
    }, [results.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, onClose]);

    const currentResult = results[currentIndex];

    if (!currentResult) return null;
    
    const stopPropagationAnd = (fn: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        fn();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="w-full h-full flex items-center justify-center p-8"
                onClick={(e) => e.stopPropagation()}
            >
                <img 
                    src={currentResult.image} 
                    alt="Generated result" 
                    className="object-contain max-w-full max-h-full rounded-lg shadow-2xl"
                />
            </div>
            
            <button 
                onClick={stopPropagationAnd(onClose)} 
                className="absolute top-4 right-4 bg-gray-800/50 text-white rounded-full p-2 hover:bg-red-500 transition-colors z-10"
                aria-label="Close"
            >
                <CloseIcon className="w-6 h-6" />
            </button>
            
            {results.length > 1 && (
                <>
                    <button 
                        onClick={stopPropagationAnd(handlePrev)} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-800/50 text-white rounded-full p-2 hover:bg-gray-700 transition-colors z-10"
                        aria-label="Previous image"
                    >
                        <ChevronLeftIcon className="w-8 h-8" />
                    </button>
                    <button 
                        onClick={stopPropagationAnd(handleNext)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-800/50 text-white rounded-full p-2 hover:bg-gray-700 transition-colors z-10"
                        aria-label="Next image"
                    >
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                        {currentIndex + 1} / {results.length}
                    </div>
                </>
            )}
        </div>
    );
};