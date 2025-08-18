-- ============================================================================
-- AI Manuscript Checker Database Schema
-- ============================================================================

-- Manuscript checks tracking table
CREATE TABLE IF NOT EXISTS manuscript_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('docx', 'pdf', 'txt', 'rtf')),
  file_size INTEGER NOT NULL,
  total_pages INTEGER,
  total_words INTEGER,
  language_detected TEXT[],
  processing_started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Check results table
CREATE TABLE IF NOT EXISTS check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES manuscript_checks(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('spelling', 'layout', 'typography', 'structure', 'color', 'grammar')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('error', 'warning', 'suggestion', 'info')),
  page_number INTEGER,
  line_number INTEGER,
  paragraph_number INTEGER,
  position_x FLOAT,
  position_y FLOAT,
  issue TEXT NOT NULL,
  original_text TEXT,
  suggestion TEXT,
  confidence FLOAT DEFAULT 1.0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Processing queue table
CREATE TABLE IF NOT EXISTS processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES manuscript_checks(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_content TEXT NOT NULL,
  chunk_metadata JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Myanmar dictionary cache table
CREATE TABLE IF NOT EXISTS myanmar_dictionary (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) UNIQUE NOT NULL,
  word_unicode VARCHAR(100),
  word_zawgyi VARCHAR(100),
  frequency INTEGER DEFAULT 1,
  is_valid BOOLEAN DEFAULT true,
  alternatives TEXT[],
  part_of_speech VARCHAR(20),
  definition TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Common Myanmar spelling mistakes table
CREATE TABLE IF NOT EXISTS myanmar_spelling_mistakes (
  id SERIAL PRIMARY KEY,
  incorrect VARCHAR(100) NOT NULL,
  correct VARCHAR(100) NOT NULL,
  mistake_type VARCHAR(50), -- 'zawgyi_unicode', 'typo', 'common_error'
  frequency INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Typography rules table
CREATE TABLE IF NOT EXISTS typography_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  language VARCHAR(10) DEFAULT 'my',
  category VARCHAR(50), -- 'font', 'spacing', 'layout', 'color'
  min_value FLOAT,
  max_value FLOAT,
  recommended_value FLOAT,
  unit VARCHAR(10), -- 'px', 'pt', 'em', 'rem'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analysis reports table
CREATE TABLE IF NOT EXISTS analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES manuscript_checks(id) ON DELETE CASCADE,
  total_issues INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  warnings INTEGER DEFAULT 0,
  suggestions INTEGER DEFAULT 0,
  score FLOAT, -- 0-100 quality score
  summary TEXT,
  recommendations TEXT[],
  report_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manuscript_checks_status ON manuscript_checks(status);
CREATE INDEX IF NOT EXISTS idx_manuscript_checks_user_id ON manuscript_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_checks_manuscript_id ON manuscript_checks(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_check_results_check_id ON check_results(check_id);
CREATE INDEX IF NOT EXISTS idx_check_results_category ON check_results(category);
CREATE INDEX IF NOT EXISTS idx_check_results_severity ON check_results(severity);
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_check_id ON processing_queue(check_id);
CREATE INDEX IF NOT EXISTS idx_myanmar_dictionary_word ON myanmar_dictionary(word);
CREATE INDEX IF NOT EXISTS idx_myanmar_dictionary_word_unicode ON myanmar_dictionary(word_unicode);
CREATE INDEX IF NOT EXISTS idx_myanmar_spelling_mistakes_incorrect ON myanmar_spelling_mistakes(incorrect);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_check_id ON analysis_reports(check_id);

-- Enable Row Level Security
ALTER TABLE manuscript_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manuscript_checks
CREATE POLICY "Users can view their own manuscript checks" ON manuscript_checks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create manuscript checks" ON manuscript_checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manuscript checks" ON manuscript_checks
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for check_results (users can view results for their checks)
CREATE POLICY "Users can view results for their checks" ON check_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM manuscript_checks 
      WHERE manuscript_checks.id = check_results.check_id 
      AND manuscript_checks.user_id = auth.uid()
    )
  );

-- RLS Policies for analysis_reports
CREATE POLICY "Users can view their analysis reports" ON analysis_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM manuscript_checks 
      WHERE manuscript_checks.id = analysis_reports.check_id 
      AND manuscript_checks.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON manuscript_checks TO authenticated;
GRANT ALL ON check_results TO authenticated;
GRANT ALL ON processing_queue TO authenticated;
GRANT ALL ON myanmar_dictionary TO authenticated;
GRANT ALL ON myanmar_spelling_mistakes TO authenticated;
GRANT ALL ON typography_rules TO authenticated;
GRANT ALL ON analysis_reports TO authenticated;

-- Insert default typography rules for Myanmar text
INSERT INTO typography_rules (rule_name, language, category, min_value, max_value, recommended_value, unit, description) VALUES
  ('myanmar_font_size', 'my', 'font', 12, 24, 14, 'pt', 'Recommended font size for Myanmar text readability'),
  ('myanmar_line_height', 'my', 'spacing', 1.6, 2.2, 1.8, 'em', 'Line height for Myanmar text'),
  ('myanmar_letter_spacing', 'my', 'spacing', 0, 0.1, 0.05, 'em', 'Letter spacing for Myanmar characters'),
  ('myanmar_paragraph_spacing', 'my', 'spacing', 1.2, 2.0, 1.5, 'em', 'Spacing between paragraphs'),
  ('page_margin_top', 'my', 'layout', 20, 40, 30, 'mm', 'Top margin for pages'),
  ('page_margin_bottom', 'my', 'layout', 20, 40, 30, 'mm', 'Bottom margin for pages'),
  ('page_margin_left', 'my', 'layout', 15, 30, 20, 'mm', 'Left margin for pages'),
  ('page_margin_right', 'my', 'layout', 15, 30, 20, 'mm', 'Right margin for pages');

-- Insert common Myanmar spelling mistakes (Zawgyi vs Unicode confusion)
INSERT INTO myanmar_spelling_mistakes (incorrect, correct, mistake_type) VALUES
  ('ေရး', 'ရေး', 'zawgyi_unicode'),
  ('ေျပာ', 'ပြော', 'zawgyi_unicode'),
  ('ၿမိဳ႕', 'မြို့', 'zawgyi_unicode'),
  ('ႏွင့္', 'နှင့်', 'zawgyi_unicode'),
  ('မွာ', 'မှာ', 'common_error'),
  ('ျဖစ္', 'ဖြစ်', 'zawgyi_unicode');

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_manuscript_checks_updated_at BEFORE UPDATE ON manuscript_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_myanmar_dictionary_updated_at BEFORE UPDATE ON myanmar_dictionary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate manuscript check score
CREATE OR REPLACE FUNCTION calculate_manuscript_score(check_id_param UUID)
RETURNS FLOAT AS $$
DECLARE
  total_issues INTEGER;
  critical_count INTEGER;
  warning_count INTEGER;
  score FLOAT;
BEGIN
  -- Count issues by severity
  SELECT 
    COUNT(*) FILTER (WHERE severity = 'error') AS critical,
    COUNT(*) FILTER (WHERE severity = 'warning') AS warnings,
    COUNT(*) AS total
  INTO critical_count, warning_count, total_issues
  FROM check_results
  WHERE check_id = check_id_param;
  
  -- Calculate score (100 - deductions)
  -- Each critical issue: -10 points
  -- Each warning: -5 points
  -- Each suggestion: -1 point
  score := GREATEST(0, 100 - (critical_count * 10) - (warning_count * 5) - ((total_issues - critical_count - warning_count) * 1));
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to get manuscript check summary
CREATE OR REPLACE FUNCTION get_manuscript_check_summary(check_id_param UUID)
RETURNS TABLE (
  category VARCHAR(20),
  severity VARCHAR(20),
  issue_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.category,
    cr.severity,
    COUNT(*)::INTEGER as issue_count
  FROM check_results cr
  WHERE cr.check_id = check_id_param
  GROUP BY cr.category, cr.severity
  ORDER BY 
    CASE cr.severity 
      WHEN 'error' THEN 1
      WHEN 'warning' THEN 2
      WHEN 'suggestion' THEN 3
      ELSE 4
    END,
    cr.category;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_manuscript_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_manuscript_check_summary TO authenticated;