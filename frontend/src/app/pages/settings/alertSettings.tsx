import { useState, useEffect } from 'react';
import { Bell, Plus, Users } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

import { AlertRule } from './types';
import { AlertRuleList } from '../../components/AlertRuleList';
import { AlertRuleModal } from '../../components/AlertRuleModal';

export function AlertSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [saveSettingsError, setSaveSettingsError] = useState<string | null>(null);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

  const [alertEvents, setAlertEvents] = useState({
    incidentCreated: true,
    incidentAssigned: true,
    incidentAcknowledged: false,
    incidentResolved: true,
    agentDisconnected: true,
  });

  const [recipients, setRecipients] = useState({
    incidentCreated: "admin-devops",
    incidentAssigned: "assigned",
    incidentResolved: "admin",
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/alert-settings`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setAlertEvents(data.alertEvents || {});
          setRecipients(data.recipients || {});
        }
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const fetchAlertRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlertRules(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch alert rules', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchAlertRules();
  }, []);

  const handleToggleRule = async (ruleId: string) => {
    try {
      const rule = alertRules.find(r => r.id === ruleId);
      if (!rule) return;

      const res = await fetch(`${API_BASE}/alerts/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });

      if (res.ok) {
        const updatedRule = await res.json();
        setAlertRules(rules => rules.map(r => (r.id === ruleId ? updatedRule : r)));
      }
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${ruleId}`, { method: 'DELETE' });
      if (res.ok) {
        setAlertRules(rules => rules.filter(rule => rule.id !== ruleId));
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleSaveRulePayload = async (payload: Partial<AlertRule>): Promise<boolean> => {
    try {
      if (editingRule) {
        const res = await fetch(`${API_BASE}/alerts/${editingRule.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return false;
        const updatedRule = await res.json();
        setAlertRules(prev => prev.map(r => r.id === editingRule.id ? updatedRule : r));
      } else {
        const res = await fetch(`${API_BASE}/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return false;
        const createdRule = await res.json();
        setAlertRules(prev => [...prev, createdRule]);
      }
      return true;
    } catch (err) {
      console.error('Save failed', err);
      return false;
    }
  };

  const handleSaveSettings = async () => {
    setSaveSettingsError(null);
    setSaveSettingsSuccess(false);

    const atLeastOneEvent = Object.values(alertEvents).some(v => v);
    if (!atLeastOneEvent) {
      return setSaveSettingsError("Select at least one alert event");
    }

    const invalidRecipient = Object.values(recipients).some(v => !v);
    if (invalidRecipient) {
      return setSaveSettingsError("All recipient fields must be selected");
    }

    try {
      const res = await fetch(`${API_BASE}/alert-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertEvents, recipients }),
      });

      if (res.ok) {
        setSaveSettingsSuccess(true);
        setTimeout(() => setSaveSettingsSuccess(false), 3000);
      } else {
        setSaveSettingsError("Failed to save settings. Please try again.");
      }
    } catch (err) {
      console.error('Save failed', err);
      setSaveSettingsError("Network error. Failed to save settings.");
    }
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: AlertRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Alert Settings</h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure alert rules, thresholds, and notification preferences
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white"
        >
          <Plus className="size-4 mr-2" />
          Create Alert Rule
        </Button>
      </div>

      {/* Alert Status Banner */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Bell className="size-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Alert System Active</p>
                <p className="text-sm text-slate-400">
                  {alertRules.filter(r => r.enabled).length} rules enabled
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Alert Events Section */}
            <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-nebula-blue/10 flex items-center justify-center">
                    <Bell className="size-5 text-nebula-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Alert Events</h3>
                    <p className="text-sm text-slate-400">When to send alerts</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox id="incident-created" checked={alertEvents.incidentCreated} onCheckedChange={(c) => setAlertEvents(p => ({ ...p, incidentCreated: !!c }))}/>
                      <label htmlFor="incident-created" className="text-white text-sm cursor-pointer">Incident Created (Critical / High)</label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox id="incident-assigned" checked={alertEvents.incidentAssigned} onCheckedChange={(c) => setAlertEvents(p => ({ ...p, incidentAssigned: !!c }))} />
                      <label htmlFor="incident-assigned" className="text-white text-sm cursor-pointer">Incident Assigned</label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox id="incident-acknowledged" checked={alertEvents.incidentAcknowledged} onCheckedChange={(c) => setAlertEvents(p => ({ ...p, incidentAcknowledged: !!c }))} />
                      <label htmlFor="incident-acknowledged" className="text-white text-sm cursor-pointer">Incident Acknowledged</label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox id="incident-resolved" checked={alertEvents.incidentResolved} onCheckedChange={(c) => setAlertEvents(p => ({ ...p, incidentResolved: !!c })) } />
                      <label htmlFor="incident-resolved" className="text-white text-sm cursor-pointer">Incident Resolved</label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox id="agent-disconnected" checked={alertEvents.agentDisconnected} onCheckedChange={(c) => setAlertEvents(p => ({ ...p, agentDisconnected: !!c }))} />
                      <label htmlFor="agent-disconnected" className="text-white text-sm cursor-pointer">Agent Disconnected</label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recipients Section */}
            <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-nebula-purple/10 flex items-center justify-center">
                    <Users className="size-5 text-nebula-purple" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Alert Recipients</h3>
                    <p className="text-sm text-slate-400">Who gets alerts for each event</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Incident Created</Label>
                    <Select value={recipients.incidentCreated} onValueChange={(v) => setRecipients(p => ({ ...p, incidentCreated: v }))}>
                      <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="devops">DevOps Group</SelectItem>
                        <SelectItem value="admin-devops">Admin + DevOps Group</SelectItem>
                        <SelectItem value="all">All Engineers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Incident Assigned</Label>
                    <Select value={recipients.incidentAssigned} onValueChange={(v) => setRecipients(p => ({ ...p, incidentAssigned: v }))}>
                      <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                        <SelectItem value="assigned">Assigned Engineer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="devops">DevOps Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Incident Resolved</Label>
                    <Select value={recipients.incidentResolved} onValueChange={(v) => setRecipients(p => ({ ...p, incidentResolved: v }))}>
                      <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="devops">DevOps Group</SelectItem>
                        <SelectItem value="assigned">Assigned Engineer</SelectItem>
                        <SelectItem value="all">All Engineers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <AlertRuleList
            alertRules={alertRules}
            handleToggleRule={handleToggleRule}
            handleDeleteRule={handleDeleteRule}
            onEditRule={openEditModal}
          />

        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        {saveSettingsError && <span className="text-red-400 text-sm">{saveSettingsError}</span>}
        {saveSettingsSuccess && <span className="text-green-400 text-sm">Settings saved successfully!</span>}
        <Button
          onClick={handleSaveSettings}
          className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white"
        >
          Save Alert Settings
        </Button>
      </div>

      <AlertRuleModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        editingRule={editingRule}
        onSave={handleSaveRulePayload}
      />
    </div>
  );
}