import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Inbox, ShieldAlert, Settings, LogOut, Mail, Zap, BarChart3 } from 'lucide-react';
import AlertsPanel from './AlertsPanel';
import { AppUser, clearSession } from '../lib/localData';

interface SidebarProps {
  user: AppUser;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    onLogout();
    navigate('/login');
  };

  return (
    <aside className="w-72 bg-white border-r border-neutral-200 flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">IntelliMail</span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavItem to="/" icon={<Inbox className="w-5 h-5" />} label="Inbox" />
        <NavItem to="/analytics" icon={<BarChart3 className="w-5 h-5" />} label="Analytics" disabled />
        <NavItem to="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" disabled />
      </nav>

      <div className="p-4 mt-auto space-y-4">
        <div className="p-4 bg-neutral-900 rounded-2xl text-white space-y-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">AI Status</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Local analysis is active and monitoring your threads for threats and priority.
          </p>
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <img 
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} 
              alt={user.name || 'User'} 
              className="w-10 h-10 rounded-full border-2 border-neutral-100"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-neutral-900 truncate max-w-[120px]">
                {user.name}
              </span>
              <span className="text-[10px] text-neutral-500 truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
          </div>
          <AlertsPanel />
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-sm"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function NavItem({ to, icon, label, disabled = false }: { to: string, icon: React.ReactNode, label: string, disabled?: boolean }) {
  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-neutral-300 cursor-not-allowed">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
        ${isActive ? 'bg-blue-50 text-blue-600' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'}
      `}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
