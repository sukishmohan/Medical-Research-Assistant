/**
 * Users Route
 * 
 * Manage user profiles and preferences
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/users/:userId/profile
 */
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;

    let profile = await req.db
      .collection('user_profiles')
      .findOne({ userId });

    if (!profile) {
      // Create default profile
      profile = {
        userId,
        interests: [],
        research_areas: [],
        preferred_sources: ['pubmed_medline', 'clinical_trials'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await req.db
        .collection('user_profiles')
        .insertOne(profile);
    }

    res.json(profile);

  } catch (error) {
    req.logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/users/:userId/profile
 * Update user profile
 */
router.put('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { interests, research_areas, preferred_sources } = req.body;

    const updated = await req.db
      .collection('user_profiles')
      .findOneAndUpdate(
        { userId },
        {
          $set: {
            ...(interests && { interests }),
            ...(research_areas && { research_areas }),
            ...(preferred_sources && { preferred_sources }),
            updatedAt: new Date()
          }
        },
        { upsert: true, returnDocument: 'after' }
      );

    res.json(updated.value);

  } catch (error) {
    req.logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/users/:userId/interests
 * Add interest
 */
router.post('/:userId/interests', async (req, res) => {
  try {
    const { userId } = req.params;
    const { interest } = req.body;

    if (!interest) {
      return res.status(400).json({ error: 'interest required' });
    }

    const result = await req.db
      .collection('user_profiles')
      .findOneAndUpdate(
        { userId },
        {
          $addToSet: { interests: interest },
          $set: { updatedAt: new Date() }
        },
        { upsert: true, returnDocument: 'after' }
      );

    res.json(result.value);

  } catch (error) {
    req.logger.error('Add interest error:', error);
    res.status(500).json({ error: 'Failed to add interest' });
  }
});

/**
 * DELETE /api/users/:userId/interests/:interest
 */
router.delete('/:userId/interests/:interest', async (req, res) => {
  try {
    const { userId, interest } = req.params;

    const result = await req.db
      .collection('user_profiles')
      .findOneAndUpdate(
        { userId },
        {
          $pull: { interests: decodeURIComponent(interest) },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.value);

  } catch (error) {
    req.logger.error('Remove interest error:', error);
    res.status(500).json({ error: 'Failed to remove interest' });
  }
});

module.exports = router;
