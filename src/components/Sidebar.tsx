import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Inbox, Settings, LogOut, Mail, Zap, BarChart3, User } from 'lucide-react';
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

  const formatDisplayName = (name: string) => {
    return name.split(' ')[0];
  };

  return (
    <aside className="w-80 bg-[var(--card)] border-r border-[var(--border)] flex flex-col h-full transition-colors duration-300">
      <div className="p-8 flex items-center gap-4">
        <div className="p-3 bg-primary-600 rounded-2xl shadow-xl shadow-primary-500/30">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-black tracking-tighter">IntelliMail</span>
      </div>

      <nav className="flex-1 px-4 space-y-3">
        <NavItem to="/" icon={<Inbox className="w-5 h-5 transition-transform group-hover:scale-110" />} label="Intelligence Feed" />
        <NavItem to="/analytics" icon={<BarChart3 className="w-5 h-5 transition-transform group-hover:scale-110" />} label="Security Dashboard" />
        <NavItem to="/settings" icon={<Settings className="w-5 h-5 transition-transform group-hover:scale-110" />} label="Settings" />
      </nav>

      <div className="p-6 mt-auto space-y-8">
        <div className="p-6 bg-[var(--secondary)]/50 border border-[var(--border)] rounded-[2.5rem] space-y-3">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <Zap className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-widest">AI Engine Active</span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed font-bold opacity-80">
            Local intelligence is monitoring threads for behavioral risks.
          </p>
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500/30 ring-2 ring-primary-500/10 transition-transform group-hover:scale-110 shadow-md">
                <img 
                  src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=ffffff&bold=true&size=80`} 
                  alt={user.name || 'User'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[var(--card)] rounded-full shadow-sm"></div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-[var(--foreground)] truncate max-w-[120px]">
                {formatDisplayName(user.name)}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-semibold text-sm"
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
      <div className="flex items-center gap-3 px-4 py-3 text-[var(--muted-foreground)] opacity-50 cursor-not-allowed">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        'group flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold text-sm',
        isActive
        ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/30'
        : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
      )}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
