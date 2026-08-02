import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface LogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export const Route = createFileRoute("/admin/log")({
  component: AdminLogViewer,
});

function AdminLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id, entity_type, entity_id, field_changed, old_value, new_value, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      setLogs((data ?? []) as LogEntry[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/admin" className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <ArrowLeft size={16} />
          Admin
        </Link>
        <h1 className="font-bold text-2xl text-white">Audit Log</h1>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-white/60">
                {log.entity_type}
              </span>
              <span>{log.field_changed}</span>
              <span className="ml-auto">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
            {log.old_value || log.new_value ? (
              <div className="mt-1 flex items-center gap-2 text-xs">
                {log.old_value && (
                  <span className="text-red-400/70 line-through truncate max-w-[200px]">{log.old_value}</span>
                )}
                {log.old_value && log.new_value && <span className="text-muted-foreground">→</span>}
                {log.new_value && (
                  <span className="text-emerald-400/70 truncate max-w-[200px]">{log.new_value}</span>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
