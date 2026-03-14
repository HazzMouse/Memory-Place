const express = require('express');
const router = express.Router();
const { 
    getAllMemories, 
    createMemory, 
    updateMemory, 
    deleteMemory 
} = require('../controllers/memoryController');

// Define the routes and map them to controller functions
router.get('/', getAllMemories);
router.post('/', createMemory);
router.put('/:id', updateMemory);
router.delete('/:id', deleteMemory);

module.exports = router;