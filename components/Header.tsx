import React from 'react';
import { RobotIcon } from './icons/RobotIcon';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="flex justify-center items-center gap-4">
        <RobotIcon className="w-12 h-12 text-indigo-400" />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
          Trình tạo giọng nói AI
        </h1>
      </div>
      <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
        Chuyển đổi văn bản và tệp phụ đề thành giọng nói tự nhiên. Chọn ngôn ngữ và giọng đọc để bắt đầu.
      </p>
    </header>
  );
};