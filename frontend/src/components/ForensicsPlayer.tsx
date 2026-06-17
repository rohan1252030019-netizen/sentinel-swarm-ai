import { ArrowUpRight, FastForward, Pause, Play, RefreshCcw, ShieldCheck, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgentContext } from '../context/AgentContext';
import type { ThreatEvent } from '../types';

interface ForensicsPlayerProps {
  onNotify: (title: string, kind?: 'threat' | 'warning' | 'info' | 'success') => void;
}

function formatTime(value: number) {
  const clamped = Math.max(0, value);
  const minutes = Math.floor(clamped / 60);
  const seconds = Math.floor(clamped % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function usePlayback(currentTime: number, playing: boolean, speed: number, onUpdate: (next: number) => void) {
  useEffect(() => {
    if (!playing) {
      return;
    }

    let frame = 0;
    let startedAt = performance.now();
    let base = currentTime;

    const tick = (time: number) => {
      const delta = ((time - startedAt) / 1000) * speed;
      onUpdate(clamp(base + delta, 0, 100));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [currentTime, playing, speed, onUpdate]);
}

function ActivityCanvas({ time }: { time: number }) {
  const { agents } = useAgentContext();
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

    const width = 800;
    const height = 460;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.clearRect(0, 0, width, height);

    context.strokeStyle = 'rgba(0, 200, 255, 0.08)';
    context.lineWidth = 1;
    for (let y = 20; y < height; y += 36) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    const activeIndex = Math.floor((time / 100) * agents.length);
    agents.slice(0, 18).forEach((agent, index) => {
      const radius = 140 + Math.sin(time / 12 + index) * 16;
      const angle = (index / 18) * Math.PI * 2 + time / 20;
      const x = centerX + Math.cos(angle) * radius * 1.1;
      const y = centerY + Math.sin(angle * 1.2) * radius * 0.72;
      const color = index === activeIndex ? 'rgba(0, 200, 255, 0.95)' : agent.status === 'threatened' ? 'rgba(255, 96, 96, 0.8)' : agent.type === 'recovery' ? 'rgba(68, 232, 128, 0.82)' : 'rgba(159, 141, 255, 0.82)';

      if (index > 0) {
        const prevAngle = ((index - 1) / 18) * Math.PI * 2 + time / 20;
        const prevX = centerX + Math.cos(prevAngle) * (140 + Math.sin(time / 12 + index - 1) * 16) * 1.1;
        const prevY = centerY + Math.sin(prevAngle * 1.2) * (140 + Math.sin(time / 12 + index - 1) * 16) * 0.72;
        context.strokeStyle = 'rgba(0, 200, 255, 0.18)';
        context.beginPath();
        context.moveTo(prevX, prevY);
        context.lineTo(x, y);
        context.stroke();
      }

      context.shadowBlur = 18;
      context.shadowColor = color;
      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, index === activeIndex ? 6 : 4, 0, Math.PI * 2);
      context.fill();

      context.shadowBlur = 0;
      context.strokeStyle = 'rgba(255,255,255,0.12)';
      context.beginPath();
      context.arc(x, y, index === activeIndex ? 14 : 9, 0, Math.PI * 2);
      context.stroke();
    });
  }, [agents, time]);

  return <canvas ref={canvasRef} className="forensics-canvas" />;
}

function EventDetails({ event }: { event: ThreatEvent | null }) {
  if (!event) {
    return <pre>{'{\n  "state": "Select an event to inspect its trace."\n}'}</pre>;
  }

  return (
    <pre>
{`{
  "id": "${event.id}",
  "type": "${event.type}",
  "sourceAgent": "${event.sourceAgent}",
  "severity": "${event.severity}",
  "details": "${event.details}",
  "occurredAt": "${new Date(event.occurredAt).toISOString()}"
}`}
    </pre>
  );
}

export function ForensicsPlayer({ onNotify }: ForensicsPlayerProps) {
  const { threatEvents, agents } = useAgentContext();
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<ThreatEvent | null>(threatEvents[0] ?? null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  usePlayback(time, playing, speed, setTime);

  const markers = useMemo(
    () => threatEvents.map((event, index) => ({ event, position: (index / Math.max(1, threatEvents.length - 1)) * 100 })),
    [threatEvents],
  );

  const visibleLogs = useMemo(
    () => threatEvents.slice(0, 8).map((event, index) => ({
      event,
      timeLabel: formatTime(index * 7 + time / 5),
      title: `${event.sourceAgent} · ${event.type}`,
      copy: event.details,
      tone: event.severity,
    })),
    [threatEvents, time],
  );

  const handleScrub = (clientX: number) => {
    const element = scrubberRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const next = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    setTime(next);
  };

  return (
    <section className="forensics-layout">
      <article className="forensics-card glass-panel--elevated scrubber" ref={scrubberRef} onPointerDown={(event) => handleScrub(event.clientX)} onPointerMove={(event) => event.buttons === 1 && handleScrub(event.clientX)}>
        <div className="scrubber__track">
          <div className="scrubber__fill" style={{ width: `${time}%` }} />
          <div className="scrubber__playhead" style={{ left: `${time}%` }} />
          {markers.map(({ event, position }) => (
            <span key={event.id} className={`scrubber__mark ${event.severity === 'high' || event.severity === 'critical' ? 'scrubber__mark--threat' : 'scrubber__mark--warning'}`} style={{ left: `${position}%` }} />
          ))}
        </div>

        <div className="scrubber-controls" style={{ marginTop: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="speed-group">
            <button className="dock-button" onClick={() => setTime((value) => Math.max(0, value - 8))}><SkipBack size={14} />Jump back</button>
            <button className="dock-button" onClick={() => setTime((value) => Math.max(0, value - 3))}><RefreshCcw size={14} />Rewind</button>
            <button className="dock-button dock-button--active" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause' : 'Play'}</button>
            <button className="dock-button" onClick={() => setTime((value) => Math.min(100, value + 3))}><FastForward size={14} />Advance</button>
            <button className="dock-button" onClick={() => setTime((value) => Math.min(100, value + 8))}><SkipForward size={14} />Jump ahead</button>
          </div>

          <div className="speed-group">
            {[0.5, 1, 2, 4].map((entry) => (
              <button key={entry} className={`dock-button ${speed === entry ? 'dock-button--active' : ''}`} onClick={() => setSpeed(entry)}>{entry}x</button>
            ))}
          </div>
        </div>
      </article>

      <div className="forensics-body">
        <article className="forensics-card glass-panel--elevated forensics-canvas-wrap">
          <ActivityCanvas time={time} />
        </article>

        <article className="forensics-card glass-panel--elevated">
          <div className="panel-section__title">
            <span>Event Log</span>
            <ArrowUpRight size={14} />
          </div>
          <div className="log-list" style={{ marginTop: 16 }}>
            {visibleLogs.map(({ event, timeLabel, title, copy }, index) => (
              <button key={event.id} className={`log-item ${selectedEvent?.id === event.id || index === Math.floor(time / 14) ? 'log-item--active' : ''}`} onClick={() => setSelectedEvent(event)}>
                <div className="log-item__time">{timeLabel}</div>
                <div className="log-item__title">{title}</div>
                <div className="log-item__copy">{copy}</div>
              </button>
            ))}
          </div>
        </article>
      </div>

      <article className="forensics-card glass-panel--elevated event-detail">
        <div className="panel-section__title">
          <span>Selected Event Detail</span>
          <ShieldCheck size={14} />
        </div>
        <div className="detail-copy" style={{ marginTop: 10 }}>Live forensic trace across {agents.length} agents and {threatEvents.length} recent security events.</div>
        <div className="detail-surface" style={{ marginTop: 16 }}>
          <EventDetails event={selectedEvent} />
        </div>
        <div className="summary-chips" style={{ marginTop: 16 }}>
          <button className="badge-pill badge-pill--accent" onClick={() => onNotify('Timeline bookmark captured', 'info')}>Bookmark event</button>
          <button className="badge-pill badge-pill--safe" onClick={() => onNotify('Replay exported', 'success')}>Export replay</button>
        </div>
      </article>
    </section>
  );
}