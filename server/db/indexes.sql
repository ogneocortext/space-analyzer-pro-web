-- Performance Indexes for Space Analyzer Database
-- These indexes will significantly improve query performance

-- Files table indexes
CREATE INDEX IF NOT EXISTS idx_files_analysis_id ON files(analysis_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_files_size ON files(size DESC);
CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension);
CREATE INDEX IF NOT EXISTS idx_files_modified ON files(modified DESC);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(created DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_files_analysis_extension ON files(analysis_id, extension);

-- Analysis table indexes
CREATE INDEX IF NOT EXISTS idx_analysis_created ON analysis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_path ON analysis(path);
CREATE INDEX IF NOT EXISTS idx_analysis_status ON analysis(status);
CREATE INDEX IF NOT EXISTS idx_analysis_duration ON analysis(duration DESC);

-- AI insights indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_timestamp ON ai_insights(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority DESC);

-- Trends table indexes
CREATE INDEX IF NOT EXISTS idx_trends_date ON trends(date DESC);
CREATE INDEX IF NOT EXISTS idx_trends_type ON trends(type);

-- Cleanup indexes
CREATE INDEX IF NOT EXISTS idx_cleanup_created ON cleanup(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_status ON cleanup(status);

-- Index usage analysis query
EXPLAIN QUERY PLAN SELECT * FROM files WHERE analysis_id = ? AND extension = '.js' ORDER BY size DESC;

-- Performance optimization recommendations
-- 1. Use these indexes for common queries
-- 2. Consider adding partial indexes for very large tables
-- 3. Monitor index usage with ANALYZE command
-- 4. Rebuild indexes periodically during low usage