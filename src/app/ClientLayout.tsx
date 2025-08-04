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
import type { CSSProperties } from 'react';

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
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div style={{ marginLeft: sidebarWidth, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{
          height: HEADER_HEIGHT,
          background: HEADER_BG,
          color: HEADER_COLOR,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
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

  const getTitle = () => {
    if (pathname.startsWith('/books')) return 'Books';
    if (pathname.startsWith('/author')) return 'Author';
    if (pathname.startsWith('/publisher')) return 'Publisher Dashboard';
    if (pathname.startsWith('/editor')) return 'Editor Dashboard';
    if (pathname.startsWith('/profile')) return 'Profile';
    if (pathname.startsWith('/my-library')) return 'My Library';
    return 'Welcome to Myat Pwint Publishing House';
  };

  return <div style={{ paddingLeft: 12 }}>{getTitle()}</div>;
}

function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (val: boolean) => void }) {
  const session = useSession();
  const pathname = usePathname();
  const { items } = useCartStore();

  const [isPublisher, setIsPublisher] = useState(false);
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      if (!session?.user?.email) return;

      try {
        const { data: publisherData } = await supabase
          .from('publishers')
          .select('id')
          .eq('email', session.user.email)
          .single();

        setIsPublisher(!!publisherData);

        const { data: editorData } = await supabase
          .from('editors')
          .select('id')
          .eq('email', session.user.email)
          .single();

        setIsEditor(!!editorData);
      } catch (error) {
        console.error('Error fetching role:', error);
      }
    };

    fetchRole();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const menuItems = [
    { label: 'Home', icon: HomeIcon, href: '/' },
    { label: 'Books', icon: MenuBookIcon, href: '/books' },
    { label: 'My Library', icon: LibraryBooksIcon, href: '/my-library' },
    { label: 'Cart', icon: ShoppingCartIcon, href: '/cart', badge: totalItems },
  ];

  if (session?.user) {
    menuItems.push(
      { label: 'Author Portal', icon: PersonIcon, href: '/author' },
    );

    if (isPublisher) {
      menuItems.push(
        { label: 'Publisher', icon: DashboardIcon, href: '/publisher' },
      );
    }

    if (isEditor) {
      menuItems.push(
        { label: 'Editor', icon: DashboardIcon, href: '/editor' },
      );
    }

    menuItems.push(
      { label: 'Profile', icon: AccountCircleIcon, href: '/profile' },
    );
  }

  const sidebarStyle: CSSProperties = {
    width: collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
    height: '100vh',
    background: '#4A1220',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 1000,
    transition: 'width 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '2px solid #8B2C42',
    overflowX: 'hidden',
  };

  const logoStyle: CSSProperties = {
    height: HEADER_HEIGHT,
    background: '#641B2E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    paddingLeft: collapsed ? 0 : 12,
    color: '#FCEBD5',
    fontSize: collapsed ? 14 : 18,
    fontWeight: 'bold',
    borderBottom: '2px solid #8B2C42',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  const menuStyle: CSSProperties = {
    flex: 1,
    paddingTop: 16,
    overflowY: 'auto',
  };

  const menuItemStyle = (isActive: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    color: isActive ? '#FCEBD5' : '#D4AF37',
    textDecoration: 'none',
    backgroundColor: isActive ? '#641B2E' : 'transparent',
    borderRight: isActive ? '3px solid #D4AF37' : '3px solid transparent',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  });

  const iconStyle: CSSProperties = {
    marginRight: collapsed ? 0 : 12,
    fontSize: 20,
    minWidth: 24,
  };

  const labelStyle: CSSProperties = {
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.3s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  const badgeStyle: CSSProperties = {
    marginLeft: 'auto',
    backgroundColor: '#D4AF37',
    color: '#4A1220',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 'bold',
    minWidth: '20px',
    textAlign: 'center',
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.3s ease',
  };

  const footerStyle: CSSProperties = {
    padding: '16px',
    borderTop: '1px solid #8B2C42',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const toggleButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#D4AF37',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
    alignSelf: collapsed ? 'center' : 'flex-start',
    fontSize: '12px',
  };

  const logoutButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#D4AF37',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease, opacity 0.3s ease',
    alignSelf: collapsed ? 'center' : 'flex-start',
    fontSize: '12px',
    opacity: collapsed ? 0 : 1,
  };

  return (
    <div style={sidebarStyle}>
      <div style={logoStyle} onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? 'MP' : 'Myat Pwint Publishing'}
      </div>
      
      <div style={menuStyle}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href} style={menuItemStyle(isActive)}>
              <Icon style={iconStyle} />
              <span style={labelStyle}>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge 
                  badgeContent={item.badge} 
                  style={badgeStyle}
                />
              )}
            </Link>
          );
        })}
      </div>

      <div style={footerStyle}>
        <button style={toggleButtonStyle} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '→' : '← Collapse'}
        </button>
        
        {session?.user && (
          <button style={logoutButtonStyle} onClick={handleLogout}>
            {collapsed ? '' : 'Sign Out'}
          </button>
        )}
      </div>
    </div>
  );
}