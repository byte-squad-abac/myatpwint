'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { SessionContextProvider, useSession } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import supabase from '@/lib/supabaseClient';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import SemanticSearch from '@/components/SemanticSearch';
import { BookWithSearchMetadata } from '@/lib/types';

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HomeIcon from '@mui/icons-material/Home';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { Badge } from '@mui/material';
import { useCartStore } from '@/lib/store/cartStore';

const HEADER_HEIGHT = 64;
const HEADER_BG = '#5B2C3B';
const HEADER_COLOR = '#FCEBD5';

// Search Results Context
interface SearchContextType {
  searchResults: BookWithSearchMetadata[] | null;
  hasActiveSearch: boolean;
  setSearchResults: (results: BookWithSearchMetadata[], isActive: boolean) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within SearchProvider');
  }
  return context;
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [browserSupabaseClient] = useState(() => createPagesBrowserClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  }));

  return (
    <SessionContextProvider supabaseClient={browserSupabaseClient}>
      <SearchProvider>
        <SidebarLayout>{children}</SidebarLayout>
      </SearchProvider>
    </SessionContextProvider>
  );
}

function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchResults, setSearchResultsState] = useState<BookWithSearchMetadata[] | null>(null);
  const [hasActiveSearch, setHasActiveSearch] = useState(false);

  const setSearchResults = useCallback((results: BookWithSearchMetadata[], isActive: boolean) => {
    setSearchResultsState(results);
    setHasActiveSearch(isActive);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResultsState(null);
    setHasActiveSearch(false);
  }, []);

  return (
    <SearchContext.Provider value={{
      searchResults,
      hasActiveSearch,
      setSearchResults,
      clearSearch
    }}>
      {children}
    </SearchContext.Provider>
  );
}

function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <TopNavbar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', paddingTop: HEADER_HEIGHT }}>
        <main style={{ padding: 24, boxSizing: 'border-box', flex: 1, overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}


function TopNavbar() {
  const session = useSession();
  const pathname = usePathname();
  const { items } = useCartStore();
  const { setSearchResults } = useSearchContext();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Memoize role fetching to avoid excessive DB calls
  useEffect(() => {
    let mounted = true;
    const fetchRole = async () => {
      if (!session?.user?.email) return;
      try {
        const { data } = await supabase.from('profiles').select('role').eq('email', session.user.email).single();
        if (mounted) setUserRole(data?.role || null);
      } catch (error) {
        console.error('Error fetching role:', error);
      }
    };
    fetchRole();
    return () => { mounted = false; };
  }, [session?.user?.email]);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const getTitle = () => {
    if (pathname.startsWith('/books')) return 'Books';
    if (pathname.startsWith('/author')) return 'Author';
    if (pathname.startsWith('/publisher')) return 'Publisher Dashboard';
    if (pathname.startsWith('/editor')) return 'Editor Dashboard';
    if (pathname.startsWith('/profile')) return 'Profile';
    if (pathname.startsWith('/my-library')) return 'My Library';
    return 'Myat Pwint Publishing House';
  };

  const isOnBooksPage = pathname.startsWith('/books');

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: HEADER_HEIGHT,
      background: HEADER_BG,
      color: HEADER_COLOR,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      borderBottom: '2px solid #C97E7E',
      zIndex: 1000,
      gap: '20px'
    }}>
      {/* Logo and Title Combined */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: HEADER_COLOR }}>
        <img src="/logo.jpg" alt="Logo" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '18px', lineHeight: '1.2' }}>Myat Pwint</div>
          <div style={{ fontWeight: 'normal', fontSize: '12px', opacity: 0.8, lineHeight: '1.2' }}>Publishing House</div>
        </div>
      </Link>

      {/* Current Page Title */}
      <div style={{ fontWeight: 'bold', fontSize: '16px', minWidth: '120px', marginLeft: '20px' }}>
        {getTitle()}
      </div>

      {/* AI Search - centered */}
      {isOnBooksPage && (
        <div style={{ 
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <SemanticSearch 
            placeholder="Search books in Myanmar or English with AI..."
            autoNavigate={true}
            headerMode={true}
            onResults={(results, isActive = false) => setSearchResults(results, isActive)}
          />
        </div>
      )}

      {/* Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
        <NavLink href="/" icon={<HomeIcon />} label="Home" />
        <NavLink href="/books" icon={<MenuBookIcon />} label="Books" />
        
        {/* Author link - only for regular users, not publishers or editors */}
        {session && userRole !== 'publisher' && userRole !== 'editor' && (
          <NavLink href="/author" icon={<PersonIcon />} label="Author" />
        )}
        
        {/* Role-specific dashboard links */}
        {userRole === 'publisher' && (
          <NavLink href="/publisher" icon={<DashboardIcon />} label="Publisher" />
        )}
        {userRole === 'editor' && (
          <NavLink href="/editor" icon={<DashboardIcon />} label="Editor" />
        )}
        
        {/* Library - only for regular users, not publishers or editors */}
        {session && userRole !== 'publisher' && userRole !== 'editor' && (
          <NavLink href="/my-library" icon={<LibraryBooksIcon />} label="Library" />
        )}
        
        {/* Profile - available for all logged-in users */}
        {session && (
          <NavLink href="/profile" icon={<AccountCircleIcon />} label="Profile" />
        )}
        
        {/* Cart - only for regular users, not publishers or editors */}
        {userRole !== 'publisher' && userRole !== 'editor' && (
          <NavLink 
            href="/checkout" 
            icon={
              <Badge badgeContent={totalCount > 0 ? totalCount : null} color="error">
                <ShoppingCartIcon />
              </Badge>
            } 
            label="Cart" 
          />
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
  
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        padding: '4px 8px',
        color: isActive ? '#FFD700' : HEADER_COLOR,
        textDecoration: 'none',
        fontSize: '12px',
        borderRadius: '4px',
        background: isActive ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
        transition: 'all 0.2s ease'
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}