/**
 * Conversations Route
 * 
 * Manage conversation history and context
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/conversations/:conversationId
 */
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;

    if (!userId || !conversationId) {
      return res.status(400).json({ error: 'userId and conversationId required' });
    }

    const conversation = await req.db
      .collection('conversations')
      .findOne({ userId, conversationId });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      conversationId,
      userId,
      messages: conversation.messages || [],
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    });

  } catch (error) {
    req.logger.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * GET /api/conversations
 * List user's conversations
 */
router.get('/', async (req, res) => {
  try {
    const { userId, limit = 10, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const conversations = await req.db
      .collection('conversations')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray();

    const total = await req.db
      .collection('conversations')
      .countDocuments({ userId });

    res.json({
      conversations: conversations.map(c => ({
        conversationId: c.conversationId,
        messageCount: (c.messages || []).length,
        lastMessage: (c.messages || []).slice(-1)[0],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      })),
      pagination: {
        total,
        offset: parseInt(offset),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    req.logger.error('List conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * DELETE /api/conversations/:conversationId
 */
router.delete('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;

    if (!userId || !conversationId) {
      return res.status(400).json({ error: 'userId and conversationId required' });
    }

    const result = await req.db
      .collection('conversations')
      .deleteOne({ userId, conversationId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ success: true, message: 'Conversation deleted' });

  } catch (error) {
    req.logger.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

module.exports = router;
