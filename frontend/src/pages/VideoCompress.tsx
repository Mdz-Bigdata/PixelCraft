import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileVideo, Loader2 } from 'lucide-react';

const VideoCompress = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
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
        operation: 'compress',
        params: {
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
        <FileVideo className="w-6 h-6 text-blue-500" />
        视频压缩
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择视频文件</label>
          <select 
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            <option value="">-- 请选择 --</option>
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.original_name}</option>
            ))}
          </select>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          此操作将使用 FFmpeg 的 libx264 编码器对视频进行压缩，目标体积降至约原大小的 50%。如果填写了关键词或需求条件，将根据条件自动将视频压缩并拆分成多个短视频片段（导出为 ZIP 包）。
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">拆分关键词 / 需求条件 (可选)</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-blue-500 h-24 resize-none text-sm"
            placeholder="例如：按人物出现的场景拆分、提取有猫的片段、高光时刻提取..."
            value={splitCondition}
            onChange={(e) => setSplitCondition(e.target.value)}
          ></textarea>
        </div>

        <button
          onClick={handleProcess}
          disabled={!selectedFile || processing}
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {processing && <Loader2 className="w-5 h-5 animate-spin" />}
          {processing ? '压缩中...' : '开始压缩'}
        </button>

        {processing && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">进度</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}
        
        {progress === 100 && !processing && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            视频压缩完成！请前往「结果管理」查看和下载。
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCompress;
