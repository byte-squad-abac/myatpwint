'use client';

import { useEffect, useState } from 'react';
import { SessionContextProvider, useSession } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import supabase from '@/lib/supabaseClient';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HomeIcon from '@mui/icons-material/Home';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { Badge } from '@mui/material';
import { useCartStore } from '@/lib/store/cartStore';
import { useSearchStore } from '@/lib/store/searchStore';

const HEADER_HEIGHT = 64;
const SIDEBAR_WIDTH = 220;
const COLLAPSED_WIDTH = 64;
const HEADER_BG = '#5B2C3B';
const HEADER_COLOR = '#FCEBD5';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [browserSupabaseClient] = useState(() => createPagesBrowserClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  }));

  return (
    <SessionContextProvider supabaseClient={browserSupabaseClient}>
      <SidebarLayout>{children}</SidebarLayout>
    </SessionContextProvider>
  );
}

function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const isExpanded = !collapsed || hoverExpanded;
  const sidebarWidth = isExpanded ? SIDEBAR_WIDTH : COLLAPSED_WIDTH;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed}
        onMouseEnter={() => setHoverExpanded(true)}
        onMouseLeave={() => setHoverExpanded(false)}
        isExpanded={isExpanded}
      />
      <div style={{ marginLeft: sidebarWidth, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{
          height: HEADER_HEIGHT,
          background: HEADER_BG,
          color: HEADER_COLOR,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: isExpanded ? SIDEBAR_WIDTH : COLLAPSED_WIDTH,
          fontSize: 20,
          fontWeight: 'bold',
          borderBottom: `2px solid #C97E7E`,
          transition: 'margin-left 0.3s ease',
          marginLeft: `-${sidebarWidth}px`
        }}>
          <HeaderWithTitleOnly />
        </div>
        <main style={{ padding: 24, boxSizing: 'border-box', flex: 1, overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}

function HeaderWithTitleOnly() {
  const pathname = usePathname();
  const { search, setSearch } = useSearchStore();

  const getTitle = () => {
    if (pathname.startsWith('/books')) return 'Books';
    if (pathname.startsWith('/author')) return 'Author';
    if (pathname.startsWith('/publisher')) return 'Publisher Dashboard';
    if (pathname.startsWith('/editor')) return 'Editor Dashboard';
    if (pathname.startsWith('/profile')) return 'Profile';
    if (pathname.startsWith('/my-library')) return 'My Library';
    return 'Welcome to Myat Pwint Publishing House';
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: 20, paddingLeft: 12 }}>
        {getTitle()}
      </div>

      {pathname.startsWith('/books') && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
          }}
        >
          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #ccc',
              fontSize: 14,
            }}
          />
        </div>
      )}
    </div>
  );
}

function Sidebar({ 
  collapsed, 
  setCollapsed, 
  onMouseEnter, 
  onMouseLeave, 
  isExpanded 
}: { 
  collapsed: boolean; 
  setCollapsed: (val: boolean) => void; 
  onMouseEnter: () => void; 
  onMouseLeave: () => void; 
  isExpanded: boolean; 
}) {
  const session = useSession();
  const { items } = useCartStore();

  const [isPublisher, setIsPublisher] = useState(false);
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      if (!session?.user?.email) return;
      const { data } = await supabase.from('profiles').select('role').eq('email', session.user.email).single();
      setIsPublisher(data?.role === 'publisher');
      setIsEditor(data?.role === 'editor');
    };
    fetchRole();
  }, [session]);

  const totalCount = items.reduce((sum, item) => sum + (item.deliveryType === 'physical' ? item.quantity : 1), 0);

  const navItems = [
    { href: '/', icon: <HomeIcon />, label: 'Home' },
    { href: '/books', icon: <MenuBookIcon />, label: 'Books' },
    { href: '/author', icon: <PersonIcon />, label: 'Author' },
    ...(isPublisher ? [{ href: '/publisher', icon: <DashboardIcon />, label: 'Publisher Dashboard' }] : []),
    ...(isEditor ? [{ href: '/editor', icon: <DashboardIcon />, label: 'Editor Dashboard' }] : []),
    ...(session ? [{ href: '/my-library', icon: <LibraryBooksIcon />, label: 'BookShelf' }] : []),
    ...(session ? [{ href: '/profile', icon: <AccountCircleIcon />, label: 'Profile' }] : []),
    { href: '/checkout', icon: <Badge badgeContent={totalCount} color="error"><ShoppingCartIcon /></Badge>, label: 'Cart' }
  ];

  return (
    <nav 
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: isExpanded ? SIDEBAR_WIDTH : COLLAPSED_WIDTH,
        background: '#2C1B28',
        color: '#FCEBD5',
        height: '100vh',
        paddingTop: 20,
        position: 'fixed',
        top: 0,
        left: 0,
        overflowY: 'auto',
        borderRight: '2px solid #C97E7E',
        zIndex: 999,
        transition: 'width 0.3s ease',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', marginBottom: 24 }}>
        <img src="/logo.jpg" alt="Logo" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
        {isExpanded && (
          <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.2, marginLeft: 12 }}>
            Myat Pwint<br />Publishing House
          </div>
        )}
      </div>
      <button onClick={() => setCollapsed(!collapsed)} style={{
        margin: '0 16px 16px',
        padding: '4px 8px',
        background: 'transparent',
        color: '#FCEBD5',
        border: '1px solid #C97E7E',
        borderRadius: 4,
        cursor: 'pointer'
      }}>
        {collapsed ? '›' : '‹'}
      </button>
      {navItems.map(({ href, icon, label }) => (
        <Link
          key={href}
          href={href}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            color: '#FCEBD5',
            textDecoration: 'none',
            fontSize: 16
          }}
        >
          {icon}
          {isExpanded && label}
        </Link>
      ))}
    </nav>
  );
}