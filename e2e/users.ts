const users = [
  { userId: "user_ava", username: "Ava Brooks", showProfilePic: true },
  { userId: "user_ben", username: "Ben Carter", showProfilePic: true },
];

export function useUserSearch() {
  return { results: users, retry() {} };
}

export function useResolvedUsers() {
  return users;
}
