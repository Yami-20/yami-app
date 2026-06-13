import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const UserContext = createContext();
const STORAGE_KEY = 'yami_user_profile';

export function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

function generateId() {
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

export function UserProvider({ children }) {
  // Track whether we're in reset-flow — prevents the profile useEffect
  // from immediately re-writing localStorage after removeItem
  const isResetting = useRef(false);

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { id: generateId(), username: '', displayName: '', avatarUrl: null };
  });

  const [setupDone, setSetupDone] = useState(() => {
    try { return !!JSON.parse(localStorage.getItem(STORAGE_KEY))?.displayName; }
    catch { return false; }
  });

  // Persist profile — but never during a reset
  useEffect(() => {
    if (isResetting.current) return;
    if (!setupDone) return; // don't write empty profile
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
  }, [profile, setupDone]);

  const completeSetup = useCallback((displayName, avatarUrl = null) => {
    isResetting.current = false;
    const trimmed = displayName.trim() || 'Listener';
    const newProfile = {
      id: generateId(),
      displayName: trimmed,
      username: trimmed.toLowerCase().replace(/\s+/g, '_'),
      avatarUrl,
    };
    setProfile(newProfile);
    setSetupDone(true);
    // Persist immediately — don't wait for useEffect
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile)); } catch {}
  }, []);

  const updateProfile = useCallback((updates) => {
    setProfile(p => ({ ...p, ...updates }));
    setSetupDone(true);
  }, []);

  // Reset profile — clears storage AND state atomically, shows setup screen
  const resetProfile = useCallback(() => {
    isResetting.current = true;
    localStorage.removeItem(STORAGE_KEY);
    const freshProfile = { id: generateId(), username: '', displayName: '', avatarUrl: null };
    setProfile(freshProfile);
    setSetupDone(false);
    // Allow writes again after state settles
    setTimeout(() => { isResetting.current = false; }, 500);
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
