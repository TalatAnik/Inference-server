// dbRoutes.js
const express = require('express');
const operations = require('./queries/dbOperations');

const router = express.Router();


// Define all product names as constants
const PRODUCT_NAMES = ['seven_up_250ml', 'sprite_250ml', 'pepsi_250ml', 'aquafina_500ml', 'kk_medley', 'bottle', 'cup'];



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


// Route to handle snapshot submission
router.post('/sendSnapshot', async (req, res) => {
  try {
    const snapshot = req.body.snapshot; // Expecting an array of objects with product_name and count
    const timestamp = new Date();

    // Fetch the last stock snapshot
    const lastStockEntry = await operations.getLastStockEntry() || {};

    const entries = []; // Array to collect entries for "IN" or "OUT" actions
    const newStock = {}; // Object to collect updated stock counts

    // Initialize newStock with all products, assuming any missing product count as 0
    for (const product of PRODUCT_NAMES) {
      const userItem = snapshot.find(item => item.product_name === product);
      const newCount = userItem ? userItem.count : 0; // Default to 0 if product not in user data
      const lastCount = lastStockEntry[product] || 0; // Default to 0 if no last entry

      if (newCount > lastCount) {
        // Product count increased; create "IN" entry
        entries.push({ product_name: product, entry_type: 'IN', count: newCount - lastCount, timestamp });
      } else if (newCount < lastCount) {
        // Product count decreased; create "OUT" entry
        entries.push({ product_name: product, entry_type: 'OUT', count: lastCount - newCount, timestamp });
      }

      // Store the updated count for the stock table
      newStock[product] = newCount;
    }

    // Insert entries into the `entries` table
    await operations.insertEntries(entries);

    // Insert the new stock snapshot into the `stock` table
    await operations.insertStockSnapshot(newStock, timestamp);

    res.status(200).json({ message: 'Snapshot processed successfully', entries });
  } catch (error) {
    console.error('Error processing snapshot:', error);
    res.status(500).json({ error: 'Failed to process snapshot' });
  }
});





// GET route for fetching all entries
router.get('/history', async (req, res) => {
    try {
        // Call the database function to get all entries
        const entries = await operations.getEntriesHistory();

        res.status(200).json({ message: 'Entries fetched successfully', entries });
    } catch (error) {
        console.error("Error fetching entries history:", error);
        res.status(500).json({ message: 'Failed to fetch entries', error: error.message });
    }
});

module.exports = router;
