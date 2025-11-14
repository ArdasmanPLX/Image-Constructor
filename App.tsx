import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MainCanvas } from './components/MainCanvas';
import { AssetPanel } from './components/AssetPanel';
import { Controls } from './components/Controls';
import { ResultModal } from './components/ResultModal';
import { Spinner } from './components/Spinner';
import { ZoomControls } from './components/ZoomControls';
import { GenerationBar } from './components/GenerationBar';
import type { ImageFile, GeneratedResult, EditMarker, DropCoordinates, AssetMarker, SegmentationMask, LogEntry } from './types';
import { editTextWithRetry, editImageWithRetry, describeImage, segmentImage, generateSceneWithMultipleAssets, generateSceneFromAssets } from './services/geminiService';
import { LogoIcon, SaveIcon, UndoIcon } from './components/icons';
import { DevConsole } from './components/DevConsole';

const MARKER_COLORS = ['#34D399', '#60A5FA', '#FBBF24', '#A78BFA', '#F87171', '#F472B6'];
const MASK_COLORS = ['rgba(52, 211, 153, 0.5)', 'rgba(96, 165, 250, 0.5)', 'rgba(251, 191, 36, 0.5)', 'rgba(167, 139, 250, 0.5)', 'rgba(248, 113, 113, 0.5)', 'rgba(244, 114, 182, 0.5)', 'rgba(250, 204, 21, 0.5)', 'rgba(59, 130, 246, 0.5)'];

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const ZOOM_STEP = 1.2;

interface EditorState {
    baseImage: ImageFile | null;
    insertImages: ImageFile[];
    markers: EditMarker[];
    assetMarkers: AssetMarker[];
}

