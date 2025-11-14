import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GeneratedResult, SegmentationMask, LogEntry } from '../types';

const MAX_RETRIES = 3;

const parseDataUrl = (dataUrl: string): { mimeType: string; data: string } => {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) {
        throw new Error('Invalid data URL.');
    }
    const mimeType = parts[0].split(':')[1].split(';')[0];
    const data = parts[1];
    return { mimeType, data };
};

const callWithRetry = async <T>(
    fn: () => Promise<T>,
    logger?: (message: string, type?: LogEntry['type']) => void
): Promise<T> => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            logger?.(`API call attempt ${attempt + 1}...`, 'api');
            return await fn();
        } catch (error) {
            logger?.(`API call attempt ${attempt + 1} failed: ${(error as Error).message}`, 'error');
            lastError = error as Error;
            if (attempt < MAX_RETRIES - 1) {
                const delay = 1000 * (attempt + 1);
                logger?.(`Retrying after ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    throw new Error(`Failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
}

export const describeImage = async (
    baseImage: string,
    logger?: (message: string, type?: LogEntry['type']) => void
): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    return callWithRetry(async () => {
        const imagePart = { inlineData: parseDataUrl(baseImage) };
        const textPart = { text: "Опиши это изображение очень подробно. Перечисли все ключевые объекты, их примерное расположение (например, 'в центре', 'слева вверху', 'на переднем плане') и общую композицию, стиль и атмосферу. Ответ дай на русском языке." };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: { thinkingConfig: { thinkingBudget: 0 } },
        });
        logger?.('Describe image response received.', 'api');
        return response.text;
    }, logger);
};


const processResponse = (response: any): GeneratedResult[] => {
    if (response && response.candidates && response.candidates[0].content.parts) {
        const results: GeneratedResult[] = [];
        let currentText = '';

        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                currentText = part.text;
            } else if (part.inlineData) {
                const { mimeType, data } = part.inlineData;
                results.push({
                    id: crypto.randomUUID(),
                    image: `data:${mimeType};base64,${data}`,
                    text: currentText,
                });
                currentText = ''; // Reset text for the next image
            }
        }
        if (results.length > 0) return results;
    }
    throw new Error('No valid image content found in the response.');
}

export const editTextWithRetry = async (
    baseImage: string,
    prompt: string,
    logger?: (message: string, type?: LogEntry['type']) => void
): Promise<GeneratedResult[]> => {
    if (!process.env.API_KEY) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    return callWithRetry(async () => {
        const baseImagePart = { inlineData: parseDataUrl(baseImage) };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [baseImagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        logger?.('Edit text response received.', 'api');
        return processResponse(response);
    }, logger);
}

export const editImageWithRetry = async (
    baseImage: string,
    insertImage: string,
    prompt: string,
    logger?: (message: string, type?: LogEntry['type']) => void
): Promise<GeneratedResult[]> => {
    if (!process.env.API_KEY) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    return callWithRetry(async () => {
        const baseImagePart = { inlineData: parseDataUrl(baseImage) };
        const insertImagePart = { inlineData: parseDataUrl(insertImage) };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [baseImagePart, insertImagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        logger?.('Edit image response received.', 'api');
        return processResponse(response);
    }, logger);
};

export const generateSceneWithMultipleAssets = async (
    baseImage: string,
    assetImages: string[],
    prompt: string,
    logger?: (message: string, type?: LogEntry['type']) => void
): Promise<GeneratedResult[]> => {
    if (!process.env.API_KEY) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    return callWithRetry(async () => {
        const parts = [];

        // Add base image first
        parts.push({ inlineData: parseDataUrl(baseImage) });
        
        // Add all asset images
        for (const asset of assetImages) {
            parts.push({ inlineData: parseDataUrl(asset) });
        }
        
        // Add the guiding text prompt last
        const finalPrompt = `The very first image provided is the main background scene. All subsequent images are reference assets that should be incorporated into the scene. Generate a new image based on the following instruction, making the final composition look natural and coherent. Instruction: "${prompt}"`;
        parts.push({ text: finalPrompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] },
        });
        logger?.('Generate scene response received.', 'api');
        return processResponse(response);
    }, logger);
};

