import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ImageFile, EditMarker, DropCoordinates, AssetMarker, SegmentationMask } from '../types';
import { UploadIcon } from './icons';
import { EditMarkerComponent } from './EditMarker';
import { AssetMarkerComponent } from './AssetMarker';
import { CoordinateGrid } from './CoordinateGrid';
import { CompareSlider } from './CompareSlider';

interface MainCanvasProps {
    canvasRef: React.RefObject<HTMLDivElement>;
    baseImage: ImageFile | null;
    displayImage: ImageFile | null;
    onBaseImageSet: (file: File) => void;
    markers: EditMarker[];
    assetMarkers: AssetMarker[];
    onAddMarker: (coords: { x: number; y: number }, targetObjectLabel?: string) => void;
    onUpdateMarker: (id: string, newProps: Partial<EditMarker>) => void;
    onRemoveMarker: (id: string) => void;
    onGenerateFromTextMarker: (id: string) => void;
    onAssetDrop: (assetId: string, coords: DropCoordinates, targetObjectLabel?: string) => void;
    onUpdateAssetMarker: (id: string, newProps: Partial<AssetMarker>) => void;
    onRemoveAssetMarker: (id: string) => void;
    onRegenerateFromAssetMarker: (id: string) => void;
    isDisabled: boolean;
    zoom: number;
    setZoom: (zoom: number) => void;
    canvasOffset: { x: number; y: number };
    setCanvasOffset: (offset: { x: number; y: number }) => void;
    showGrid: boolean;
    isCompareMode: boolean;
    sliderPosition: number;
    isSliderDragging: boolean;
    onSliderPositionChange: (position: number) => void;
    onSliderDragStart: () => void;
    onSliderDragEnd: () => void;
    segmentationData: SegmentationMask[] | null;
    hoveredMaskLabel: string | null;
    onHoverMask: (label: string | null) => void;
    aspectRatio: string;
}

type DraggedMarker = { id: string; type: 'edit' | 'asset'; }

