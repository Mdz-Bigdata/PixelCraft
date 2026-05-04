import { Link } from 'react-router-dom';
import { Upload, FileVideo, Image as ImageIcon, Copy, Maximize, Sparkles, FolderOpen } from 'lucide-react';

const Home = () => {
  const features = [
    {
      title: '上传文件',
      desc: '支持视频和图片批量上传，多种预设格式选择',
      icon: Upload,
      path: '/upload',
      color: 'bg-gray-500'
    },
    {
      title: '视频压缩',
      desc: '使用先进编码器减小视频体积',
      icon: FileVideo,
      path: '/video-compress',
      color: 'bg-blue-500'
    },
    {
      title: '单图缩放',
      desc: '调整单张图片的分辨率',
      icon: ImageIcon,
      path: '/image-resize',
      color: 'bg-green-500'
    },
    {
      title: '批量图像缩放',
      desc: '一次性处理多张图片的尺寸缩放',
      icon: Copy,
      path: '/batch-image-resize',
      color: 'bg-teal-500'
    },
    {
      title: '视频智能缩放',
      desc: '根据视频主体自动裁剪适应各种比例',
      icon: Maximize,
      path: '/video-smart-scale',
      color: 'bg-indigo-500'
    },
    {
      title: 'AI创作中心',
      desc: '长视频抽帧打标、向量检索及AI视频二创',
      icon: Sparkles,
      path: '/ai-create',
      color: 'bg-purple-500'
    },
    {
      title: '结果管理',
      desc: '查看历史记录，下载处理结果',
      icon: FolderOpen,
      path: '/results',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          全链路视频与图像智能处理平台
        </h1>
        <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
          提供从原始素材到成品视频的一站式处理解决方案，包含基础处理与高级AI创作能力。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Link 
              key={f.path} 
              to={f.path}
              className="group relative bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 ${f.color}`}></div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${f.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Home;
