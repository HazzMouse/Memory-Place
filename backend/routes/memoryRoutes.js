const express = require('express');
const router = express.Router();
const {
    getAllMemories,
    createMemory,
    updateMemory,
    saveScene,
    deleteMemory,
    deleteAllMemories
} = require('../controllers/memoryController');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

router.get('/', getAllMemories);
router.delete('/', deleteAllMemories);

router.post('/', upload.single('image'), createMemory);

router.put('/:id', upload.single('image'), updateMemory);
router.patch('/:id/scene', saveScene);        // ← save cached sceneData
router.delete('/:id', deleteMemory);

module.exports = router;