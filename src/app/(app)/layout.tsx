import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getActiveEntity } from "@/lib/session";
import { EntitySwitcher } from "@/components/EntitySwitcher";
import { Nav } from "@/components/Nav";
import { signOut } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  const activeEntity = await getActiveEntity(profile);

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <header className="border-b border-slate-200 bg-white print:hidden">
        {/* Brand accent stripe */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(to right, #1A4D10 70%, #D4AA00 100%)` }} />
        {/* Top bar: brand + user controls */}
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
          <span className="font-mono text-sm font-bold tracking-tight" style={{ color: "#1A4D10" }}>
            Cey<span style={{ color: "#D4AA00" }}>Pall</span> ERP
          </span>
          <div className="flex items-center gap-4">
            {!profile?.entity_scope && <EntitySwitcher active={activeEntity} />}
            <span className="text-sm text-slate-500">
              {profile?.full_name ?? "—"}{" "}
              <span className="text-slate-400">· {profile?.role ?? "viewer"}</span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-medium text-slate-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        {/* Nav bar: horizontally scrollable */}
        <div className="border-t border-slate-100 overflow-x-auto">
          <div className="mx-auto max-w-screen-2xl px-6">
            <Nav activeEntity={activeEntity} role={profile?.role ?? "viewer"} />
          </div>
        </div>
      </header>
      <main className="max-w-screen-2xl px-6 py-8">{children}</main>
    </div>
  );
}
