'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  Search,
  Settings,
  Recommend,
} from '@mui/icons-material';
import { useSession } from '@supabase/auth-helpers-react';
import PersonalizedRecommendations from './PersonalizedRecommendations';
import TrendingBooks from './TrendingBooks';
import SearchWithRecommendations from './SearchWithRecommendations';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`recommendation-tabpanel-${index}`}
      aria-labelledby={`recommendation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `recommendation-tab-${index}`,
    'aria-controls': `recommendation-tabpanel-${index}`,
  };
}

export interface RecommendationDashboardProps {
  showSearchTab?: boolean;
  showPersonalizedTab?: boolean;
  showTrendingTab?: boolean;
  showAdvancedOptions?: boolean;
  defaultTab?: number;
}

export default function RecommendationDashboard({
  showSearchTab = true,
  showPersonalizedTab = true,
  showTrendingTab = true,
  showAdvancedOptions = true,
  defaultTab = 0,
}: RecommendationDashboardProps) {
  const session = useSession();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showScores, setShowScores] = useState(true);
  const [showAlgorithm, setShowAlgorithm] = useState(true);
  const [excludePurchased, setExcludePurchased] = useState(true);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const tabs = [];
  let tabIndex = 0;

  // Search Tab
  if (showSearchTab) {
    tabs.push({
      label: 'AI Search',
      icon: <Search />,
      index: tabIndex++,
      component: (
        <SearchWithRecommendations
          showScores={showScores}
          showAlgorithm={showAlgorithm}
          limit={12}
        />
      ),
    });
  }

  // Personalized Tab (only if user is signed in)
  if (showPersonalizedTab && session?.user?.id) {
    tabs.push({
      label: 'For You',
      icon: <Psychology />,
      index: tabIndex++,
      component: (
        <PersonalizedRecommendations
          showScores={showScores}
          showAlgorithm={showAlgorithm}
          excludePurchased={excludePurchased}
          limit={12}
        />
      ),
    });
  }

  // Trending Tab
  if (showTrendingTab) {
    tabs.push({
      label: 'Trending',
      icon: <TrendingUp />,
      index: tabIndex++,
      component: (
        <TrendingBooks
          showScores={showScores}
          showAlgorithm={showAlgorithm}
          limit={12}
          allowTimeWindowSelection={true}
          allowCategorySelection={true}
        />
      ),
    });
  }

  // Adjust active tab if it's out of bounds
  const validActiveTab = Math.min(activeTab, tabs.length - 1);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Dashboard Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: 'linear-gradient(45deg, #2196F3 30%, #9C27B0 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          AI-Powered Book Discovery
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 1 }}
        >
          Discover your next favorite book with intelligent recommendations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Powered by advanced machine learning and semantic search technology
        </Typography>
      </Box>

      <Paper
        elevation={2}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
        }}
      >
        {/* Tab Bar */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'white' }}>
          <Tabs
            value={validActiveTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 72,
                fontSize: '1rem',
                fontWeight: 600,
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                {...a11yProps(tab.index)}
              />
            ))}
          </Tabs>
        </Box>

        {/* Advanced Options */}
        {showAdvancedOptions && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: 'rgba(0,0,0,0.02)',
              borderBottom: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Settings sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Display Options
              </Typography>
            </Box>
            
            <FormGroup row sx={{ gap: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showScores}
                    onChange={(e) => setShowScores(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    Show similarity scores
                  </Typography>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showAlgorithm}
                    onChange={(e) => setShowAlgorithm(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    Show AI algorithm info
                  </Typography>
                }
              />
              
              {session?.user?.id && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={excludePurchased}
                      onChange={(e) => setExcludePurchased(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Hide owned books
                    </Typography>
                  }
                />
              )}
            </FormGroup>
          </Paper>
        )}

        {/* Tab Content */}
        <Box sx={{ minHeight: 400 }}>
          {tabs.map((tab) => (
            <TabPanel key={tab.index} value={validActiveTab} index={tab.index}>
              {tab.component}
            </TabPanel>
          ))}
          
          {tabs.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                color: 'text.secondary',
              }}
            >
              <Recommend sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No recommendation tabs available
              </Typography>
              <Typography variant="body2">
                {!session?.user?.id 
                  ? 'Sign in to access personalized recommendations' 
                  : 'Configure which recommendation types to show'}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Information Footer */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Recommendations are powered by advanced AI including:
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            • Multilingual Sentence Transformers
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • Vector Similarity Search
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • Collaborative Filtering
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • Behavioral Analysis
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}