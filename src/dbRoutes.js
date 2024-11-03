// dbRoutes.js
const express = require('express');
const operations = require('./queries/dbOperations');

const router = express.Router();

// Endpoint to add an entry to the opening table with 'IN' type
router.post('/add-entry', (req, res) => {
    const { timestamp, product_name, product_count } = req.body;

    if (!timestamp || !product_name || product_count === undefined) {
        return res.status(400).json({ error: 'Please provide timestamp, product_name, and product_count' });
    }

    operations.addInEntry({ timestamp, product_name, product_count }, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Error inserting entry' });
        }
        res.json({ message: 'Entry added successfully', entryId: result.entryId });
  });
});



// Endpoint to add an entry to the opening table with 'CLOSE' type
router.post('/close-entry', (req, res) => {
    const { timestamp, product_name, product_count } = req.body;

    if (!timestamp || !product_name || product_count === undefined) {
        return res.status(400).json({ error: 'Please provide timestamp, product_name, and product_count' });
    }

    operations.addInEntry({ timestamp, product_name, product_count }, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Error inserting entry' });
        }
        res.json({ message: 'Entry added successfully', entryId: result.entryId });
  });
});

module.exports = router;
