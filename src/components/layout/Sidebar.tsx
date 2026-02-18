import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users as UsersIcon,
  Radio,
  Target,
  Megaphone,
  Settings,
  Star,
  DollarSign,
  ShieldCheck,
  BarChart3,
  Network,
  Calendar as CalendarIcon,
  Building2,
  Store as StoreIcon,
  MapPin
} from 'lucide-react';

const adminNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['super_admin', 'administrator', 'finance'] },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon, roles: ['super_admin', 'administrator'] },
  { name: 'Members', href: '/members', icon: UsersIcon, roles: ['super_admin', 'administrator'] },
  { name: 'Communities', href: '/communities', icon: Network, roles: ['super_admin', 'administrator'] },
  { name: 'Broadcasting', href: '/broadcasting', icon: Radio, roles: ['super_admin', 'administrator'] },
  { name: 'Polls', href: '/polls', icon: BarChart3, roles: ['super_admin', 'administrator'] },
  { name: 'Campaigns', href: '/campaigns', icon: Target, roles: ['super_admin', 'administrator'] },
  { name: 'Adverts', href: '/adverts', icon: Megaphone, roles: ['super_admin', 'administrator'] },
  { name: 'Party Management', href: '/party', icon: Building2, roles: ['super_admin', 'administrator'] },
  { name: 'Store', href: '/store', icon: StoreIcon, roles: ['super_admin', 'administrator'] },
  { name: 'Regional Authority', href: '/regional-authority', icon: MapPin, roles: ['super_admin', 'administrator'] },
  { name: 'Finance', href: '/finance', icon: DollarSign, roles: ['super_admin', 'finance'] },
  { name: 'User Management', href: '/users', icon: ShieldCheck, roles: ['super_admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['super_admin', 'administrator', 'finance'] },
];

export default function Sidebar() {
  const { profile, signOut, loading, devRoleOverride } = useAuth();

  console.log('Sidebar - Profile:', profile);
  console.log('Sidebar - Loading:', loading);
  console.log('Sidebar - Dev Role Override:', devRoleOverride);

  const effectiveRole = devRoleOverride || profile?.role;
  const visibleNavigation = profile && effectiveRole
    ? adminNavigation.filter(item => item.roles.includes(effectiveRole))
    : [];

  console.log('Sidebar - Effective Role:', effectiveRole);
  console.log('Sidebar - Visible Navigation:', visibleNavigation);

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#d1242a] rounded-lg flex items-center justify-center">
            <Star className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-medium text-gray-900">AR Management</h1>
            <p className="text-xs text-gray-500 font-light">Backend Office</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-6">
        {loading ? (
          <div className="text-center text-gray-500 text-sm">Loading...</div>
        ) : visibleNavigation.length > 0 ? (
          <ul className="space-y-2">
            {visibleNavigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center px-3 py-2 text-sm font-light rounded-lg transition-colors focus:outline-none focus-visible:outline-none active:outline-none',
                      isActive
                        ? 'bg-[#d1242a]/10 text-[#d1242a] hover:bg-[#d1242a]/10 hover:text-[#d1242a]'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  <item.icon className="mr-3 h-5 w-5" strokeWidth={1.5} />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500 text-sm">
            <p>No profile found.</p>
            <p className="mt-2 text-xs">Please contact an administrator.</p>
          </div>
        )}
      </nav>

      {profile && (
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-[#d1242a]/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-[#d1242a]">
                {profile.full_name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {effectiveRole.replace('_', ' ')}
                {devRoleOverride && <span className="ml-1 text-orange-500">(Dev Mode)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full text-sm text-gray-700 text-left py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus-visible:outline-none"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}