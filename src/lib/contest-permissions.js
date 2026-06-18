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
    contest.user_id,
    contest.organizer_email,
    contest.organizer_name,
  ].filter(Boolean);

  if (ownershipValues.length === 0) return false;

  if (ownershipValues.some((value) => String(value) === userId) ||
    (contest.organizer_email && String(contest.organizer_email).toLowerCase() === userEmail) ||
    (contest.organizer_name && String(contest.organizer_name).trim().toLowerCase() === userName)) {
    return true;
  }

  return false;
};
