import { HashRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { YamiProvider } from './context/YamiContext';
import { UserProvider, useUser } from './context/UserContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import UserSetup from './components/UserSetup';
import YamiPlayer from './components/YamiPlayer';
import NowPlayingPanel from './components/NowPlayingPanel';
import Toast from './components/Toast';
import { TitleBar } from './TitleBar';
import { useIsMobile } from './hooks/useIsMobile';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import Liked from './pages/Liked';
import History from './pages/History';
import Settings from './pages/Settings';
import Spotify from './pages/Spotify';
import Stats from './pages/Stats';
import Lyrics from './pages/Lyrics';
import './styles/yami.css';

const isElectron = !!window.electronAPI;

function AppInner() {
  const { setupDone } = useUser();
  const isMobile = useIsMobile();

  // Auto-updater notification (Electron only — no-op on Android)
  useEffect(() => {
    if (!window.electronAPI) return;
    const clean = window.electronAPI.onUpdateDownloaded((d) => {
      if (window.confirm(`Yami v${d.version} is ready. Restart now to update?`)) {
        window.location.reload();
      }
    });
    return () => clean?.();
  }, []);

  if (!setupDone) return <UserSetup />;

  return (
    <HashRouter>
      {isElectron && <TitleBar />}
      <div
        className={`yami-layout yami-shell${isMobile ? ' is-mobile' : ''}`}
        style={isElectron ? { paddingTop: 32 } : {}}
      >
        {!isMobile && <Sidebar />}
        <ErrorBoundary>
          <Routes>
            <Route path="/"        element={<Home />} />
            <Route path="/search"  element={<Search />} />
            <Route path="/library" element={<Library />} />
            <Route path="/liked"   element={<Liked />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/spotify"  element={<Spotify />} />
            <Route path="/stats"   element={<Stats />} />
            <Route path="/lyrics"  element={<Lyrics />} />
          </Routes>
        </ErrorBoundary>
        <YamiPlayer />
        {isMobile && <MobileNav />}
      </div>
      <NowPlayingPanel />
      <Toast />
    </HashRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <YamiProvider>
          <AppInner />
        </YamiProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}
