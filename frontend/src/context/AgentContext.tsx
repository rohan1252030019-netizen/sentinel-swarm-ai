import React, { createContext, useContext } from 'react';
import { useAgentSimulation } from '../hooks/useAgentSimulation';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Agent, SocketEvent, SystemMetrics, ThreatEvent } from '../types';

interface AgentContextValue {
  agents: Agent[];
  threatEvents: ThreatEvent[];
  metrics: SystemMetrics;
  socketEvent: SocketEvent | null;
  socketConnected: boolean;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const simulation = useAgentSimulation();
  const socket = useWebSocket('ws://localhost:5000');

  return (
    <AgentContext.Provider
      value={{
        agents: simulation.agents,
        threatEvents: simulation.threatEvents,
        metrics: simulation.metrics,
        socketEvent: socket.lastMessage,
        socketConnected: socket.connected,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  const value = useContext(AgentContext);
  if (!value) {
    throw new Error('useAgentContext must be used within AgentProvider');
  }
  return value;
}