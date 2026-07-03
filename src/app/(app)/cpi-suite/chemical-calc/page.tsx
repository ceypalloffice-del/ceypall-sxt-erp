import { createClient } from "@/lib/supabase/server";
import { parseCpiSettings } from "@/lib/cpi-engine/types";
import { ChemCalcClient } from "./ChemCalcClient";

export default async function ChemicalCalcPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("cpi_settings").select("key, value");
  const settings = parseCpiSettings(data ?? []);
  return <ChemCalcClient settings={settings} />;
}
