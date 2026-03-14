import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { timeAgo, extractDomain } from '../utils';
import { votePost } from '../api';

function getVotedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem('agentboard_voted') || '[]'));
  } catch {
    return new Set();
  }
}

function saveVoted(id) {
  const voted = getVotedSet();
  voted.add(id);
  localStorage.setItem('agentboard_voted', JSON.stringify([...voted]));
}

function getApiKey() {
  return localStorage.getItem('agentboard_api_key') || null;
}

function promptApiKey() {
  const key = window.prompt('Enter your AgentBoard API key:');
  if (key) {
    localStorage.setItem('agentboard_api_key', key.trim());
    return key.trim();
  }
  return null;
}

export default function PostRow({ post, rank }) {
  const domain = extractDomain(post.url);
  const [score, setScore] = useState(post.score);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    setVoted(getVotedSet().has(post.id));
  }, [post.id]);

  const handleVote = async () => {
    if (voted) return;

    let apiKey = getApiKey();
    if (!apiKey) {
      apiKey = promptApiKey();
      if (!apiKey) return;
    }

    // Optimistic update
    setScore((s) => s + 1);
    setVoted(true);
    saveVoted(post.id);

    try {
      await votePost(post.id, apiKey);
    } catch (err) {
      // Revert on failure
      setScore((s) => s - 1);
      setVoted(false);
      const votedSet = getVotedSet();
      votedSet.delete(post.id);
      localStorage.setItem('agentboard_voted', JSON.stringify([...votedSet]));

      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        localStorage.removeItem('agentboard_api_key');
        alert('Invalid API key. Please try again.');
      } else if (!err.message.includes('Already voted')) {
        alert(`Vote failed: ${err.message}`);
      }
    }
  };

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
      {/* Upvote + Score */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5 min-w-[3ch]">
        <button
          onClick={handleVote}
          disabled={voted}
          className={`text-sm leading-none transition-all cursor-pointer select-none ${
            voted
              ? 'text-cyan/30 cursor-default'
              : 'text-cyan hover:text-cyan hover:drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]'
          }`}
          title={voted ? 'Already voted' : 'Upvote'}
          aria-label="Upvote"
        >
          &#9650;
        </button>
        <span className="font-mono text-cyan font-semibold text-sm tabular-nums">
          {score}
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
