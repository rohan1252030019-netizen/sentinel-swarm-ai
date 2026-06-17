import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Command,
  FastForward,
  Newspaper,
  Pause,
  Play,
  Plus,
  Radar,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldAlert,
  SkipBack,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react';
import { AgentProvider, useAgentContext } from './context/AgentContext';
import { COMMAND_RESULTS, POLICY_PROFILES } from './data/mockData';
import type { NotificationKind, NotificationToast, View } from './types';
import { Dock } from './components/Dock';
import { ForensicsPlayer } from './components/ForensicsPlayer';
import { GRCBoardroom } from './components/GRCBoardroom';
import { NotificationTray } from './components/NotificationTray';
import { PolicyEditor } from './components/PolicyEditor';
import { RightSidePanel } from './components/RightSidePanel';
import { SpotlightCommand } from './components/SpotlightCommand';
import { SwarmCanvas } from './components/SwarmCanvas';
import { TitleBar } from './components/TitleBar';

function AppShell() {
  const { agents, threatEvents, metrics, socketConnected, socketEvent } = useAgentContext();
  const [activeView, setActiveView] = useState<View>('swarm');
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const seenThreatIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSpotlightOpen(true);
      }

      if (event.key === 'Escape') {
        setSpotlightOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const latestThreat = threatEvents[0];
    if (!latestThreat || seenThreatIdRef.current === latestThreat.id) {
      return;
    }

    seenThreatIdRef.current = latestThreat.id;
    pushNotification('threat', `${latestThreat.type} blocked`, `${latestThreat.sourceAgent} triggered a ${latestThreat.severity} event. ${latestThreat.details}`);
  }, [threatEvents]);

  useEffect(() => {
    if (socketEvent && socketConnected) {
      pushNotification('info', 'Swarm sync', socketEvent.message);
    }
  }, [socketConnected, socketEvent?.id]);

  const pushNotification = (kind: NotificationKind, title: string, body: string) => {
    const next: NotificationToast = {
      id: `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind,
      title,
      body,
      createdAt: Date.now(),
    };

    setNotifications((current) => [next, ...current].slice(0, 8));
  };

  const dismissNotification = (id: string) => {
    setNotifications((current) => current.filter((toast) => toast.id !== id));
  };

  const openCommand = () => setSpotlightOpen(true);

  const handleNavigate = (view: View) => {
    if (view === 'command') {
      setSpotlightOpen(true);
      return;
    }

    setActiveView(view);
    setSpotlightOpen(false);
  };

  const handleQuickAction = (title: string, kind: NotificationKind = 'info') => {
    pushNotification(kind, title, 'Mock action completed in the live command surface.');
  };

  const handleCommandResult = (resultView?: View, kind?: NotificationKind, label?: string) => {
    if (label) {
      handleQuickAction(label, kind ?? 'info');
    }

    if (resultView) {
      handleNavigate(resultView);
    }
  };

  const activeThreats = threatEvents.filter((event) => event.severity === 'high' || event.severity === 'critical').length;
  const healthyAgents = agents.filter((agent) => agent.status === 'healthy' || agent.status === 'recovery').length;

  return (
    <div className="app-shell">
      <TitleBar
        metrics={metrics}
        agentCount={agents.length}
        threatCount={activeThreats}
        healthyCount={healthyAgents}
        onOpenPolicy={() => handleNavigate('policy')}
        onOpenCommand={openCommand}
      />

      <main className={`app-stage ${activeView === 'swarm' ? 'app-stage--swarm' : ''}`}>
        {activeView === 'swarm' && (
          <div className="swarm-stage">
            <div className="swarm-stage__canvas">
              <SwarmCanvas />
            </div>
            <RightSidePanel />
          </div>
        )}

        {activeView === 'grc' && <GRCBoardroom onNotify={handleQuickAction} />}
        {activeView === 'forensics' && <ForensicsPlayer onNotify={handleQuickAction} />}
        {activeView === 'policy' && <PolicyEditor onNotify={handleQuickAction} />}
      </main>

      <Dock activeView={activeView} spotlightOpen={spotlightOpen} onNavigate={handleNavigate} onOpenCommand={openCommand} />

      {spotlightOpen && (
        <SpotlightCommand
          onClose={() => setSpotlightOpen(false)}
          onAction={(result) => handleCommandResult(result.view, result.toastKind, result.label)}
          onNavigate={handleNavigate}
          onQuickAction={handleQuickAction}
        />
      )}

      <NotificationTray notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function App() {
  return (
    <AgentProvider>
      <AppShell />
    </AgentProvider>
  );
}
