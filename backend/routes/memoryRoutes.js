const express = require('express');
const router = express.Router();
const { 
    getAllMemories, 
    createMemory, 
    updateMemory, 
    deleteMemory,
    deleteAllMemories // <-- Import the new function
} = require('../controllers/memoryController');

// Photos for memories
const multer = require('multer');
const path = require('path');

// Store uploaded images in /backend/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Define the routes and map them to controller functions
router.get('/', getAllMemories);
router.delete('/', deleteAllMemories); // <-- Add the route to delete the entire collection

router.delete('/:id', deleteMemory);

router.post('/', upload.single('image'), createMemory);
router.put('/:id', upload.single('image'), updateMemory);

module.exports = router;