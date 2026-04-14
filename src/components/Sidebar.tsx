import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Inbox, Settings, LogOut, Mail, Zap, BarChart3, User } from 'lucide-react';
import { motion } from 'motion/react';
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
    <aside className="w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col h-full transition-all duration-500 relative z-50">
      <div className="p-6 pb-6 flex items-center gap-3">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: -5 }}
          className="p-2.5 gradient-primary rounded-xl shadow-md"
        >
          <Mail className="w-5 h-5 text-white" />
        </motion.div>
        <span className="text-xl font-black tracking-tightest bg-clip-text text-transparent bg-gradient-to-br from-[var(--foreground)] to-[var(--foreground)]/60">
          IntelliMail
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <NavItem to="/" icon={<Inbox className="w-4 h-4" />} label="Inbox" />
        <NavItem to="/analytics" icon={<BarChart3 className="w-4 h-4" />} label="Analytics" />
        <NavItem to="/profile" icon={<User className="w-4 h-4" />} label="Profile" />
        <NavItem to="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" />
      </nav>

      <div className="p-3 mt-auto space-y-3">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 bg-primary-50/50 dark:bg-primary-500/10 border border-primary-200/50 dark:border-primary-500/20 rounded-xl space-y-2 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-2 opacity-10">
             <Zap className="w-8 h-8 fill-primary-600" />
          </div>
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <Zap className="w-3 h-3 fill-current animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest">Neural Defense</span>
          </div>
          <p className="text-[9px] text-[var(--foreground)]/70 leading-relaxed font-bold">
            Signals monitored.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 bg-[var(--secondary)]/40 rounded-xl border border-[var(--border)] cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl overflow-hidden border">
                  <img 
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=026dc6&color=ffffff&bold=true&size=80`} 
                    alt={user.name || 'User'} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[var(--foreground)] truncate">
                  {formatDisplayName(user.name)}
                </span>
                <span className="text-[9px] text-[var(--muted-foreground)] font-bold truncate">
                  Pro Plan
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ to, icon, label, disabled = false }: { to: string, icon: React.ReactNode, label: string, disabled?: boolean }) {
  if (disabled) {
    return (
      <div className="flex items-center gap-4 px-6 py-4 text-[var(--muted-foreground)] opacity-50 cursor-not-allowed">
        {icon}
        <span className="font-bold text-sm tracking-tight">{label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        'group flex items-center gap-3 px-5 py-3 rounded-xl transition-all font-bold text-xs relative overflow-hidden',
        isActive
        ? 'bg-primary-600 text-white shadow-lg active:scale-[0.98]'
        : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
      )}
    >
      <div className="relative z-10">
        {icon}
      </div>
      <span className="relative z-10 tracking-tight">{label}</span>
      <NavLink to={to}>
         {({ isActive }) => isActive && (
           <motion.div 
             layoutId="activeTab"
             className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full"
           />
         )}
      </NavLink>
    </NavLink>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

