const express = require('express');
const router = express.Router();

// Routes
router.get('/', async (req, res) => {
  try {
    // Fetch coffee shop data from MongoDB
    const coffeeShop = await coffeeshops.findOne({ name: "Coffee Bean & Tea Leaf" });
    // Render the index template with the coffeeShop data
    res.render('index', { coffeeShop });
  } catch (err) {
    console.error('Error fetching coffee shop data:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
