import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Sparkles, Search, Video, Loader2, Image as ImageIcon } from 'lucide-react';

const AiCreate = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedFrames, setExtractedFrames] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  
  const [tagSequence, setTagSequence] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);

  // Global Models
  const [globalModels, setGlobalModels] = useState<any>({ text: [], image: [], video: [], audio: [] });
  const [selectedTextModel, setSelectedTextModel] = useState('');
  const [selectedVideoModel, setSelectedVideoModel] = useState('');
  const [selectedAudioModel, setSelectedAudioModel] = useState('');

  useEffect(() => {
    axios.get('http://localhost:3000/api/upload/files').then(res => {
      setFiles(res.data.filter((f: any) => f.file_type === 'video'));
    });
    axios.get('http://localhost:3000/api/providers').then(providersRes => {
      const providers = providersRes.data;
      const defaultVideoProvider = providers.find((p: any) => p.id === 'video' && p.enabled === 1);
      const defaultTextProvider = providers.find((p: any) => p.id === 'text' && p.enabled === 1);
      const defaultAudioProvider = providers.find((p: any) => p.id === 'audio' && p.enabled === 1);
      
      axios.get('http://localhost:3000/api/providers/models').then(res => {
        setGlobalModels(res.data);
        
        // Auto-select model from global config if set
        if (defaultTextProvider && defaultTextProvider.selected_model) {
          setSelectedTextModel(defaultTextProvider.selected_model);
        } else if (res.data.text?.length > 0) {
          setSelectedTextModel(res.data.text[0].id);
        }

        if (defaultVideoProvider && defaultVideoProvider.selected_model) {
          setSelectedVideoModel(defaultVideoProvider.selected_model);
        } else if (res.data.video?.length > 0) {
          setSelectedVideoModel(res.data.video[0].id);
        }

        if (defaultAudioProvider && defaultAudioProvider.selected_model) {
          setSelectedAudioModel(defaultAudioProvider.selected_model);
        } else if (res.data.audio?.length > 0) {
          setSelectedAudioModel(res.data.audio[0].id);
        }
      });
    });
  }, []);

  const handleExtract = async () => {
    if (!selectedVideo) return;
    setExtracting(true);
    try {
      const res = await axios.post('http://localhost:3000/api/ai/extract-frames', {
        videoId: selectedVideo,
        frameRate: 1
      });
      setExtractedFrames(res.data.frames);
      setTags(res.data.tags);
    } catch (e) {
      console.error(e);
    } finally {
      setExtracting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await axios.post('http://localhost:3000/api/ai/vector-search', { query: searchQuery });
      setSearchResults(res.data.results);
      // Auto select top 3 results for convenience
      setSelectedResults(res.data.results.slice(0, 3).map((r: any) => r.id));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleResultSelect = (id: string) => {
    if (selectedResults.includes(id)) {
      setSelectedResults(selectedResults.filter(rid => rid !== id));
    } else {
      setSelectedResults([...selectedResults, id]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt || selectedResults.length === 0) return;
    setGenerating(true);
    setGeneratedVideo(null);
    try {
      const res = await axios.post('http://localhost:3000/api/ai/generate-video', {
        referenceFrames: selectedResults,
        prompt,
        tagSequence,
        model: globalModels.video?.find((m: any) => m.id === selectedVideoModel)?.model_name || '默认引擎',
        textModel: globalModels.text?.find((m: any) => m.id === selectedTextModel)?.model_name || '',
        audioModel: globalModels.audio?.find((m: any) => m.id === selectedAudioModel)?.model_name || ''
      });
      
      // Mock polling for demo
      setTimeout(() => {
        setGenerating(false);
        setGeneratedVideo(res.data.taskId);
      }, 4000);
      
    } catch (e) {
      console.error(e);
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-purple-500" />
        AI 二次创作中心
      </h2>

      {/* Step 1: Extract Frames */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold mb-4">1. 长视频抽帧压缩与智能打标</h3>
        <div className="flex gap-4">
          <select 
            className="flex-1 border border-gray-300 rounded-lg p-2 outline-none focus:border-purple-500"
            value={selectedVideo}
            onChange={e => setSelectedVideo(e.target.value)}
          >
            <option value="">-- 选择长视频素材 --</option>
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.original_name}</option>
            ))}
          </select>
          <button 
            onClick={handleExtract}
            disabled={!selectedVideo || extracting}
            className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            开始抽帧打标
          </button>
        </div>
        
        {tags.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">已从视频中抽帧并识别出以下标签特征:</p>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <span key={t} className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Vector Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold mb-4">2. 向量化多模态检索查询</h3>
        <div className="flex gap-4">
          <input 
            type="text"
            placeholder="输入画面内容描述或特征标签..."
            className="flex-1 border border-gray-300 rounded-lg p-2 outline-none focus:border-purple-500"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={handleSearch}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            向量检索
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-3">检索结果 (包含图片及视频素材)，请勾选作为二创的参考源：</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map((r, i) => (
                <div 
                  key={i} 
                  onClick={() => toggleResultSelect(r.id)}
                  className={`aspect-square rounded-lg border-2 relative overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-colors ${selectedResults.includes(r.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:border-purple-300'}`}
                >
                  <div className="absolute top-2 right-2 flex gap-1">
                    {r.type === 'video' ? <Video className="w-4 h-4 text-gray-500" /> : <ImageIcon className="w-4 h-4 text-gray-500" />}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{r.type === 'video' ? '视频' : '图片'}片段 {i+1}</span>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 text-xs text-white truncate text-center">
                    {r.tag} ({(r.similarity * 100).toFixed(1)}%)
                  </div>
                  {selectedResults.includes(r.id) && (
                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-1 shadow-sm">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 3: AI Generation */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold mb-4">3. 二次加工与生成新视频</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择文本提示模型</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-purple-500"
                value={selectedTextModel}
                onChange={e => setSelectedTextModel(e.target.value)}
              >
                <option value="">-- 使用系统默认 --</option>
                {globalModels.text?.map((m: any) => (
                  <option key={m.id} value={m.id}>[{m.provider_name}] {m.model_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择视频生成模型</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-purple-500"
                value={selectedVideoModel}
                onChange={e => setSelectedVideoModel(e.target.value)}
              >
                <option value="">-- 使用系统默认 --</option>
                {globalModels.video?.map((m: any) => (
                  <option key={m.id} value={m.id}>[{m.provider_name}] {m.model_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择声音模型 (配音)</label>
              <select 
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-purple-500"
                value={selectedAudioModel}
                onChange={e => setSelectedAudioModel(e.target.value)}
              >
                <option value="">-- 使用系统默认 --</option>
                {globalModels.audio?.map((m: any) => (
                  <option key={m.id} value={m.id}>[{m.provider_name}] {m.model_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标签序号组合 (如: 1,3,4)</label>
            <input 
              type="text" 
              placeholder="输入指定的标签序号，控制场景排列顺序"
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-purple-500"
              value={tagSequence}
              onChange={e => setTagSequence(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">需求提示词 (Prompt)</label>
            <textarea
              rows={3}
              placeholder="描述您期望生成的视频效果、风格或补充指令 (文本模型输入)..."
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-purple-500 resize-none"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            ></textarea>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <strong>生成配置:</strong> 将使用选中的 <strong>{selectedResults.length}</strong> 个素材(视频/图片) + 标签序号 <strong>{tagSequence || '未指定'}</strong> + 文本提示词，提交至 <strong>FFmpeg + {globalModels.video?.find((m: any) => m.id === selectedVideoModel)?.model_name || '默认引擎'}</strong> 进行视频生成。
          </div>

          <button 
            onClick={handleGenerate}
            disabled={!prompt || selectedResults.length === 0 || generating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all"
          >
            {generating && <Loader2 className="w-5 h-5 animate-spin" />}
            {generating ? 'AI 视频深度生成中...' : '开始生成新视频'}
          </button>
        </div>

        {generatedVideo && (
          <div className="mt-6 p-8 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50 flex flex-col items-center justify-center text-purple-700">
            <Video className="w-12 h-12 mb-3" />
            <p className="font-bold text-lg">视频生成任务已完成！</p>
            <p className="text-sm opacity-80 mt-1">任务ID: {generatedVideo}</p>
            <button className="mt-4 px-6 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg text-sm font-medium transition-colors">
              前往结果管理查看
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiCreate;
