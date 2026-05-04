import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Upload, FileVideo, Image as ImageIcon, Copy, Maximize, Sparkles, FolderOpen, Settings } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navItems = [
    { name: '首页', path: '/', icon: Home },
    { name: '模型配置', path: '/provider-config', icon: Settings },
    { name: '文件上传', path: '/upload', icon: Upload },
    { name: '视频压缩', path: '/video-compress', icon: FileVideo },
    { name: '单图缩放', path: '/image-resize', icon: ImageIcon },
    { name: '批量图像缩放', path: '/batch-image-resize', icon: Copy },
    { name: '视频智能缩放', path: '/video-smart-scale', icon: Maximize },
    { name: 'AI创作中心', path: '/ai-create', icon: Sparkles },
    { name: '结果管理', path: '/results', icon: FolderOpen },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <span className="text-xl font-bold text-primary flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            VideoAI Platform
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
