import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FolderOpen, Download, Clock, X } from 'lucide-react';

const Results = () => {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/process/tasks');
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = (taskId: string) => {
    window.open(`http://localhost:3000/api/process/download/${taskId}`, '_blank');
  };

  const handleDelete = async (taskId: string) => {
    try {
      await axios.delete(`http://localhost:3000/api/process/tasks/${taskId}`);
      fetchTasks();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <FolderOpen className="w-6 h-6 text-orange-500" />
        处理结果与历史
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-sm text-gray-500">
              <th className="pb-3 font-medium">任务ID</th>
              <th className="pb-3 font-medium">类型</th>
              <th className="pb-3 font-medium">状态</th>
              <th className="pb-3 font-medium">时间</th>
              <th className="pb-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">暂无处理记录</td>
              </tr>
            ) : (
              tasks.map(t => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-4 font-mono text-xs text-gray-600">{t.id.slice(0, 8)}...</td>
                  <td className="py-4">
                    <span className="px-2.5 py-1 bg-gray-100 rounded-md text-gray-700 text-xs">
                      {t.task_type}
                    </span>
                  </td>
                  <td className="py-4">
                    {t.status === 'completed' ? (
                      <span className="text-green-600 font-medium">已完成</span>
                    ) : t.status === 'processing' ? (
                      <span className="text-blue-600 font-medium">{t.progress}%</span>
                    ) : (
                      <span className="text-red-600 font-medium">失败</span>
                    )}
                  </td>
                  <td className="py-4 text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {t.status === 'completed' && (
                        <button 
                          onClick={() => handleDownload(t.id)}
                          className="text-primary hover:text-primary/80 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" /> 下载
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="删除记录"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Results;
