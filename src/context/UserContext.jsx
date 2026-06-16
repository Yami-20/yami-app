import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext();
const STORAGE_KEY = 'yami_user_profile';

export function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

function generateId() {
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

const EMPTY_PROFILE = () => ({ id: generateId(), username: '', displayName: '', avatarUrl: null });

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return EMPTY_PROFILE();
  });

  const [setupDone, setSetupDone] = useState(() => {
    try { return !!JSON.parse(localStorage.getItem(STORAGE_KEY))?.displayName; }
    catch { return false; }
  });

  // Only persist when setup is actually complete — never during reset state
  useEffect(() => {
    if (!setupDone) return;
    if (!profile.displayName) return; // never persist empty profile
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
  }, [profile, setupDone]);

  const completeSetup = useCallback((displayName, avatarUrl = null) => {
    const trimmed = displayName.trim() || 'Listener';
    const newProfile = {
      id: generateId(),
      displayName: trimmed,
      username: trimmed.toLowerCase().replace(/\s+/g, '_'),
      avatarUrl,
    };
    // Write to storage first, then set state — prevents any race
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile)); } catch {}
    setProfile(newProfile);
    setSetupDone(true);
  }, []);

  const updateProfile = useCallback((updates) => {
    setProfile(p => ({ ...p, ...updates }));
  }, []);

  const resetProfile = useCallback(() => {
    // Clear storage first, then clear state — order matters
    localStorage.removeItem(STORAGE_KEY);
    setSetupDone(false);
    setProfile(EMPTY_PROFILE());
    // No timers, no refs — state is the only source of truth
  }, []);

  return (
    <UserContext.Provider value={{
      profile, updateProfile, completeSetup, resetProfile, setupDone, getInitials,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
