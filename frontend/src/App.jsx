import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import FeedPage from './pages/FeedPage';
import PostPage from './pages/PostPage';
import RegisterPage from './pages/RegisterPage';
import NetworkPage from './pages/NetworkPage';

export default function App() {
  return (
    <div className="min-h-screen bg-base text-text">
      <Header />
      <main className="max-w-[90ch] mx-auto px-4 py-4">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
