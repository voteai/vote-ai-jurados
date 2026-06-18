import { base44 } from "@/api/base44Client";

const serialize = (value) => {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export async function logAudit({ action, entityType, entityId, contestId, oldValue, newValue, reason } = {}) {
  if (!action || !entityType) return;

  try {
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }

    await base44.entities.AuditLog.create({
      user_id: user?.id || "",
      user_name: user?.full_name || user?.email || "",
      contest_id: contestId || "",
      action,
      entity_type: entityType,
      entity_id: entityId || "",
      old_value: serialize(oldValue),
      new_value: serialize(newValue),
      reason: reason || "",
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Audit log nao registrado:", error);
  }
}
