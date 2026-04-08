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
    <aside className="w-80 bg-[var(--card)] border-r border-[var(--border)] flex flex-col h-full transition-all duration-500 relative z-50">
      <div className="p-10 pb-12 flex items-center gap-4">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: -5 }}
          className="p-3.5 gradient-primary rounded-2xl shadow-lg shadow-primary-500/20"
        >
          <Mail className="w-6 h-6 text-white" />
        </motion.div>
        <span className="text-3xl font-extrabold tracking-tightest bg-clip-text text-transparent bg-gradient-to-br from-[var(--foreground)] to-[var(--foreground)]/60">
          IntelliMail
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <NavItem to="/" icon={<Inbox className="w-5 h-5" />} label="Inbox" />
        <NavItem to="/analytics" icon={<BarChart3 className="w-5 h-5" />} label="Analytics" />
        <NavItem to="/profile" icon={<User className="w-5 h-5" />} label="Profile" />
        <NavItem to="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
      </nav>

      <div className="p-6 mt-auto space-y-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-primary-50/50 dark:bg-primary-500/10 border border-primary-200/50 dark:border-primary-500/20 rounded-[2rem] space-y-4 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
             <Zap className="w-16 h-16 fill-primary-600" />
          </div>
          <div className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400">
            <Zap className="w-4 h-4 fill-current animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.15em]">Neural Defense</span>
          </div>
          <p className="text-[11px] text-[var(--foreground)]/70 leading-relaxed font-bold">
            Behavioral analysis active. High-fidelity signals are being monitored.
          </p>
        </motion.div>

        <div className="flex flex-col gap-4">
          <motion.div 
            whileHover={{ x: 5 }}
            className="flex items-center justify-between p-4 bg-[var(--secondary)]/40 rounded-2xl border border-[var(--border)] group cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white/80 dark:border-white/10 shadow-sm ring-1 ring-black/5">
                  <img 
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=026dc6&color=ffffff&bold=true&size=80`} 
                    alt={user.name || 'User'} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[var(--foreground)] truncate">
                  {formatDisplayName(user.name)}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] font-bold truncate">
                  Pro Plan
                </span>
              </div>
            </div>
          </motion.div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Termination Session
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
        'group flex items-center gap-4 px-7 py-4 rounded-2xl transition-all font-bold text-sm relative overflow-hidden',
        isActive
        ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/30 active:scale-[0.98]'
        : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
      )}
    >
      <motion.div
        whileHover={{ scale: 1.2, rotate: 5 }}
        className="relative z-10"
      >
        {icon}
      </motion.div>
      <span className="relative z-10 tracking-tight">{label}</span>
      {/* Decorative indicator for active state */}
      <NavLink to={to}>
         {({ isActive }) => isActive && (
           <motion.div 
             layoutId="activeTab"
             className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-r-full"
           />
         )}
      </NavLink>
    </NavLink>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

