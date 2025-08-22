/**
 * Design System Theme Configuration
 */

import { createTheme, ThemeOptions } from '@mui/material/styles';
import { APP_CONSTANTS } from '../config';

const colors = {
  primary: {
    main: APP_CONSTANTS.THEME.PRIMARY_COLOR,
    light: '#8B2C42',
    dark: '#4A1220',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: APP_CONSTANTS.THEME.SECONDARY_COLOR,
    light: '#FCEBBC',
    dark: '#E6C55C',
    contrastText: '#2C1810',
  },
  success: {
    main: APP_CONSTANTS.THEME.SUCCESS_COLOR,
  },
  warning: {
    main: APP_CONSTANTS.THEME.WARNING_COLOR,
  },
  error: {
    main: APP_CONSTANTS.THEME.ERROR_COLOR,
  },
  info: {
    main: APP_CONSTANTS.THEME.INFO_COLOR,
  },
};

const typography = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'sans-serif',
  ].join(','),
  button: {
    textTransform: 'none' as const,
  },
};

const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        textTransform: 'none' as const,
        fontWeight: 500,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      contained: {
        '&:hover': {
          boxShadow: '0px 4px 12px rgba(100, 27, 46, 0.24)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
      },
    },
  },
};

const themeOptions: ThemeOptions = {
  palette: colors,
  typography,
  components,
  breakpoints: {
    values: {
      xs: 0,
      sm: 768,
      md: 1024,
      lg: 1200,
      xl: 1536,
    },
  },
  shape: {
    borderRadius: 8,
  },
};

export const theme = createTheme(themeOptions);
export default theme;