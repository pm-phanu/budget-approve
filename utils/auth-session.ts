export const CURRENT_USER_KEY = "currentUser";

const SESSION_CHANGE_EVENT = "budget-approve:session-change";

export function hasCurrentUserSession() {
  if (typeof window === "undefined") {
    return false;
  }

  const storedUser = window.localStorage.getItem(CURRENT_USER_KEY);

  if (!storedUser) {
    return false;
  }

  try {
    const user: unknown = JSON.parse(storedUser);

    return (
      typeof user === "object" &&
      user !== null &&
      "username" in user &&
      typeof user.username === "string" &&
      "email" in user &&
      typeof user.email === "string"
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return false;
    }

    throw error;
  }
}

export function subscribeToAuthSession(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_CHANGE_EVENT, callback);
  };
}

export function notifyAuthSessionChange() {
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}
