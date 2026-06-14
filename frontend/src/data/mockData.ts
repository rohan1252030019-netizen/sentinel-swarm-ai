import { useEffect, useMemo, useRef, useState } from 'react';
import type { Agent, AgentStatus, AgentType, CommandResult, PolicyProfile, SocketEvent, SystemMetrics, ThreatEvent } from '../types';

const AGENT_TYPES: Array<{ type: AgentType; prefix: string }> = [
  { type: 'planner', prefix: 'PlannerAgent' },
  { type: 'security', prefix: 'SecurityAgent' },
  { type: 'memory', prefix: 'MemoryAgent' },
  { type: 'validator', prefix: 'ValidatorAgent' },
  { type: 'compliance', prefix: 'ComplianceAgent' },
  { type: 'recovery', prefix: 'RecoveryAgent' },
];

const THREAT_TYPES: ThreatEvent['type'][] = ['Prompt injection', 'Jailbreak attempt', 'Credential leak', 'Tool abuse'];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createAgentName(type: AgentType, index: number) {
  const hex = (0x1a + index * 7).toString(16).toUpperCase().padStart(2, '0');
  return `${AGENT_TYPES.find((item) => item.type === type)?.prefix ?? 'Agent'}_0x${hex}`;
}

function createInitialAgents(): Agent[] {
  const random = seededRandom(48);
  return Array.from({ length: 50 }, (_, index) => {
    const type = AGENT_TYPES[index % AGENT_TYPES.length].type;
    const radius = 0.55 + random() * 0.35;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    const trustScore = clamp(0.88 - (index % 9) * 0.02 + random() * 0.04, 0.42, 0.99);
    const status: AgentStatus = trustScore < 0.7 ? 'quarantine' : trustScore < 0.82 ? 'threatened' : type === 'recovery' ? 'recovery' : 'healthy';

    return {
      id: `agent-${index}`,
      name: createAgentName(type, index),
      type,
      status,
      trustScore: Number(trustScore.toFixed(2)),
      taskCount: 1 + ((index * 3) % 7),
      latency: 8 + ((index * 5) % 19),
      x,
      y,
      z,
    };
  });
}

function createThreatEvents(agents: Agent[]): ThreatEvent[] {
  const random = seededRandom(1337);
  return Array.from({ length: 20 }, (_, index) => {
    const type = THREAT_TYPES[index % THREAT_TYPES.length];
    const source = agents[(index * 3 + 5) % agents.length];
    const severity: ThreatEvent['severity'] = index % 5 === 0 ? 'critical' : index % 3 === 0 ? 'high' : index % 2 === 0 ? 'medium' : 'low';
    const ago = 8 + index * 11 + Math.floor(random() * 5);

    return {
      id: `threat-${index}`,
      type,
      sourceAgent: source.name,
      details:
        severity === 'critical'
          ? 'Multi-stage payload crossed the prompt boundary and attempted tool escalation.'
          : severity === 'high'
            ? 'Abnormal token pattern detected in downstream output validation.'
            : 'Suspicious instruction framing was rejected by the policy layer.',
      severity,
      occurredAt: Date.now() - ago * 1000,
      ageSeconds: ago,
    };
  });
}

function createPolicyProfiles(): PolicyProfile[] {
  return [
    {
      id: 'planner',
      name: 'PlannerAgent Core',
      type: 'planner',
      status: 'healthy',
      trustThreshold: 0.8,
      permissions: { read: true, write: false, execute: false, network: false },
      maxConcurrentTasks: 8,
      quarantineBehavior: 'throttle',
      lastModified: '14m ago',
    },
    {
      id: 'security',
      name: 'SecurityAgent Sentinel',
      type: 'security',
      status: 'healthy',
      trustThreshold: 0.9,
      permissions: { read: true, write: true, execute: true, network: true },
      maxConcurrentTasks: 6,
      quarantineBehavior: 'isolate',
      lastModified: '2m ago',
    },
    {
      id: 'memory',
      name: 'MemoryAgent Ledger',
      type: 'memory',
      status: 'healthy',
      trustThreshold: 0.84,
      permissions: { read: true, write: true, execute: false, network: false },
      maxConcurrentTasks: 10,
      quarantineBehavior: 'warn',
      lastModified: '27m ago',
    },
    {
      id: 'validator',
      name: 'ValidatorAgent Proof',
      type: 'validator',
      status: 'healthy',
      trustThreshold: 0.88,
      permissions: { read: true, write: false, execute: true, network: false },
      maxConcurrentTasks: 7,
      quarantineBehavior: 'throttle',
      lastModified: '41m ago',
    },
    {
      id: 'compliance',
      name: 'ComplianceAgent Prism',
      type: 'compliance',
      status: 'healthy',
      trustThreshold: 0.86,
      permissions: { read: true, write: false, execute: false, network: true },
      maxConcurrentTasks: 5,
      quarantineBehavior: 'warn',
      lastModified: '6m ago',
    },
    {
      id: 'recovery',
      name: 'RecoveryAgent Atlas',
      type: 'recovery',
      status: 'recovery',
      trustThreshold: 0.78,
      permissions: { read: true, write: true, execute: true, network: false },
      maxConcurrentTasks: 4,
      quarantineBehavior: 'terminate',
      lastModified: '9m ago',
    },
  ];
}

