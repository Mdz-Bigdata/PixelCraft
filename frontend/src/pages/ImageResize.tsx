import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

const ImageResize = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [width, setWidth] = useState('1280');
  const [height, setHeight] = useState('720');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    axios.get('http://localhost:3000/api/upload/files').then(res => {
      // Allow both images and videos
      setFiles(res.data.filter((f: any) => f.file_type === 'image' || f.file_type === 'video'));
    });
  }, []);

  const handleProcess = async () => {
    if (!selectedFile) return;
    setProcessing(true);
    setProgress(0);
    try {
      const fileInfo = files.find(f => f.id === selectedFile);
      const isVideo = fileInfo?.file_type === 'video';

      let endpoint = 'http://localhost:3000/api/process/image';
      let payload: any = {
        uploadIds: [selectedFile],
        operation: 'resize',
        params: { width, height }
      };

      if (isVideo) {
        endpoint = 'http://localhost:3000/api/process/video';
        payload = {
          uploadId: selectedFile,
          operation: 'extract_frames',
          params: {}
        };
      }

      const res = await axios.post(endpoint, payload);
      pollTask(isVideo ? res.data.taskId : res.data.taskIds[0]);
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

  const selectedFileInfo = files.find(f => f.id === selectedFile);
  const isVideo = selectedFileInfo?.file_type === 'video';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <ImageIcon className="w-6 h-6 text-green-500" />
        单图缩放 / 视频抽帧
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择文件 (支持图片或视频)</label>
          <select 
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            <option value="">-- 请选择 --</option>
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.original_name}</option>
            ))}
          </select>
        </div>

        {!isVideo && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">目标宽度 (px)</label>
              <input 
                type="number" 
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500"
                value={width}
                onChange={e => setWidth(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">目标高度 (px)</label>
              <input 
                type="number" 
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-green-500"
                value={height}
                onChange={e => setHeight(e.target.value)}
              />
            </div>
          </div>
        )}

        {isVideo && (
          <div className="p-4 bg-green-50 rounded-lg text-sm text-green-800">
            您选择了视频文件。此操作将把视频短片段压缩并提取为一帧一帧的图片。
          </div>
        )}

        <button
          onClick={handleProcess}
          disabled={!selectedFile || processing}
          className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {processing && <Loader2 className="w-5 h-5 animate-spin" />}
          {processing ? '处理中...' : (isVideo ? '开始抽帧' : '开始缩放')}
        </button>

        {processing && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">进度</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}
        
        {progress === 100 && !processing && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            处理完成！请前往「结果管理」查看和下载。
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageResize;
