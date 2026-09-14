// server/src/controllers/analyticsController.js
const db = require('../db/connection');
const Document = require('../models/Document');

// Pulls the document_analytics row for each doc id and returns a Map keyed
// by document_id for O(1) lookups while aggregating in JS. Visible-document
// sets here are small (per-org demo scale), so doing this in JS instead of
// a bigger SQL join keeps the query logic in one place (Document.listForUser).
function analyticsById(documentIds) {
  if (documentIds.length === 0) return new Map();
  const placeholders = documentIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT * FROM document_analytics WHERE document_id IN (${placeholders})`)
    .all(...documentIds);
  return new Map(rows.map((r) => [r.document_id, r]));
}

// GET /api/analytics/overview
function overview(req, res) {
  const docs = Document.listForUser(req.user);
  const analytics = analyticsById(docs.map((d) => d.id));

  let totalStorageBytes = 0;
  let totalViews = 0;
  let totalDownloads = 0;
  let totalAiQuestions = 0;
  const categoryCounts = {};

  for (const doc of docs) {
    totalStorageBytes += doc.size_bytes;
    const a = analytics.get(doc.id);
    if (a) {
      totalViews += a.view_count;
      totalDownloads += a.download_count;
      totalAiQuestions += a.ai_question_count;
    }
    const cat = doc.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  return res.json({
    totalDocuments: docs.length,
    totalStorageBytes,
    totalViews,
    totalDownloads,
    totalAiQuestionsAsked: totalAiQuestions,
    popularCategories: Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  });
}

// GET /api/analytics/most-viewed?limit=10
function mostViewed(req, res) {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const docs = Document.listForUser(req.user);
  const analytics = analyticsById(docs.map((d) => d.id));

  const ranked = docs
    .map((doc) => ({
      document: doc,
      viewCount: analytics.get(doc.id)?.view_count ?? 0,
    }))
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit);

  return res.json({ documents: ranked });
}

// GET /api/analytics/most-downloaded?limit=10
function mostDownloaded(req, res) {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const docs = Document.listForUser(req.user);
  const analytics = analyticsById(docs.map((d) => d.id));

  const ranked = docs
    .map((doc) => ({
      document: doc,
      downloadCount: analytics.get(doc.id)?.download_count ?? 0,
    }))
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, limit);

  return res.json({ documents: ranked });
}

// GET /api/analytics/search-queries?limit=10
// Admins see the org-wide search log; everyone else sees only their own
// queries, matching the same "don't let users snoop on each other" spirit
// as document visibility.
function popularSearchQueries(req, res) {
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const rows =
    req.user.role === 'admin'
      ? db
          .prepare(
            `SELECT query, query_type, COUNT(*) AS count, MAX(created_at) AS last_used
             FROM search_queries
             GROUP BY query, query_type
             ORDER BY count DESC, last_used DESC
             LIMIT ?`
          )
          .all(limit)
      : db
          .prepare(
            `SELECT query, query_type, COUNT(*) AS count, MAX(created_at) AS last_used
             FROM search_queries
             WHERE user_id = ?
             GROUP BY query, query_type
             ORDER BY count DESC, last_used DESC
             LIMIT ?`
          )
          .all(req.user.id, limit);

  return res.json({ queries: rows });
}

module.exports = { overview, mostViewed, mostDownloaded, popularSearchQueries };