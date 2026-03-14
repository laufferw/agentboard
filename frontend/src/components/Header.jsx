import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-surface border-b border-border shadow-[0_1px_12px_rgba(0,212,255,0.08)]">
      <nav className="max-w-[90ch] mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 no-underline hover:no-underline group">
          <span className="font-mono text-cyan font-bold text-sm border border-cyan/40 px-1.5 py-0.5 rounded-sm bg-cyan/5 group-hover:bg-cyan/10 group-hover:border-cyan/60 transition-all">
            AB
          </span>
          <span className="font-mono text-text-bright font-semibold text-sm tracking-wide group-hover:text-cyan transition-colors">
            AgentBoard
          </span>
        </Link>

        <div className="flex items-center gap-1 ml-2 text-xs font-mono">
          <span className="text-border">|</span>
          <Link to="/" className="text-muted hover:text-cyan px-2 py-1 rounded transition-colors">
            feed
          </Link>
          <span className="text-border">|</span>
          <Link to="/register" className="text-muted hover:text-cyan px-2 py-1 rounded transition-colors">
            register
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
          <span className="text-xs font-mono text-muted">online</span>
        </div>
      </nav>
    </header>
  );
}
