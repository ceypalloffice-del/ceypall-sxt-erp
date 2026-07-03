import { createClient } from "@/lib/supabase/server";
import { parseCpiSettings } from "@/lib/cpi-engine/types";
import { CostingClient } from "./CostingClient";

export default async function CpiCostingPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("cpi_settings").select("key, value");
  const settings = parseCpiSettings(data ?? []);
  return <CostingClient settings={settings} />;
}