function createCommandResults(): CommandResult[] {
  return [
    { id: 'agent-audit', category: 'Agents', label: 'PlannerAgent_0x1A', description: 'Inspect trust graph, task queue, and recent decisions.', shortcut: 'Enter', icon: 'scan', view: 'swarm' },
    { id: 'agent-memory', category: 'Agents', label: 'MemoryAgent_0x22', description: 'Review historical context and memory integrity.', shortcut: 'Shift+Enter', icon: 'book-open', view: 'policy' },
    { id: 'simulate-attack', category: 'Actions', label: 'Simulate Attack', description: 'Launch a controlled prompt-injection drill.', shortcut: '⌘1', icon: 'triangle-alert', toastKind: 'threat', view: 'swarm' },
    { id: 'audit-agents', category: 'Actions', label: 'Audit Agents', description: 'Refresh the live swarm posture and reputation.', shortcut: '⌘2', icon: 'shield-check', toastKind: 'info', view: 'swarm' },
    { id: 'grc-report', category: 'Reports', label: 'GRC Report', description: 'Open the executive boardroom summary.', shortcut: '⌘3', icon: 'newspaper', view: 'grc' },
    { id: 'self-heal', category: 'Actions', label: 'Run Self-Heal', description: 'Trigger a recovery and rollback sweep.', shortcut: '⌘4', icon: 'refresh-cw', toastKind: 'success', view: 'swarm' },
  ];
}

export const AGENTS: Agent[] = createInitialAgents();
export const THREAT_EVENTS: ThreatEvent[] = createThreatEvents(AGENTS);
export const METRICS: SystemMetrics = {
  inputScan: 18,
  consensus: 32,
  uptime: 99.97,
  outputSanitization: 24,
  swarmSync: 45,
  selfHealRollback: 650,
  breachCostSaved: 1280000,
};
export const POLICY_PROFILES = createPolicyProfiles();
export const COMMAND_RESULTS = createCommandResults();

export function useAgentSimulation() {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [threatEvents, setThreatEvents] = useState<ThreatEvent[]>(THREAT_EVENTS);
  const [metrics, setMetrics] = useState<SystemMetrics>(METRICS);
  const counterRef = useRef(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      counterRef.current += 1;

      setAgents((current) =>
        current.map((agent, index) => {
          const drift = Math.sin((counterRef.current + index) / 5) * 0.015;
          const trustScore = clamp(agent.trustScore + drift - (agent.status === 'threatened' ? 0.01 : 0), 0.35, 0.99);
          const status: AgentStatus = trustScore < 0.68 ? 'quarantine' : trustScore < 0.8 ? 'threatened' : agent.type === 'recovery' ? 'recovery' : 'healthy';

          return {
            ...agent,
            trustScore: Number(trustScore.toFixed(2)),
            status,
            latency: clamp(agent.latency + Math.round(Math.sin((counterRef.current + index) / 3)), 5, 72),
            taskCount: clamp(agent.taskCount + (index % 4 === 0 ? 1 : 0), 1, 12),
          };
        }),
      );

      setMetrics((current) => ({
        ...current,
        consensus: Number(clamp(current.consensus + Math.sin(counterRef.current / 4) * 0.6, 28, 39).toFixed(0)),
        swarmSync: Number(clamp(current.swarmSync + Math.cos(counterRef.current / 3) * 0.7, 38, 52).toFixed(0)),
        selfHealRollback: Number(clamp(current.selfHealRollback + Math.sin(counterRef.current / 6) * 7, 560, 720).toFixed(0)),
        uptime: Number(clamp(current.uptime + 0.001, 99.91, 99.99).toFixed(2)),
      }));

      if (counterRef.current % 4 === 0) {
        const source = AGENTS[(counterRef.current * 3) % AGENTS.length];
        const newThreat: ThreatEvent = {
          id: `live-threat-${counterRef.current}`,
          type: THREAT_TYPES[counterRef.current % THREAT_TYPES.length],
          sourceAgent: source.name,
          details: 'Live payload drift detected and blocked by the security shell.',
          severity: counterRef.current % 8 === 0 ? 'critical' : 'high',
          occurredAt: Date.now(),
          ageSeconds: 0,
        };

        setThreatEvents((current) => [newThreat, ...current].slice(0, 20));
        setAgents((current) =>
          current.map((agent) =>
            agent.id === source.id
              ? { ...agent, status: 'threatened', trustScore: Number(clamp(agent.trustScore - 0.08, 0.35, 0.99).toFixed(2)) }
              : agent,
          ),
        );
      }

      if (counterRef.current % 6 === 0) {
        setAgents((current) =>
          current.map((agent) =>
            agent.type === 'recovery' || agent.status === 'quarantine'
              ? { ...agent, status: 'recovery', trustScore: Number(clamp(agent.trustScore + 0.03, 0.35, 0.99).toFixed(2)) }
              : agent,
          ),
        );
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, []);

  return { agents, threatEvents, metrics };
}

export function useWebSocket(url: string) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<SocketEvent | null>(null);
  const [messages, setMessages] = useState<SocketEvent[]>([]);

  useEffect(() => {
    setConnected(true);
    const interval = window.setInterval(() => {
      const message: SocketEvent = {
        id: `socket-${Date.now()}`,
        channel: url,
        message: `Swarm sync packet from ${AGENTS[(messages.length * 5) % AGENTS.length].name}`,
        receivedAt: Date.now(),
      };

      setLastMessage(message);
      setMessages((current) => [message, ...current].slice(0, 8));
    }, 5000);

    return () => {
      setConnected(false);
      window.clearInterval(interval);
    };
  }, [url]);

  return useMemo(
    () => ({ connected, lastMessage, messages, send: (payload: string) => setLastMessage({ id: `socket-${Date.now()}`, channel: url, message: payload, receivedAt: Date.now() }) }),
    [connected, lastMessage, messages, url],
  );
}