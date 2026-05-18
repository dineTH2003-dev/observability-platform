import { AlertCircle, Edit2, Trash2, Mail } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { AlertRule, conditionOptions, getSeverityColor } from '../types/alert';

interface AlertRuleListProps {
  alertRules: AlertRule[];
  handleToggleRule: (id: string) => void;
  handleDeleteRule: (id: string) => void;
  onEditRule: (rule: AlertRule) => void;
}

export function AlertRuleList({ alertRules, handleToggleRule, handleDeleteRule, onEditRule }: AlertRuleListProps) {
  return (
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
  );
}
