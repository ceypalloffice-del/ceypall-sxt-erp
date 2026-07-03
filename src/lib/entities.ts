export type EntityId = "SXT" | "CPL";
export type EntityKey = EntityId | "ALL";

export const ENTITY_COOKIE = "erp_entity";

export const ENTITIES: Record<EntityKey, { label: string; accent: string; tint: string }> = {
  SXT: { label: "St. Xavier Timber", accent: "#185FA5", tint: "#E6F1FB" },
  CPL: { label: "CeyPall", accent: "#1A4D10", tint: "#EBF4E6" },
  ALL: { label: "Consolidated", accent: "#334155", tint: "#F1F5F9" },
};

export function isEntityId(value: string | undefined | null): value is EntityId {
  return value === "SXT" || value === "CPL";
}

export function isEntityKey(value: string | undefined | null): value is EntityKey {
  return value === "SXT" || value === "CPL" || value === "ALL";
}
