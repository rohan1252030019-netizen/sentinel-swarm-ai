import { ArrowUpRight, BookOpen, Command, Newspaper, RefreshCcw, Radar, Search, ShieldCheck, AlertTriangle, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { COMMAND_RESULTS } from '../data/mockData';
import type { CommandResult, NotificationKind, View } from '../types';

interface SpotlightCommandProps {
  onClose: () => void;
  onAction: (result: CommandResult) => void;
  onNavigate: (view: View) => void;
  onQuickAction: (title: string, kind?: NotificationKind) => void;
}

const ICONS: Record<string, LucideIcon> = {
  scan: Radar,
  'triangle-alert': AlertTriangle,
  'shield-check': ShieldCheck,
  newspaper: Newspaper,
  'refresh-cw': RefreshCcw,
  'book-open': BookOpen,
};

const QUICK_ACTIONS = [
  { title: 'Simulate Attack', kind: 'threat' as const },
  { title: 'Audit Agents', kind: 'info' as const },
  { title: 'GRC Report', kind: 'info' as const },
  { title: 'Run Self-Heal', kind: 'success' as const },
];

export function SpotlightCommand({ onClose, onAction, onNavigate, onQuickAction }: SpotlightCommandProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return COMMAND_RESULTS.filter((result) => {
      if (!normalized) {
        return true;
      }

      return [result.category, result.label, result.description, result.shortcut].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [query]);

  const grouped = useMemo(() => {
    const categories: CommandResult['category'][] = ['Agents', 'Actions', 'Reports'];
    return categories.map((category) => ({ category, items: filtered.filter((result) => result.category === category) })).filter((group) => group.items.length > 0);
  }, [filtered]);

  const flatItems = grouped.flatMap((group) => group.items);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(current + 1, Math.max(0, flatItems.length - 1)));
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(current - 1, 0));
      }

      if (event.key === 'Enter' && flatItems[selectedIndex]) {
        event.preventDefault();
        onAction(flatItems[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flatItems, onAction, onClose, selectedIndex]);

  const selectShortcut = (title: string, kind: NotificationKind) => {
    onQuickAction(title, kind);
    if (title === 'GRC Report') {
      onNavigate('grc');
    }
  };

  return (
    <div className="spotlight-backdrop" onClick={onClose}>
      <section className="spotlight glass-panel--elevated" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command center">
        <div className="spotlight__bar">
          <Search size={18} color="var(--text-accent)" />
          <input
            ref={inputRef}
            className="spotlight__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents, run simulations, query policy…"
          />
          <span className="spotlight__kbd">ESC</span>
          <button className="toast__dismiss" onClick={onClose} aria-label="Close command center">
            <X size={16} />
          </button>
        </div>

        <div className="spotlight__body">
          <div className="command-pills">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.title} className="command-pill" onClick={() => selectShortcut(action.title, action.kind)}>
                {action.title}
              </button>
            ))}
          </div>

          {grouped.length === 0 ? (
            <div className="spotlight__empty">No matching agents, actions, or reports.</div>
          ) : (
            grouped.map((group) => (
              <div key={group.category} className="result-group">
                <div className="result-group__title">{group.category}</div>
                <div className="result-group__items">
                  {group.items.map((result) => {
                    const Icon = ICONS[result.icon] ?? Command;
                    const itemIndex = flatItems.findIndex((entry) => entry.id === result.id);
                    const active = itemIndex === selectedIndex;

                    return (
                      <button key={result.id} className={`result-item ${active ? 'result-item--active' : ''}`} onClick={() => onAction(result)}>
                        <Icon size={16} color="var(--text-accent)" />
                        <div>
                          <div className="result-item__title">{result.label}</div>
                          <div className="result-copy">{result.description}</div>
                        </div>
                        <div className="result-item__hint">{result.shortcut}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}