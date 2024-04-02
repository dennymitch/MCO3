require('dotenv').config();

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const mongodb = require('mongodb');
const bcrypt = require('bcrypt');

const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

app.use(session({
  secret: '1234567',
  resave: false,
  saveUninitialized: false
}));

app.use(express.static('public'));
app.use(expressLayouts);
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');

const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI;

function getImageFilename(coffeeShopName) {
    const lowercaseName = coffeeShopName.trim().toLowerCase();

    if (lowercaseName === 'coffee bean & tea leaf qc') {
        return 'CBTLQC.jpg';
    } else if (lowercaseName === "bo's coffee makati") {
        return 'BCMakati.jpg';
    } else if (lowercaseName === 'poison coffee & doughnuts') {
        return 'PCD.jpg';
    } else if (lowercaseName === 'primero') {
        return 'Primero.jpg';
    } else if (lowercaseName === 'starbucks hiraya') {
        return 'SBH.jpg';
    } else if (lowercaseName === 'tim hortons') {
        return 'TH.jpg';
    } else {    
        return 'default.jpg'; 
    }
}

app.get('/', async (req, res) => {
  try {
      const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db('APDEV');
      const collection = db.collection('coffeeshops');
      const coffeeShops = await collection.find().toArray();

      // Pass the loggedIn status to the template
      res.render('index', { coffeeShops, getImageFilename, loggedIn: req.session.loggedIn });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    res.status(500).send('Internal Server Error');
  }
});
  
app.get('/coffeeshop/:id', async (req, res) => {
  const coffeeShopId = req.params.id;

  try {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db('APDEV');
    const collection = db.collection('coffeeshops');
    const reviewsCollection = db.collection('reviews');

    const coffeeShop = await collection.findOne({ _id: new ObjectId (coffeeShopId) });
    const reviews = await reviewsCollection.find({ coffeeshop_id: coffeeShopId }).toArray();


    // Pass the coffeeShop object to the template
    res.render('coffeeshop', { coffeeShop, reviews, loggedIn: req.session.loggedIn });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/user/:username', async (req, res) => {
  const username = req.params.username;

  try {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db('APDEV');
    const usersCollection = db.collection('user');
    const reviewsCollection = db.collection('reviews');

    // Ensure the username is queried case-insensitively
    const user = await usersCollection.findOne({ username });
    const description = user ? user.description : '';

    // Get reviews for the user
    const userReviews = await reviewsCollection.find({ username }).toArray();

    res.render('user', { user, description, userReviews, loggedIn: req.session.loggedIn });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/profile', async (req, res) => {
  if (req.session.loggedIn) {
    try {
      const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db('APDEV');
      const usersCollection = db.collection('user');
      
      const username = req.session.username;
      
      const user = await usersCollection.findOne({ username });
      const description = user ? user.description : '';

      res.render('profile', { username, description, loggedIn: req.session.loggedIn });
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.redirect('/login'); // Redirect to login if user is not logged in
  }
});

app.get('/login', (req, res) => {
  res.render('login', {loggedIn: req.session.loggedIn});
});

app.get('/search', (req, res) => {
  res.render('search-form', {loggedIn: req.session.loggedIn});
});

app.get('/search-results', async (req, res) => {
  const query = req.query.query; // Get the search query from the request query parameters

  try {
    const client = await MongoClient.connect(uri, { useUnifiedTopology: true });
    const db = client.db('APDEV');
    const collection = db.collection('coffeeshops');
    const usersCollection = db.collection('users');


    // Filter results based on the search query
    const results = await collection.find({ name: { $regex: query, $options: 'i' } }).toArray();
    const userResults = await usersCollection.find({ username: { $regex: query, $options: 'i' } }).toArray();

    res.render('search-results', { results, userResults, query, loggedIn: req.session.loggedIn  }); // Render the search results page with the results and query
  } catch (err) {
    console.error('Error during search:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/signup', (req, res) => {
  res.render('signup', { loggedIn: false });
});


app.get('/review-success', (req, res) => {
  res.render('review-success', { loggedIn: req.session.loggedIn });
});

app.get('/make', async (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect('/login');
  }

  try {
      const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db('APDEV');
      const coffeeShopsCollection = db.collection('coffeeshops');
      const reviewsCollection = db.collection('reviews');

      const coffeeShops = await coffeeShopsCollection.find().toArray();
      const reviews = await reviewsCollection.find().toArray();

      // Add coffee shop name to each review
      for (const review of reviews) {
        const coffeeShop = await coffeeShopsCollection.findOne({ _id: new ObjectId(review.coffeeshop_id) });
        review.coffeeShopName = coffeeShop ? coffeeShop.name : 'Unknown';
      }

      res.render('make', { coffeeShops, reviews, loggedIn: req.session.loggedIn });
  } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/reviews/:id/edit', async (req, res) => {
  const reviewId = req.params.id;
  const { editRating, editComment } = req.body;

  try {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db('APDEV');
    const reviewsCollection = db.collection('reviews');

    // Update the review in the database
    await reviewsCollection.updateOne({ _id: new ObjectId(reviewId) }, { $set: { rating: editRating, comment: editComment } });

    // Redirect back to the make page
    res.redirect('/make');
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/login', async (req, res) => {  
  const { username, password } = req.body;

  try {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db('APDEV');
    const usersCollection = db.collection('login');

    const user = await usersCollection.findOne({ username });

    const validate = await bcrypt.compare(password, user.password);

    if (validate) {
      req.session.loggedIn = true;
      req.session.username = username; 
      res.redirect('/');
  } else {
      res.send('Invalid username or password');
  }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/signup-failed', (req, res) => {
  res.render('signup-failed');
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  try {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db('APDEV');
    const usersCollection = db.collection('login');

    // Check if the username already exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      // Redirect back to the signup page with a message indicating that the username is already taken
      return res.render('signup-failed', { error: 'Username is already taken', loggedIn: req.session.loggedIn});
    }

    // Hashes the user's password and inserts the user's credentials into the database
    bcrypt
      .hash(password, 8)
      .then(password => {
        usersCollection.insertOne({ username, password });
      });

    // Redirect to the login page after successful signup
    res.redirect('/login');
  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/profile', async (req, res) => {
  if (req.session.loggedIn) {
    const { description } = req.body;
    const username = req.session.username;

    try {
      const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db('APDEV');
      const usersCollection = db.collection('user');
      const existingUser = await usersCollection.findOne({ username });

      // Update the user's description in the database
      if (existingUser) {
        await usersCollection.updateOne({ username }, { $set: { description } });
      } else {
        await usersCollection.insertOne({ username, description });
      }
      // Redirect back to the profile page with the updated description
      res.redirect('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.redirect('/login'); // Redirect to login if user is not logged in
  }
});

app.post('/reviews', async (req, res) => {
  const { coffeeshop_id, rating, comment } = req.body;
  const { username } = req.session;

  try {
      const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db('APDEV');
      const collection = db.collection('reviews');

      await collection.insertOne({ coffeeshop_id, rating: parseInt(rating), comment, username });

      res.redirect('/review-success'); // Redirect to home page after successful submission
  } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/logout', (req, res) => {  
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`App listening on PORT ${PORT}`);
});
