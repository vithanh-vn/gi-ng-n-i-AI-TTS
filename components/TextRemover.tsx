import React, { useState, useCallback, useEffect, useRef } from 'react';
import { removeTextFromImage } from '../services/ttsService';
import { Loader } from './Loader';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { EraserIcon } from './icons/EraserIcon';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { InfoIcon } from './icons/InfoIcon';
import JSZip from 'jszip';


type Mode = 'image' | 'video';
type OutputFormat = 'jpeg' | 'png' | 'webp';

const ImageTextRemover: React.FC = () => {
    const [inputFile, setInputFile] = useState<File | null>(null);
    const [inputPreview, setInputPreview] = useState<string | null>(null);
    const [outputPreview, setOutputPreview] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('png');
    const [quality, setQuality] = useState(90);

    const resetState = () => {
        setIsLoading(false);
        setError(null);
        setOutputPreview(null);
        setLoadingMessage('');
    };

    const handleFileSelect = (file: File | null) => {
        resetState();
        if (inputPreview) {
            URL.revokeObjectURL(inputPreview);
        }
        
        if (file && file.type.startsWith('image/')) {
            setInputFile(file);
            setInputPreview(URL.createObjectURL(file));
        } else {
            setInputFile(null);
            setInputPreview(null);
            if (file) {
                 setError('Vui lòng chọn một tệp hình ảnh hợp lệ.');
            }
        }
    };
    
    useEffect(() => {
        return () => {
            if (inputPreview) URL.revokeObjectURL(inputPreview);
        };
    }, [inputPreview]);

    const handleProcessImage = async () => {
        if (!inputFile) {
            setError('Vui lòng tải lên một hình ảnh để xử lý.');
            return;
        }
        
        resetState();
        setIsLoading(true);

        try {
            const resultDataUrl = await removeTextFromImage(inputFile, setLoadingMessage);
            setOutputPreview(resultDataUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định khi xử lý hình ảnh.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = () => {
        if (!outputPreview) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0);

            const mimeType = `image/${outputFormat}`;
            const qualityValue = quality / 100;
            const originalName = inputFile?.name.substring(0, inputFile.name.lastIndexOf('.')) || 'processed-image';
            
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${originalName}_no-text.${outputFormat}`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }
                },
                mimeType,
                (outputFormat === 'jpeg' || outputFormat === 'webp') ? qualityValue : undefined
            );
        };
        img.src = outputPreview;
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-indigo-500');
        handleFileSelect(event.dataTransfer.files?.[0] ?? null);
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.currentTarget.classList.add('border-indigo-500');
    };

    const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
        event.currentTarget.classList.remove('border-indigo-500');
    };

    return (
        <div className="space-y-4">
            <label 
                htmlFor="image-text-remover-upload" 
                className="flex flex-col items-center justify-center p-6 min-h-[12rem] bg-gray-800/50 hover:bg-gray-800 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <input id="image-text-remover-upload" type="file" className="sr-only" onChange={e => handleFileSelect(e.target.files?.[0] ?? null)} accept="image/*" />
                <UploadIcon className="w-10 h-10 text-gray-500 mb-3" />
                <p className="font-semibold text-gray-300">Tải lên hoặc kéo và thả hình ảnh</p>
                <p className="text-sm text-gray-500">Kéo và thả hoặc nhấp để chọn</p>
            </label>

            {inputFile && (
                 <button onClick={handleProcessImage} disabled={isLoading} className="w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 rounded-full transition-all duration-200 transform hover:scale-105 disabled:bg-indigo-900/50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg shadow-indigo-500/30">
                    {isLoading ? <><Loader /> <span>{loadingMessage || 'Đang xử lý...'}</span></> : <> <EraserIcon className="w-6 h-6" /> Xóa văn bản</>}
                 </button>
            )}

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            
            {outputPreview && (
                <div className="space-y-4 animate-fade-in">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="text-center font-semibold text-gray-300">Ảnh gốc</h4>
                            <img src={inputPreview ?? ''} alt="Original" className="w-full h-auto rounded-lg object-contain bg-gray-900/50 p-1 border border-gray-700"/>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-center font-semibold text-green-400">Kết quả</h4>
                            <img src={outputPreview} alt="Processed" className="w-full h-auto rounded-lg object-contain bg-gray-900/50 p-1 border border-green-700/50"/>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-900/50 rounded-lg space-y-4 border border-gray-700/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                                <label htmlFor="output-format" className="block text-sm font-medium text-gray-300 mb-2">Định dạng tải về</label>
                                <select id="output-format" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)} className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                    <option value="png">PNG (Chất lượng cao)</option>
                                    <option value="jpeg">JPG (Kích thước nhỏ)</option>
                                    <option value="webp">WEBP (Tối ưu cho web)</option>
                                </select>
                            </div>
                            {(outputFormat === 'jpeg' || outputFormat === 'webp') && (
                                <div>
                                    <label htmlFor="quality" className="block text-sm font-medium text-gray-300 mb-2">Chất lượng: <span className="font-mono text-cyan-400">{quality}%</span></label>
                                    <input id="quality" type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-indigo-500" />
                                </div>
                            )}
                        </div>
                        <button onClick={handleDownload} className="w-full flex items-center justify-center gap-3 px-8 py-3 text-md font-bold bg-green-700 hover:bg-green-600 rounded-lg transition-all duration-200">
                           <DownloadIcon /> Tải về ảnh đã xử lý
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const VideoTextRemover: React.FC = () => {
    type Frame = {
        id: number;
        original: string;
        processed: string | null;
        status: 'pending' | 'processing' | 'done' | 'error';
    };

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [frames, setFrames] = useState<Frame[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const processingStarted = useRef(false);

    const [videoInfo, setVideoInfo] = useState<{ duration: number; totalFrames: number } | null>(null);
    const [numFramesToProcess, setNumFramesToProcess] = useState(30);
    const MAX_FRAMES_ALLOWED = 150;

    const resetState = useCallback(() => {
        setVideoFile(null);
        setFrames([]);
        setIsLoading(false);
        setIsZipping(false);
        setLoadingMessage('');
        setError(null);
        processingStarted.current = false;
        setVideoInfo(null);
        setNumFramesToProcess(30);
    }, []);

    const dataURLtoFile = (dataurl: string, filename: string): File => {
        const arr = dataurl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) throw new Error("Invalid data URL");
        
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const handleStartProcessing = useCallback(async () => {
        if (!videoFile) return;

        setIsLoading(true);
        setLoadingMessage('Bắt đầu quá trình trích xuất...');
        setFrames([]);
        processingStarted.current = true;

        const video = document.createElement('video');
        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;
        video.muted = true;

        try {
            await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => resolve();
                video.onerror = () => reject(new Error("Không thể tải tệp video."));
            });

            const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Không thể tạo canvas context.");

            const duration = video.duration;
            const interval = duration / numFramesToProcess;
            const extractedFrames: Frame[] = [];
            
            for (let i = 0; i < numFramesToProcess; i++) {
                setLoadingMessage(`Đang trích xuất khung hình ${i + 1}/${numFramesToProcess}...`);
                const seekTime = i * interval;
                
                video.currentTime = seekTime;
                await new Promise<void>((resolve, reject) => {
                    const timer = setTimeout(() => reject(new Error("Quá thời gian chờ khi tua video.")), 5000);
                    video.onseeked = () => { clearTimeout(timer); resolve(); };
                });

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                extractedFrames.push({ id: i, original: dataUrl, processed: null, status: 'pending' });
            }
            
            setFrames(extractedFrames);
            
            // Start AI processing after extraction
            const processingPromises = extractedFrames.map(async (frame) => {
                try {
                    setLoadingMessage(`AI đang xử lý khung hình ${frame.id + 1}/${numFramesToProcess}...`);
                    const frameFile = dataURLtoFile(frame.original, `frame-${frame.id}.jpeg`);
                    const resultDataUrl = await removeTextFromImage(frameFile, () => {});
                    setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, status: 'done', processed: resultDataUrl } : f));
                } catch (err) {
                    console.error(`Lỗi xử lý khung hình ${frame.id}:`, err);
                    setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, status: 'error' } : f));
                }
            });
            await Promise.all(processingPromises);


        } catch (err) {
            setError(err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định trong quá trình trích xuất.");
        } finally {
            URL.revokeObjectURL(videoUrl);
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [videoFile, numFramesToProcess]);
    
    const handleDownloadAll = async () => {
        if (!videoFile) return;
        
        const processedFrames = frames.filter(f => f.status === 'done' && f.processed);
        if(processedFrames.length === 0) return;

        setIsZipping(true);
        try {
            const zip = new JSZip();
            
            for (const frame of processedFrames) {
                const response = await fetch(frame.processed!);
                const blob = await response.blob();
                zip.file(`frame_${String(frame.id).padStart(4, '0')}.jpg`, blob);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            const originalName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.'));
            link.href = url;
            link.download = `${originalName}_processed_frames.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError("Lỗi khi tạo tệp .zip. Vui lòng thử lại.");
            console.error("Zipping error:", err);
        } finally {
            setIsZipping(false);
        }
    };
    
    const handleAnalyzeVideo = (file: File) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);
        video.src = url;
        video.onloadedmetadata = () => {
            // Assume 30 FPS if not available, which is a common standard.
            const totalFrames = Math.floor(video.duration * 30);
            setVideoInfo({ duration: video.duration, totalFrames });
            URL.revokeObjectURL(url);
        };
        video.onerror = () => {
            setError("Không thể đọc siêu dữ liệu video.");
            URL.revokeObjectURL(url);
        };
    };

    const handleFileSelect = useCallback((file: File | null) => {
        resetState();
        if (file && file.type.startsWith('video/')) {
            setVideoFile(file);
            handleAnalyzeVideo(file);
        } else if (file) {
            setError('Vui lòng chọn một tệp video hợp lệ.');
        }
    }, [resetState]);

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault(); event.currentTarget.classList.remove('border-indigo-500');
        handleFileSelect(event.dataTransfer.files?.[0] ?? null);
    };
    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault(); event.currentTarget.classList.add('border-indigo-500');
    };
    const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
        event.currentTarget.classList.remove('border-indigo-500');
    };

    const FramePreview: React.FC<{ frame: Frame }> = ({ frame }) => (
        <div className="space-y-2">
            <div className="relative">
                <img src={frame.original} alt="Original Frame" className="w-full h-auto rounded-md object-contain bg-gray-900/50 p-1 border border-gray-700"/>
                {frame.status === 'done' && frame.processed && (
                    <img src={frame.processed} alt="Processed Frame" className="w-full h-auto rounded-md object-contain absolute top-0 left-0" />
                )}
                 {frame.status === 'processing' && <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70"><Loader /></div>}
                 {frame.status === 'error' && <div className="absolute inset-0 flex items-center justify-center bg-red-900/70"><span className="text-xs font-bold text-red-300">LỖI</span></div>}
            </div>
        </div>
    );

    const successfulFramesCount = frames.filter(f => f.status === 'done').length;

    return (
        <div className="space-y-4">
            <label 
                htmlFor="video-text-remover-upload" 
                className="flex flex-col items-center justify-center p-6 min-h-[12rem] bg-gray-800/50 hover:bg-gray-800 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer transition-colors"
                onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            >
                <input id="video-text-remover-upload" type="file" className="sr-only" onChange={e => handleFileSelect(e.target.files?.[0] ?? null)} accept="video/*" />
                <UploadIcon className="w-10 h-10 text-gray-500 mb-3" />
                <p className="font-semibold text-gray-300">Tải lên video để xử lý</p>
                <p className="text-sm text-gray-500">Kéo và thả hoặc nhấp để chọn tệp</p>
            </label>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            
            {videoFile && !processingStarted.current && (
                <div className="p-4 bg-gray-900/50 rounded-lg space-y-4 border border-gray-700/50 animate-fade-in">
                    {videoInfo && (
                        <div className="text-center text-sm text-gray-300">
                           Video của bạn dài <span className="font-bold text-cyan-400">{videoInfo.duration.toFixed(1)}</span> giây và có khoảng <span className="font-bold text-cyan-400">{videoInfo.totalFrames.toLocaleString('vi-VN')}</span> khung hình.
                        </div>
                    )}
                    <div>
                        <label htmlFor="frame-count-slider" className="block text-sm font-medium text-gray-300 mb-2">
                           Chọn số lượng khung hình để xử lý: <span className="font-mono text-cyan-400">{numFramesToProcess}</span>
                        </label>
                        <input
                            id="frame-count-slider"
                            type="range"
                            min="10"
                            max={videoInfo ? Math.min(videoInfo.totalFrames, MAX_FRAMES_ALLOWED) : MAX_FRAMES_ALLOWED}
                            value={numFramesToProcess}
                            onChange={(e) => setNumFramesToProcess(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-indigo-500"
                        />
                    </div>
                     <div className="bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 px-4 py-3 rounded-lg flex items-start gap-3 text-xs">
                        <div className="flex-shrink-0 pt-0.5"><InfoIcon className="w-4 h-4" /></div>
                        <div>
                            <strong>Lưu ý:</strong> Xử lý nhiều khung hình sẽ mất nhiều thời gian và có thể làm chậm trình duyệt của bạn.
                        </div>
                    </div>
                     <button onClick={handleStartProcessing} disabled={isLoading} className="w-full flex items-center justify-center gap-3 px-8 py-3 text-md font-bold bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-200 disabled:opacity-50">
                        {isLoading ? <><Loader /> <span>{loadingMessage}</span></> : `Bắt đầu xử lý ${numFramesToProcess} khung hình`}
                    </button>
                </div>
            )}
            
            {frames.length > 0 && (
                <div className="space-y-4 animate-fade-in">
                    {isLoading && (
                         <div className="flex items-center justify-center gap-3 p-4 bg-gray-800 rounded-lg">
                            <Loader />
                            <p className="text-sm font-medium text-gray-300">{loadingMessage}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {frames.sort((a,b) => a.id - b.id).map(frame => <FramePreview key={frame.id} frame={frame} />)}
                    </div>
                    {successfulFramesCount > 0 && (
                        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                             <button onClick={handleDownloadAll} disabled={isZipping || isLoading} className="w-full flex items-center justify-center gap-3 px-8 py-3 text-md font-bold bg-green-700 hover:bg-green-600 rounded-lg transition-all duration-200 disabled:opacity-50">
                                {isZipping ? <Loader /> : <DownloadIcon />}
                                {isZipping ? 'Đang nén...' : `Tải tất cả ${successfulFramesCount} khung hình (.ZIP)`}
                            </button>
                        </div>
                    )}
                </div>
            )}
            
        </div>
    );
};

export const TextRemover: React.FC = () => {
    const [mode, setMode] = useState<Mode>('image');

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-2xl font-bold text-cyan-400 flex items-center justify-center gap-3">
                    <EraserIcon className="w-7 h-7" />
                    Công cụ Xóa Văn bản AI
                </h3>
                <p className="text-gray-400 mt-2">Tự động xóa văn bản không mong muốn khỏi hình ảnh và video.</p>
            </div>
            <div className="flex justify-center border-b border-gray-700">
                <nav className="-mb-px flex space-x-2 sm:space-x-4">
                    <button 
                        onClick={() => setMode('image')} 
                        className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${mode === 'image' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <ImageIcon /> Hình ảnh
                    </button>
                    <button 
                        onClick={() => setMode('video')} 
                        className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${mode === 'video' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <VideoIcon /> Video
                    </button>
                </nav>
            </div>
            <div>
                {mode === 'image' && <ImageTextRemover />}
                {mode === 'video' && <VideoTextRemover />}
            </div>
        </div>
    );
};