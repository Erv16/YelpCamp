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
  res.render('register.ejs', { page: 'register' });
});

// handle sign up logic
router.post('/register', function (req, res) {
  let newUser = new User({ username: req.body.username });
  // log user in
  User.register(newUser, req.body.password, function (err, user) {
    if (err) {
      return res.render('register', { error: err.message });
    } else {
      // authenticate
      passport.authenticate('local')(req, res, function () {
        // redirect
        req.flash(
          'success',
          'Successfully Signed Up! Nice to meet you ' + user.username
        );
        res.redirect('/campgrounds');
      });
    }
  });
});

// show login form
router.get('/login', function (req, res) {
  res.render('login.ejs', { page: 'login' });
});

// Login logic
router.post('/login', function (req, res, next) {
  passport.authenticate('local', {
    successRedirect: '/campgrounds',
    failureRedirect: '/login',
    failureFlash: true,
    successFlash: 'Welcome to YelpCamp, ' + req.body.username + '!',
    failureFlash: 'Invalid username/password',
  })(req, res);
});

// Logout
router.get('/logout', function (req, res) {
  req.logOut();
  req.flash('success', 'Logged you out!');
  res.redirect('/campgrounds');
});

module.exports = router;
