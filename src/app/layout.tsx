'use client';

import { useEffect, useState } from 'react';
import { SessionContextProvider, useSession } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import supabase from '@/lib/supabaseClient';               // ← server-side singleton
import Link     from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import {
  Badge, Popover, IconButton, List, ListItem, ListItemText,
  ListItemAvatar, Avatar, Divider, Button, Typography,
} from '@mui/material';

import { useCartStore } from '@/lib/store/cartStore';
import type { CSSProperties } from 'react';

/* ============================================================================
   •••  CONSTANTS / STYLES •••
   ========================================================================== */
const HEADER_HEIGHT = 64;
const HEADER_BG     = '#641B2E';
const HEADER_COLOR  = '#FBDB93';
const HEADER_RADIUS = 16;
const NAV_MAX_WIDTH = 1200;

const headerStyle: CSSProperties = {
  position : 'fixed',
  top      : 0,
  left     : 0,
  right    : 0,
  width    : '100%',
  height   : HEADER_HEIGHT,
  background: HEADER_BG,
  color    : HEADER_COLOR,
  borderBottomLeftRadius : HEADER_RADIUS,
  borderBottomRightRadius: HEADER_RADIUS,
  zIndex   : 1000,
  padding  : '0',
  boxSizing: 'border-box',
  margin   : 0,
};

const navContainerStyle: CSSProperties = {
  width   : '100%',
  display : 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height  : HEADER_HEIGHT,
  boxSizing: 'border-box',
  paddingLeft: '20px',
  paddingRight: '20px',
};

const linkBarStyle: CSSProperties = { display: 'flex', gap: 20, alignItems: 'center' };

const mainStyle: CSSProperties = {
  width     : '100%',
  paddingTop: HEADER_HEIGHT,
  minHeight : '100vh',
  boxSizing : 'border-box',
  margin    : 0,
  paddingLeft: 0,
  paddingRight: 0,
  paddingBottom: 0,
};

/* ============================================================================
   •••  ROOT LAYOUT •••
   ========================================================================== */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  /* A client-side Supabase instance for auth-helpers */
  const [browserSupabaseClient] = useState(() => createPagesBrowserClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  }));

  return (
    <html lang="en">
      <body>
        <SessionContextProvider supabaseClient={browserSupabaseClient}>
          <HeaderWithRoleAwareNav />
          <main style={mainStyle}>{children}</main>
        </SessionContextProvider>
      </body>
    </html>
  );
}

/* ============================================================================
   •••  HEADER COMPONENT (with role-aware nav) •••
   ========================================================================== */
function HeaderWithRoleAwareNav() {
  const session  = useSession();           // comes from <SessionContextProvider/>
  const pathname = usePathname();
  const router   = useRouter();

  const [isPublisher, setIsPublisher] = useState<boolean>(false);
  const [isEditor   , setIsEditor   ] = useState<boolean>(false);

  /* -- Lookup role once we know the user is signed-in -------------------- */
  useEffect(() => {
    const fetchRole = async () => {
      if (!session?.user?.email) {
        setIsPublisher(false);
        setIsEditor(false);
        return;
      }

      const { data, error } = await supabase
        .from('publishers')           // <-- your table that stores roles
        .select('role')
        .eq('email', session.user.email)
        .single();

      if (error || !data) {
        setIsPublisher(false);
        setIsEditor(false);
        return;
      }

      setIsPublisher(data.role === 'publisher');
      setIsEditor   (data.role === 'editor');
    };

    fetchRole();
  }, [session]);

  return (
    <header style={headerStyle}>
      <div style={navContainerStyle}>
        {/* -------- LEFT LINKS -------- */}
        <nav style={linkBarStyle}>
          <Link href="/"       style={{ color: HEADER_COLOR, textDecoration: 'none' }}>Home</Link>
          <Link href="/books"  style={{ color: HEADER_COLOR, textDecoration: 'none' }}>Books</Link>
          <Link href="/author" style={{ color: HEADER_COLOR, textDecoration: 'none' }}>Author</Link>

          {isPublisher && (
            <Link href="/publisher" style={{ color: HEADER_COLOR, textDecoration: 'none' }}>
              Publisher Dashboard
            </Link>
          )}

          {isEditor && (
            <Link href="/editor" style={{ color: HEADER_COLOR, textDecoration: 'none' }}>
              Editor Dashboard
            </Link>
          )}
        </nav>

        {/* -------- RIGHT LINKS -------- */}
        <div style={linkBarStyle}>
          {pathname.startsWith('/books') && <CartPopover />}
          {session && (
            <Link href="/my-library" style={{ color: HEADER_COLOR, textDecoration: 'none', fontSize: 16 }}>
              BookShelf
            </Link>
          )}
          {!session && (
            <Link href="/login" style={{ color: HEADER_COLOR, textDecoration: 'none' }}>Login</Link>
          )}
          {session && (
            <Link href="/profile" style={{ color: HEADER_COLOR, textDecoration: 'none', fontSize: 18 }}>
              Profile
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/* ============================================================================
   •••  CART POPOVER •••
   ========================================================================== */
function CartPopover() {
  const { items, getTotal, removeItem } = useCartStore();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const router = useRouter();

  const totalCount = items.reduce(
    (sum, item) => sum + (item.deliveryType === 'physical' ? item.quantity : 1),
    0,
  );

  const open   = Boolean(anchorEl);
  const handleOpen  = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: HEADER_COLOR, ml: 2 }}>
        <Badge badgeContent={totalCount} color="error" overlap="circular">
          <ShoppingCartIcon sx={{ fontSize: 28 }} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top'   , horizontal: 'right' }}
        PaperProps={{ sx: { minWidth: 320, p: 2 } }}
      >
        <Typography variant="h6" sx={{ mb: 1 }}>Cart</Typography>
        <Divider sx={{ mb: 1 }} />

        {items.length === 0 ? (
          <Typography color="text.secondary">Your cart is empty.</Typography>
        ) : (
          <>
            <List dense>
              {items.map((item, idx) => (
                <ListItem
                  key={`${item.book.id}-${item.deliveryType}-${idx}`}
                  secondaryAction={
                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeItem(item.book.id, item.deliveryType)}
                    >
                      Remove
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={item.book.image_url} alt={item.book.name} variant="rounded" />
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.book.name}
                    secondary={
                      <>
                        <span>
                          {item.deliveryType === 'physical'
                            ? `Physical x${item.quantity}`
                            : 'Digital'}
                        </span>
                        <br />
                        <span>{item.book.price.toLocaleString()} MMK</span>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontWeight: 600, mb: 1 }}>
              Total: {getTotal().toLocaleString()} MMK
            </Typography>

            <Button
              fullWidth
              variant="contained"
              sx={{ mb: 1 }}
              onClick={() => {
                handleClose();
                router.push('/checkout');
              }}
            >
              Checkout
            </Button>
          </>
        )}
      </Popover>
    </>
  );
}
