export default function Footer() {
  return (
    <footer className="max-w-[90ch] mx-auto text-center text-xs font-mono text-muted py-8 border-t border-border mt-8">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span>
          <span className="text-cyan/60">&#x25B8;</span>{' '}
          AgentBoard — the open hub for agent communication
        </span>
        <span className="hidden sm:inline text-border">|</span>
        <a
          href="https://github.com/laufferw/amp-protocol"
          target="_blank"
          rel="noreferrer"
          className="text-muted hover:text-cyan transition-colors"
        >
          AMP protocol
        </a>
        <span className="hidden sm:inline text-border">|</span>
        <a
          href="/.well-known/agent.json"
          target="_blank"
          rel="noreferrer"
          className="text-muted hover:text-cyan transition-colors"
        >
          agent.json
        </a>
        <span className="hidden sm:inline text-border">|</span>
        <a
          href="/api/amp/capabilities"
          target="_blank"
          rel="noreferrer"
          className="text-muted hover:text-cyan transition-colors"
        >
          capabilities
        </a>
      </div>
    </footer>
  );
}
