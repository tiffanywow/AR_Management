import { Search, User, LogOut, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import NotificationsDropdown from './NotificationsDropdown';

export default function Header() {
  const { profile, signOut, devRoleOverride, setDevRoleOverride } = useAuth();

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'administrator', label: 'Administrator' },
    { value: 'finance', label: 'Finance' },
  ] as const;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <Input
              className="pl-10 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
              placeholder="Search..."
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {profile?.role === 'super_admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 transition-colors cursor-pointer">
                  <ShieldAlert className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
                  <div className="text-left">
                    <p className="text-xs font-medium text-amber-900">DEV MODE</p>
                    <p className="text-xs text-amber-700 capitalize">
                      {devRoleOverride ? devRoleOverride.replace('_', ' ') : 'Actual Role'}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-amber-900">
                  Role Switcher (Testing Only)
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDevRoleOverride(null)}
                  className={`cursor-pointer ${!devRoleOverride ? 'bg-amber-50 font-medium' : ''}`}
                >
                  <Badge variant="outline" className="mr-2 bg-green-50 text-green-700 border-green-200">
                    ACTUAL
                  </Badge>
                  {profile?.role.replace('_', ' ')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {roles.map((role) => (
                  <DropdownMenuItem
                    key={role.value}
                    onClick={() => setDevRoleOverride(role.value)}
                    className={`cursor-pointer capitalize ${devRoleOverride === role.value ? 'bg-amber-50 font-medium' : ''}`}
                  >
                    {devRoleOverride === role.value && (
                      <Badge variant="outline" className="mr-2 bg-amber-50 text-amber-700 border-amber-200">
                        ACTIVE
                      </Badge>
                    )}
                    {role.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <NotificationsDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-3 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 transition-colors cursor-pointer">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 font-light capitalize">
                    {devRoleOverride
                      ? devRoleOverride.replace('_', ' ')
                      : profile?.role.replace('_', ' ') || 'Loading...'}
                  </p>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-700" strokeWidth={1.5} />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 focus:bg-gray-200 focus:text-gray-900">
                <LogOut className="mr-2 h-4 w-4 text-gray-700" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}