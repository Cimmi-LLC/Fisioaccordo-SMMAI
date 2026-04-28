import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutGrid, BookImage, TrendingUp, Users, BarChart3, Settings, LogOut, Building2, Video, Shield, CalendarClock, Briefcase } from 'lucide-react';
import logo from '@/assets/logo-fisioaccordo.png';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import BrandSwitcher from './BrandSwitcher';

const NAV_ITEMS = [
  { to: '/posts', label: 'Post', icon: LayoutGrid },
  { to: '/storie', label: 'Storie', icon: BookImage },
  { to: '/reel', label: 'Reel', icon: Video },
  { to: '/calendario', label: 'Calendario', icon: CalendarClock },
  { to: '/trend', label: 'Trend', icon: TrendingUp },
  { to: '/competitor', label: 'Competitor', icon: Users },
  { to: '/virale', label: 'Analisi Virale', icon: BarChart3 },
];

const ADMIN_NAV_ITEMS = [
  { to: '/brands', label: 'I miei Brand', icon: Briefcase },
];

const BOTTOM_ITEMS = [
  { to: '/brand', label: 'Il tuo Brand', icon: Building2 },
  { to: '/settings', label: 'Impostazioni', icon: Settings },
];

const Sidebar: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const firstName = user?.user_metadata?.first_name || 'Utente';

  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--line)' }}>
        <img src={logo} alt="Logo" style={{ height: 32, width: 'auto' }} />
      </div>

      {/* Brand switcher (admin only) */}
      {isAdmin && (
        <div style={{ padding: '12px 8px 0' }}>
          <BrandSwitcher />
        </div>
      )}

      {/* Main nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isAdmin && ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
              fontSize: 13, fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--rosa)' : 'var(--ink3)',
              backgroundColor: isActive ? 'var(--rosa-dim)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon style={{ width: 18, height: 18 }} />
            {label}
          </NavLink>
        ))}
        {isAdmin && <div style={{ height: 1, backgroundColor: 'var(--line)', margin: '6px 4px' }} />}
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--viola)' : 'var(--ink3)',
              backgroundColor: isActive ? 'var(--viola-dim)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon style={{ width: 18, height: 18 }} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '8px 8px 12px', borderTop: '1px solid var(--line)' }}>
        {isAdmin && (
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
              fontSize: 13, fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--rosa)' : 'var(--ink3)',
              backgroundColor: isActive ? 'rgba(230,0,126,0.08)' : 'transparent',
              transition: 'all 0.15s',
              marginBottom: 4,
            })}
          >
            <Shield style={{ width: 18, height: 18 }} />
            Admin
          </NavLink>
        )}
        {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--viola)' : 'var(--ink3)',
              backgroundColor: isActive ? 'var(--viola-dim)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon style={{ width: 18, height: 18 }} />
            {label}
          </NavLink>
        ))}

        {/* User + Logout */}
        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--bg)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
            {firstName}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            Esci
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
