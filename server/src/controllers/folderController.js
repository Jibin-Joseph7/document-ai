// server/src/controllers/folderController.js
const Folder = require('../models/Folder');

function createFolder(req, res) {
  const { name, parentId } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (parentId) {
    const parent = Folder.findById(parentId);
    if (!parent) return res.status(400).json({ error: 'parentId does not exist' });
    if (parent.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot nest a folder under one you do not own' });
    }
  }

  const folder = Folder.create({
    name: name.trim(),
    parentId: parentId ?? null,
    ownerId: req.user.id,
    department: req.user.department,
  });
  return res.status(201).json({ folder });
}

// GET /api/folders?parentId=  — one level of the tree. Omit parentId (or
// pass "root") to list top-level folders.
function listFolders(req, res) {
  const { parentId } = req.query;
  const ownerId = req.user.role === 'admin' && req.query.ownerId
    ? Number(req.query.ownerId)
    : req.user.id;

  const resolvedParentId = !parentId || parentId === 'root' ? null : Number(parentId);
  const folders = Folder.listChildren(ownerId, resolvedParentId);
  return res.json({ folders });
}

function getFolder(req, res) {
  const folder = Folder.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  if (folder.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return res.json({ folder });
}

function updateFolder(req, res) {
  const folder = Folder.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  if (folder.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { name, parentId } = req.body || {};
  if (parentId !== undefined && parentId !== null) {
    if (Number(parentId) === folder.id) {
      return res.status(400).json({ error: 'A folder cannot be its own parent' });
    }
    if (Folder.isDescendantOf(parentId, folder.id)) {
      return res.status(400).json({ error: 'Cannot move a folder into its own descendant' });
    }
  }

  const updated = Folder.update(req.params.id, { name, parentId });
  return res.json({ folder: updated });
}

function deleteFolder(req, res) {
  const folder = Folder.findById(req.params.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  if (folder.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  Folder.delete(req.params.id);
  return res.status(204).send();
}

module.exports = { createFolder, listFolders, getFolder, updateFolder, deleteFolder };