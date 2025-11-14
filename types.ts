
export interface ImageFile {
  id: string;
  dataUrl: string;
}

export interface GeneratedResult {
    id: string;
    image: string; // base64 data url
    text: string;
}

export interface DropCoordinates {
    x: number;
    y: number;
}

export interface SegmentationMask {
  label: string;
  mask: string; // base64 encoded mask
  color: string; // UI color
}

export interface EditMarker {
  id: string;
  x: number; // relative coordinate 0-1
  y: number; // relative coordinate 0-1
  prompt: string;
  targetObjectLabel?: string;
}

export interface AssetMarker {
  id: string;
  assetId: string;
  x: number;
  y: number;
  color: string;
  prompt?: string;
  targetObjectLabel?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'api';
  message: string;
}

// FIX: Add ImageContextPanelProps to resolve missing type error.
export interface ImageContextPanelProps {
  context: string | null;
}