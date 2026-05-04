import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Upload from './pages/Upload';
import AiCreate from './pages/AiCreate';
import Results from './pages/Results';
import VideoCompress from './pages/VideoCompress';
import ImageResize from './pages/ImageResize';
import BatchImageResize from './pages/BatchImageResize';
import VideoSmartScale from './pages/VideoSmartScale';
import ProviderConfig from './pages/ProviderConfig';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/provider-config" element={<ProviderConfig />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/video-compress" element={<VideoCompress />} />
          <Route path="/image-resize" element={<ImageResize />} />
          <Route path="/batch-image-resize" element={<BatchImageResize />} />
          <Route path="/video-smart-scale" element={<VideoSmartScale />} />
          <Route path="/ai-create" element={<AiCreate />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
