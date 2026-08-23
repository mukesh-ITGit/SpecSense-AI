import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, FileText, UploadCloud, Layers, ShieldAlert, Activity, 
  CheckCircle, Settings, User as UserIcon, Search, PanelLeftClose, PanelLeftOpen,
  LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommandPalette from '../components/CommandPalette';
import ErrorBoundary from '../components/ErrorBoundary';
import './AppShell.css';

const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, connectionStatus } = useAuth();

  const navItems = [
    { name: 'Overview', path: '/', icon: <LayoutDashboard size={19} /> },
    { name: 'Enrich Product', path: '/enrich', icon: <FileText size={19} /> },
    { name: 'Bulk Upload', path: '/upload', icon: <UploadCloud size={19} /> },
    { name: 'Products', path: '/products', icon: <Layers size={19} /> },
    { name: 'Review Queue', path: '/review', icon: <CheckCircle size={19} /> },
    { name: 'Conflicts', path: '/conflicts', icon: <ShieldAlert size={19} /> },
    { name: 'Catalog Quality', path: '/quality', icon: <Activity size={19} /> },
  ];

  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Compute current page label for breadcrumb
  const currentNavItem = navItems.find(item => item.path === location.pathname) || 
    (location.pathname.startsWith('/products/') ? { name: 'Product Details' } :
     location.pathname.startsWith('/reports/summary') ? { name: 'Summary Report' } :
     location.pathname === '/settings' ? { name: 'Settings' } :
     location.pathname === '/profile' ? { name: 'Profile' } : { name: 'Dashboard' });

  return (
    <div className="app-layout">
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
      
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-box">S</div>
          {!isSidebarCollapsed && (
            <div className="brand-info">
              <h1 className="logo-text">SpecSense AI</h1>
              <span className="logo-badge">Enterprise</span>
            </div>
          )}
          <button 
            className="sidebar-toggle" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isExactActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);

            return (
              <NavLink 
                key={item.path} 
                to={item.path}
                end={item.path === '/'}
                className={`nav-item ${isExactActive ? 'active' : ''}`}
                title={isSidebarCollapsed ? item.name : undefined}
                style={{ position: 'relative' }}
              >
                {isExactActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="sidebar-active-indicator"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="nav-icon-wrap" style={{ position: 'relative', zIndex: 2 }}>{item.icon}</span>
                {!isSidebarCollapsed && <span style={{ position: 'relative', zIndex: 2 }}>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <NavLink 
            to="/settings" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
            title={isSidebarCollapsed ? "Settings" : undefined}
            style={{ position: 'relative' }}
          >
            {location.pathname === '/settings' && (
              <motion.div
                layoutId="sidebarActivePill"
                className="sidebar-active-indicator"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="nav-icon-wrap" style={{ position: 'relative', zIndex: 2 }}><Settings size={19} /></span>
            {!isSidebarCollapsed && <span style={{ position: 'relative', zIndex: 2 }}>Settings</span>}
          </NavLink>
          <NavLink 
            to="/profile" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
            title={isSidebarCollapsed ? "Profile" : undefined}
            style={{ position: 'relative' }}
          >
            {location.pathname === '/profile' && (
              <motion.div
                layoutId="sidebarActivePill"
                className="sidebar-active-indicator"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="nav-icon-wrap" style={{ position: 'relative', zIndex: 2 }}><UserIcon size={19} /></span>
            {!isSidebarCollapsed && <span style={{ position: 'relative', zIndex: 2 }}>Profile</span>}
          </NavLink>

          {/* User Profile Pill in Sidebar */}
          {!isSidebarCollapsed && user && (
            <div className="sidebar-user-card">
              <div className="sidebar-avatar">
                {user.name.charAt(0)}
              </div>
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-role">{user.role}</span>
              </div>
              <button 
                className="sidebar-logout-btn" 
                onClick={handleLogout} 
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <nav className="breadcrumb-trail" aria-label="Breadcrumb">
              <span className="breadcrumb-root">SpecSense</span>
              <ChevronRight size={14} className="breadcrumb-sep" aria-hidden="true" />
              <span className="breadcrumb-current" aria-current="page">{currentNavItem.name}</span>
            </nav>

            <div className="topbar-search" onClick={() => setIsCommandOpen(true)} role="button" tabIndex={0} aria-label="Open command palette">
              <Search size={15} className="topbar-search-icon" />
              <span className="search-hint">Search catalog, part #, tags...</span>
              <div className="topbar-kbd">
                <kbd>⌘</kbd>
                <kbd>K</kbd>
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className={`api-status ${connectionStatus}`} title={`Backend connection: ${connectionStatus}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {connectionStatus === 'connected' && 'Connected'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'reconnecting' && 'Reconnecting...'}
                {connectionStatus === 'offline' && 'Offline'}
              </span>
            </div>

            {user && (
              <div className="topbar-user-pill" onClick={() => navigate('/profile')} role="button" tabIndex={0} title="View Profile">
                <div className="topbar-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div className="topbar-user-info">
                  <span className="topbar-user-name">{user.name}</span>
                  <span className="topbar-user-company">{user.company}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="content-area">
          <ErrorBoundary>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <Outlet />
            </motion.div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
