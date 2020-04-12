const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');

// root route
router.get('/', function (req, res) {
  res.render('landing.ejs');
});

// Auth routes

// show register form
router.get('/register', function (req, res) {
  res.render('register.ejs');
});

// handle sign up logic
router.post('/register', function (req, res) {
  let newUser = new User({ username: req.body.username });
  // log user in
  User.register(newUser, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.render('register');
    }
    // authenticate
    passport.authenticate('local')(req, res, function () {
      // redirect
      res.redirect('/campgrounds');
    });
  });
});

// show login form
router.get('/login', function (req, res) {
  res.render('login.ejs');
});

// Login logic
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/campgrounds',
    failureRedirect: '/login',
  }),
  function (req, res) {}
);

// Logout
router.get('/logout', function (req, res) {
  req.logOut();
  res.redirect('/campgrounds');
});

// Middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

module.exports = router;