export const MainCanvas: React.FC<MainCanvasProps> = ({
    canvasRef, baseImage, displayImage, onBaseImageSet, markers, assetMarkers, onAddMarker, onUpdateMarker,
    onRemoveMarker, onGenerateFromTextMarker, onAssetDrop, onUpdateAssetMarker, onRemoveAssetMarker,
    onRegenerateFromAssetMarker, isDisabled, zoom, setZoom, canvasOffset, setCanvasOffset, showGrid,
    isCompareMode, sliderPosition, isSliderDragging, onSliderPositionChange, onSliderDragStart, onSliderDragEnd,
    segmentationData, hoveredMaskLabel, onHoverMask, aspectRatio
}) => {
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [dropIndicator, setDropIndicator] = useState<DropCoordinates | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [draggedMarker, setDraggedMarker] = useState<DraggedMarker | null>(null);
    const [isAssetDragOver, setIsAssetDragOver] = useState(false);
    const [renderedImageGeom, setRenderedImageGeom] = useState({ x: 0, y: 0, width: 1, height: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const mouseDownPos = useRef({ x: 0, y: 0 });
    const didDrag = useRef(false);
    const hitCanvasRef = useRef<HTMLCanvasElement>(null);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });


    const getLabelFromHitMap = (coords: DropCoordinates): string | undefined => {
        const hitCanvas = hitCanvasRef.current;
        if (!hitCanvas || !segmentationData) return undefined;
        const ctx = hitCanvas.getContext('2d');
        if (!ctx) return undefined;

        const x = Math.floor(coords.x * hitCanvas.width);
        const y = Math.floor(coords.y * hitCanvas.height);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        
        // Pixel color maps to index+1, 0 is no mask.
        const index = pixel[2] - 1; 

        if (index >= 0 && index < segmentationData.length) {
            return segmentationData[index].label;
        }
        return undefined;
    };
    
    useEffect(() => {
        const hitCanvas = hitCanvasRef.current;
        const img = imageRef.current;
        if (!hitCanvas || !img || !segmentationData || !img.naturalWidth || !img.naturalHeight) {
            if (hitCanvas) {
                const ctx = hitCanvas.getContext('2d');
                ctx?.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
            }
            return;
        }

        const ctx = hitCanvas.getContext('2d');
        if (!ctx) return;
        
        hitCanvas.width = img.naturalWidth;
        hitCanvas.height = img.naturalHeight;
        ctx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
        
        segmentationData.forEach((maskData, index) => {
            const maskImg = new Image();
            maskImg.src = `data:image/png;base64,${maskData.mask}`;
            maskImg.onload = () => {
                if (hitCanvas.width === 0 || hitCanvas.height === 0) return;
                // Unique color for each mask (using blue channel for index)
                ctx.fillStyle = `rgb(0, 0, ${index + 1})`; 
                ctx.fillRect(0, 0, hitCanvas.width, hitCanvas.height);
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(maskImg, 0, 0, hitCanvas.width, hitCanvas.height);
                ctx.globalCompositeOperation = 'source-over';
            };
        });

    }, [segmentationData, renderedImageGeom.width, renderedImageGeom.height]); // Depend on rendered image size to fix race condition


    const calculateGeom = useCallback(() => {
        if (!imageRef.current || !canvasRef.current) return;
        const img = imageRef.current;
        const container = canvasRef.current;
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;
        if (!imgW || !imgH) return;
        const containerAspect = containerW / containerH;
        const imgAspect = imgW / imgH;
        let width, height, x, y;
        if (imgAspect > containerAspect) {
            width = containerW;
            height = width / imgAspect;
            x = 0;
            y = (containerH - height) / 2;
        } else {
            height = containerH;
            width = height * imgAspect;
            y = 0;
            x = (containerW - width) / 2;
        }
        setRenderedImageGeom({ x, y, width, height });
    }, [canvasRef]);

    useEffect(() => {
        const container = canvasRef.current;
        if (!container) return;
        const observer = new ResizeObserver(calculateGeom);
        observer.observe(container);
        const imgEl = imageRef.current;
        if (imgEl) {
            imgEl.onload = calculateGeom;
            if (imgEl.complete) calculateGeom();
        }
        return () => observer.disconnect();
    }, [displayImage, calculateGeom]);


    const handleFileDrop = useCallback((files: FileList) => {
        if (files.length > 0) onBaseImageSet(files[0]);
    }, [onBaseImageSet]);

    const getRelativeCoords = useCallback((e: React.DragEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>): DropCoordinates | null => {
        if (!canvasRef.current) return null;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        const preTransformX = (mouseX - canvasOffset.x) / zoom;
        const preTransformY = (mouseY - canvasOffset.y) / zoom;
        const imageX = preTransformX - renderedImageGeom.x;
        const imageY = preTransformY - renderedImageGeom.y;
        
        if (imageX < 0 || imageX > renderedImageGeom.width || imageY < 0 || imageY > renderedImageGeom.height) {
            const clampedX = Math.max(0, Math.min(imageX, renderedImageGeom.width));
            const clampedY = Math.max(0, Math.min(imageY, renderedImageGeom.height));
            return { x: clampedX / renderedImageGeom.width, y: clampedY / renderedImageGeom.height };
        }
    
        const relativeX = imageX / renderedImageGeom.width;
        const relativeY = imageY / renderedImageGeom.height;
        return { x: relativeX, y: relativeY };
    }, [canvasOffset, zoom, renderedImageGeom, canvasRef]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); if (isDisabled) return;
        const coords = getRelativeCoords(e);
        if(coords) onHoverMask(getLabelFromHitMap(coords) ?? null);
        if (e.dataTransfer.types.includes('application/x-asset-id')) {
            setIsAssetDragOver(true); setDropIndicator(coords);
        } else if (e.dataTransfer.types.includes('Files')) {
            setIsDraggingFile(true);
        }
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); onHoverMask(null);
        setIsDraggingFile(false); setDropIndicator(null); setIsAssetDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        const coords = getRelativeCoords(e);
        const targetLabel = coords ? getLabelFromHitMap(coords) : undefined;
        onHoverMask(null); setIsDraggingFile(false); setDropIndicator(null); setIsAssetDragOver(false);
        if (isDisabled) return;
        const assetId = e.dataTransfer.getData('application/x-asset-id');
        if (assetId && displayImage && coords) {
            onAssetDrop(assetId, coords, targetLabel);
        } else if (e.dataTransfer.files.length > 0) {
            handleFileDrop(e.dataTransfer.files);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleFileDrop(e.target.files); };
    const handleMarkerDragStart = (id: string, type: 'edit' | 'asset') => { if(!isDisabled) setDraggedMarker({ id, type }); };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isCompareMode || isDisabled || !displayImage || (e.target as HTMLElement).closest('.marker-container')) return;
        didDrag.current = false; setIsPanning(true);
        mouseDownPos.current = { x: e.clientX, y: e.clientY };
        panStart.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
    };
    
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (canvasRef.current) {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            setCursorPosition({ x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top });
        }
        const coords = getRelativeCoords(e);
        if (!isPanning && !draggedMarker) onHoverMask(coords ? getLabelFromHitMap(coords) ?? null : null);
        if (isSliderDragging && coords) { onSliderPositionChange(coords.x); return; }
        if (isPanning) {
            const dx = Math.abs(e.clientX - mouseDownPos.current.x);
            const dy = Math.abs(e.clientY - mouseDownPos.current.y);
            if (!didDrag.current && (dx > 5 || dy > 5)) didDrag.current = true;
            if (didDrag.current) {
                setCanvasOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
                return;
            }
        }
        if (draggedMarker && coords) {
            if (draggedMarker.type === 'edit') onUpdateMarker(draggedMarker.id, { x: coords.x, y: coords.y });
            else onUpdateAssetMarker(draggedMarker.id, { x: coords.x, y: coords.y });
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isSliderDragging) onSliderDragEnd();
        if (isPanning && !didDrag.current) {
            const target = e.target as HTMLElement;
            if(!target.closest('.marker-container')) {
                const coords = getRelativeCoords(e);
                if (coords) onAddMarker(coords, getLabelFromHitMap(coords));
            }
        }
        didDrag.current = false; setIsPanning(false); setDraggedMarker(null);
    };
    
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (isDisabled || !displayImage) return;
        e.preventDefault();
        const MIN_ZOOM = 0.2, MAX_ZOOM = 5, ZOOM_STEP = 1.2;
        const canvasRect = canvasRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        const oldZoom = zoom;
        const newZoom = e.deltaY > 0 ? Math.max(oldZoom / ZOOM_STEP, MIN_ZOOM) : Math.min(oldZoom * ZOOM_STEP, MAX_ZOOM);
        if (newZoom === oldZoom) return;
        const newOffsetX = mouseX - (newZoom / oldZoom) * (mouseX - canvasOffset.x);
        const newOffsetY = mouseY - (newZoom / oldZoom) * (mouseY - canvasOffset.y);
        setZoom(newZoom); setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    };

    const dropzoneClasses = `w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center text-center transition-colors duration-300 ${isDraggingFile ? 'border-cyan-400 bg-gray-700/50' : 'border-gray-600'}`;
    const canvasCursor = isPanning && didDrag.current ? 'grabbing' : (displayImage ? (isCompareMode ? 'ew-resize' : (hoveredMaskLabel ? 'pointer' : 'grab')) : 'default');
    
    const canvasStyle: React.CSSProperties = aspectRatio !== 'freeform'
        ? {
            aspectRatio: aspectRatio.replace(':', '/'),
            width: 'auto',
            height: 'auto',
            maxHeight: '100%',
            maxWidth: '100%',
          }
        : { width: '100%', height: '100%' };

    return (
        <div ref={canvasRef} className="relative select-none bg-gray-800 rounded-lg overflow-hidden"
            style={canvasStyle}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { handleMouseUp(null as any); onHoverMask(null); }} onWheel={handleWheel}
        >
            <div className="w-full h-full" style={{ cursor: canvasCursor }}>
                <canvas ref={hitCanvasRef} className="hidden" />
                {displayImage ? (
                    <div className="absolute top-0 left-0 w-full h-full" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
                       <div className="absolute" style={{ width: `${renderedImageGeom.width}px`, height: `${renderedImageGeom.height}px`, left: `${renderedImageGeom.x}px`, top: `${renderedImageGeom.y}px` }}>
                            {isCompareMode && baseImage && displayImage && baseImage.id !== displayImage.id ? (
                                <CompareSlider beforeImage={baseImage.dataUrl} afterImage={displayImage.dataUrl} sliderPosition={sliderPosition} onDragStart={onSliderDragStart} />
                            ) : (
                                <>
                                    <img ref={imageRef} src={displayImage.dataUrl} alt="Main content" className="w-full h-full pointer-events-none" crossOrigin="anonymous" />
                                    {showGrid && <CoordinateGrid zoom={zoom} />}
                                    {hoveredMaskLabel && segmentationData && (() => {
                                        const maskData = segmentationData.find(m => m.label === hoveredMaskLabel);
                                        if (!maskData) return null;

                                        return (
                                            <div
                                                key={maskData.label}
                                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                                style={{
                                                    backgroundColor: maskData.color.replace('0.5', '0.7'),
                                                    maskImage: `url(data:image/png;base64,${maskData.mask})`,
                                                    maskSize: '100% 100%',
                                                    WebkitMaskImage: `url(data:image/png;base64,${maskData.mask})`,
                                                    WebkitMaskSize: '100% 100%',
                                                }}
                                            />
                                        );
                                    })()}
                                    {markers.map(marker => <EditMarkerComponent key={marker.id} marker={marker} onGenerate={onGenerateFromTextMarker} onRemove={onRemoveMarker} onUpdate={onUpdateMarker} onDragStart={(id) => handleMarkerDragStart(id, 'edit')} isDisabled={isDisabled} />)}
                                    {assetMarkers.map(marker => <AssetMarkerComponent key={marker.id} marker={marker} onRegenerate={onRegenerateFromAssetMarker} onRemove={onRemoveAssetMarker} onDragStart={(id) => handleMarkerDragStart(id, 'asset')} onUpdate={onUpdateAssetMarker} isDisabled={isDisabled} />)}
                                    {dropIndicator && (
                                         <div className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30" style={{ left: `${dropIndicator.x * 100}%`, top: `${dropIndicator.y * 100}%` }}>
                                            <span className={`absolute inline-flex h-5 w-5 rounded-full opacity-75 animate-ping ${hoveredMaskLabel ? 'bg-purple-400' : 'bg-red-400'}`}></span>
                                            <span className={`relative inline-flex rounded-full h-5 w-5 border-2 border-white ${hoveredMaskLabel ? 'bg-purple-500' : 'bg-red-500'}`}></span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                     <label htmlFor="base-upload" className={`${dropzoneClasses} cursor-pointer p-8`}>
                        <div className="flex flex-col items-center gap-4 text-gray-400">
                            <UploadIcon className="w-12 h-12" />
                            <h3 className="text-xl font-semibold">Drop Base Image Here</h3>
                            <p>or click to upload, or paste from clipboard</p>
                        </div>
                        <input id="base-upload" type="file" accept="image/*" className="hidden" onChange={handleFileInput} disabled={isDisabled} />
                    </label>
                )}
                {hoveredMaskLabel && !isPanning && !draggedMarker && !isAssetDragOver && !isCompareMode && (
                     <div className="absolute px-2 py-1 bg-black/70 text-white text-sm rounded-md pointer-events-none z-50 transform -translate-y-full"
                         style={{
                             left: `${cursorPosition.x + 15}px`,
                             top: `${cursorPosition.y - 5}px`,
                         }}
                     >
                        {hoveredMaskLabel}
                    </div>
                )}
                 {isDraggingFile && displayImage && (
                    <div className="absolute inset-0 bg-gray-900/70 border-4 border-dashed border-cyan-400 rounded-lg flex items-center justify-center z-40 pointer-events-none">
                        <div className="text-center text-white">
                            <UploadIcon className="w-16 h-16 mx-auto" />
                            <h3 className="text-2xl font-semibold mt-4">Drop to replace base image</h3>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
