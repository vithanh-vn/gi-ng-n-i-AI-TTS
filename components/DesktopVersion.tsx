import React from 'react';
import { DesktopIcon } from './icons/DesktopIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { CpuIcon } from './icons/CpuIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CodeIcon } from './icons/CodeIcon';

const BenefitCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-start gap-4">
        <div className="flex-shrink-0 text-cyan-400 mt-1">{icon}</div>
        <div>
            <h5 className="font-bold text-gray-200">{title}</h5>
            <p className="text-sm text-gray-400 mt-1">{children}</p>
        </div>
    </div>
);


export const DesktopVersion: React.FC = () => {
    return (
        <div className="space-y-8 text-gray-300">
            <div className="text-center">
                <h3 className="text-2xl font-bold text-cyan-400 flex items-center justify-center gap-3">
                    <DesktopIcon className="w-7 h-7" />
                    Phiên bản Desktop cho Windows
                </h3>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Giải thích đơn giản về cách biến trang web này thành một phần mềm mạnh mẽ trên máy tính của bạn.
                </p>
            </div>
            
            <div className="p-4 bg-gray-900/50 rounded-lg space-y-4 border border-indigo-500/30">
                <h4 className="text-xl font-semibold text-indigo-300 text-center">Tại sao lại cần phiên bản cho máy tính?</h4>
                <p className="text-center text-gray-400">
                    Hãy tưởng tượng trang web này giống như xem phim online, còn phần mềm máy tính là bạn đã tải bộ phim đó về. Phần mềm cài đặt sẽ mạnh hơn rất nhiều!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <BenefitCard icon={<CpuIcon className="w-6 h-6"/>} title="Sức mạnh Tối đa">
                        Phần mềm có thể dùng toàn bộ sức mạnh của máy tính (CPU, card đồ họa GPU) để xử lý AI, giúp nhân bản giọng nói và gỡ băng video nhanh và chất lượng hơn.
                    </BenefitCard>
                     <BenefitCard icon={<SparklesIcon className="w-6 h-6"/>} title="Bảo mật & Riêng tư">
                        Khi xử lý AI trên máy tính của bạn, các tệp âm thanh và video nhạy cảm của bạn không cần phải gửi đi bất cứ đâu, giúp bảo mật thông tin tuyệt đối.
                    </BenefitCard>
                </div>
            </div>

            <div className="p-4 bg-gray-900/50 rounded-lg space-y-6">
                <h4 className="text-xl font-semibold text-indigo-300 text-center">Lộ trình biến ý tưởng thành hiện thực</h4>
                <p className="text-center text-gray-400">
                    Để tạo ra phần mềm này, các nhà phát triển cần thực hiện 2 bước chính:
                </p>

                <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="text-cyan-400 flex-shrink-0">
                        <CodeIcon className="w-12 h-12"/>
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-200">Bước 1: "Đóng gói" trang web</h5>
                        <p className="text-sm text-gray-400 mt-1">
                            Sử dụng một công cụ đặc biệt (tên là Electron) để gói toàn bộ giao diện trang web bạn đang thấy vào một "chiếc hộp". Chiếc hộp này chính là file cài đặt `.exe` mà bạn có thể chạy trực tiếp trên Windows.
                        </p>
                    </div>
                </div>

                 <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="text-cyan-400 flex-shrink-0">
                        <SparklesIcon className="w-12 h-12"/>
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-200">Bước 2: Tạo "Bộ não" AI</h5>
                        <p className="text-sm text-gray-400 mt-1">
                           Giao diện chỉ là vẻ bề ngoài. Để xử lý AI, cần có một "bộ não" riêng, là một chương trình nhỏ chạy ngầm. "Bộ não" này sẽ nhận lệnh từ giao diện và huy động CPU, GPU của bạn để làm việc. Hai phần này sẽ "nói chuyện" với nhau để hoàn thành tác vụ.
                        </p>
                    </div>
                </div>
                
                <p className="text-center text-sm text-gray-500 pt-2">
                    Quá trình này cần các kỹ sư phần mềm để thực hiện và không thể tự động làm từ trang web. Tab này chỉ nhằm mục đích giải thích rõ ràng ý tưởng.
                </p>
            </div>

            <div className="text-center">
                 <button className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold bg-green-700 hover:bg-green-600 rounded-full transition-colors duration-200 shadow-lg shadow-green-500/30 cursor-not-allowed opacity-70" disabled>
                    <DownloadIcon className="w-6 h-6" />
                    Tải về cho Windows (Minh họa)
                </button>
                <p className="text-xs text-gray-500 mt-2">Nút này chỉ mang tính chất minh họa cho sản phẩm cuối cùng sẽ trông như thế nào.</p>
            </div>

        </div>
    );
};