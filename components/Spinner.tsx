
import React from 'react';
import { LogoIcon } from './icons';

interface SpinnerProps {
    message: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ message }) => {
    return (
        <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-10 rounded-lg">
            <LogoIcon className="w-16 h-16 text-cyan-400 animate-spin" />
            <p className="mt-4 text-lg font-semibold text-white">{message}</p>
        </div>
    );
};
