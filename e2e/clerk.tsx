import { useCallback } from "react";
export function useClerk() {
  return { openSignIn() {} };
}

export function useAuth() {
  const getToken = useCallback(async () => {
    const session = await (await fetch("/__test/session")).json();
    return session.token as string;
  }, []);
  return {
    getToken,
    userId: "user_fixture_owner",
    isLoaded: true,
    isSignedIn: true,
  };
}
