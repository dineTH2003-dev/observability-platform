import { useState } from 'react';
import { X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { toast } from 'sonner';

interface LogAnalysesConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  currentLogPath?: string;
  currentEnabled: boolean;
  onSave: (logPath: string, enabled: boolean) => void;
}

export function LogAnalysesConfigModal({
  isOpen,
  onClose,
  serviceName,
  currentLogPath = '',
  currentEnabled,
  onSave,
}: LogAnalysesConfigModalProps) {
  const [logPath, setLogPath] = useState(currentLogPath);
  const [enabled, setEnabled] = useState(currentEnabled);
  const [isIngesting, setIsIngesting] = useState(false);

  const handleSave = async () => {
    if (enabled && !logPath.trim()) {
      toast.error('Please provide a log path to enable log analyses');
      return;
    }

    setIsIngesting(true);

    // Simulate API call to configure log agent
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (enabled && logPath.trim()) {
      // Simulate log ingestion via backend API
      toast.success(`Log agent configured successfully! Ingesting logs from: ${logPath}`);
    } else {
      toast.success('Log analyses configuration updated');
    }

    onSave(logPath, enabled);
    setIsIngesting(false);
    onClose();
  };

  const handleCancel = () => {
    setLogPath(currentLogPath);
    setEnabled(currentEnabled);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="bg-nebula-navy-light border-nebula-navy-lighter max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-nebula-navy-lighter">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-nebula-cyan/10 flex items-center justify-center">
              <FileText className="size-5 text-nebula-cyan" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Log Analyses Configuration</h2>
              <p className="text-sm text-slate-400 mt-0.5">{serviceName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter -mr-2"
          >
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6 py-4">
          {/* Enable/Disable Toggle */}
          <div className="space-y-3">
            <Label className="text-white">Status</Label>
            <div className="flex items-center gap-3 p-4 bg-nebula-navy-dark rounded-lg border border-nebula-navy-lighter">
              <button
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  enabled ? 'bg-green-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <div className="flex-1">
                <p className={`text-sm font-medium ${enabled ? 'text-green-400' : 'text-slate-400'}`}>
                  {enabled ? 'Log Analyses Enabled' : 'Log Analyses Disabled'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {enabled 
                    ? 'Agent will actively ingest and analyze logs' 
                    : 'Log collection is paused for this service'}
                </p>
              </div>
              {enabled ? (
                <CheckCircle className="size-5 text-green-400" />
              ) : (
                <AlertCircle className="size-5 text-slate-500" />
              )}
            </div>
          </div>

          {/* Log Path Input */}
          <div className="space-y-3">
            <Label htmlFor="logPath" className="text-white">
              Log File Path
            </Label>
            <Input
              id="logPath"
              placeholder="/var/log/app/service.log"
              value={logPath}
              onChange={(e) => setLogPath(e.target.value)}
              disabled={!enabled}
              className="bg-nebula-navy-dark border-nebula-navy-lighter text-white placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-slate-500">
              Specify the absolute path where log files are stored. The log agent will access this location to ingest logs.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-nebula-navy-lighter">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isIngesting}
            className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isIngesting}
            className="bg-nebula-cyan hover:bg-nebula-cyan/90 text-white"
          >
            {isIngesting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                Configuring...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}