export const generateSceneFromAssets = async (
    assetImages: string[],
    prompt: string,
    logger?: (message: string, type?: LogEntry['type']) => void,
    aspectRatio?: string
): Promise<GeneratedResult[]> => {
    if (!process.env.API_KEY) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    return callWithRetry(async () => {
        const parts = [];
        
        // Add all asset images
        for (const asset of assetImages) {
            parts.push({ inlineData: parseDataUrl(asset) });
        }
        
        // Add the guiding text prompt last
        let finalPrompt = `All images provided are reference assets for characters or objects. Create a new scene based on these assets and the following instruction. Generate a suitable background if not specified. Instruction: "${prompt}"`;
        if (aspectRatio && aspectRatio !== 'freeform') {
            finalPrompt += ` The final image must have a ${aspectRatio} aspect ratio.`;
        }
        parts.push({ text: finalPrompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] },
        });
        logger?.('Generate scene from assets response received.', 'api');
        return processResponse(response);
    }, logger);
};


export const segmentImage = async (
    baseImage: string,
    logger?: (message: string, type?: LogEntry['type']) => void
): Promise<Omit<SegmentationMask, 'color'>[]> => {
    if (!process.env.API_KEY) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    return callWithRetry(async () => {
        const imagePart = { inlineData: parseDataUrl(baseImage) };
        // A more explicit prompt to guide the model and ensure format consistency.
        const textPart = { text: 'Analyze the image and provide segmentation masks for all distinct objects. You MUST output a single JSON object that strictly follows the provided schema. The JSON object must have a root key "objects". This key must contain a list of object entries. Each entry must have a "mask" key (containing the base64 encoded PNG string of the mask) and a "label" key (containing a descriptive name for the object in Russian). Do not add any extra text or explanations outside of the JSON object.' };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                systemInstruction: "You are an expert image analysis tool. Your task is to identify all distinct objects in the provided image and return their segmentation masks.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        objects: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING, description: "A concise, descriptive name for the object in Russian (e.g., 'Сундук', 'Катапульта')." },
                                    mask: { type: Type.STRING, description: "A base64 encoded string of the PNG image mask for the object." }
                                },
                                required: ["label", "mask"]
                            }
                        }
                    },
                    required: ["objects"]
                },
                thinkingConfig: { thinkingBudget: 0 },
            }
        });

        logger?.('Segmentation response received from API.', 'api');
        
        try {
            let jsonString = response.text.trim();
            logger?.(`Raw response text (first 500 chars): ${jsonString.substring(0, 500)}...`, 'api');

            // Robust JSON parsing: find the JSON object within potential markdown fences or other text.
            const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                jsonString = jsonMatch[1];
            } else {
                 const firstBrace = jsonString.indexOf('{');
                 const lastBrace = jsonString.lastIndexOf('}');
                 if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                     jsonString = jsonString.substring(firstBrace, lastBrace + 1);
                 } else {
                     throw new Error("No valid JSON structure found in the model's response.");
                 }
            }

            logger?.(`Cleaned response text for parsing: ${jsonString.substring(0, 500)}...`, 'api');
            const jsonResponse = JSON.parse(jsonString);
            
            if (jsonResponse.objects && Array.isArray(jsonResponse.objects)) {
                return jsonResponse.objects.filter((obj: any) => obj.label && obj.mask);
            }
            throw new Error("Parsed JSON does not contain a valid 'objects' array.");
        } catch (e) {
            logger?.(`Failed to parse segmentation response: ${(e as Error).message}`, 'error');
            console.error("Failed to parse segmentation response:", e, "Raw response:", response.text);
            throw new Error("Could not parse segmentation data from the model.");
        }
    }, logger);
};
