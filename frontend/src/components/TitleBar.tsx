import { Activity, Clock3, Command, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { SystemMetrics } from '../types';

interface TitleBarProps {
  metrics: SystemMetrics;
  agentCount: number;
  threatCount: number;
  healthyCount: number;
  onOpenPolicy: () => void;
  onOpenCommand: () => void;
}

export function TitleBar({ metrics, agentCount, threatCount, healthyCount, onOpenPolicy, onOpenCommand }: TitleBarProps) {
  const threatActive = threatCount > 0;

  return (
    <header className="titlebar">
      <div className="titlebar__left">
        <span className={`status-orb ${threatActive ? 'status-orb--threat' : ''}`} />
        <div className="brand-mark">
          <div className="brand-mark__title">SENTINEL SWARM AI</div>
          <div className="brand-mark__meta">· {agentCount} agents active · {healthyCount} healthy</div>
        </div>
      </div>

      <div className="titlebar__center" aria-label="Live metrics">
        <div className="metric-pill">
          <Activity size={14} />
          <span>Input scan</span>
          <span className="metric-pill__value">{metrics.inputScan}ms</span>
        </div>
        <div className="metric-pill">
          <Command size={14} />
          <span>Consensus</span>
          <span className="metric-pill__value">{metrics.consensus}ms</span>
        </div>
        <div className="metric-pill">
          <Clock3 size={14} />
          <span>Uptime</span>
          <span className="metric-pill__value metric-pill__value--safe">{metrics.uptime.toFixed(2)}%</span>
        </div>
      </div>

      <div className="titlebar__right">
        <button className="badge-pill badge-pill--safe" onClick={onOpenPolicy}>
          <ShieldCheck size={14} />
          ZeroTrust
        </button>
        <div className={`badge-pill ${threatActive ? 'badge-pill--threat' : 'badge-pill--accent'}`}>
          <ShieldAlert size={14} />
          {threatCount} active threats
        </div>
        <button className="badge-pill badge-pill--accent" onClick={onOpenCommand}>
          <Command size={14} />
          RBAC Override
        </button>
      </div>
    </header>
  );
}