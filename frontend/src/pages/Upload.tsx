import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const Upload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgress(0);
    setStatus('idle');

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      await axios.post('http://localhost:3000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            setProgress(Math.round((e.loaded * 100) / e.total));
          }
        }
      });
      setStatus('success');
      setFiles([]);
    } catch (err) {
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">上传文件</h2>
      
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer relative">
        <input 
          type="file" 
          multiple 
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="video/*,image/*"
        />
        <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg text-gray-700 font-medium">点击或拖拽文件到此处</p>
        <p className="text-sm text-gray-500 mt-2">支持视频(MP4, AVI)和图片(JPG, PNG)批量上传</p>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">待上传 ({files.length})</h4>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <span className="truncate max-w-[80%]">{f.name}</span>
                <span className="text-gray-500">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploading && (
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-1">
            <span>上传中...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          文件上传成功！请前往处理工作台或AI创作中心进行下一步操作。
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          文件上传失败，请重试。
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          开始上传
        </button>
      </div>
    </div>
  );
};

export default Upload;
