export function Settings() {
  return (
    <div className="rounded-3xl border border-slate-700 bg-nebula-navy-dark p-10 text-slate-100 shadow-lg shadow-slate-900/20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Settings</h1>
          <p className="text-slate-400 mt-2">Manage platform configuration, alert routing, and access controls.</p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-nebula-navy-lighter p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Platform Settings</h2>
          <p className="text-slate-400 text-sm">
            Configure system-level settings for CloudSight, including maintenance windows and integrations.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-nebula-navy-lighter p-6">
          <h2 className="text-xl font-semibold text-white mb-2">User Roles</h2>
          <p className="text-slate-400 text-sm">
            Admin users can manage roles, view reports, and configure alert settings.
          </p>
        </div>
      </div>
    </div>
  );
}
