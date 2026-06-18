export const canManageContest = (user, contest) => {
  if (!user) return false;
  if (["admin", "organizer", "owner"].includes(user.role)) return true;
  if (!contest) return false;

  const userId = String(user.id ?? "");
  const userEmail = String(user.email ?? "").toLowerCase();
  const userName = String(user.full_name ?? "").trim().toLowerCase();
  const normalize = (value) => String(value ?? "").trim().toLowerCase();

  const ownershipValues = [
    contest.organizer_id,
    contest.owner_id,
    contest.created_by,
    contest.created_by_id,
    contest.created_by_email,
    contest.created_by_name,
    contest.user_id,
    contest.organizer_email,
    contest.organizer_name,
    contest.created_by_user,
    contest.owner,
    contest.organizer,
  ].filter(Boolean);

  // Concursos antigos foram criados antes de owner_id/organizer_email existirem.
  // Mantemos acesso administrativo para esses registros legados e os novos ja saem com dono.
  if (ownershipValues.length === 0) return true;

  if (ownershipValues.some((value) => {
    const normalized = normalize(typeof value === "object" ? JSON.stringify(value) : value);
    return (
      normalized === normalize(userId) ||
      normalized === userEmail ||
      normalized === userName ||
      (userEmail && normalized.includes(userEmail)) ||
      (userName && normalized.includes(userName))
    );
  })) {
    return true;
  }

  return false;
};
