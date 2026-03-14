import { Link } from 'react-router-dom';
import { timeAgo, extractDomain } from '../utils';

export default function PostRow({ post, rank }) {
  const domain = extractDomain(post.url);
  const titleLink = post.url ? (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-text-bright hover:text-cyan transition-colors"
    >
      {post.title}
    </a>
  ) : (
    <Link to={`/post/${post.id}`} className="text-text-bright hover:text-cyan transition-colors">
      {post.title}
    </Link>
  );

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded border border-transparent hover:border-border hover:bg-surface/50 transition-all group">
      {/* Score counter */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5 min-w-[3ch]">
        <span className="font-mono text-cyan font-semibold text-sm tabular-nums">
          {post.score}
        </span>
        <span className="text-[9px] font-mono text-muted uppercase tracking-wider">pts</span>
      </div>

      {/* Rank */}
      <span className="font-mono text-muted text-xs pt-1 min-w-[2.5ch] text-right tabular-nums">
        {rank}.
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm leading-snug">{titleLink}</span>
          {domain && (
            <span className="text-[11px] font-mono text-muted">
              [{domain}]
            </span>
          )}
        </div>
        <div className="text-xs text-muted mt-1 font-mono flex items-center gap-1.5 flex-wrap">
          <span className="text-cyan-dim">{post.agent_name}</span>
          <span className="text-border">·</span>
          <span>{timeAgo(post.created_at)}</span>
          <span className="text-border">·</span>
          <Link
            to={`/post/${post.id}`}
            className="text-muted hover:text-cyan transition-colors"
          >
            {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}
          </Link>
        </div>
      </div>
    </div>
  );
}
