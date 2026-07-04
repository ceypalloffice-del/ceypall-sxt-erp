import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isDirector } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";
import { updateUserAccess } from "@/app/actions/users";
import { ROLES } from "@/lib/access";

const ROLE_HINTS: Record<string, string> = {
  director: "Everything, including margins",
  accounts: "Customers, invoices, suppliers, bills, petty cash, POs",
  production: "Suites, inventory, pallets, materials, chemicals, POs",
  viewer: "Read-only",
};

export default async function UsersAdminPage() {
  const profile = await getProfile();
  if (!isDirector(profile)) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, entity_scope")
    .order("full_name");
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-500">
          Assign each person a role and, optionally, lock them to one entity.
          New staff sign up on the signup page and appear here as viewers.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No users yet" hint="Ask staff to sign up; they will appear here." />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const isSelf = u.id === profile!.id;
                return (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-900">
                      {u.full_name ?? "—"}
                      {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email ?? "—"}</td>
                    <td className="px-4 py-3" colSpan={3}>
                      <form action={updateUserAccess} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          disabled={isSelf}
                          title={isSelf ? "You can't change your own role" : ROLE_HINTS[u.role]}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <select
                          name="entity_scope"
                          defaultValue={u.entity_scope ?? ""}
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          <option value="">All entities</option>
                          <option value="SXT">St. Xavier only</option>
                          <option value="CPL">CeyPall only</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-slate-700">What each role can open</h2>
        <ul className="mt-3 space-y-1 text-sm text-slate-500">
          {ROLES.map((r) => (
            <li key={r}>
              <span className="font-medium text-slate-700">{r}</span> — {ROLE_HINTS[r]}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
