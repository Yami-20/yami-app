import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext();

const STORAGE_KEY = 'yami_user_profile';

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

function generateId() {
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { id: generateId(), username: '', displayName: '', avatarUrl: null };
  });

  const [setupDone, setSetupDone] = useState(() => {
    return !!localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
  }, [profile]);

  const updateProfile = useCallback((updates) => {
    setProfile(p => ({ ...p, ...updates }));
    setSetupDone(true);
  }, []);

  const completeSetup = useCallback((displayName, avatarUrl = null) => {
    const trimmed = displayName.trim() || 'Listener';
    setProfile(p => ({
      ...p,
      displayName: trimmed,
      username: trimmed.toLowerCase().replace(/\s+/g, '_'),
      avatarUrl,
    }));
    setSetupDone(true);
  }, []);

  return (
    <UserContext.Provider value={{ profile, updateProfile, completeSetup, setupDone, getInitials }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
export { getInitials };
