export type View = 'swarm' | 'command' | 'grc' | 'forensics' | 'policy';

export type AgentType =
  | 'planner'
  | 'security'
  | 'memory'
  | 'validator'
  | 'compliance'
  | 'recovery';

export type AgentStatus = 'healthy' | 'threatened' | 'quarantine' | 'recovery';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  trustScore: number;
  taskCount: number;
  latency: number;
  x: number;
  y: number;
  z: number;
}

export type ThreatType = 'Prompt injection' | 'Jailbreak attempt' | 'Credential leak' | 'Tool abuse';
export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatEvent {
  id: string;
  type: ThreatType;
  sourceAgent: string;
  details: string;
  severity: ThreatSeverity;
  occurredAt: number;
  ageSeconds?: number;
}

export interface SystemMetrics {
  inputScan: number;
  consensus: number;
  uptime: number;
  outputSanitization: number;
  swarmSync: number;
  selfHealRollback: number;
  breachCostSaved: number;
}

export type NotificationKind = 'threat' | 'warning' | 'info' | 'success';

export interface NotificationToast {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: number;
}

export interface PolicyProfile {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  trustThreshold: number;
  permissions: Record<'read' | 'write' | 'execute' | 'network', boolean>;
  maxConcurrentTasks: number;
  quarantineBehavior: 'warn' | 'throttle' | 'isolate' | 'terminate';
  lastModified: string;
}

export interface CommandResult {
  id: string;
  category: 'Agents' | 'Actions' | 'Reports';
  label: string;
  description: string;
  shortcut: string;
  icon: string;
  view?: View;
  toastKind?: NotificationKind;
}

export interface SocketEvent {
  id: string;
  channel: string;
  message: string;
  receivedAt: number;
}