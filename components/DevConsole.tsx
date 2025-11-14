import React, { useRef, useEffect } from 'react';
import type { LogEntry } from '../types';
import { TerminalIcon, ChevronDownIcon } from './icons';

interface DevConsoleProps {
    logs: LogEntry[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const LogTypeStyles = {
    info: 'text-gray-400',
    error: 'text-red-400',
    success: 'text-green-400',
    api: 'text-cyan-400',
};

export const DevConsole: React.FC<DevConsoleProps> = ({ logs, isOpen, setIsOpen }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && logContainerRef.current) {
            logContainerRef.current.scrollTop = 0;
        }
    }, [logs, isOpen]);

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t border-gray-700 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
             <div className="absolute bottom-full left-1/2 -translate-x-1/2">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-gray-800 border-t border-l border-r border-gray-700 rounded-t-lg px-4 py-2 flex items-center gap-2 text-gray-300 hover:text-white"
                >
                    <TerminalIcon className="w-5 h-5" />
                    <span className="font-mono text-sm">Dev Console</span>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {isOpen && (
                <div ref={logContainerRef} className="h-64 overflow-y-auto p-4 font-mono text-sm">
                    {logs.length === 0 ? (
                        <div className="text-gray-500">Console ready. No logs yet.</div>
                    ) : (
                        <ul className="space-y-2">
                            {logs.map(log => (
                                <li key={log.id} className="flex gap-4">
                                    <span className="text-gray-500 flex-shrink-0">{log.timestamp}</span>
                                    <span className={`${LogTypeStyles[log.type]} flex-shrink-0 font-bold w-16`}>[{log.type.toUpperCase()}]</span>
                                    <p className="text-gray-300 break-words whitespace-pre-wrap">{log.message}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};