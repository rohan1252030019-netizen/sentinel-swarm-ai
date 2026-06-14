import { ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgentContext } from '../context/AgentContext';

interface GRCBoardroomProps {
  onNotify: (title: string, kind?: 'threat' | 'warning' | 'info' | 'success') => void;
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(target * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function Sparkline() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const draw = () => {
      const width = 320;
      const height = 120;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const values = [44, 50, 48, 56, 61, 58, 64, 68, 72, 69, 75, 80, 83, 85, 82, 88];
      context.strokeStyle = 'rgba(0, 200, 255, 0.7)';
      context.lineWidth = 2;
      context.beginPath();
      values.forEach((value, index) => {
        const x = (width / (values.length - 1)) * index;
        const y = height - (value / 100) * (height - 18) - 8;
        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.stroke();

      context.fillStyle = 'rgba(159, 141, 255, 0.9)';
      values.forEach((value, index) => {
        const x = (width / (values.length - 1)) * index;
        const y = height - (value / 100) * (height - 18) - 8;
        context.beginPath();
        context.arc(x, y, index === values.length - 1 ? 4 : 2.4, 0, Math.PI * 2);
        context.fill();
      });
    };

    draw();
  }, []);

  return <canvas ref={canvasRef} className="sparkline-canvas" />;
}

function ReputationChart({ values }: { values: Array<{ label: string; value: number }> }) {
  return (
    <div className="grc-bars">
      {values.map((entry) => (
        <div key={entry.label} className="grc-bar">
          <span className="board-copy">{entry.label}</span>
          <div className="grc-bar__track">
            <div className="grc-bar__fill" style={{ width: `${entry.value}%` }} />
          </div>
          <span className="board-copy">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

export function GRCBoardroom({ onNotify }: GRCBoardroomProps) {
  const { agents, threatEvents } = useAgentContext();
  const breachValue = useCountUp(1280000 / 1000000);
  const complianceScore = useCountUp(97, 1000);
  const blockedCount = useCountUp(2847, 1400);

  const recentEvents = threatEvents.slice(0, 5);
  const reputationValues = useMemo(
    () => [
      { label: 'High trust', value: Math.round((agents.filter((agent) => agent.trustScore > 0.85).length / agents.length) * 100) },
      { label: 'Monitored', value: Math.round((agents.filter((agent) => agent.trustScore <= 0.85 && agent.trustScore > 0.7).length / agents.length) * 100) },
      { label: 'Quarantine', value: Math.round((agents.filter((agent) => agent.trustScore <= 0.7).length / agents.length) * 100) },
    ],
    [agents],
  );

  return (
    <section className="grc-layout">
      <div className="grc-grid">
        <article className="grc-card grc-card--hero mesh-panel">
          <div className="grc-hero__value">${breachValue.toFixed(2)}M</div>
          <div className="grc-hero__subtitle">Breach costs neutralised this quarter</div>
          <div className="grc-hero__meta">Executive posture across the swarm, compliance, and recovery lattice.</div>
        </article>

        <article className="grc-card glass-panel--elevated">
          <div className="panel-section__title"><span>SOC2 Type II</span><CheckCircle2 size={14} /></div>
          <div className="progress-ring" style={{ position: 'relative', marginTop: 18 }}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="url(#grc-progress-gradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 48}`}
                strokeDashoffset={`${2 * Math.PI * 48 * (1 - complianceScore / 100)}`}
              />
              <defs>
                <linearGradient id="grc-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--text-purple)" />
                  <stop offset="100%" stopColor="var(--text-accent)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="progress-ring__label">
              <span className="progress-ring__value">{Math.round(complianceScore)}%</span>
              <span className="board-copy">Last audit: 14 days ago</span>
            </div>
          </div>
        </article>

        <article className="grc-card glass-panel--elevated">
          <div className="panel-section__title"><span>GDPR Alignment</span><CheckCircle2 size={14} /></div>
          <div className="grc-hero__subtitle" style={{ marginTop: 16 }}>COMPLIANT</div>
          <p className="board-copy">Data access, retention, and deletion flows are aligned to policy. The swarm's memory access remains minimized and fully logged.</p>
          <div style={{ marginTop: 18, color: 'var(--text-safe)', fontWeight: 600 }}>✓ Protection-by-default confirmed</div>
        </article>

        <article className="grc-card glass-panel--elevated">
          <div className="panel-section__title"><span>Threats Blocked</span><ShieldCheck size={14} /></div>
          <div className="grc-hero__subtitle" style={{ marginTop: 16 }}>{Math.round(blockedCount).toLocaleString()}</div>
          <div className="grc-sparkline" style={{ marginTop: 16 }}>
            <Sparkline />
          </div>
        </article>
      </div>

      <div className="grc-grid grc-grid--secondary">
        <article className="grc-card glass-panel--elevated">
          <div className="panel-section__title"><span>Recent Security Events</span><ArrowUpRight size={14} /></div>
          <div className="timeline-list" style={{ marginTop: 18 }}>
            {recentEvents.map((event) => (
              <div key={event.id} className={`timeline-item ${event.severity === 'critical' || event.severity === 'high' ? 'timeline-item--threat' : ''}`}>
                <div className="timeline-item__time">{new Date(event.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="timeline-item__title">{event.type}</div>
                <div className="timeline-item__copy">{event.sourceAgent} · {event.details}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="grc-card glass-panel--elevated">
          <div className="panel-section__title"><span>Agent Reputation Distribution</span><ShieldCheck size={14} /></div>
          <div className="grc-rep-chart" style={{ marginTop: 18 }}>
            <ReputationChart values={reputationValues} />
          </div>
          <div className="board-copy" style={{ marginTop: 18 }}>Reputation based on live trust score, task load, and recovery state.</div>
          <div className="summary-chips" style={{ marginTop: 12 }}>
            <button className="badge-pill badge-pill--accent" onClick={() => onNotify('Executive summary exported', 'info')}>Export summary</button>
            <button className="badge-pill badge-pill--safe" onClick={() => onNotify('Boardroom brief refreshed', 'success')}>Refresh brief</button>
          </div>
        </article>
      </div>
    </section>
  );
}