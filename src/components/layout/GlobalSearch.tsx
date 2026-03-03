import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

type SearchGroup = 'Pages' | 'Members' | 'Communities' | 'Campaigns' | 'Polls';

type SearchResult = {
  key: string;
  group: SearchGroup;
  label: string;
  description?: string;
  href: string;
};

const PAGES: Array<Omit<SearchResult, 'key'>> = [
  { group: 'Pages', label: 'Dashboard', href: '/', description: 'Overview' },
  { group: 'Pages', label: 'Members', href: '/members', description: 'Membership management' },
  { group: 'Pages', label: 'Communities', href: '/communities', description: 'Groups & engagement' },
  { group: 'Pages', label: 'Broadcasting', href: '/broadcasting-enhanced', description: 'Posts & announcements' },
  { group: 'Pages', label: 'Polls', href: '/polls', description: 'Create and manage polls' },
  { group: 'Pages', label: 'Campaigns', href: '/campaigns', description: 'Fundraising & campaigns' },
  { group: 'Pages', label: 'Finance', href: '/finance', description: 'Finance dashboard' },
  { group: 'Pages', label: 'Donations', href: '/finance/donations', description: 'Donations and pledges' },
  { group: 'Pages', label: 'Users', href: '/users', description: 'User management' },
  { group: 'Pages', label: 'Calendar', href: '/calendar', description: 'Events & schedule' },
  { group: 'Pages', label: 'Party Management', href: '/party', description: 'Party structure' },
  { group: 'Pages', label: 'Store', href: '/store', description: 'Orders & products' },
  { group: 'Pages', label: 'Regional Authority', href: '/regional-authority', description: 'Regional oversight' },
  { group: 'Pages', label: 'Settings', href: '/settings', description: 'Configuration' },
];

function makeKey(r: Omit<SearchResult, 'key'>) {
  return `${r.group}:${r.href}:${r.label}`;
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dynamicResults, setDynamicResults] = useState<SearchResult[]>([]);

  const pageResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = PAGES.map((p) => ({ ...p, key: makeKey(p) }));
    if (!q) return base;
    return base.filter((p) => {
      const hay = `${p.label} ${p.description ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDynamicResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const like = `%${q}%`;

        const [members, communities, campaigns, polls] = await Promise.all([
          supabase
            .from('memberships')
            .select('id, full_name, surname, email, membership_number')
            .or(
              `full_name.ilike.${like},surname.ilike.${like},email.ilike.${like},membership_number.ilike.${like}`
            )
            .limit(6),
          supabase
            .from('communities')
            .select('id, name, description')
            .ilike('name', like)
            .limit(6),
          supabase
            .from('campaigns')
            .select('id, name, description')
            .ilike('name', like)
            .limit(6),
          supabase
            .from('polls')
            .select('id, question, description')
            .ilike('question', like)
            .limit(6),
        ]);

        const next: SearchResult[] = [];

        if (!members.error && members.data) {
          for (const m of members.data as any[]) {
            next.push({
              key: `Members:${m.id}`,
              group: 'Members',
              label: `${m.full_name ?? ''} ${m.surname ?? ''}`.trim() || m.email || 'Member',
              description: [m.membership_number, m.email].filter(Boolean).join(' • ') || undefined,
              href: `/members?q=${encodeURIComponent(q)}`,
            });
          }
        }

        if (!communities.error && communities.data) {
          for (const c of communities.data as any[]) {
            next.push({
              key: `Communities:${c.id}`,
              group: 'Communities',
              label: c.name,
              description: c.description || undefined,
              href: `/communities?q=${encodeURIComponent(q)}`,
            });
          }
        }

        if (!campaigns.error && campaigns.data) {
          for (const c of campaigns.data as any[]) {
            next.push({
              key: `Campaigns:${c.id}`,
              group: 'Campaigns',
              label: c.name,
              description: c.description || undefined,
              href: `/campaigns/${c.id}`,
            });
          }
        }

        if (!polls.error && polls.data) {
          for (const p of polls.data as any[]) {
            next.push({
              key: `Polls:${p.id}`,
              group: 'Polls',
              label: p.question,
              description: p.description || undefined,
              href: `/polls?q=${encodeURIComponent(q)}`,
            });
          }
        }

        setDynamicResults(next);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query]);

  const grouped = useMemo(() => {
    const byGroup = new Map<SearchGroup, SearchResult[]>();
    const add = (r: SearchResult) => {
      if (!byGroup.has(r.group)) byGroup.set(r.group, []);
      byGroup.get(r.group)!.push(r);
    };

    pageResults.forEach(add);
    dynamicResults.forEach(add);

    return byGroup;
  }, [pageResults, dynamicResults]);

  const onPick = (href: string) => {
    setOpen(false);
    setQuery('');
    navigate(href);
    window.setTimeout(() => inputRef.current?.blur(), 0);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className="relative max-w-md w-full"
          onMouseDown={() => setOpen(true)}
        >
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
            strokeWidth={1.5}
          />
          <Input
            ref={inputRef}
            value={query}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Close only if focus moves outside both input and dropdown.
              window.setTimeout(() => {
                const active = document.activeElement as HTMLElement | null;
                if (!active) return setOpen(false);
                if (active === inputRef.current) return;
                if (contentRef.current?.contains(active)) return;
                setOpen(false);
              }, 0);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="pl-10 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
            placeholder="Search..."
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        ref={contentRef}
        align="start"
        className="p-0 w-[520px] max-w-[calc(100vw-2rem)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          // Keep the input focused while clicking results so the popover doesn't close
          // due to input blur before selection runs.
          e.preventDefault();
        }}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-[360px]">
            <CommandEmpty>
              {loading ? 'Searching…' : query.trim().length < 2 ? 'Type at least 2 characters.' : 'No results found.'}
            </CommandEmpty>

            {Array.from(grouped.entries()).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.slice(0, 8).map((item) => (
                  <CommandItem
                    key={item.key}
                    value={item.label}
                    onSelect={() => onPick(item.href)}
                    className={cn('flex flex-col items-start gap-0.5')}
                  >
                    <div className="text-sm font-medium text-gray-900">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-gray-500 line-clamp-1">{item.description}</div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

