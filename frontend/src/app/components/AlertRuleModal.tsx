import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { AlertRule, conditionOptions } from '../types/alert';

interface AlertRuleModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  editingRule: AlertRule | null;
  onSave: (payload: Partial<AlertRule>) => Promise<boolean>;
}

export function AlertRuleModal({ isOpen, setIsOpen, editingRule, onSave }: AlertRuleModalProps) {
  const [ruleData, setRuleData] = useState<Partial<AlertRule>>({
    name: '', condition: '', severity: 'medium', duration: '5', enabled: true, recipients: [], scope: 'global', cooldown: '30', sendOnce: false
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingRule) {
        setRuleData(editingRule);
      } else {
        setRuleData({ name: '', condition: '', severity: 'medium', duration: '5', enabled: true, recipients: [], scope: 'global', cooldown: '30', sendOnce: false });
      }
      setErrorMsg(null);
    }
  }, [isOpen, editingRule]);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSave = async () => {
    setErrorMsg(null);
    if (!ruleData.name?.trim()) return setErrorMsg("Alert name is required");
    if (!ruleData.condition) return setErrorMsg("Please select a trigger condition");
    if (!ruleData.duration || Number(ruleData.duration) <= 0) return setErrorMsg("Duration must be greater than 0");
    if (ruleData.threshold) {
      const t = Number(ruleData.threshold);
      if (t < 0 || t > 100) return setErrorMsg("Threshold must be between 0 and 100");
    }
    if (!ruleData.recipients || ruleData.recipients.length === 0) return setErrorMsg("At least one recipient is required");
    if (ruleData.recipients.some(e => !isValidEmail(e))) return setErrorMsg("Enter valid email addresses only");

    const success = await onSave(ruleData);
    if (success) {
      setIsOpen(false);
    } else {
      setErrorMsg("Failed to save alert rule. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {editingRule ? 'Modify existing alert rule' : 'Define a new alert rule for your monitoring system'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Alert Name *</Label>
            <Input
              value={ruleData.name}
              onChange={(e) => setRuleData({ ...ruleData, name: e.target.value })}
              placeholder="e.g., High CPU Usage Alert"
              className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Trigger Condition *</Label>
            <Select
              value={ruleData.condition}
              onValueChange={(value) => setRuleData({ ...ruleData, condition: value })}
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
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select
                value={ruleData.severity}
                onValueChange={(value: any) => setRuleData({ ...ruleData, severity: value })}
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

            <div className="space-y-2">
              <Label>Duration (minutes) *</Label>
              <Input
                type="number"
                value={ruleData.duration}
                onChange={(e) => setRuleData({ ...ruleData, duration: e.target.value })}
                placeholder="5"
                className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
              />
              <p className="text-xs text-slate-500">Trigger only if condition persists</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Threshold (%) - Optional</Label>
            <Input
              type="number"
              value={ruleData.threshold || ''}
              onChange={(e) => setRuleData({ ...ruleData, threshold: e.target.value })}
              placeholder="e.g., 80"
              className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
            />
            <p className="text-xs text-slate-500">For metric-based conditions</p>
          </div>

          <div className="space-y-2">
            <Label>Scope *</Label>
            <Select
              value={ruleData.scope}
              onValueChange={(value) => setRuleData({ ...ruleData, scope: value })}
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

          <div className="space-y-2">
            <Label>Recipients (comma-separated emails)</Label>
            <Input
              value={ruleData.recipients?.join(', ')}
              onChange={(e) => setRuleData({ ...ruleData, recipients: e.target.value.split(',').map((email) => email.trim()) })}
              placeholder="admin@company.com, devops@company.com"
              className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cooldown (minutes)</Label>
              <Input
                type="number"
                value={ruleData.cooldown}
                onChange={(e) => setRuleData({ ...ruleData, cooldown: e.target.value })}
                placeholder="30"
                className="bg-nebula-navy-dark border-nebula-navy-lighter text-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Send Once Per Incident</Label>
              <div className="flex items-center h-10 px-3 bg-nebula-navy-dark rounded-md border border-nebula-navy-lighter">
                <Switch
                  checked={ruleData.sendOnce}
                  onCheckedChange={(checked) => setRuleData({ ...ruleData, sendOnce: checked })}
                />
                <span className="ml-2 text-sm text-white">
                  {ruleData.sendOnce ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rule Status</Label>
              <div className="flex items-center h-10 px-3 bg-nebula-navy-dark rounded-md border border-nebula-navy-lighter">
                <Switch
                  checked={ruleData.enabled}
                  onCheckedChange={(checked) => setRuleData({ ...ruleData, enabled: checked })}
                />
                <span className="ml-2 text-sm text-white">
                  {ruleData.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-md text-sm border border-red-500/20">
             <AlertCircle className="size-4" />
             {errorMsg}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white"
          >
            {editingRule ? 'Save Changes' : 'Create Alert Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
