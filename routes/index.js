const express = require('express');
const router = express.Router();
const passport = require('passport');
const async = require('async');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/user');
const Notification = require('../models/notification');
const Campground = require('../models/campground');
const middleware = require('../middleware');

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
  let newUser = new User({
    username: req.body.username,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    avatar: req.body.avatar,
    email: req.body.email,
  });
  if (req.body.adminCode === 'rootAccess94516***') {
    newUser.isAdmin = true;
  }
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
          'Successfully Signed Up! Nice to meet you ' + user.username + '.'
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
  req.flash('success', 'See you later!');
  res.redirect('/campgrounds');
});

// forgot password
router.get('/forgot', function (req, res) {
  res.render('forgot');
});

router.post('/forgot', function (req, res, next) {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
      function (token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: 'palanierwin94@gmail.com',
            pass: process.env.GMAILPW,
          },
        });
        var mailOptions = {
          to: user.email,
          from: 'palanierwin94@gmail.com',
          subject: 'YelpCamp Password Reset',
          text:
            'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' +
            req.headers.host +
            '/reset/' +
            token +
            '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n',
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          console.log('mail sent');
          req.flash(
            'success',
            'An e-mail has been sent to ' +
              user.email +
              ' with further instructions.'
          );
          done(err, 'done');
        });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.redirect('/forgot');
    }
  );
});

router.get('/reset/:token', function (req, res) {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', { token: req.params.token });
    }
  );
});

router.post('/reset/:token', function (req, res) {
  async.waterfall(
    [
      function (done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          function (err, user) {
            if (!user) {
              req.flash(
                'error',
                'Password reset token is invalid or has expired.'
              );
              return res.redirect('back');
            }
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, function (err) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function (err) {
                  req.logIn(user, function (err) {
                    done(err, user);
                  });
                });
              });
            } else {
              req.flash('error', 'Passwords do not match.');
              return res.redirect('back');
            }
          }
        );
      },
      function (user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: 'palanierwin94@gmail.com',
            pass: process.env.GMAILPW,
          },
        });
        var mailOptions = {
          to: user.email,
          from: 'palanierwin94@mail.com',
          subject: 'Your password has been changed',
          text:
            'Hello,\n\n' +
            'This is a confirmation that the password for your account ' +
            user.email +
            ' has just been changed.\n',
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      },
    ],
    function (err) {
      res.redirect('/campgrounds');
    }
  );
});

// User's Profile
router.get('/users/:id', function (req, res) {
  User.findById(req.params.id)
    .populate('followers')
    .exec(function (err, foundUser) {
      if (err) {
        req.flash('error', 'Something went wrong');
        res.redirect('/');
      }
      Campground.find()
        .where('author.id')
        .equals(foundUser._id)
        .exec(function (err, campgrounds) {
          if (err) {
            req.flash('error', 'Something went wrong');
            res.redirect('back');
          }
          res.render('users/show', {
            user: foundUser,
            campgrounds: campgrounds,
          });
        });
    });
});

// follow user
router.get('/follow/:id', middleware.isLoggedIn, async function (req, res) {
  try {
    let user = await User.findById(req.params.id);
    user.followers.push(req.user._id);
    user.save();
    req.flash('success', 'Successfully followed ' + user.username + '!');
    res.redirect('/users/' + req.params.id);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

// view all notifications
router.get('/notifications', middleware.isLoggedIn, async function (req, res) {
  try {
    let user = await User.findById(req.user._id)
      .populate({
        path: 'notifications',
        options: { sort: { _id: -1 } },
      })
      .exec();
    let allNotifications = user.notifications;
    res.render('notifications/index', { allNotifications });
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

// handle notification
router.get('/notifications/:id', middleware.isLoggedIn, async function (
  req,
  res
) {
  try {
    let notification = await Notification.findById(req.params.id);
    notification.isRead = true;
    notification.save();
    res.redirect(`/campgrounds/${notification.campgroundId}`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

module.exports = router;
