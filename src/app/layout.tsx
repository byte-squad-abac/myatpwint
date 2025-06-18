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
import { useRouter } from 'next/navigation';
import Typography from '@mui/material/Typography';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());
  const session = useSession();

  return (
    <html lang="en">
      <body>
        <SessionContextProvider supabaseClient={supabaseClient}>
          <header style={{ padding: '20px', background: '#1a237e', color: 'white', position: 'relative' }}>
            <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
              <Link href="/books" style={{ color: 'white', textDecoration: 'none' }}>Books</Link>
              <Link href="/author" style={{ color: 'white', textDecoration: 'none' }}>Author</Link>
              <Link href="/publisher" style={{ color: 'white', textDecoration: 'none' }}>Publisher</Link>
              <div style={{ flex: 1 }} />
              <Link href="/login" style={{ color: 'white', textDecoration: 'none' }}>Login</Link>
              {session && session.user && (
                <Link href="/profile" style={{ marginLeft: 18, color: 'white', textDecoration: 'none', fontSize: 22, display: 'flex', alignItems: 'center' }}>
                  <span style={{ display: 'inline-block', width: 28, height: 28, borderRadius: '50%', background: '#fff', color: '#1a237e', textAlign: 'center', fontWeight: 700, lineHeight: '28px', marginRight: 6 }}>
                    {session.user.email ? session.user.email[0].toUpperCase() : '?'}
                  </span>
                  Profile
                </Link>
              )}
              <CartPopover />
            </nav>
          </header>
          <main style={{ padding: '40px' }}>
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
      <IconButton onClick={handleOpen} sx={{ color: 'white', ml: 2 }}>
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
