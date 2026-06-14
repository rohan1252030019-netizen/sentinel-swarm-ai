import { Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { POLICY_PROFILES } from '../data/mockData';
import type { PolicyProfile } from '../types';

interface PolicyEditorProps {
  onNotify: (title: string, kind?: 'threat' | 'warning' | 'info' | 'success') => void;
}

function clonePolicies() {
  return POLICY_PROFILES.map((profile) => ({ ...profile, permissions: { ...profile.permissions } }));
}

function trustLabel(value: number) {
  if (value >= 0.9) {
    return 'Trusted';
  }

  if (value >= 0.75) {
    return 'Guarded';
  }

  return 'Quarantine';
}

export function PolicyEditor({ onNotify }: PolicyEditorProps) {
  const [profiles, setProfiles] = useState<PolicyProfile[]>(clonePolicies);
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? 'planner');

  const selected = useMemo(() => profiles.find((profile) => profile.id === selectedId) ?? profiles[0], [profiles, selectedId]);

  const updateSelected = (updater: (profile: PolicyProfile) => PolicyProfile) => {
    setProfiles((current) => current.map((profile) => (profile.id === selectedId ? updater(profile) : profile)));
  };

  const addAgent = () => {
    const next: PolicyProfile = {
      id: `custom-${Date.now()}`,
      name: `CustomAgent_${profiles.length + 1}`,
      type: 'security',
      status: 'healthy',
      trustThreshold: 0.82,
      permissions: { read: true, write: false, execute: false, network: false },
      maxConcurrentTasks: 3,
      quarantineBehavior: 'warn',
      lastModified: 'just now',
    };

    setProfiles((current) => [next, ...current]);
    setSelectedId(next.id);
    onNotify('Custom policy agent created', 'info');
  };

  const applyPolicy = () => {
    setProfiles((current) => current.map((profile) => (profile.id === selectedId ? { ...profile, lastModified: 'just now' } : profile)));
    onNotify(`${selected.name} policy applied`, 'success');
  };

  const resetPolicy = () => {
    setProfiles(clonePolicies());
    setSelectedId(POLICY_PROFILES[0]?.id ?? 'planner');
    onNotify('Policy set restored to default', 'warning');
  };

  if (!selected) {
    return null;
  }

  return (
    <section className="policy-layout">
      <aside className="roster-card glass-panel--elevated">
        <div className="panel-section__title">
          <span>Agent Roster</span>
          <ShieldCheck size={14} />
        </div>

        <div className="roster-list" style={{ marginTop: 16 }}>
          {profiles.map((profile) => (
            <button key={profile.id} className={`roster-item ${selectedId === profile.id ? 'roster-item--active' : ''}`} onClick={() => setSelectedId(profile.id)}>
              <div className="roster-item__name">{profile.name}</div>
              <div className="roster-item__meta">
                <span>{trustLabel(profile.trustThreshold)}</span>
                <span>{profile.trustThreshold.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>

        <button className="add-agent-button dock-button" onClick={addAgent}>
          <Plus size={14} />
          Add Agent
        </button>
      </aside>

      <article className="policy-card glass-panel--elevated">
        <div className="panel-section__title">
          <span>{selected.name}</span>
          <span className="badge-pill badge-pill--accent">Last modified {selected.lastModified}</span>
        </div>

        <div className="policy-copy" style={{ marginTop: 10 }}>{selected.type.toUpperCase()} · {trustLabel(selected.trustThreshold)} policy profile</div>

        <div className="policy-grid" style={{ marginTop: 18 }}>
          <div className="field field--full">
            <label>Trust Threshold</label>
            <div className="range-row">
              <input type="range" min="0" max="1" step="0.01" value={selected.trustThreshold} onChange={(event) => updateSelected((profile) => ({ ...profile, trustThreshold: Number(event.target.value) }))} />
              <span className="range-value">{selected.trustThreshold.toFixed(2)}</span>
            </div>
          </div>

          <div className="field field--full">
            <label>Permissions</label>
            <div className="permission-list">
              {(['read', 'write', 'execute', 'network'] as const).map((permission) => (
                <label key={permission} className="permission-chip">
                  <input
                    type="checkbox"
                    checked={selected.permissions[permission]}
                    onChange={(event) =>
                      updateSelected((profile) => ({
                        ...profile,
                        permissions: { ...profile.permissions, [permission]: event.target.checked },
                      }))
                    }
                  />
                  {permission}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Max concurrent tasks</label>
            <input
              type="number"
              min="1"
              max="12"
              value={selected.maxConcurrentTasks}
              onChange={(event) => updateSelected((profile) => ({ ...profile, maxConcurrentTasks: Number(event.target.value) }))}
            />
          </div>

          <div className="field">
            <label>Quarantine behavior</label>
            <select
              value={selected.quarantineBehavior}
              onChange={(event) => updateSelected((profile) => ({ ...profile, quarantineBehavior: event.target.value as PolicyProfile['quarantineBehavior'] }))}
            >
              <option value="warn">warn</option>
              <option value="throttle">throttle</option>
              <option value="isolate">isolate</option>
              <option value="terminate">terminate</option>
            </select>
          </div>

          <div className="field field--full">
            <div className="summary-chips">
              <span className="badge-pill badge-pill--safe">Trust {selected.trustThreshold.toFixed(2)}</span>
              <span className="badge-pill badge-pill--accent">Tasks {selected.maxConcurrentTasks}</span>
              <span className="badge-pill badge-pill--accent">{trustLabel(selected.trustThreshold)}</span>
            </div>
          </div>

          <div className="field field--full">
            <button className="action-button" onClick={applyPolicy}>Apply Policy</button>
          </div>

          <div className="field field--full">
            <button className="ghost-link" onClick={resetPolicy}>
              <RotateCcw size={12} /> Reset to Default
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}