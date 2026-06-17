import { useEffect, useMemo, useRef, useState } from 'react';
import type { Agent } from '../types';
import { useAgentContext } from '../context/AgentContext';

interface HoverState {
  agent: Agent;
  x: number;
  y: number;
  trust: number;
  taskCount: number;
  latency: number;
  status: Agent['status'];
}

interface ProjectedNode {
  agent: Agent;
  x: number;
  y: number;
  z: number;
  screenX: number;
  screenY: number;
  radius: number;
}

function resolveColor(name: string, fallback: string) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rotatePoint(x: number, y: number, z: number, rotationX: number, rotationY: number) {
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);

  const rotatedX = x * cosY - z * sinY;
  const rotatedZ = x * sinY + z * cosY;
  const rotatedY = y * cosX - rotatedZ * sinX;
  const finalZ = y * sinX + rotatedZ * cosX;

  return { x: rotatedX, y: rotatedY, z: finalZ };
}

export function SwarmCanvas() {
  const { agents } = useAgentContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const rotationRef = useRef({ x: -0.25, y: 0.28 });
  const zoomRef = useRef(1.05);
  const dragRef = useRef({ active: false, x: 0, y: 0, rotationX: 0, rotationY: 0 });
  const cursorRef = useRef({ x: 0, y: 0 });
  const nodesRef = useRef<ProjectedNode[]>([]);
  const agentsRef = useRef<Agent[]>(agents);
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [hoverPoint, setHoverPoint] = useState({ x: 0, y: 0 });
  const palette = useMemo(
    () => ({
      void0: resolveColor('--void-0', '#020408'),
      void1: resolveColor('--void-1', '#060c14'),
      void2: resolveColor('--void-2', '#0a1628'),
      accent: resolveColor('--text-accent', '#00c8ff'),
      threat: resolveColor('--text-threat', '#ff6060'),
      safe: resolveColor('--text-safe', '#44e880'),
      purple: resolveColor('--text-purple', '#9f8dff'),
      gold: resolveColor('--text-gold', '#f0a500'),
      text: resolveColor('--text-primary', '#e8f4ff'),
      secondary: resolveColor('--text-secondary', 'rgba(180,210,255,0.6)'),
    }),
    [],
  );

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);

    const draw = (time: number) => {
      const rect = wrapper.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const agentsNow = agentsRef.current;
      const centerX = width / 2;
      const centerY = height / 2;
      const pulse = time / 1000;
      const projectionDistance = 380 * zoomRef.current;

      context.clearRect(0, 0, width, height);
      context.fillStyle = palette.void0;
      context.fillRect(0, 0, width, height);

      const glowA = context.createRadialGradient(width * 0.25, height * 0.28, 10, width * 0.25, height * 0.28, Math.max(width, height) * 0.42);
      glowA.addColorStop(0, 'rgba(0, 200, 255, 0.14)');
      glowA.addColorStop(1, 'rgba(0, 200, 255, 0)');
      context.fillStyle = glowA;
      context.fillRect(0, 0, width, height);

      const glowB = context.createRadialGradient(width * 0.75, height * 0.2, 10, width * 0.75, height * 0.2, Math.max(width, height) * 0.38);
      glowB.addColorStop(0, 'rgba(159, 141, 255, 0.12)');
      glowB.addColorStop(1, 'rgba(159, 141, 255, 0)');
      context.fillStyle = glowB;
      context.fillRect(0, 0, width, height);

      const glowC = context.createRadialGradient(width * 0.56, height * 0.82, 10, width * 0.56, height * 0.82, Math.max(width, height) * 0.42);
      glowC.addColorStop(0, 'rgba(68, 232, 128, 0.08)');
      glowC.addColorStop(1, 'rgba(68, 232, 128, 0)');
      context.fillStyle = glowC;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.55;
      context.strokeStyle = 'rgba(30, 80, 140, 0.18)';
      context.lineWidth = 1;
      for (let x = -80 + (pulse * 10) % 40; x < width + 80; x += 40) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = -80 + (pulse * 12) % 40; y < height + 80; y += 40) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.restore();

      const rotationX = rotationRef.current.x + dragRef.current.rotationX;
      const rotationY = rotationRef.current.y + dragRef.current.rotationY + pulse * 0.08;
      const projected: ProjectedNode[] = agentsNow.map((agent) => {
        const rotated = rotatePoint(agent.x, agent.y, agent.z, rotationX, rotationY);
        const depthScale = projectionDistance / (projectionDistance - rotated.z * 180);
        return {
          agent,
          x: rotated.x,
          y: rotated.y,
          z: rotated.z,
          screenX: centerX + rotated.x * 200 * depthScale,
          screenY: centerY + rotated.y * 200 * depthScale,
          radius: clamp(8 * depthScale, 3.5, 12),
        };
      });

      nodesRef.current = projected;

      context.lineWidth = 1;
      projected.forEach((node, index) => {
        for (let i = index + 1; i < projected.length; i += 1) {
          const other = projected[i];
          const distance = Math.hypot(node.x - other.x, node.y - other.y, node.z - other.z);
          if (distance > 0.62) {
            continue;
          }

          const alpha = clamp(0.28 - distance * 0.32, 0.04, 0.2);
          context.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
          context.beginPath();
          context.moveTo(node.screenX, node.screenY);
          context.lineTo(other.screenX, other.screenY);
          context.stroke();

          const packetTime = (pulse * 0.22 + index * 0.018) % 1;
          const packetX = node.screenX + (other.screenX - node.screenX) * packetTime;
          const packetY = node.screenY + (other.screenY - node.screenY) * packetTime;
          const packetColor = node.agent.status === 'threatened' || other.agent.status === 'threatened' ? palette.threat : palette.accent;
          context.fillStyle = packetColor;
          context.beginPath();
          context.arc(packetX, packetY, 1.2 + Math.sin(pulse * 6 + index) * 0.4, 0, Math.PI * 2);
          context.fill();
        }
      });

      projected.forEach((node, index) => {
        const statusColor = node.agent.type === 'planner' ? palette.purple : node.agent.type === 'recovery' ? palette.safe : node.agent.status === 'threatened' || node.agent.status === 'quarantine' ? palette.threat : palette.accent;
        const ringPulse = 1 + Math.sin(pulse * 3 + index) * 0.16;

        context.shadowBlur = 20;
        context.shadowColor = statusColor;
        context.fillStyle = statusColor;
        context.beginPath();
        context.arc(node.screenX, node.screenY, node.radius, 0, Math.PI * 2);
        context.fill();

        context.shadowBlur = 0;
        context.strokeStyle = `rgba(255, 255, 255, ${0.14 + node.agent.trustScore * 0.16})`;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(node.screenX, node.screenY, node.radius * 1.9 * ringPulse, 0, Math.PI * 2);
        context.stroke();

        context.strokeStyle = `rgba(0, 200, 255, ${0.05 + node.agent.trustScore * 0.08})`;
        context.beginPath();
        context.arc(node.screenX, node.screenY, node.radius * 3.2, 0, Math.PI * 2);
        context.stroke();
      });

      if (hovered) {
        const node = projected.find((entry) => entry.agent.id === hovered.agent.id);
        if (node) {
          const nextX = node.screenX + 12;
          const nextY = node.screenY + 12;
          setHoverPoint({ x: nextX, y: nextY });
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [hovered, palette]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) {
        return;
      }

      const rect = wrapper.getBoundingClientRect();
      const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      cursorRef.current = pointer;

      if (dragRef.current.active) {
        dragRef.current.rotationY = (event.clientX - dragRef.current.x) * 0.0035;
        dragRef.current.rotationX = (event.clientY - dragRef.current.y) * 0.0028;
        return;
      }

      const closest = nodesRef.current.reduce<{ node: ProjectedNode | null; distance: number }>(
        (result, candidate) => {
          const distance = Math.hypot(candidate.screenX - pointer.x, candidate.screenY - pointer.y);
          if (distance < result.distance) {
            return { node: candidate, distance };
          }
          return result;
        },
        { node: null, distance: 28 },
      );

      if (closest.node) {
        setHovered({
          agent: closest.node.agent,
          x: pointer.x,
          y: pointer.y,
          trust: closest.node.agent.trustScore,
          taskCount: closest.node.agent.taskCount,
          latency: closest.node.agent.latency,
          status: closest.node.agent.status,
        });
      } else {
        setHovered(null);
      }
    };

    const handleUp = () => {
      if (dragRef.current.active) {
        rotationRef.current.x += dragRef.current.rotationX;
        rotationRef.current.y += dragRef.current.rotationY;
      }

      dragRef.current.active = false;
    };

    const handleDown = (event: PointerEvent) => {
      dragRef.current.active = true;
      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;
      dragRef.current.rotationX = 0;
      dragRef.current.rotationY = 0;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomRef.current = clamp(zoomRef.current + event.deltaY * -0.0007, 0.8, 1.6);
    };

    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    wrapper.addEventListener('pointermove', handleMove);
    wrapper.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointerup', handleUp);
    wrapper.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      wrapper.removeEventListener('pointermove', handleMove);
      wrapper.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      wrapper.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="swarm-stage__canvas" ref={wrapperRef}>
      <canvas ref={canvasRef} className="swarm-canvas" />

      {hovered && (
        <div
          className="compact-card glass-panel--elevated"
          style={{
            position: 'absolute',
            left: `${hoverPoint.x}px`,
            top: `${hoverPoint.y}px`,
            width: '250px',
            pointerEvents: 'none',
            transform: 'translate(0, 0)',
            zIndex: 15,
          }}
        >
          <div className="panel-section__title" style={{ marginBottom: 8 }}>
            <span>{hovered.agent.name}</span>
            <span className={`badge-pill ${hovered.trust < 0.7 ? 'badge-pill--threat' : 'badge-pill--accent'}`}>
              {hovered.trust < 0.7 ? '⚠ Quarantine' : hovered.status}
            </span>
          </div>
          <div className="compact-copy">Trust score {hovered.trust.toFixed(2)} · {hovered.taskCount} tasks · {hovered.latency}ms latency</div>
          <div className="metric-row" style={{ marginTop: 8 }}>
            <span className="metric-row__label">Reputation</span>
            <span className="metric-row__value">{Math.round(hovered.trust * 100)}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', marginTop: 8, background: 'rgba(255,255,255,0.06)' }}>
            <div
              style={{
                width: `${hovered.trust * 100}%`,
                height: '100%',
                background: hovered.trust < 0.7 ? 'linear-gradient(90deg, var(--text-threat), var(--text-amber))' : 'linear-gradient(90deg, var(--text-purple), var(--text-accent))',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}