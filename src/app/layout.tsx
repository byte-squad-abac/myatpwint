'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from '@supabase/auth-helpers-react';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import { useCartStore } from '@/lib/store/cartStore';
import { useRouter, usePathname } from 'next/navigation';
import Typography from '@mui/material/Typography';
import type { CSSProperties } from 'react';

// Header and navbar styles
const HEADER_HEIGHT = 64;
const HEADER_BG = '#641B2E';
const HEADER_COLOR = '#FBDB93';
const HEADER_RADIUS = 16;
const NAV_MAX_WIDTH = 1400;

const headerStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: '100vw',
  height: `${HEADER_HEIGHT}px`,
  background: HEADER_BG,
  color: HEADER_COLOR,
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderBottomLeftRadius: HEADER_RADIUS,
  borderBottomRightRadius: HEADER_RADIUS,
  zIndex: 1000,
  padding: '0 16px',
  boxSizing: 'border-box' as const,
};

const navContainerStyle: CSSProperties = {
  maxWidth: `${NAV_MAX_WIDTH}px`,
  margin: '0 auto',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: `${HEADER_HEIGHT}px`,
};

const leftLinksStyle: CSSProperties = {
  display: 'flex',
  gap: '20px',
  alignItems: 'center',
  flex: 1,
};

const rightLinksStyle: CSSProperties = {
  display: 'flex',
  gap: '24px',
  alignItems: 'center',
  flexShrink: 0,
  minWidth: 0,
};

const mainStyle: CSSProperties = {
  left: '0px',
  top: '0px',
  position: 'absolute',
  width: '100%',
  paddingTop: `${HEADER_HEIGHT}px`,
  minHeight: '100vh',
  marginTop: `-${HEADER_RADIUS}px`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());
  const session = useSession();
  const pathname = usePathname();

  return (
    <html lang="en">
      <body>
        <SessionContextProvider supabaseClient={supabaseClient}>
          <header style={headerStyle}>
            <div style={navContainerStyle}>
              <nav style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Left side links */}
                <div style={leftLinksStyle}>
                  <Link href="/" style={{ color: HEADER_COLOR, textDecoration: 'none' }}>Home</Link>
                  <Link href="/books" style={{ color: HEADER_COLOR, textDecoration: 'none' }}>Books</Link>
                  <Link href="/author" style={{ color: HEADER_COLOR, textDecoration: 'none' }}>Author</Link>
                  <Link href="/publisher" style={{ color: HEADER_COLOR, textDecoration: 'none' }}>Publisher</Link>
                </div>
                {/* Right side links */}
                <div style={rightLinksStyle}>
                  {pathname.startsWith('/books') && (
                    <div style={{ marginRight: '12px' }}><CartPopover /></div>
                  )}
                  <Link href="/login" style={{ color: HEADER_COLOR, textDecoration: 'none' }}>Login</Link>
                  {session && session.user && (
                    <Link href="/profile" style={{ marginLeft: 8, color: 'white', textDecoration: 'none', fontSize: 22, display: 'flex', alignItems: 'center' }}>
                      <span style={{ display: 'inline-block', width: 28, height: 28, borderRadius: '50%', background: '#fff', color: '#1a237e', textAlign: 'center', fontWeight: 700, lineHeight: '28px', marginRight: 6 }}>
                        {session.user.email ? session.user.email[0].toUpperCase() : '?'}
                      </span>
                      Profile
                    </Link>
                  )}
                </div>
              </nav>
            </div>
          </header>
          <main style={mainStyle}>
            {children}
          </main>
        </SessionContextProvider>
      </body>
    </html>
  );
}

function CartPopover() {
  const { items, getTotal, removeItem } = useCartStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const totalCount = items.reduce((sum, item) => sum + (item.deliveryType === 'physical' ? item.quantity : 1), 0);
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);
  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: '#FBDB93', ml: 2 }}>
        <Badge badgeContent={totalCount} color="error" overlap="circular">
          <ShoppingCartIcon style={{ fontSize: 28 }} />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
                <ListItem key={item.book.id + item.deliveryType + idx} alignItems="flex-start" secondaryAction={
                  <Button size="small" color="error" onClick={() => removeItem(item.book.id, item.deliveryType)}>Remove</Button>
                }>
                  <ListItemAvatar>
                    <Avatar src={item.book.image_url} alt={item.book.name} variant="rounded" />
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.book.name}
                    secondary={
                      <>
                        <span>{item.deliveryType === 'physical' ? `Physical x${item.quantity}` : 'Digital'}</span><br />
                        <span>{item.book.price.toLocaleString()} MMK</span>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Total: {getTotal().toLocaleString()} MMK</Typography>
            <Button fullWidth variant="contained" color="primary" sx={{ mb: 1 }} onClick={() => { handleClose(); router.push('/checkout'); }}>Checkout</Button>
            {/* Uncomment below if you add a /cart page */}
            {/* <Button fullWidth variant="outlined" onClick={() => { handleClose(); router.push('/cart'); }}>View Cart</Button> */}
          </>
        )}
      </Popover>
    </>
  );
}
