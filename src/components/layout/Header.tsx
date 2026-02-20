import { Search, User, LogOut, ShieldAlert, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '@/hooks/useSearch';
import { SearchResult } from '@/lib/searchService';
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
  const { search, searchResults, isSearching, initialized } = useSearch();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim() && initialized) {
        await search(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, initialized, search]);

  // Handle clicks outside search results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'campaign':
        return '📊';
      case 'broadcast':
        return '📢';
      case 'member':
        return '👤';
      case 'community':
        return '👥';
      case 'poll':
        return '📋';
      case 'advert':
        return '📰';
      default:
        return '📌';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setShowSearchResults(false);
    setSearchQuery('');

    switch (result.type) {
      case 'campaign':
        navigate(`/campaigns/${result.id}`);
        break;
      case 'broadcast':
        navigate('/broadcasting');
        break;
      case 'member':
        navigate('/members');
        break;
      case 'community':
        navigate('/communities');
        break;
      case 'poll':
        navigate('/polls');
        break;
      case 'advert':
        navigate('/adverts');
        break;
      default:
        console.warn('Unknown result type:', result.type);
    }
  };

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
              ref={searchInputRef}
              className="pl-10 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
              placeholder="Search campaigns, members, broadcasts..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.length > 0);
              }}
              onFocus={() => searchQuery.length > 0 && setShowSearchResults(true)}
            />
            {isSearching && (
              <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" strokeWidth={1.5} />
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="h-4 w-4 text-gray-400 animate-spin mr-2" />
                    <span className="text-sm text-gray-500">Searching...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-4 text-center text-gray-500 text-sm">
                    {searchQuery.trim() ? 'No results found' : 'Type to search'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {searchResults.slice(0, 8).map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="px-4 py-2 hover:bg-gray-50 transition-colors block w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl flex-shrink-0">{getTypeIcon(result.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 line-clamp-1">
                              {result.title}
                            </p>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {result.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {result.type}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                Score: {result.relevanceScore.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                    {searchResults.length > 8 && (
                      <div className="px-4 py-2 text-center text-xs text-gray-500">
                        +{searchResults.length - 8} more results
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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