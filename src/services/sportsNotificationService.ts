const LOCAL_STORAGE_KEY = "axis_sports_sub_matches";

export const getSubscribedMatches = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Failed to parse subscribed matches:", err);
    return [];
  }
};

export const isMatchSubscribed = (matchId: string): boolean => {
  const subs = getSubscribedMatches();
  return subs.includes(matchId);
};

export const subscribeToMatch = (matchId: string): void => {
  const subs = getSubscribedMatches();
  if (!subs.includes(matchId)) {
    subs.push(matchId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subs));
    window.dispatchEvent(new Event("sports_subscriptions_changed"));
  }
};

export const unsubscribeFromMatch = (matchId: string): void => {
  const subs = getSubscribedMatches();
  const index = subs.indexOf(matchId);
  if (index > -1) {
    subs.splice(index, 1);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subs));
    window.dispatchEvent(new Event("sports_subscriptions_changed"));
  }
};

export const toggleMatchSubscription = (matchId: string): boolean => {
  if (isMatchSubscribed(matchId)) {
    unsubscribeFromMatch(matchId);
    return false;
  } else {
    subscribeToMatch(matchId);
    return true;
  }
};
