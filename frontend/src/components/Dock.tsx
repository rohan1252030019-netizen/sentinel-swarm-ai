import { Command, Newspaper, Radar, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { View } from '../types';

interface DockProps {
  activeView: View;
  spotlightOpen: boolean;
  onNavigate: (view: View) => void;
  onOpenCommand: () => void;
}

export function Dock({ activeView, spotlightOpen, onNavigate, onOpenCommand }: DockProps) {
  return (
    <nav className="dock" aria-label="Primary navigation">
      <button className={`dock-button ${activeView === 'swarm' ? 'dock-button--active' : ''}`} onClick={() => onNavigate('swarm')}>
        <Radar size={16} />
        <span className="dock-button__label">Swarm</span>
      </button>
      <button className={`dock-button ${spotlightOpen ? 'dock-button--active' : ''}`} onClick={onOpenCommand}>
        <Command size={16} />
        <span className="dock-button__label">Cmd+K</span>
      </button>
      <button className={`dock-button ${activeView === 'grc' ? 'dock-button--active' : ''}`} onClick={() => onNavigate('grc')}>
        <Newspaper size={16} />
        <span className="dock-button__label">GRC</span>
      </button>
      <button className={`dock-button ${activeView === 'forensics' ? 'dock-button--active' : ''}`} onClick={() => onNavigate('forensics')}>
        <AlertTriangle size={16} />
        <span className="dock-button__label">Forensics</span>
      </button>
      <button className={`dock-button ${activeView === 'policy' ? 'dock-button--active' : ''}`} onClick={() => onNavigate('policy')}>
        <ShieldCheck size={16} />
        <span className="dock-button__label">Policy</span>
      </button>
    </nav>
  );
}