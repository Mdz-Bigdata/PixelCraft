import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Maximize, Loader2 } from 'lucide-react';

const VideoSmartScale = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [splitCondition, setSplitCondition] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    axios.get('http://localhost:3000/api/upload/files').then(res => {
      setFiles(res.data.filter((f: any) => f.file_type === 'video'));
    });
  }, []);

  const handleProcess = async () => {
    if (!selectedFile) return;
    setProcessing(true);
    setProgress(0);
    try {
      const res = await axios.post('http://localhost:3000/api/process/video', {
        uploadId: selectedFile,
        operation: 'smart-scale',
        params: { 
          aspectRatio,
          splitCondition: splitCondition.trim()
        }
      });
      pollTask(res.data.taskId);
    } catch (e) {
      console.error(e);
      setProcessing(false);
    }
  };

  const pollTask = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/process/tasks');
        const task = res.data.find((t: any) => t.id === id);
        if (task) {
          setProgress(task.progress);
          if (task.status === 'completed' || task.status === 'failed') {
            clearInterval(interval);
            setProcessing(false);
          }
        }
      } catch (e) {
        clearInterval(interval);
        setProcessing(false);
      }
    }, 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Maximize className="w-6 h-6 text-indigo-500" />
        视频智能缩放
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择视频文件</label>
          <select 
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            <option value="">-- 请选择 --</option>
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.original_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">拆分条件 / 关键词 (选填)</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
            rows={2}
            placeholder="例如：精彩镜头、人物特写等。将根据条件拆分为多个短视频片段..."
            value={splitCondition}
            onChange={(e) => setSplitCondition(e.target.value)}
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">目标比例</label>
          <select 
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
          >
            <option value="16:9">横屏 (16:9) - 适合西瓜视频、B站等</option>
            <option value="9:16">竖屏 (9:16) - 适合抖音、快手等</option>
            <option value="1:1">正方形 (1:1) - 适合朋友圈等</option>
            <option value="4:3">标准 (4:3)</option>
          </select>
        </div>

        <div className="p-4 bg-indigo-50 rounded-lg text-sm text-indigo-800">
          智能缩放会根据内容显著区域自动裁剪和填充，以适配您选择的目标比例。支持多片段拆分。
        </div>

        <button
          onClick={handleProcess}
          disabled={!selectedFile || processing}
          className="w-full bg-indigo-500 text-white py-3 rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {processing && <Loader2 className="w-5 h-5 animate-spin" />}
          {processing ? '智能处理中...' : '开始智能缩放'}
        </button>

        {processing && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">进度</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}
        
        {progress === 100 && !processing && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            视频智能缩放完成！请前往「结果管理」查看和下载。
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoSmartScale;
