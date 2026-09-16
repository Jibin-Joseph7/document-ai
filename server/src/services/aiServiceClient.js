const DEFAULT_TIMEOUT_MS = 30000;

class AiServiceError extends Error {
  constructor(message, status = null, details = null) {
    super(message);
    this.name = 'AiServiceError';
    this.status = status;
    this.details = details;
  }
}

function getBaseUrl() {
  return (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
}

async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        ...(body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();

    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      throw new AiServiceError(
        data?.detail ||
          data?.error ||
          `AI service returned HTTP ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof AiServiceError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new AiServiceError(
        `AI service request timed out after ${timeoutMs}ms`,
        null,
        null
      );
    }

    throw new AiServiceError(
      `AI service unavailable: ${error.message}`,
      null,
      null
    );
  } finally {
    clearTimeout(timer);
  }
}

async function ingestDocument({
  documentId,
  filepath,
  mimeType,
  metadata = {},
}) {
  return request('/ingest', {
    method: 'POST',
    body: {
      document_id: documentId,
      filepath,
      mime_type: mimeType,
      metadata,
    },
  });
}

async function removeDocument(documentId) {
  return request(`/documents/${documentId}`, {
    method: 'DELETE',
  });
}

async function search({
  query,
  documentIds = [],
  nResults = 5,
}) {
  return request('/search', {
    method: 'POST',
    body: {
      query,
      document_ids: documentIds,
      n_results: nResults,
    },
  });
}

async function askQuestion({
  question,
  documentIds = [],
  nResults = 5,
}) {
  return request('/qa', {
    method: 'POST',
    body: {
      question,
      document_ids: documentIds,
      n_results: nResults,
    },
  });
}

async function summarizeDocument({
  documentId,
  maxSentences = 5,
}) {
  return request('/summarize', {
    method: 'POST',
    body: {
      document_id: documentId,
      max_sentences: maxSentences,
    },
  });
}

async function suggestTags({
  documentId,
  maxTags = 5,
}) {
  return request('/tag', {
    method: 'POST',
    body: {
      document_id: documentId,
      max_tags: maxTags,
    },
  });
}

module.exports = {
  AiServiceError,
  ingestDocument,
  removeDocument,
  search,
  askQuestion,
  summarizeDocument,
  suggestTags,
};
