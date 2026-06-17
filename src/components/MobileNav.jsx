import { NavLink, useNavigate } from 'react-router-dom';
import {
  RiHomeLine, RiHomeFill, RiSearchLine, RiSearch2Line,
  RiPlayListLine, RiPlayListFill, RiHeartLine, RiHeartFill,
  RiUser3Line,
} from 'react-icons/ri';
import { useYami } from '../context/YamiContext';
import { useUser, getInitials } from '../context/UserContext';

// Bottom tab bar shown only on narrow (mobile/Android) viewports.
// Replaces the desktop Sidebar entirely below the responsive breakpoint.
export default function MobileNav() {
  const { queue, liked } = useYami();
  const { profile } = useUser();
  const navigate = useNavigate();

  const tabs = [
    { to: '/',        label: 'Home',   icon: RiHomeLine,      activeIcon: RiHomeFill },
    { to: '/search',  label: 'Search', icon: RiSearchLine,    activeIcon: RiSearch2Line },
    { to: '/library', label: 'Queue',  icon: RiPlayListLine,  activeIcon: RiPlayListFill, badge: queue.length },
    { to: '/liked',   label: 'Liked',  icon: RiHeartLine,     activeIcon: RiHeartFill,    badge: liked.length },
  ];

  return (
    <nav className="mobile-nav">
      {tabs.map(({ to, label, icon: Icon, activeIcon: ActiveIcon, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `mobile-nav-tab${isActive ? ' active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <span className="mobile-nav-icon">
                {isActive ? <ActiveIcon /> : <Icon />}
                {badge > 0 && <span className="mobile-nav-badge">{badge > 99 ? '99+' : badge}</span>}
              </span>
              <span className="mobile-nav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button className="mobile-nav-tab" onClick={() => navigate('/settings')}>
        <span className="mobile-nav-icon mobile-nav-avatar">
          {profile.avatarUrl
            ? <img src={profile.avatarUrl} alt="" />
            : (profile.displayName ? getInitials(profile.displayName) : <RiUser3Line />)}
        </span>
        <span className="mobile-nav-label">You</span>
      </button>
    </nav>
  );
}
