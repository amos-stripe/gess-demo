const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const hbs = require('hbs');
require('dotenv').config();
require('express-async-errors');

const app = express();

// View engine (Handlebars)
app.set('view engine', 'hbs');
app.engine('handlebars', exphbs.engine());
app.set('views', './views');

// Register partials
hbs.registerPartials(__dirname + '/views/partials');

// Middleware
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: process.env.SESSION_SECRET || 'change-me-in-production', resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Make Stripe publishable key available to templates
app.use(function (req, res, next) {
  res.locals.STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
  res.locals.layout = false;
  next();
});

// Routes
app.use(require('./controllers'));

// Error handler
app.use(function (err, req, res, next) {
  console.error(err);
  res.render('pages/error', { error: err.message || err });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GESS Parents Portal running at http://localhost:${PORT}`);
});
