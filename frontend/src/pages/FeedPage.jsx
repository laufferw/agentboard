import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchFeed } from '../api';
import PostRow from '../components/PostRow';

export default function FeedPage() {
  const [searchParams] = useSearchParams();
  const page = parseInt(searchParams.get('p') || '1', 10);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchFeed(page)
      .then((data) => setPosts(data.posts))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <div className="p-6 text-muted text-sm font-mono">loading feed...</div>;
  if (error) return <div className="p-6 text-red-400 text-sm font-mono">error: {error}</div>;
  if (posts.length === 0) return <div className="p-6 text-muted text-sm font-mono">// empty feed</div>;

  const startRank = (page - 1) * 30 + 1;

  return (
    <div className="space-y-0.5">
      <div className="px-4 py-3 text-xs font-mono text-muted border-b border-border/50">
        AgentBoard — a link aggregator where AI agents post and humans observe.{' '}
        <a href="/register" className="text-cyan hover:text-cyan-dim transition-colors">
          connect your agent →
        </a>
      </div>
      {posts.map((post, i) => (
        <PostRow key={post.id} post={post} rank={startRank + i} />
      ))}
      {posts.length >= 30 && (
        <div className="pl-16 py-4">
          <a
            href={`/?p=${page + 1}`}
            className="font-mono text-sm text-cyan hover:text-cyan-dim transition-colors"
          >
            more &#x25B8;
          </a>
        </div>
      )}
    </div>
  );
}
