import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAgentContext } from '../context/AgentContext';
import type { ThreatEvent } from '../types';

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Number((target * eased).toFixed(target % 1 === 0 ? 0 : 2)));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function relativeTime(event: ThreatEvent) {
  const seconds = Math.max(1, Math.floor((Date.now() - event.occurredAt) / 1000));
  return `${seconds}s ago`;
}

export function RightSidePanel() {
  const { threatEvents, metrics, agents } = useAgentContext();
  const inputScan = useCountUp(metrics.inputScan);
  const outputSanitization = useCountUp(metrics.outputSanitization);
  const swarmSync = useCountUp(metrics.swarmSync);
  const selfHealRollback = useCountUp(metrics.selfHealRollback);
  const breachCostSaved = useCountUp(metrics.breachCostSaved / 1000000, 1200);
  const securityActive = agents.some((agent) => agent.type === 'security' && agent.status !== 'healthy');

  const pipeline = [
    { label: 'Planner', status: '✓', tone: 'safe' as const },
    { label: 'Security', status: securityActive ? '⚠' : '✓', tone: securityActive ? 'threat' as const : 'safe' as const },
    { label: 'Memory', status: '✓', tone: 'safe' as const },
    { label: 'Validator', status: '✓', tone: 'safe' as const },
    { label: 'Compliance', status: '✓', tone: 'safe' as const },
    { label: 'Recovery', status: '✓', tone: 'safe' as const },
  ];

  return (
    <aside className="swarm-stage__panel glass-panel--secondary">
      <section className="panel-section">
        <div className="panel-section__title">
          <span>Live Threat Feed</span>
          <ShieldAlert size={14} />
        </div>

        {threatEvents.slice(0, 4).map((event) => (
          <article key={event.id} className="threat-card">
            <div className="threat-card__type">{event.type}</div>
            <div className="threat-card__meta">{event.sourceAgent}</div>
            <div className="threat-card__meta">{relativeTime(event)}</div>
          </article>
        ))}
      </section>

      <section className="panel-section">
        <div className="panel-section__title">
          <span>Performance Metrics</span>
          <ArrowUpRight size={14} />
        </div>

        <div className="metric-row"><span className="metric-row__label">Input scan latency</span><span className="metric-row__value">{inputScan}ms</span></div>
        <div className="metric-row"><span className="metric-row__label">Output sanitization</span><span className="metric-row__value">{outputSanitization}ms</span></div>
        <div className="metric-row"><span className="metric-row__label">Swarm sync time</span><span className="metric-row__value">{swarmSync}ms</span></div>
        <div className="metric-row"><span className="metric-row__label">Self-heal rollback</span><span className="metric-row__value metric-row__value--safe">{selfHealRollback}ms</span></div>
        <div className="metric-row"><span className="metric-row__label">Breach cost saved</span><span className="metric-row__value metric-row__value--gold">${breachCostSaved.toFixed(2)}M</span></div>
      </section>

      <section className="panel-section">
        <div className="panel-section__title">
          <span>Consensus Pipeline</span>
          <CheckCircle2 size={14} />
        </div>

        <div className="pipeline">
          {pipeline.map((step, index) => (
            <div key={step.label} className={`pipeline-step pipeline-step--${step.tone} ${index === 1 ? 'pipeline-step--active' : ''}`}>
              <span className="pipeline-step__dot" />
              <span className="pipeline-step__label">{step.label}</span>
              <span className={`pipeline-step__status ${step.tone === 'safe' ? 'pipeline-step__status--safe' : 'pipeline-step__status--amber'}`}>{step.status}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}