const App: React.FC = () => {
    const [baseImage, setBaseImage] = useState<ImageFile | null>(null);
    const [insertImages, setInsertImages] = useState<ImageFile[]>([]);
    const [markers, setMarkers] = useState<EditMarker[]>([]);
    const [assetMarkers, setAssetMarkers] = useState<AssetMarker[]>([]);
    const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    const [numVariations, setNumVariations] = useState<number>(1);
    const [creativity, setCreativity] = useState<number>(0.9);
    const [aspectRatio, setAspectRatio] = useState<string>('freeform');

    const [modalInitialResult, setModalInitialResult] = useState<GeneratedResult | null>(null);
    const [activeResultId, setActiveResultId] = useState<string | null>(null);
    const [lastColorIndex, setLastColorIndex] = useState(0);
    
    const [zoom, setZoom] = useState(1);
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [showGrid, setShowGrid] = useState<boolean>(false);
    const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
    const [imageContext, setImageContext] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Segmentation state
    const [isSegmenting, setIsSegmenting] = useState<boolean>(false);
    const [segmentationData, setSegmentationData] = useState<SegmentationMask[] | null>(null);
    const [hoveredMaskLabel, setHoveredMaskLabel] = useState<string | null>(null);

    const [sliderPosition, setSliderPosition] = useState(0.5);
    const [isSliderDragging, setIsSliderDragging] = useState(false);

    // Dev Console State
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    
    // Undo/Redo State
    const [history, setHistory] = useState<EditorState[]>([]);

    const log = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newEntry: LogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message,
        };
        setLogs(prev => [newEntry, ...prev]);
    }, []);

    // --- History Management ---
    // FIX: Refactored history management to use explicit dependencies in `saveStateToHistory`'s `useCallback` instead of a `useRef`. 
    // This resolves a potential stale state issue and clarifies data flow, which might be the underlying cause of the cryptic error.
    const saveStateToHistory = useCallback(() => {
        setHistory(prev => [...prev, { baseImage, insertImages, markers, assetMarkers }]);
    }, [baseImage, insertImages, markers, assetMarkers]);

    const handleUndo = useCallback(() => {
        if (history.length === 0) {
            log('Undo stack is empty.');
            return;
        }

        log('Performing undo...');
        const prevState = history[history.length - 1];
        
        // Restore state
        setBaseImage(prevState.baseImage);
        setInsertImages(prevState.insertImages);
        setMarkers(prevState.markers);
        setAssetMarkers(prevState.assetMarkers);

        // Update history
        setHistory(prev => prev.slice(0, -1));

        // Reset transient states that are now invalid
        setGeneratedResults([]);
        setActiveResultId(null);
        setError(null);
        setIsCompareMode(false);
        setSegmentationData(null);
        setHoveredMaskLabel(null);
        log('Undo complete.', 'success');
    }, [history, log]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo]);
    // --- End History Management ---

    const handleSliderPositionChange = useCallback((position: number) => {
        setSliderPosition(Math.max(0, Math.min(1, position)));
    }, []);

    const handleSliderDragStart = useCallback(() => {
        setIsSliderDragging(true);
    }, []);

    const handleSliderDragEnd = useCallback(() => {
        setIsSliderDragging(false);
    }, []);

    const handleZoomIn = useCallback(() => {
        if (!canvasRef.current) return;
        const newZoom = Math.min(zoom * ZOOM_STEP, MAX_ZOOM);
        if (newZoom === zoom) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const centerX = canvasRect.width / 2;
        const centerY = canvasRect.height / 2;
        const newOffsetX = centerX - (newZoom / zoom) * (centerX - canvasOffset.x);
        const newOffsetY = centerY - (newZoom / zoom) * (centerY - canvasOffset.y);
        setZoom(newZoom);
        setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    }, [zoom, canvasOffset]);

    const handleZoomOut = useCallback(() => {
        if (!canvasRef.current) return;
        const newZoom = Math.max(zoom / ZOOM_STEP, MIN_ZOOM);
        if (newZoom === zoom) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const centerX = canvasRect.width / 2;
        const centerY = canvasRect.height / 2;
        const newOffsetX = centerX - (newZoom / zoom) * (centerX - canvasOffset.x);
        const newOffsetY = centerY - (newZoom / zoom) * (centerY - canvasOffset.y);
        setZoom(newZoom);
        setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    }, [zoom, canvasOffset]);

    const handleResetZoom = useCallback(() => {
        setZoom(1);
        setCanvasOffset({ x: 0, y: 0 });
    }, []);

    const getNextColor = useCallback(() => {
        const color = MARKER_COLORS[lastColorIndex];
        setLastColorIndex((prevIndex) => (prevIndex + 1) % MARKER_COLORS.length);
        return color;
    }, [lastColorIndex]);

    const fileToImageFile = async (file: File): Promise<ImageFile> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target && typeof event.target.result === 'string') {
                    resolve({ id: crypto.randomUUID(), dataUrl: event.target.result });
                } else {
                    reject(new Error('Failed to read file.'));
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const handleBaseImageSet = useCallback(async (file: File) => {
        if (baseImage) saveStateToHistory();
        log(`New base image selected: ${file.name}`);
        setIsLoading(true);
        setLoadingMessage("Загрузка изображения...");
        setBaseImage(null);
        setGeneratedResults([]);
        setActiveResultId(null);
        setMarkers([]);
        setAssetMarkers([]);
        setIsCompareMode(false);
        setImageContext(null);
        setSegmentationData(null);
        setHoveredMaskLabel(null);
        setError(null);
        handleResetZoom();
        
        try {
            const imageFile = await fileToImageFile(file);
            setBaseImage(imageFile);
            log('Base image loaded successfully.', 'success');
            setLoadingMessage("Анализ контекста сцены...");
            log('Requesting scene context from AI...');
            const context = await describeImage(imageFile.dataUrl, log);
            setImageContext(context);
            log('Scene context received.', 'success');
        } catch (err: any) {
            setError('Не удалось загрузить или проанализировать изображение.');
            log(`Error loading base image: ${err.message}`, 'error');
            console.error(err);
            setBaseImage(null);
        } finally {
            setIsLoading(false);
        }
    }, [handleResetZoom, log, baseImage, saveStateToHistory]);

    const handleInsertImageAdd = useCallback(async (files: FileList) => {
        saveStateToHistory();
        try {
            const fileNames = Array.from(files).map(f => f.name).join(', ');
            log(`Adding assets: ${fileNames}`);
            const imageFiles = await Promise.all(Array.from(files).map(fileToImageFile));
            setInsertImages(prev => [...prev, ...imageFiles]);
            log('Assets added successfully.', 'success');
        } catch (err: any) {
            setError('Failed to load insert image(s).');
            log(`Failed to add assets: ${err.message}`, 'error');
            console.error(err);
        }
    }, [log, saveStateToHistory]);

    const handleClearInsertImages = useCallback(() => {
        if (insertImages.length > 0 || assetMarkers.length > 0) saveStateToHistory();
        log('Clearing all assets and asset markers.');
        setInsertImages([]);
        setAssetMarkers([]);
    }, [log, insertImages, assetMarkers, saveStateToHistory]);

    const startLoading = (initialMessage: string) => {
        setIsLoading(true);
        setError(null);
        setLoadingMessage(initialMessage);
        log(initialMessage);
        const loadingMessages = ["Applying changes...", "Correcting pixels...", "Matching style...", "Almost there..."];
        let messageIndex = 0;
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            const msg = loadingMessages[messageIndex];
            setLoadingMessage(msg);
            log(msg);
        }, 3000);
        return () => clearInterval(interval);
    };

    const handleAssetGeneration = useCallback(async (assetId: string, coords: DropCoordinates, targetObjectLabel?: string, isRegeneration: boolean = false, regenerationPrompt?: string) => {
        const insertImage = insertImages.find(img => img.id === assetId);
        if (!baseImage || !insertImage) return;

        const stopLoading = startLoading(isRegeneration ? 'Regenerating from asset...' : 'Generating new asset...');
        setGeneratedResults([]);

        try {
            const contextInstruction = imageContext ? `SCENE CONTEXT: "${imageContext}". Use this context to understand where and how to place the asset.` : '';
            const targetInstruction = targetObjectLabel ? `Target object for placement: **${targetObjectLabel}**. Place the asset on or near this object.` : `Coordinate system: (0,0) is top-left. Place the CENTER of the asset EXACTLY at relative coordinates x=${coords.x.toFixed(3)}, y=${coords.y.toFixed(3)}.`;
            const placementInstruction = `This is critically important; the position must be precise. After placing, integrate the asset into the main image by adjusting lighting, shadows, colors, and style to make it look natural.`;

            let finalPrompt;
            if (isRegeneration && regenerationPrompt) {
                finalPrompt = `${contextInstruction} This is a regeneration for an asset. The user's new instruction, which has HIGHEST PRIORITY, is: "${regenerationPrompt}". Apply this change, keeping the asset in the same area unless otherwise specified.`;
            } else {
                finalPrompt = `${contextInstruction} Insert the second image (asset) into the first (main) image. ${targetInstruction} ${placementInstruction}`;
            }
            log(`Prompt for asset generation: ${finalPrompt}`);
            
            const promises = Array(numVariations).fill(0).map(() => editImageWithRetry(baseImage.dataUrl, insertImage.dataUrl, finalPrompt, log));
            const results = await Promise.all(promises);
            const successfulResults = results.flat().map(res => ({ ...res, id: crypto.randomUUID() }));
            
            if (successfulResults.length === 0) {
                 const msg = "Generation failed. The model couldn't produce a valid result.";
                 setError(msg);
                 log(msg, 'error');
            } else {
                log(`Successfully generated ${successfulResults.length} variations.`, 'success');
                setGeneratedResults(successfulResults);
                const firstResult = successfulResults[0];
                setActiveResultId(firstResult.id);
                
                if (!isRegeneration) {
                     saveStateToHistory();
                     const newMarker: AssetMarker = {
                        id: crypto.randomUUID(),
                        assetId: assetId,
                        x: coords.x,
                        y: coords.y,
                        color: getNextColor(),
                        prompt: '',
                        targetObjectLabel,
                    };
                    setAssetMarkers(prev => [...prev, newMarker]);
                }
            }
        } catch (err: any) {
            console.error("Asset generation failed:", err);
            const msg = err.message || "An unexpected error occurred during asset generation.";
            setError(msg);
            log(msg, 'error');
        } finally {
            setIsLoading(false);
            stopLoading();
        }
    }, [baseImage, insertImages, numVariations, getNextColor, imageContext, log, saveStateToHistory]);
    
    const handleAssetRegeneration = useCallback(async (markerId: string) => {
        const marker = assetMarkers.find(m => m.id === markerId);
        if (!marker) return;
        log(`Regenerating for asset marker ${markerId}`);
        await handleAssetGeneration(marker.assetId, { x: marker.x, y: marker.y }, marker.targetObjectLabel, true, marker.prompt);
    }, [assetMarkers, handleAssetGeneration, log]);

    const handleMarkerGeneration = useCallback(async (marker: EditMarker) => {
        if (!baseImage) return;

        const stopLoading = startLoading('Generating from text marker...');
        setGeneratedResults([]);

        try {
            const contextInstruction = imageContext ? `Context of the main image: "${imageContext}".` : '';
            const targetInstruction = marker.targetObjectLabel ? `Apply the change to the object **'${marker.targetObjectLabel}'**.` : `The change must be centered EXACTLY at relative coordinates x=${marker.x.toFixed(3)}, y=${marker.y.toFixed(3)}.`;
            const prompt = `${contextInstruction} ${targetInstruction} Instruction: '${marker.prompt}'. Localize the change, blending it naturally with the surroundings.`;
            log(`Prompt for text marker generation: ${prompt}`);
            
            const promises = Array(numVariations).fill(0).map(() => editTextWithRetry(baseImage.dataUrl, prompt, log));
            const results = await Promise.all(promises);
            const successfulResults = results.flat().map(res => ({ ...res, id: crypto.randomUUID() }));
            
            if (successfulResults.length === 0) {
                const msg = "Generation failed. The model couldn't produce a valid result.";
                setError(msg);
                log(msg, 'error');
            } else {
                log(`Successfully generated ${successfulResults.length} variations from text marker.`, 'success');
                setGeneratedResults(successfulResults);
                const firstResult = successfulResults[0];
                setActiveResultId(firstResult.id);
            }
        } catch (err: any)
        {
            console.error("Marker generation failed:", err);
            const msg = err.message || "An unexpected error occurred during image generation.";
            setError(msg);
            log(msg, 'error');
        } finally {
            setIsLoading(false);
            stopLoading();
        }
    }, [numVariations, baseImage, imageContext, log]);

    const handleSceneGeneration = useCallback(async (prompt: string) => {
        const hasBaseImage = !!baseImage;
        const hasAssets = insertImages.length > 0;

        if (!hasBaseImage && !hasAssets) {
            const msg = "A base image or at least one asset is required for Generation Mode.";
            setError(msg);
            log(msg, 'error');
            return;
        }

        saveStateToHistory();
        const stopLoading = startLoading('Generating scene from prompt...');
        setGeneratedResults([]);

        try {
            let promises;

            if (hasBaseImage && hasAssets) {
                const assetUrls = insertImages.map(img => img.dataUrl);
                log(`Generating scene with base image, prompt: "${prompt}" and ${assetUrls.length} assets.`);
                promises = Array(numVariations).fill(0).map(() => 
                    generateSceneWithMultipleAssets(baseImage!.dataUrl, assetUrls, prompt, log)
                );
            } else if (hasBaseImage && !hasAssets) {
                log(`Generating from base image with prompt: "${prompt}"`);
                const contextInstruction = imageContext ? `Context of the main image: "${imageContext}".` : '';
                const fullPrompt = `${contextInstruction} Apply the following change to the entire image: '${prompt}'. Blend the changes naturally with the surroundings.`;
                promises = Array(numVariations).fill(0).map(() => 
                    editTextWithRetry(baseImage!.dataUrl, fullPrompt, log)
                );
            } else { // !hasBaseImage && hasAssets
                const assetUrls = insertImages.map(img => img.dataUrl);
                log(`Generating scene from ${assetUrls.length} assets with prompt: "${prompt}"`);
                promises = Array(numVariations).fill(0).map(() =>
                    generateSceneFromAssets(assetUrls, prompt, log, aspectRatio)
                );
            }
            
            const results = await Promise.all(promises);
            const successfulResults = results.flat().map(res => ({ ...res, id: crypto.randomUUID() }));

            if (successfulResults.length === 0) {
                const msg = "Scene generation failed. The model couldn't produce a valid result.";
                setError(msg);
                log(msg, 'error');
            } else {
                log(`Successfully generated ${successfulResults.length} variations for the scene.`, 'success');
                setGeneratedResults(successfulResults);
                const firstResult = successfulResults[0];
                setActiveResultId(firstResult.id);
                setMarkers([]);
                setAssetMarkers([]);
            }
        } catch (err: any) {
            console.error("Scene generation failed:", err);
            const msg = err.message || "An unexpected error occurred during scene generation.";
            setError(msg);
            log(msg, 'error');
        } finally {
            setIsLoading(false);
            stopLoading();
        }
    }, [baseImage, insertImages, numVariations, log, imageContext, aspectRatio, saveStateToHistory]);

    const handleSaveChanges = useCallback(() => {
        saveStateToHistory();
        log('Save Changes button clicked.');
        const resultToSave = generatedResults.find(r => r.id === activeResultId);
        if (resultToSave) {
            log(`Saving result ID: ${activeResultId}`);
            setBaseImage({ id: crypto.randomUUID(), dataUrl: resultToSave.image });
            setGeneratedResults([]);
            setActiveResultId(null);
            setAssetMarkers([]);
            setMarkers([]);
            setError(null);
            setIsCompareMode(false);
            setSliderPosition(0.5);
            setSegmentationData(null);
            log('Changes saved, workspace reset.', 'success');
        } else {
             const msg = "No result selected to save.";
             setError(msg);
             log(msg, 'error');
        }
    }, [generatedResults, activeResultId, log, saveStateToHistory]);
    
    const handleGenerateFromMarker = useCallback(async (markerId: string) => {
        const marker = markers.find(m => m.id === markerId);
        if (!baseImage || !marker) return;
        if (!marker.prompt.trim()) {
            const msg = "Please enter a prompt for the marker.";
            setError(msg);
            log(msg, 'error');
            return;
        }
        log(`Generating from text marker ${markerId}`);
        await handleMarkerGeneration(marker);
    }, [baseImage, markers, handleMarkerGeneration, log]);

    const handleAddMarker = useCallback((coords: { x: number; y: number }, targetObjectLabel?: string) => {
        saveStateToHistory();
        const newMarker: EditMarker = {
            id: crypto.randomUUID(),
            x: coords.x,
            y: coords.y,
            prompt: '',
            targetObjectLabel,
        };
        setMarkers(prev => [...prev, newMarker]);
        log(`Added new text marker at (${coords.x.toFixed(3)}, ${coords.y.toFixed(3)})${targetObjectLabel ? ` on object '${targetObjectLabel}'` : ''}.`);
    }, [log, saveStateToHistory]);

    const handleUpdateMarker = useCallback((id: string, newProps: Partial<EditMarker>) => {
        setMarkers(prev => prev.map(m => m.id === id ? { ...m, ...newProps } : m));
    }, []);
    
    const handleRemoveMarker = useCallback((id: string) => {
        saveStateToHistory();
        setMarkers(prev => prev.filter(m => m.id !== id));
        log(`Removed text marker ${id}.`);
    }, [log, saveStateToHistory]);

    const handleUpdateAssetMarker = useCallback((id: string, newProps: Partial<AssetMarker>) => {
        setAssetMarkers(prev => prev.map(m => m.id === id ? { ...m, ...newProps } : m));
    }, []);

    const handleRemoveAssetMarker = useCallback((id: string) => {
        saveStateToHistory();
        setAssetMarkers(prev => prev.filter(m => m.id !== id));
        log(`Removed asset marker ${id}.`);
    }, [log, saveStateToHistory]);

    const handleSegmentImage = useCallback(async () => {
        if (!baseImage) return;
        setIsSegmenting(true);
        setError(null);
        setSegmentationData(null);
        log('Starting image segmentation...');
        try {
            const masks = await segmentImage(baseImage.dataUrl, log);
            if (masks.length === 0) {
                log('Segmentation returned no objects.', 'info');
            } else {
                log(`Segmentation successful, found ${masks.length} objects.`, 'success');
            }
            const coloredMasks = masks.map((mask, index) => ({
                ...mask,
                color: MASK_COLORS[index % MASK_COLORS.length]
            }));
            setSegmentationData(coloredMasks);
        } catch (err: any) {
            const msg = err.message || "Failed to segment image.";
            setError(msg);
            log(`Segmentation Error: ${msg}`, 'error');
            console.error("Segmentation Error in App:", err);
        } finally {
            setIsSegmenting(false);
        }
    }, [baseImage, log]);

    useEffect(() => {
        const handlePaste = async (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        event.preventDefault();
                        if (!baseImage) {
                            log('Pasted image as new base image.');
                            await handleBaseImageSet(file);
                        } else {
                           log('Pasted image as new asset.');
                           await handleInsertImageAdd(file.constructor.name === 'File' ? new File([file], file.name, {type: file.type}) as any as FileList : [file] as any as FileList);
                        }
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [baseImage, handleBaseImageSet, handleInsertImageAdd, log]);

    const displayImage = useMemo(() => {
        const activeResult = generatedResults.find(r => r.id === activeResultId);
        return activeResult ? {id: activeResult.id, dataUrl: activeResult.image} : baseImage;
    }, [baseImage, generatedResults, activeResultId]);
    
    const assetIdToColorMap = useMemo(() => {
        return assetMarkers.reduce((acc, marker) => {
            acc[marker.assetId] = marker.color;
            return acc;
        }, {} as Record<string, string>);
    }, [assetMarkers]);
    
    const isCompareDisabled = generatedResults.length === 0;

    return (
        <div className="h-screen flex flex-col p-4 bg-gray-900 text-gray-100 font-sans">
            <header className="flex items-center justify-between pb-4 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <LogoIcon className="w-10 h-10 text-cyan-400" />
                    <h1 className="text-3xl font-bold tracking-tight text-white">Playrix Image Сonstructor</h1>
                    <button
                        onClick={handleUndo}
                        disabled={history.length === 0 || isLoading || isSegmenting}
                        className="flex items-center gap-1.5 bg-gray-700 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                        aria-label="Undo last action"
                        title="Undo last action (Ctrl+Z)"
                    >
                        <UndoIcon className="w-4 h-4" />
                        Undo
                    </button>
                </div>
                <Controls 
                    numVariations={numVariations} 
                    setNumVariations={setNumVariations} 
                    creativity={creativity} 
                    setCreativity={setCreativity} 
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    isDisabled={isLoading || isSegmenting} 
                />
            </header>
            
            <main className="flex-grow grid grid-rows-[minmax(0,1fr)_auto] gap-4 py-4 min-h-0">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 min-h-0">
                    <div className="flex-grow relative w-full h-full min-h-0 flex items-center justify-center">
                       {(isLoading || isSegmenting) && <Spinner message={isSegmenting ? "Сегментация изображения..." : loadingMessage} />}
                        <MainCanvas
                            canvasRef={canvasRef}
                            baseImage={baseImage}
                            displayImage={displayImage}
                            onBaseImageSet={handleBaseImageSet}
                            markers={markers}
                            assetMarkers={assetMarkers}
                            onAddMarker={handleAddMarker}
                            onUpdateMarker={handleUpdateMarker}
                            onRemoveMarker={handleRemoveMarker}
                            onGenerateFromTextMarker={handleGenerateFromMarker}
                            onAssetDrop={handleAssetGeneration}
                            onUpdateAssetMarker={handleUpdateAssetMarker}
                            onRemoveAssetMarker={handleRemoveAssetMarker}
                            onRegenerateFromAssetMarker={handleAssetRegeneration}
                            isDisabled={isLoading || isSegmenting}
                            zoom={zoom}
                            setZoom={setZoom}
                            canvasOffset={canvasOffset}
                            setCanvasOffset={setCanvasOffset}
                            showGrid={showGrid}
                            isCompareMode={isCompareMode}
                            sliderPosition={sliderPosition}
                            isSliderDragging={isSliderDragging}
                            onSliderPositionChange={handleSliderPositionChange}
                            onSliderDragStart={handleSliderDragStart}
                            onSliderDragEnd={handleSliderDragEnd}
                            segmentationData={segmentationData}
                            hoveredMaskLabel={hoveredMaskLabel}
                            onHoverMask={setHoveredMaskLabel}
                            aspectRatio={aspectRatio}
                        />
                        {baseImage && !(isLoading || isSegmenting) && (
                             <ZoomControls
                                onZoomIn={handleZoomIn}
                                onZoomOut={handleZoomOut}
                                onReset={handleResetZoom}
                                zoomLevel={zoom}
                                isDisabled={isLoading || isSegmenting}
                                showGrid={showGrid}
                                onToggleGrid={() => setShowGrid(prev => !prev)}
                                isCompareMode={isCompareMode}
                                onToggleCompare={() => setIsCompareMode(prev => !prev)}
                                isCompareDisabled={isCompareDisabled}
                            />
                        )}
                    </div>

                    <aside className="w-full flex flex-col">
                        <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-3 border-b border-gray-600 pb-2 flex-shrink-0">
                                <h2 className="text-xl font-semibold">Generated Results</h2>
                                {generatedResults.length > 0 && (
                                    <button
                                        onClick={handleSaveChanges}
                                        disabled={isLoading || !activeResultId}
                                        className="flex items-center gap-1.5 whitespace-nowrap bg-cyan-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold shadow-lg hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed transition-colors"
                                        aria-label="Save selected result"
                                    >
                                        <SaveIcon className="w-4 h-4" />
                                        Save Changes
                                    </button>
                                )}
                            </div>
                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            {!isLoading && generatedResults.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto flex-grow pr-2 content-start">
                                    {generatedResults.map((result) => (
                                        <div 
                                            key={result.id} 
                                            className={`aspect-square bg-gray-700 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-all ${result.id === activeResultId ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-400' : ''}`}
                                            onClick={() => {
                                                setActiveResultId(result.id);
                                                setModalInitialResult(result);
                                            }}
                                        >
                                            <img src={result.image} alt="Generated result" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                             {!isLoading && !error && generatedResults.length === 0 && (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <p>Your results will appear here.</p>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
                
                <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-4 items-start">
                    <AssetPanel 
                        insertImages={insertImages} 
                        onInsertImageAdd={handleInsertImageAdd}
                        onClear={handleClearInsertImages}
                        isDisabled={isLoading || isSegmenting}
                        assetIdToColorMap={assetIdToColorMap}
                    />
                    <GenerationBar
                        onGenerate={handleSceneGeneration}
                        isDisabled={isLoading || isSegmenting}
                        canActivate={!!baseImage || insertImages.length > 0}
                    />
                </div>
            </main>
            
            {modalInitialResult && (
                <ResultModal 
                    results={generatedResults}
                    initialResult={modalInitialResult} 
                    onClose={() => setModalInitialResult(null)}
                    onNavigate={(newResultId) => setActiveResultId(newResultId)}
                />
            )}
             <DevConsole
                logs={logs}
                isOpen={isConsoleOpen}
                setIsOpen={setIsConsoleOpen}
            />
        </div>
    );
};

export default App;