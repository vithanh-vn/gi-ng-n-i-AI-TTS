import React, { useState, useEffect, useCallback } from 'react';
import { getConversionGuide } from '../services/ttsService';

import { Loader } from './Loader';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { TextIcon } from './icons/TextIcon'; // Re-using for documents

type ConversionMode = 'image' | 'video' | 'document';
type OutputFormat = 'jpeg' | 'png' | 'webp';

interface ConversionResult {
  id: number;
  name: string;
  url: string | null;
  error: string | null;
}

// --- Sub-component: Batch Image Converter ---
const BatchImageConverter: React.FC = () => {
    const [inputFiles, setInputFiles] = useState<File[]>([]);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg');
    const [quality, setQuality] = useState(80);
    const [isConverting, setIsConverting] = useState(false);
    const [conversionResults, setConversionResults] = useState<ConversionResult[]>([]);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const handleFileSelect = (files: FileList | null) => {
        setGlobalError(null);
        setConversionResults([]);
        setSelectedIds(new Set());
        if (files) {
            const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
            if (imageFiles.length !== files.length) {
                setGlobalError('Một số tệp không phải là hình ảnh và đã bị bỏ qua.');
            }
            setInputFiles(imageFiles);
        }
    };
    
    useEffect(() => {
        // Cleanup object URLs on unmount or when results change
        return () => {
            conversionResults.forEach(result => {
                if (result.url) URL.revokeObjectURL(result.url);
            });
        };
    }, [conversionResults]);
    
    const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allSuccessfulIds = new Set(conversionResults.filter(r => r.url).map(r => r.id));
            setSelectedIds(allSuccessfulIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleToggleSelectOne = (id: number) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
        } else {
            newSelectedIds.add(id);
        }
        setSelectedIds(newSelectedIds);
    };

    const handleDownloadSelected = () => {
        selectedIds.forEach(id => {
            const result = conversionResults.find(r => r.id === id);
            if (result?.url) {
                const link = document.createElement('a');
                link.href = result.url;
                link.download = result.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    };

    const convertFile = (file: File, id: number): Promise<ConversionResult> => {
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve({ id, name: file.name, url: null, error: 'Không thể xử lý canvas.' });
                    return;
                }
                ctx.drawImage(img, 0, 0);

                const mimeType = `image/${outputFormat}`;
                const qualityValue = quality / 100;
                
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const originalName = file.name.substring(0, file.name.lastIndexOf('.'));
                            resolve({
                                id,
                                name: `${originalName}.${outputFormat}`,
                                url: URL.createObjectURL(blob),
                                error: null,
                            });
                        } else {
                             resolve({ id, name: file.name, url: null, error: 'Lỗi tạo blob.' });
                        }
                    },
                    mimeType,
                    (outputFormat === 'jpeg' || outputFormat === 'webp') ? qualityValue : undefined
                );
            };
            img.onerror = () => {
                resolve({ id, name: file.name, url: null, error: 'Không thể tải hình ảnh.' });
            };
            
            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };
            reader.onerror = () => {
                resolve({ id, name: file.name, url: null, error: 'Lỗi đọc tệp.' });
            };
            reader.readAsDataURL(file);
        });
    };

    const handleConvertAll = async () => {
        if (inputFiles.length === 0) return;

        setIsConverting(true);
        setConversionResults([]);
        setSelectedIds(new Set());
        
        const promises = inputFiles.map((file, index) => convertFile(file, index));
        const results = await Promise.all(promises);

        setConversionResults(results);
        setIsConverting(false);
    };
    
    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-indigo-500');
        handleFileSelect(event.dataTransfer.files);
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.currentTarget.classList.add('border-indigo-500');
    };

    const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
        event.currentTarget.classList.remove('border-indigo-500');
    };

    const successfulResults = conversionResults.filter(r => r.url);

    return (
      <div className="space-y-4">
        <label 
            htmlFor="batch-image-upload" 
            className="flex flex-col items-center justify-center p-6 h-48 bg-gray-800/50 hover:bg-gray-800 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <input id="batch-image-upload" type="file" multiple className="sr-only" onChange={e => handleFileSelect(e.target.files)} accept="image/*" />
            <UploadIcon className="w-10 h-10 text-gray-500 mb-3" />
            {inputFiles.length > 0 ? (
                <p className="font-semibold text-green-400">Đã chọn {inputFiles.length} tệp</p>
            ) : (
                <>
                    <p className="font-semibold text-gray-300">Tải lên nhiều hình ảnh</p>
                    <p className="text-sm text-gray-500">Kéo và thả hoặc nhấp để chọn</p>
                </>
            )}
        </label>
        
        {globalError && <p className="text-sm text-red-400 text-center">{globalError}</p>}
        
        {inputFiles.length > 0 && (
            <div className="p-4 bg-gray-900/50 rounded-lg space-y-4 border border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label htmlFor="output-format-batch" className="block text-sm font-medium text-gray-300 mb-2">Chuyển đổi sang</label>
                        <select id="output-format-batch" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)} className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500">
                            <option value="jpeg">JPG</option>
                            <option value="png">PNG</option>
                            <option value="webp">WEBP</option>
                        </select>
                    </div>
                     {(outputFormat === 'jpeg' || outputFormat === 'webp') &&
                        <div>
                            <label htmlFor="quality-batch" className="block text-sm font-medium text-gray-300 mb-2">Chất lượng: <span className="font-mono text-cyan-400">{quality}%</span></label>
                            <input id="quality-batch" type="range" min="1" max="100" value={quality} onChange={(e) => setQuality(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-indigo-500" />
                        </div>
                    }
                </div>
                 <button onClick={handleConvertAll} disabled={isConverting} className="w-full flex items-center justify-center gap-3 px-8 py-3 text-md font-bold bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-all duration-200 disabled:bg-cyan-900/50 disabled:cursor-not-allowed">
                    {isConverting ? <Loader /> : null}
                    {isConverting ? `Đang chuyển đổi (${conversionResults.length}/${inputFiles.length})...` : `Chuyển đổi ${inputFiles.length} tệp`}
                </button>
            </div>
        )}

        {conversionResults.length > 0 && (
            <div className="space-y-3">
                <h4 className="text-lg font-semibold text-center text-gray-200">Kết quả chuyển đổi</h4>
                
                {successfulResults.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-3">
                            <input
                                id="select-all-checkbox"
                                type="checkbox"
                                className="w-5 h-5 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-2 focus:ring-offset-0 focus:ring-offset-gray-900 focus:ring-indigo-500"
                                checked={selectedIds.size === successfulResults.length && successfulResults.length > 0}
                                onChange={handleToggleSelectAll}
                            />
                            <label htmlFor="select-all-checkbox" className="text-sm font-medium text-gray-300">Đánh dấu tất cả</label>
                        </div>
                        <button
                            onClick={handleDownloadSelected}
                            disabled={selectedIds.size === 0}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Tải về ({selectedIds.size}) mục đã chọn
                        </button>
                    </div>
                )}
                
                {conversionResults.map(result => (
                    <div key={result.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3 flex-grow min-w-0">
                            {result.url && (
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-2 focus:ring-offset-0 focus:ring-offset-gray-800 focus:ring-indigo-500 flex-shrink-0"
                                    checked={selectedIds.has(result.id)}
                                    onChange={() => handleToggleSelectOne(result.id)}
                                />
                            )}
                            <p className="text-sm text-gray-300 truncate" title={result.name}>{result.name}</p>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                            {result.url && (
                                <a href={result.url} download={result.name} className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm font-medium rounded-md transition-colors">
                                    <DownloadIcon className="w-4 h-4" />
                                </a>
                            )}
                            {result.error && <p className="text-sm text-red-400">{result.error}</p>}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    );
};


// --- Sub-component: AI Conversion Advisor ---
const ConversionAdvisor: React.FC<{ type: 'Video' | 'Tài liệu' }> = ({ type }) => {
    const formats = {
        'Video': ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'],
        'Tài liệu': ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'html', 'epub']
    };
    
    const [fromFormat, setFromFormat] = useState(formats[type][0]);
    const [toFormat, setToFormat] = useState(formats[type][1]);
    const [isLoading, setIsLoading] = useState(false);
    const [guide, setGuide] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleGetGuide = async () => {
        if (fromFormat === toFormat) {
            setError('Định dạng đầu vào và đầu ra phải khác nhau.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGuide('');
        try {
            const result = await getConversionGuide(fromFormat, toFormat);
            setGuide(result);
        } catch(err) {
            setError(err instanceof Error ? err.message : 'Không thể lấy hướng dẫn từ AI.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-4">
             <div className="p-4 bg-gray-900/50 rounded-lg space-y-4 border border-gray-700/50 text-center">
                 <p className="text-gray-400 text-sm">
                    Việc chuyển đổi {type.toLowerCase()} là một quá trình phức tạp cần tài nguyên máy chủ.
                    Trợ lý AI sẽ cung cấp cho bạn hướng dẫn và đề xuất các công cụ miễn phí, an toàn để thực hiện việc này.
                </p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Chuyển đổi từ</label>
                         <select value={fromFormat} onChange={e => setFromFormat(e.target.value)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500">
                             {formats[type].map(f => <option key={f} value={f}>.{f.toUpperCase()}</option>)}
                         </select>
                     </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Sang định dạng</label>
                         <select value={toFormat} onChange={e => setToFormat(e.target.value)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500">
                             {formats[type].map(f => <option key={f} value={f}>.{f.toUpperCase()}</option>)}
                         </select>
                     </div>
                 </div>
                 <button onClick={handleGetGuide} disabled={isLoading} className="w-full flex items-center justify-center gap-3 px-8 py-3 text-md font-bold bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-all duration-200 disabled:bg-cyan-900/50 disabled:cursor-not-allowed">
                    {isLoading ? <><Loader /> <span>Đang lấy hướng dẫn...</span></> : 'Nhận hướng dẫn từ AI'}
                 </button>
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            
            {guide && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 prose prose-invert prose-sm max-w-none prose-p:text-gray-300 prose-h3:text-cyan-400" dangerouslySetInnerHTML={{ __html: guide.replace(/\n/g, '<br />') }} />
            )}
        </div>
    );
};

// --- Main Component: File Converter ---
export const FileConverter: React.FC = () => {
    const [mode, setMode] = useState<ConversionMode>('image');
    
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-2xl font-bold text-cyan-400">Công cụ Chuyển đổi</h3>
                <p className="text-gray-400 mt-2">Công cụ mạnh mẽ để chuyển đổi hình ảnh, video và tài liệu.</p>
            </div>

            <div className="flex justify-center border-b border-gray-700">
                <nav className="-mb-px flex space-x-2 sm:space-x-4">
                    <button onClick={() => setMode('image')} className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${mode === 'image' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
                        <ImageIcon /> Hình ảnh
                    </button>
                     <button onClick={() => setMode('video')} className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${mode === 'video' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
                        <VideoIcon /> Video
                    </button>
                     <button onClick={() => setMode('document')} className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${mode === 'document' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
                        <TextIcon /> Tài liệu
                    </button>
                </nav>
            </div>

            <div>
                {mode === 'image' && <BatchImageConverter />}
                {mode === 'video' && <ConversionAdvisor type="Video" />}
                {mode === 'document' && <ConversionAdvisor type="Tài liệu" />}
            </div>
        </div>
    );
};