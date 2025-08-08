'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  Search,
  Psychology,
  Visibility,
  ShoppingCart,
  Person,
  Timeline,
} from '@mui/icons-material';
import { analyticsService, RecommendationPerformance } from '@/lib/services/analytics.service';

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

function MetricCard({ title, value, subtitle, icon, color, trend }: MetricCardProps) {
  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
            </Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {trend !== undefined && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
            <TrendingUp
              sx={{
                fontSize: 16,
                color: trend >= 0 ? 'success.main' : 'error.main',
                mr: 0.5,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: trend >= 0 ? 'success.main' : 'error.main',
                fontWeight: 600,
              }}
            >
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [timePeriod, setTimePeriod] = useState(30);
  
  // Analytics data state
  const [performanceMetrics, setPerformanceMetrics] = useState<RecommendationPerformance[]>([]);
  const [searchAnalytics, setSearchAnalytics] = useState<any>(null);
  const [overallStats, setOverallStats] = useState<any>(null);

  const timePeriodOptions = [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 3 months' },
  ];

  useEffect(() => {
    loadAnalyticsData();
  }, [timePeriod]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timePeriod);

      // Load performance metrics
      const metrics = await analyticsService.getPerformanceMetrics(
        startDate.toISOString(),
        endDate
      );
      setPerformanceMetrics(metrics);

      // Load search analytics
      const searchData = await analyticsService.getSearchAnalytics(timePeriod);
      setSearchAnalytics(searchData);

      // Calculate overall stats
      const totalViews = metrics.reduce((sum, m) => sum + m.total_views, 0);
      const totalClicks = metrics.reduce((sum, m) => sum + m.total_clicks, 0);
      const totalPurchases = metrics.reduce((sum, m) => sum + m.total_purchases, 0);
      
      setOverallStats({
        totalViews,
        totalClicks,
        totalPurchases,
        overallCTR: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
        overallConversion: totalClicks > 0 ? (totalPurchases / totalClicks) * 100 : 0,
      });

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Recommendation Analytics
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1" color="text.secondary">
            AI-powered recommendation system performance insights
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Period</InputLabel>
            <Select
              value={timePeriod}
              label="Time Period"
              onChange={(e) => setTimePeriod(e.target.value as number)}
            >
              {timePeriodOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Overview Metrics */}
      {overallStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <MetricCard
              title="Total Views"
              value={overallStats.totalViews.toLocaleString()}
              icon={<Visibility />}
              color="#2196F3"
              subtitle="Recommendation impressions"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <MetricCard
              title="Total Clicks"
              value={overallStats.totalClicks.toLocaleString()}
              icon={<Psychology />}
              color="#9C27B0"
              subtitle="Books clicked from recommendations"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <MetricCard
              title="Purchases"
              value={overallStats.totalPurchases.toLocaleString()}
              icon={<ShoppingCart />}
              color="#4CAF50"
              subtitle="Books purchased from recommendations"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <MetricCard
              title="Click-through Rate"
              value={`${overallStats.overallCTR.toFixed(1)}%`}
              icon={<TrendingUp />}
              color="#FF5722"
              subtitle="Clicks per view"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <MetricCard
              title="Conversion Rate"
              value={`${overallStats.overallConversion.toFixed(1)}%`}
              icon={<Analytics />}
              color="#795548"
              subtitle="Purchases per click"
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
            <Tab
              label="Recommendation Performance"
              icon={<Psychology />}
              iconPosition="start"
            />
            <Tab
              label="Search Analytics"
              icon={<Search />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Recommendation Performance Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Performance by Recommendation Type
              </Typography>
            </Grid>
            
            {performanceMetrics.map((metric) => (
              <Grid item xs={12} md={6} key={`${metric.recommendation_type}-${metric.algorithm}`}>
                <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {metric.recommendation_type?.replace('_', ' ')} Recommendations
                    </Typography>
                    <Chip
                      label={metric.algorithm}
                      size="small"
                      sx={{ ml: 2, backgroundColor: 'primary.main', color: 'white' }}
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Views</Typography>
                      <Typography variant="h6">{metric.total_views.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Clicks</Typography>
                      <Typography variant="h6">{metric.total_clicks.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Purchases</Typography>
                      <Typography variant="h6">{metric.total_purchases.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">CTR</Typography>
                      <Typography variant="h6" color="primary.main">
                        {metric.click_through_rate.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Conversion</Typography>
                      <Typography variant="h6" color="success.main">
                        {metric.conversion_rate.toFixed(1)}%
                      </Typography>
                    </Grid>
                  </Grid>

                  {metric.average_similarity_score && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Average Similarity Score: {(metric.average_similarity_score * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}

            {performanceMetrics.length === 0 && (
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                  <Psychology sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No recommendation data available
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start using the recommendation system to see analytics here
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Search Analytics Tab */}
        <TabPanel value={activeTab} index={1}>
          {searchAnalytics ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Search Performance Overview
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Total Searches</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {searchAnalytics.total_searches.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Success Rate</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {searchAnalytics.success_rate.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">CTR</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {searchAnalytics.click_through_rate.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Avg Results</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {searchAnalytics.average_results_per_search.toFixed(0)}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      Algorithm Usage
                    </Typography>
                    {searchAnalytics.algorithm_usage.map((algo: any) => (
                      <Box key={algo.algorithm} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">
                            {algo.algorithm === 'semantic_search' ? 'AI Semantic Search' : 'Traditional Search'}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {algo.percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: '100%',
                            height: 6,
                            backgroundColor: 'grey.200',
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${algo.percentage}%`,
                              height: '100%',
                              backgroundColor: algo.algorithm === 'semantic_search' ? 'primary.main' : 'secondary.main',
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Popular Search Queries
                  </Typography>
                  <List dense>
                    {searchAnalytics.top_queries.slice(0, 10).map((query: any, index: number) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemText
                          primary={query.query}
                          secondary={`${query.count} searches`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>

              {searchAnalytics.no_result_queries.length > 0 && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Queries with No Results (Improvement Opportunities)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {searchAnalytics.no_result_queries.slice(0, 20).map((query: string, index: number) => (
                        <Chip
                          key={index}
                          label={query}
                          size="small"
                          sx={{ backgroundColor: 'warning.light', color: 'warning.contrastText' }}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          ) : (
            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
              <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No search data available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Search analytics will appear here once users start searching
              </Typography>
            </Paper>
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
}