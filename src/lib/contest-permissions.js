export const canManageContest = (user) => {
  if (!user) return false;
  return true;
};
