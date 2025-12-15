const redis = require('../models/redis')
const logger = require('../utils/logger')

const MAX_LOGS_PER_KEY = 500
const LOG_TTL_SECONDS = 60 * 24 * 60 * 60 // 60天
const MAX_TEXT_LENGTH = 8000

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  try {
    const clone = JSON.parse(JSON.stringify(payload))
    return clone
  } catch (error) {
    logger.warn('⚠️ Failed to clone payload for conversation log:', error)
    return null
  }
}

function truncateText(text) {
  if (!text || typeof text !== 'string') {
    return text
  }

  if (text.length <= MAX_TEXT_LENGTH) {
    return text
  }

  return `${text.slice(0, MAX_TEXT_LENGTH)}... (truncated)`
}

async function recordConversation({
  apiKeyId,
  accountId,
  accountType,
  requestBody,
  responseBody,
  model,
  isStream = false,
  clientVersion = null,
  serverVersion = null
}) {
  if (!apiKeyId) {
    return
  }

  const payload = {
    timestamp: new Date().toISOString(),
    model: model || requestBody?.model || 'unknown',
    accountId: accountId || null,
    accountType: accountType || null,
    isStream,
    clientVersion: clientVersion || null,
    serverVersion: serverVersion || null,
    request: sanitizePayload(requestBody),
    response: truncateText(responseBody)
  }

  try {
    await redis.addConversationLog(apiKeyId, payload, MAX_LOGS_PER_KEY, LOG_TTL_SECONDS)
  } catch (error) {
    logger.error('❌ Failed to record conversation log:', error)
  }
}

module.exports = {
  recordConversation
}
