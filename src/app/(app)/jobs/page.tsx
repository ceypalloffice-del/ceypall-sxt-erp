import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEntity } from "@/lib/session";
import { Card, EmptyState, EntityTag, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function JobsPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const entity = await getActiveEntity(profile);

  let jobs = supabase
    .from("jobs")
    .select("id, entity_id, job_no, description, status, created_at, customers(name)")
    .order("created_at", { ascending: false });

  if (entity !== "ALL") jobs = jobs.eq("entity_id", entity);

  const { data } = await jobs;
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Jobs</h1>
        <p className="mt-1 text-sm text-slate-500">Job-centric work in progress and completed.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No jobs yet" hint="Jobs will appear here once created." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Job no.</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((job) => (
                <tr key={job.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-900">
                    <Link href={`/jobs/${job.id}`} className="underline-offset-2 hover:underline">
                      {job.job_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><EntityTag entityId={job.entity_id} /></td>
                  {/* @ts-expect-error -- joined relation shape */}
                  <td className="px-4 py-3 text-slate-700">{job.customers?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{job.description ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
