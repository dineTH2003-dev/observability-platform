export function AccessDenied() {
  return (
    <div className="max-w-2xl mx-auto rounded-3xl border border-red-500/20 bg-nebula-navy-dark p-12 text-slate-100 shadow-xl shadow-red-500/20">
      <h1 className="text-4xl font-semibold text-white mb-4">Access Denied</h1>
      <p className="text-slate-400 mb-6">You do not have permission to access this page.</p>
      <p className="text-sm text-slate-500">
        If you believe this is an error, contact your administrator or return to the dashboard.
      </p>
    </div>
  );
}
