// server/src/controllers/tagController.js
const Tag = require('../models/Tag');

function listTags(req, res) {
  return res.json({ tags: Tag.list() });
}

function deleteTag(req, res) {
  const tag = Tag.findById(req.params.id);
  if (!tag) return res.status(404).json({ error: 'Tag not found' });
  Tag.delete(req.params.id);
  return res.status(204).send();
}

module.exports = { listTags, deleteTag };