import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Settings, Save, Loader2, RefreshCw, Eye, EyeOff, Clock } from 'lucide-react';

const ProviderConfig = () => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'video'>('text');
  const [providerKey, setProviderKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const [fetchedModels, setFetchedModels] = useState<{ text: any[], image: any[], video: any[], audio: any[] }>({ text: [], image: [], video: [], audio: [] });
  const [selectedModel, setSelectedModel] = useState('');
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const [providersData, setProvidersData] = useState<Record<string, any>>({});
  const [allModels, setAllModels] = useState<{ text: any[], image: any[], video: any[], audio: any[] }>({ text: [], image: [], video: [], audio: [] });

  const loadGlobalConfig = async () => {
    try {
      const [provRes, modRes] = await Promise.all([
        axios.get('http://127.0.0.1:3000/api/providers'),
        axios.get('http://127.0.0.1:3000/api/providers/models')
      ]);
      const provMap: Record<string, any> = {};
      provRes.data.forEach((p: any) => {
        provMap[p.id] = p; // p.id is 'text', 'image', or 'video'
      });
      setProvidersData(provMap);
      setAllModels(modRes.data);
    } catch (e) {
      console.error('Failed to load global config', e);
    }
  };

  useEffect(() => {
    loadGlobalConfig();
  }, []);

  useEffect(() => {
    // When activeTab changes or providersData loads, populate the form
    const currentProvider = providersData[activeTab];
    if (currentProvider) {
      // Find the matching key in templates by url or just name mapping
      // Because we save name and base_url in DB
      let matchedKey = '';
      const templates = providerTemplates[activeTab];
      for (const k in templates) {
        if (templates[k].name === currentProvider.name) {
          matchedKey = k;
          break;
        }
      }
      
      setProviderKey(matchedKey || currentProvider.name); // fallback to name if not in template
      setBaseUrl(currentProvider.base_url);
      setApiKey(currentProvider.api_key);
      
      // Load fetched models from global models that match this category
      const currentCategoryModels = allModels[activeTab] || [];
      setFetchedModels({
        ...{ text: [], image: [], video: [], audio: [] },
        [activeTab]: currentCategoryModels
      });
      
      // Set selected model
      if (currentProvider.selected_model) {
        // Strip the category prefix if it was added
        const shortId = currentProvider.selected_model.replace(`${activeTab}-`, '');
        setSelectedModel(currentProvider.selected_model);
      } else if (currentCategoryModels.length > 0) {
        setSelectedModel(currentCategoryModels[0].id);
      } else {
        setSelectedModel('');
      }
      
    } else {
      setProviderKey('');
      setBaseUrl('');
      setApiKey('');
      setFetchedModels({ text: [], image: [], video: [], audio: [] });
      setSelectedModel('');
    }
    setStatusMsg(null);
  }, [activeTab, providersData, allModels]);

  const providerTemplates: Record<string, Record<string, { name: string, url: string }>> = {
    text: {
      '': { name: '-- 请选择文本 AI 供应商 --', url: '' },
      openai: { name: 'OpenAI', url: 'https://api.openai.com' },
      deepseek: { name: 'DeepSeek', url: 'https://api.deepseek.com' },
      qwen: { name: '通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
      gemini: { name: 'Gemini', url: 'https://generativelanguage.googleapis.com' },
      volcengine: { name: '火山引擎', url: 'https://ark.cn-beijing.volces.com/api/v3' },
      anthropic: { name: 'Anthropic', url: 'https://api.anthropic.com' },
    },
    image: {
      '': { name: '-- 请选择图像 AI 供应商 --', url: '' },
      openai: { name: 'OpenAI (DALL-E)', url: 'https://api.openai.com' },
      gemini: { name: 'Gemini (Imagen)', url: 'https://generativelanguage.googleapis.com' },
      midjourney: { name: 'Midjourney', url: 'https://api.midjourney.com/v1' },
      stability: { name: 'Stable Diffusion', url: 'https://api.stability.ai/v1' },
      flux: { name: 'Flux', url: 'https://api.bfl.ml/v1' },
      aliyun: { name: '阿里云万相', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    },
    video: {
      '': { name: '-- 请选择视频 AI 供应商 --', url: '' },
      volcengine: { name: '火山引擎', url: 'https://ark.cn-beijing.volces.com/api/v3' },
      qwen: { name: '通义千问 (Happyhorse/Wan)', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
      runway: { name: 'Runway', url: 'https://api.runwayml.com/v1' },
      kling: { name: 'Kling (可灵)', url: 'https://api.klingai.com/v1' },
      pika: { name: 'Pika', url: 'https://api.pika.art/v1' },
      sora: { name: 'OpenAI (Sora)', url: 'https://api.openai.com' },
      hunyuan: { name: '混元视频', url: 'https://api.hunyuan.tencent.com/v1' },
    }
  };

  const handleProviderSelect = (key: string) => {
    setProviderKey(key);
    if (key === '') {
      setBaseUrl('');
      return;
    }
    const template = providerTemplates[activeTab][key];
    setBaseUrl(template.url);
    // Don't clear models here if we are loading saved config
    // but if it's a manual change, we might want to clear.
    // For simplicity, just reset models when switching provider.
    setFetchedModels({ text: [], image: [], video: [], audio: [] });
    setSelectedModel('');
  };

  const fetchModelsAuto = async (currentProvider: string, currentUrl: string, currentKey: string) => {
    if (!currentProvider || !currentUrl || !currentKey || currentKey.length < 5) return;
    
    setIsFetchingModels(true);
    try {
      const pyRes = await axios.post('http://127.0.0.1:8000/api/models/fetch', {
        provider_id: activeTab, // strictly tied to tab
        api_key: currentKey,
        base_url: currentUrl
      });

      const models = pyRes.data.models || [];
      const grouped = {
        text: models.filter((m: any) => m.category === 'text'),
        image: models.filter((m: any) => m.category === 'image'),
        video: models.filter((m: any) => m.category === 'video'),
        audio: models.filter((m: any) => m.category === 'audio'),
      };
      
      const currentTabModels = grouped[activeTab] || [];
      setFetchedModels({
        ...{ text: [], image: [], video: [], audio: [] },
        [activeTab]: currentTabModels
      });
      
      setStatusMsg({ type: 'success', text: `自动加载成功！已筛选出 ${currentTabModels.length} 个模型。` });

      if (currentTabModels.length > 0) setSelectedModel(currentTabModels[0].id);

    } catch (e) {
      console.error('Auto fetch failed:', e);
      setStatusMsg({ type: 'error', text: '自动加载模型失败，请检查 API Key 或进行连接测试。' });
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTest = async () => {
    const name = providerTemplates[activeTab][providerKey]?.name || providerKey;
    if (!name || !baseUrl || !apiKey) {
      setStatusMsg({ type: 'error', text: '请先填写供应商、Base URL 和 API Key' });
      return;
    }
    
    setTesting(true);
    setStatusMsg(null);
    try {
      // Test connectivity first
      const testRes = await axios.post('http://127.0.0.1:3000/api/providers/test', {
        name,
        base_url: baseUrl,
        api_key: apiKey
      });
      
      setStatusMsg({ type: 'success', text: `连接测试成功！正在加载模型列表...` });

      // Automatically fetch models from python service to display in the dropdown
      const pyRes = await axios.post('http://127.0.0.1:8000/api/models/fetch', {
        provider_id: activeTab, // Use activeTab instead of provider key so it fetches exactly for this tab
        api_key: apiKey,
        base_url: baseUrl
      });

      const models = pyRes.data.models || [];
      const grouped = {
        text: models.filter((m: any) => m.category === 'text'),
        image: models.filter((m: any) => m.category === 'image'),
        video: models.filter((m: any) => m.category === 'video'),
        audio: models.filter((m: any) => m.category === 'audio'),
      };
      
      // Update fetched models, but only keep the ones belonging to the current tab
      const currentTabModels = grouped[activeTab] || [];
      setFetchedModels({
        ...{ text: [], image: [], video: [], audio: [] },
        [activeTab]: currentTabModels
      });
      
      setStatusMsg({ type: 'success', text: `连接测试成功！已自动加载并筛选 ${currentTabModels.length} 个当前类别模型。` });

      if (currentTabModels.length > 0) setSelectedModel(currentTabModels[0].id);

    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.response?.data?.error || e.response?.data?.detail || '测试连接或获取模型失败，请检查配置' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const name = providerTemplates[activeTab][providerKey]?.name || providerKey;
    if (!name || !baseUrl || !apiKey) {
      setStatusMsg({ type: 'error', text: '请填写所有必填字段' });
      return;
    }
    
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await axios.post('http://127.0.0.1:3000/api/providers', {
        category: activeTab,
        name,
        base_url: baseUrl,
        api_key: apiKey,
        selected_model: selectedModel
      });
      setStatusMsg({ type: 'success', text: `配置保存成功！已将模型作用于全局。` });
      
      // Reload configurations so it stays populated
      await loadGlobalConfig();
      
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.response?.data?.error || '保存配置失败' });
    } finally {
      setSaving(false);
    }
  };

  const currentModels = fetchedModels[activeTab] || [];

  return (
    <div className="font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-bold text-gray-900">模型配置</h2>
            </div>
            
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button 
                onClick={() => { setActiveTab('text'); setSelectedModel(fetchedModels.text[0]?.id || ''); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'text' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                文本模型
              </button>
              <button 
                onClick={() => { setActiveTab('image'); setSelectedModel(fetchedModels.image[0]?.id || ''); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'image' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                图像模型
              </button>
              <button 
                onClick={() => { setActiveTab('video'); setSelectedModel(fetchedModels.video[0]?.id || ''); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'video' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                视频模型
              </button>
            </div>

            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <Clock className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-8 space-y-6">
            
            {/* AI Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI 供应商</label>
              <select 
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 outline-none focus:border-purple-500 transition-colors appearance-none"
                value={providerKey}
                onChange={e => handleProviderSelect(e.target.value)}
              >
                {Object.keys(providerTemplates[activeTab] || {}).map(k => (
                  <option key={k} value={k}>{providerTemplates[activeTab][k].name}</option>
                ))}
              </select>
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">基础 URL</label>
              <input 
                type="text" 
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 outline-none focus:border-purple-500 transition-colors"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API 密钥</label>
              <div className="relative">
                <input 
                  type={showApiKey ? "text" : "password"}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 outline-none focus:border-purple-500 transition-colors pr-12"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  onBlur={() => fetchModelsAuto(providerKey, baseUrl, apiKey)}
                  placeholder="请输入 API Key"
                />
                <button 
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Models Dropdown (Auto loaded) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
              <select 
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 outline-none focus:border-purple-500 transition-colors appearance-none"
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                disabled={currentModels.length === 0 || isFetchingModels}
              >
                {currentModels.length === 0 ? (
                  <option value="">暂无模型数据</option>
                ) : (
                  currentModels.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.model_name}</option>
                  ))
                )}
              </select>
            </div>

            {statusMsg && (
              <div className={`p-3 rounded-lg text-sm border ${statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {statusMsg.text}
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-8 py-5 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleTest}
              disabled={testing || saving || !providerKey || !apiKey}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {testing ? '测试中...' : '连接测试'}
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={() => { setProviderKey(''); setBaseUrl(''); setApiKey(''); setFetchedModels({ text: [], image: [], video: [], audio: [] }); }}
                className="px-4 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || testing || !providerKey || !apiKey}
                className="px-8 py-2.5 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存配置
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProviderConfig;
