import React, { useState } from 'react';
import { MagicWandIcon, CloseIcon, SendIcon } from './icons';

interface GenerationBarProps {
    onGenerate: (prompt: string) => void;
    isDisabled: boolean;
    canActivate: boolean;
}

export const GenerationBar: React.FC<GenerationBarProps> = ({ onGenerate, isDisabled, canActivate }) => {
    const [isActive, setIsActive] = useState(false);
    const [prompt, setPrompt] = useState('');

    const canGenerate = canActivate && prompt.trim().length > 0;

    const handleGenerateClick = () => {
        if (canGenerate) {
            onGenerate(prompt);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerateClick();
        }
    };

    if (!isActive) {
        return (
            <div className="bg-gray-800 rounded-lg p-4 flex-shrink-0 h-full">
                <button
                    onClick={() => setIsActive(true)}
                    disabled={isDisabled || !canActivate}
                    className="w-full h-full flex items-center justify-center gap-2 bg-gray-700 text-white px-4 py-2.5 rounded-md text-sm font-semibold shadow-lg hover:bg-gray-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed transition-all"
                    title={!canActivate ? "Upload a base image or at least one asset to enable Generation Mode" : "Generate a new scene using assets and a text prompt"}
                >
                    <MagicWandIcon className="w-5 h-5" />
                    Generation Mode
                </button>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3 flex-shrink-0 animate-fade-in h-full">
            <div className="flex justify-between items-center">
                <h3 className="text-md font-semibold flex items-center gap-2">
                    <MagicWandIcon className="w-5 h-5 text-cyan-400"/>
                    Describe the scene you want to create
                </h3>
                <button onClick={() => setIsActive(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
                    <CloseIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className="flex flex-col gap-3 flex-grow">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isDisabled}
                    placeholder="e.g., A man plays with the puppy using the ball near the fountain"
                    className="w-full flex-grow p-2 bg-gray-900/50 text-white rounded-md text-sm resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                />
                 <button 
                    onClick={handleGenerateClick}
                    disabled={isDisabled || !canGenerate}
                    className="w-full flex items-center justify-center bg-cyan-500 text-white px-4 py-2.5 rounded-md text-sm font-semibold shadow-lg hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed transition-colors"
                    title="Generate Image (Enter)"
                >
                    Generate
                 </button>
            </div>
        </div>
    );
};