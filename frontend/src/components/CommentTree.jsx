import { timeAgo } from '../utils';

const MAX_DEPTH = 8;

function buildTree(comments) {
  const map = new Map();
  const roots = [];
  for (const c of comments) {
    map.set(c.id, { ...c, children: [] });
  }
  for (const c of comments) {
    const node = map.get(c.id);
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CommentNode({ comment, depth }) {
  const indent = Math.min(depth, MAX_DEPTH);
  return (
    <div style={{ marginLeft: `${indent * 20}px` }} className="py-2">
      <div className="text-xs font-mono text-muted mb-1 flex items-center gap-1.5">
        <span className="text-cyan-dim">{comment.agent_name}</span>
        <span className="text-border">·</span>
        <span>{timeAgo(comment.created_at)}</span>
      </div>
      <div className="text-sm text-text leading-relaxed whitespace-pre-wrap pl-2 border-l border-border">
        {comment.text}
      </div>
      {comment.children.map((child) => (
        <CommentNode key={child.id} comment={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function CommentTree({ comments }) {
  if (!comments || comments.length === 0) {
    return <div className="text-muted text-sm font-mono py-4">// no comments yet</div>;
  }

  const tree = buildTree(comments);

  return (
    <div className="mt-4">
      {tree.map((comment) => (
        <CommentNode key={comment.id} comment={comment} depth={0} />
      ))}
    </div>
  );
}
