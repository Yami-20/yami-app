import { HashRouter, Routes, Route } from 'react-router-dom';
import { YamiProvider } from './context/YamiContext';
import { UserProvider, useUser } from './context/UserContext';
import Sidebar from './components/Sidebar';
import UserSetup from './components/UserSetup';
import YamiPlayer from './components/YamiPlayer';
import NowPlayingPanel from './components/NowPlayingPanel';
import Toast from './components/Toast';
import { TitleBar } from './TitleBar';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import Liked from './pages/Liked';
import History from './pages/History';
import Settings from './pages/Settings';
import Spotify from './pages/Spotify';
import SpotifyCallback from './pages/SpotifyCallback';
import Stats from './pages/Stats';
import Lyrics from './pages/Lyrics';
import './styles/yami.css';

const isElectron = !!window.electronAPI;

function AppInner() {
  const { setupDone } = useUser();
  if (!setupDone) return <UserSetup />;
  return (
    <HashRouter>
      {isElectron && <TitleBar />}
      <div className="yami-layout yami-shell" style={isElectron ? { paddingTop: 32 } : {}}>
        <Sidebar />
        <Routes>
          <Route path="/"        element={<Home />} />
          <Route path="/search"  element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/liked"   element={<Liked />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/spotify"  element={<Spotify />} />
          <Route path="/spotify/callback" element={<SpotifyCallback />} />
          <Route path="/stats"   element={<Stats />} />
          <Route path="/lyrics"  element={<Lyrics />} />
        </Routes>
        <YamiPlayer />
      </div>
      <NowPlayingPanel />
      <Toast />
    </HashRouter>
  );
}

export default function App() {
  return (
    <UserProvider>
      <YamiProvider>
        <AppInner />
      </YamiProvider>
    </UserProvider>
  );
}
