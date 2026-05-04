import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Copy, Loader2 } from 'lucide-react';

const BatchImageResize = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [width, setWidth] = useState('1280');
  const [height, setHeight] = useState('720');
  const [processing, setProcessing] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    axios.get('http://localhost:3000/api/upload/files').then(res => {
      setFiles(res.data.filter((f: any) => f.file_type === 'image'));
    });
  }, []);

  const toggleSelect = (id: string) => {
    if (selectedFiles.includes(id)) {
      setSelectedFiles(selectedFiles.filter(fid => fid !== id));
    } else {
      setSelectedFiles([...selectedFiles, id]);
    }
  };

  const selectAll = () => {
    setSelectedFiles(files.map(f => f.id));
  };

  const deselectAll = () => {
    setSelectedFiles([]);
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;
    setProcessing(true);
    setCompletedCount(0);
    try {
      const res = await axios.post('http://localhost:3000/api/process/image', {
        uploadIds: selectedFiles,
        operation: 'batch-resize',
        params: { width, height }
      });
      pollTasks(res.data.taskIds);
    } catch (e) {
      console.error(e);
      setProcessing(false);
    }
  };

  const pollTasks = (ids: string[]) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/process/tasks');
        const tasks = res.data.filter((t: any) => ids.includes(t.id));
        
        const done = tasks.filter((t: any) => t.status === 'completed' || t.status === 'failed').length;
        setCompletedCount(done);

        if (done === ids.length) {
          clearInterval(interval);
          setProcessing(false);
        }
      } catch (e) {
        clearInterval(interval);
        setProcessing(false);
      }
    }, 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Copy className="w-6 h-6 text-teal-500" />
        批量图像缩放
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">选择多张图片</label>
            <div className="space-x-2 text-sm">
              <button onClick={selectAll} className="text-teal-600 hover:underline">全选</button>
              <button onClick={deselectAll} className="text-gray-500 hover:underline">取消</button>
            </div>
          </div>
          <div className="border border-gray-300 rounded-lg p-2 h-64 overflow-y-auto space-y-1">
            {files.length === 0 ? (
              <p className="text-gray-400 text-center py-4">暂无图片素材</p>
            ) : (
              files.map(f => (
                <div 
                  key={f.id}
                  onClick={() => toggleSelect(f.id)}
                  className={`p-2 rounded cursor-pointer text-sm ${selectedFiles.includes(f.id) ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'hover:bg-gray-50 border border-transparent'}`}
                >
                  <input type="checkbox" checked={selectedFiles.includes(f.id)} readOnly className="mr-2" />
                  {f.original_name}
                </div>
              ))
            )}
          </div>
          <div className="mt-2 text-sm text-gray-500">已选择 {selectedFiles.length} 张图片</div>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">目标宽度 (px)</label>
              <input 
                type="number" 
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-teal-500"
                value={width}
                onChange={e => setWidth(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">目标高度 (px)</label>
              <input 
                type="number" 
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-teal-500"
                value={height}
                onChange={e => setHeight(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={handleProcess}
            disabled={selectedFiles.length === 0 || processing}
            className="w-full bg-teal-500 text-white py-3 rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {processing && <Loader2 className="w-5 h-5 animate-spin" />}
            {processing ? '批量处理中...' : '开始批量缩放'}
          </button>

          {processing && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">整体进度</span>
                <span className="font-medium">{completedCount} / {selectedFiles.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-teal-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(completedCount / selectedFiles.length) * 100}%` }}></div>
              </div>
            </div>
          )}
          
          {completedCount === selectedFiles.length && selectedFiles.length > 0 && !processing && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              批量缩放任务全部完成！请前往「结果管理」查看。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchImageResize;
