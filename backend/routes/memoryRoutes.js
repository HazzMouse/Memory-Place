const express = require('express');
const router = express.Router();
const { 
    getAllMemories, 
    createMemory, 
    updateMemory, 
    deleteMemory,
    deleteAllMemories // <-- Import the new function
} = require('../controllers/memoryController');

// Define the routes and map them to controller functions
router.get('/', getAllMemories);
router.post('/', createMemory);
router.delete('/', deleteAllMemories); // <-- Add the route to delete the entire collection

router.put('/:id', updateMemory);
router.delete('/:id', deleteMemory);

module.exports = router;