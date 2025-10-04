import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { InfoIcon } from './icons/InfoIcon';

export const ApiKeyManager: React.FC = () => {
    const [googleKey, setGoogleKey] = useState('');
    const [fptKey, setFptKey] = useState('');
    const [microsoftKey, setMicrosoftKey] = useState('');
    const [microsoftRegion, setMicrosoftRegion] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    useEffect(() => {
        const storedGoogleKey = localStorage.getItem('GOOGLE_API_KEY');
        if (storedGoogleKey) setGoogleKey(storedGoogleKey);
        
        const storedFptKey = localStorage.getItem('FPT_API_KEY');
        if (storedFptKey) setFptKey(storedFptKey);

        const storedMicrosoftKey = localStorage.getItem('MICROSOFT_API_KEY');
        if (storedMicrosoftKey) setMicrosoftKey(storedMicrosoftKey);

        const storedMicrosoftRegion = localStorage.getItem('MICROSOFT_API_REGION');
        if (storedMicrosoftRegion) setMicrosoftRegion(storedMicrosoftRegion);

    }, []);

    const handleSave = () => {
        localStorage.setItem('GOOGLE_API_KEY', googleKey);
        localStorage.setItem('FPT_API_KEY', fptKey);
        localStorage.setItem('MICROSOFT_API_KEY', microsoftKey);
        localStorage.setItem('MICROSOFT_API_REGION', microsoftRegion);
        setFeedbackMessage('Đã lưu khóa API thành công!');
        setTimeout(() => setFeedbackMessage(null), 3000);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-2xl font-bold text-cyan-400 flex items-center justify-center gap-3">
                    <KeyIcon className="w-7 h-7" />
                    Quản lý Khóa API
                </h3>
                <p className="text-gray-400 mt-2">Nhập khóa API của bạn để kích hoạt các tính năng giọng nói nâng cao.</p>
            </div>

            <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                 <div>
                    <label htmlFor="microsoft-key" className="block text-sm font-medium text-gray-300 mb-2">
                        Khóa API Microsoft Azure
                    </label>
                    <input
                        id="microsoft-key"
                        type="password"
                        value={microsoftKey}
                        onChange={(e) => setMicrosoftKey(e.target.value)}
                        placeholder="Nhập khóa Azure Speech của bạn..."
                        className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                     <p className="text-xs text-gray-500 mt-1">
                        Dùng cho giọng đọc chất lượng cao của Microsoft (Hoài My, Nam Minh).
                        <a href="https://azure.microsoft.com/en-us/products/ai-services/speech-to-text" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline ml-1">
                            Lấy khóa ở đây.
                        </a>
                    </p>
                </div>
                 <div>
                    <label htmlFor="microsoft-region" className="block text-sm font-medium text-gray-300 mb-2">
                        Khu vực (Region) Microsoft Azure
                    </label>
                    <input
                        id="microsoft-region"
                        type="text"
                        value={microsoftRegion}
                        onChange={(e) => setMicrosoftRegion(e.target.value)}
                        placeholder="Ví dụ: eastus, southeastasia..."
                        className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                     <p className="text-xs text-gray-500 mt-1">
                        Nhập mã khu vực nơi bạn đã tạo dịch vụ Speech. Đây là thông tin bắt buộc.
                    </p>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-700/50">
                    <label htmlFor="google-key" className="block text-sm font-medium text-gray-300 mb-2">
                        Khóa API Google Cloud
                    </label>
                    <input
                        id="google-key"
                        type="password"
                        value={googleKey}
                        onChange={(e) => setGoogleKey(e.target.value)}
                        placeholder="Nhập khóa Google Cloud của bạn..."
                        className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                     <p className="text-xs text-gray-500 mt-1">
                        Dùng cho giọng đọc Tiếng Việt chất lượng cao của Google.
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline ml-1">
                            Lấy khóa ở đây.
                        </a>
                    </p>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-700/50">
                    <label htmlFor="fpt-key" className="block text-sm font-medium text-gray-300 mb-2">
                        Khóa API FPT.AI
                    </label>
                    <input
                        id="fpt-key"
                        type="password"
                        value={fptKey}
                        onChange={(e) => setFptKey(e.target.value)}
                        placeholder="Nhập khóa FPT.AI của bạn..."
                        className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                     <p className="text-xs text-gray-500 mt-1">
                        Dùng cho giọng đọc Tiếng Việt chất lượng cao của FPT.
                        <a href="https://console.fpt.ai/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline ml-1">
                            Lấy khóa ở đây.
                        </a>
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-3 px-8 py-3 text-md font-bold bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-200"
                >
                    Lưu tất cả các khóa
                </button>

                {feedbackMessage && <p className="text-sm text-green-400 text-center">{feedbackMessage}</p>}
            </div>

            <div className="bg-gray-800/50 border border-gray-700 text-gray-400 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 pt-0.5">
                    <InfoIcon className="w-5 h-5" />
                </div>
                <div>
                    <strong>Bảo mật:</strong> Khóa API của bạn được lưu trữ an toàn ngay trong trình duyệt của bạn (sử dụng <code>localStorage</code>) và không bao giờ được gửi đến máy chủ của chúng tôi. Chúng chỉ được sử dụng để giao tiếp trực tiếp với các nhà cung cấp AI.
                </div>
            </div>
        </div>
    );
};
