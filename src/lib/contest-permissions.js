export const canManageContest = (user, contest) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!contest) return false;

  const userId = String(user.id ?? "");
  const userEmail = String(user.email ?? "").toLowerCase();
  const userName = String(user.full_name ?? "").trim().toLowerCase();

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
  ].filter(Boolean);

  // Concursos antigos foram criados antes de owner_id/organizer_email existirem.
  // Mantemos acesso administrativo para esses registros legados e os novos ja saem com dono.
  if (ownershipValues.length === 0) return true;

  if (ownershipValues.some((value) => String(value) === userId) ||
    (contest.organizer_email && String(contest.organizer_email).toLowerCase() === userEmail) ||
    (contest.created_by_email && String(contest.created_by_email).toLowerCase() === userEmail) ||
    (contest.created_by_name && String(contest.created_by_name).trim().toLowerCase() === userName) ||
    (contest.organizer_name && String(contest.organizer_name).trim().toLowerCase() === userName)) {
    return true;
  }

  return false;
};
