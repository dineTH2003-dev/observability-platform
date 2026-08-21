import { useState } from 'react';
import { AlertCircle, Edit2, Trash2, Mail } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { conditionOptions, getSeverityColor } from '../types/alert';
import type { AlertRule } from '../types/alert';

interface AlertRuleListProps {
  alertRules: AlertRule[];
  handleToggleRule: (id: string) => void;
  handleDeleteRule: (id: string) => Promise<void>;
  onEditRule: (rule: AlertRule) => void;
}

export function AlertRuleList({ alertRules, handleToggleRule, handleDeleteRule, onEditRule }: AlertRuleListProps) {
  // ID of the rule waiting for delete confirmation; null when dialog is closed
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pendingRule = alertRules.find(r => r.id === pendingDeleteId);

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await handleDeleteRule(pendingDeleteId);
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  };

  return (
    <>
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
                          {Array.isArray(rule.recipients)
                          ? rule.recipients.join(', ')
                          : 'No recipients'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditRule(rule)}
                        className="text-slate-400 hover:text-white h-8 w-8"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      {/* Opens confirmation dialog instead of deleting immediately */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDeleteId(rule.id)}
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

      {/* ── Delete confirmation dialog ─────────────────────────────────── */}
      <Dialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open && !deleting) setPendingDeleteId(null); }}>
        <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-red-400" />
              Delete Alert Rule
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to permanently delete{' '}
              <span className="text-white font-medium">"{pendingRule?.name}"</span>?
              {' '}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setPendingDeleteId(null)}
              disabled={deleting}
              className="bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-lighter"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
