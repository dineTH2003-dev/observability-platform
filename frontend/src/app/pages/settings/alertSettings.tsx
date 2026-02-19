import { useState } from 'react';
import { Bell, Plus, Edit2, Trash2, Mail, TestTube2, AlertCircle, Users, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  threshold?: string;
  duration: string;
  enabled: boolean;
  recipients: string[];
  scope: string;
  cooldown: string;
  sendOnce: boolean;
}

export function AlertSettings() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [emailChannelEnabled, setEmailChannelEnabled] = useState(true);
  const [emailAddress, setEmailAddress] = useState('admin@company.com');

  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: 'rule-1',
      name: 'Critical System Health',
      condition: 'system_health_critical',
      severity: 'critical',
      duration: '1',
      enabled: true,
      recipients: ['admin@company.com'],
      scope: 'global',
      cooldown: '30',
      sendOnce: false,
    },
    {
      id: 'rule-2',
      name: 'High-Severity Anomaly Detected',
      condition: 'anomaly_high_severity',
      severity: 'high',
      duration: '2',
      enabled: true,
      recipients: ['devops@company.com'],
      scope: 'global',
      cooldown: '15',
      sendOnce: true,
    },
    {
      id: 'rule-3',
      name: 'Service Unavailable',
      condition: 'service_unavailable',
      severity: 'critical',
      threshold: '5',
      duration: '5',
      enabled: false,
      recipients: ['oncall@company.com'],
      scope: 'application',
      cooldown: '60',
      sendOnce: false,
    },
  ]);

  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    condition: '',
    severity: 'medium',
    duration: '5',
    enabled: true,
    recipients: [],
    scope: 'global',
    cooldown: '30',
    sendOnce: false,
  });

  const handleToggleRule = (ruleId: string) => {
    setAlertRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    setAlertRules(rules => rules.filter(rule => rule.id !== ruleId));
  };

  const handleCreateRule = () => {
    const rule: AlertRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name || 'New Alert Rule',
      condition: newRule.condition || 'custom_condition',
      severity: newRule.severity || 'medium',
      duration: newRule.duration || '5',
      enabled: newRule.enabled ?? true,
      recipients: newRule.recipients || [],
      scope: newRule.scope || 'global',
      cooldown: newRule.cooldown || '30',
      sendOnce: newRule.sendOnce ?? false,
      threshold: newRule.threshold,
    };

    setAlertRules([...alertRules, rule]);
    setIsCreateDialogOpen(false);
    setNewRule({
      name: '',
      condition: '',
      severity: 'medium',
      duration: '5',
      enabled: true,
      recipients: [],
      scope: 'global',
      cooldown: '30',
      sendOnce: false,
    });
  };

  const handleTestNotification = () => {
    // Mock test notification
    alert(`Test notification sent to ${emailAddress}`);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const conditionOptions = [
    { value: 'system_health_critical', label: 'System Health = Critical' },
    { value: 'system_health_degraded', label: 'System Health = Degraded' },
    { value: 'anomaly_critical', label: 'Critical Anomaly Detected' },
    { value: 'anomaly_high_severity', label: 'High-Severity Anomaly Detected' },
    { value: 'service_unavailable', label: 'Service Unavailable for > X minutes' },
    { value: 'agent_disconnected', label: 'Agent Disconnected' },
    { value: 'error_rate_high', label: 'Error Rate Exceeds Threshold' },
    { value: 'latency_high', label: 'Latency Exceeds Threshold' },
  ];

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
          onClick={() => setIsCreateDialogOpen(true)}
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
            <div className="flex items-center gap-2">
              <Switch checked={emailChannelEnabled} onCheckedChange={setEmailChannelEnabled} />
              <span className="text-sm text-white">Enable Alerts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Alert Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alert Events and Recipients Row */}
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
                      <Checkbox id="incident-created" defaultChecked />
                      <label htmlFor="incident-created" className="text-white text-sm cursor-pointer">
                        Incident Created (Critical / High)
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox id="incident-assigned" defaultChecked />
                      <label htmlFor="incident-assigned" className="text-white text-sm cursor-pointer">
                        Incident Assigned
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox id="incident-acknowledged" />
                      <label htmlFor="incident-acknowledged" className="text-white text-sm cursor-pointer">
                        Incident Acknowledged
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox id="incident-resolved" defaultChecked />
                      <label htmlFor="incident-resolved" className="text-white text-sm cursor-pointer">
                        Incident Resolved
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-nebula-navy-dark rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox id="agent-disconnected" defaultChecked />
                      <label htmlFor="agent-disconnected" className="text-white text-sm cursor-pointer">
                        Agent Disconnected
                      </label>
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
                    <Select defaultValue="admin-devops">
                      <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                        <SelectValue />
                      </SelectTrigger>
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
                    <Select defaultValue="assigned">
                      <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                        <SelectItem value="assigned">Assigned Engineer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="devops">DevOps Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Incident Resolved</Label>
                    <Select defaultValue="admin">
                      <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                        <SelectValue />
                      </SelectTrigger>
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

          {/* Alert Rules Section */}
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-nebula-cyan/10 flex items-center justify-center">
                  <AlertCircle className="size-5 text-nebula-cyan" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Advanced Alert Rules</h3>
                  <p className="text-sm text-slate-400">Custom conditions and thresholds</p>
                </div>
              </div>

              <div className="space-y-3">
                {alertRules.length === 0 ? (
                  <div className="p-8 text-center">
                    <AlertCircle className="size-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No alert rules configured.</p>
                  </div>
                ) : (
                  alertRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter hover:border-nebula-purple/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={() => handleToggleRule(rule.id)}
                            />
                            <h4 className="text-white font-medium">{rule.name}</h4>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                              {rule.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-400">
                              {conditionOptions.find(c => c.value === rule.condition)?.label || rule.condition}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>Duration: {rule.duration} min</span>
                            {rule.threshold && <span>Threshold: {rule.threshold}%</span>}
                            <span>Cooldown: {rule.cooldown} min</span>
                            <span>Scope: {rule.scope}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="size-3 text-slate-500" />
                            <span className="text-xs text-slate-400">
                              {rule.recipients.join(', ') || 'No recipients'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-white h-8 w-8"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-slate-400 hover:text-red-400 h-8 w-8"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Notification Channels & Settings */}
        <div className="space-y-6">
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white">
          Save Alert Settings
        </Button>
      </div>

      {/* Create Alert Rule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Alert Rule</DialogTitle>
            <DialogDescription className="text-slate-400">
              Define a new alert rule for your monitoring system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Alert Name */}
            <div className="space-y-2">
              <Label>Alert Name *</Label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="e.g., High CPU Usage Alert"
                className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
              />
            </div>

            {/* Trigger Condition */}
            <div className="space-y-2">
              <Label>Trigger Condition *</Label>
              <Select
                value={newRule.condition}
                onValueChange={(value) => setNewRule({ ...newRule, condition: value })}
              >
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue placeholder="Select condition..." />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  {conditionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Severity */}
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select
                  value={newRule.severity}
                  onValueChange={(value: any) => setNewRule({ ...newRule, severity: value })}
                >
                  <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  value={newRule.duration}
                  onChange={(e) => setNewRule({ ...newRule, duration: e.target.value })}
                  placeholder="5"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
                />
                <p className="text-xs text-slate-500">Trigger only if condition persists</p>
              </div>
            </div>

            {/* Threshold (optional) */}
            <div className="space-y-2">
              <Label>Threshold (%) - Optional</Label>
              <Input
                type="number"
                value={newRule.threshold || ''}
                onChange={(e) => setNewRule({ ...newRule, threshold: e.target.value })}
                placeholder="e.g., 80"
                className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
              />
              <p className="text-xs text-slate-500">For metric-based conditions</p>
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <Label>Scope *</Label>
              <Select
                value={newRule.scope}
                onValueChange={(value) => setNewRule({ ...newRule, scope: value })}
              >
                <SelectTrigger className="bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                  <SelectItem value="global">Global System</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                  <SelectItem value="production">Production Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <Label>Recipients (comma-separated emails)</Label>
              <Input
                value={newRule.recipients?.join(', ')}
                onChange={(e) =>
                  setNewRule({
                    ...newRule,
                    recipients: e.target.value.split(',').map((email) => email.trim()),
                  })
                }
                placeholder="admin@company.com, devops@company.com"
                className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Cooldown */}
              <div className="space-y-2">
                <Label>Cooldown (minutes)</Label>
                <Input
                  type="number"
                  value={newRule.cooldown}
                  onChange={(e) => setNewRule({ ...newRule, cooldown: e.target.value })}
                  placeholder="30"
                  className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
                />
              </div>

              {/* Send Once */}
              <div className="space-y-2">
                <Label>Send Once Per Incident</Label>
                <div className="flex items-center h-10 px-3 bg-nebula-navy-dark rounded-md border border-nebula-navy-lighter">
                  <Switch
                    checked={newRule.sendOnce}
                    onCheckedChange={(checked) => setNewRule({ ...newRule, sendOnce: checked })}
                  />
                  <span className="ml-2 text-sm text-white">
                    {newRule.sendOnce ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRule}
              className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white"
            >
              Create Alert Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}