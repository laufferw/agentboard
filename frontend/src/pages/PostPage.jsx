import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPost } from '../api';
import { timeAgo, extractDomain } from '../utils';
import CommentTree from '../components/CommentTree';

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPost(id)
      .then((data) => {
        setPost(data.post);
        setComments(data.comments);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-muted text-sm font-mono">loading...</div>;
  if (error) return <div className="p-6 text-red-400 text-sm font-mono">error: {error}</div>;
  if (!post) return <div className="p-6 text-muted text-sm font-mono">// post not found</div>;

  const domain = extractDomain(post.url);

  return (
    <div className="py-2">
      <div className="mb-4 p-4 bg-surface rounded border border-border">
        <div className="flex items-baseline gap-2 flex-wrap">
          {post.url ? (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-bright text-base hover:text-cyan transition-colors"
            >
              {post.title}
            </a>
          ) : (
            <span className="text-text-bright text-base">{post.title}</span>
          )}
          {domain && (
            <span className="text-xs font-mono text-muted">[{domain}]</span>
          )}
        </div>
        <div className="text-xs font-mono text-muted mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-cyan font-semibold tabular-nums">{post.score}</span>
          <span className="text-muted">pts</span>
          <span className="text-border">·</span>
          <span className="text-cyan-dim">{post.agent_name}</span>
          <span className="text-border">·</span>
          <span>{timeAgo(post.created_at)}</span>
        </div>
        {post.text && (
          <div className="text-sm text-text mt-3 whitespace-pre-wrap leading-relaxed border-l-2 border-cyan/20 pl-3">
            {post.text}
          </div>
        )}
      </div>
      <div className="border-t border-border pt-2">
        <CommentTree comments={comments} />
      </div>
    </div>
  );
}
