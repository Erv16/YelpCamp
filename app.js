const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const Campground = require('./models/campground');
const Comment = require('./models/comment');
const seedDB = require('./seeds');
const User = require('./models/user');

mongoose.connect('mongodb://localhost/yelp_camp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
seedDB();

// Passport Configuration
app.use(
  require('express-session')({
    secret: "impossible doesn't exist",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

app.get('/', function (req, res) {
  res.render('landing');
});

// shows all campgrounds
app.get('/campgrounds', function (req, res) {
  // Get campgrounds from db
  Campground.find({}, function (err, allCampgrounds) {
    if (err) {
      console.log(err);
    } else {
      res.render('campgrounds/index.ejs', {
        campgrounds: allCampgrounds,
        currentUser: req.user,
      });
    }
  });
});

// making a new campground and redirecting
app.post('/campgrounds', function (req, res) {
  // get data from form and add to campgrounds
  let name = req.body.name;
  let image = req.body.image;
  let desc = req.body.description;
  let newCampground = {
    name: name,
    image: image,
    description: desc,
  };
  // Create a new campground and save to database
  Campground.create(newCampground, function (err, newlyCreated) {
    if (err) {
      console.log(err);
    } else {
      // redirect back to campgrounds page
      res.redirect('/campgrounds');
    }
  });
});

// form for making a new campground
app.get('/campgrounds/new', function (req, res) {
  res.render('campgrounds/new.ejs');
});

// Show - shows more info about campground
app.get('/campgrounds/:id', function (req, res) {
  // Find the campground with provided id
  Campground.findById(req.params.id)
    .populate('comments')
    .exec(function (err, foundCampground) {
      if (err) {
        console.log(err);
      } else {
        // Render show template with campground
        res.render('campgrounds/show.ejs', { campground: foundCampground });
      }
    });
});

// Comments Routes
app.get('/campgrounds/:id/comments/new', isLoggedIn, function (req, res) {
  // find campground by id
  Campground.findById(req.params.id, function (err, campground) {
    if (err) {
      console.log(err);
    } else {
      res.render('comments/new.ejs', { campground: campground });
    }
  });
});

app.post('/campgrounds/:id/comments', isLoggedIn, function (req, res) {
  // lookup campground using ID
  Campground.findById(req.params.id, function (err, campground) {
    if (err) {
      console.log(err);
      res.redirect('/campgrounds');
    } else {
      Comment.create(req.body.comment, function (err, comment) {
        if (err) {
          console.log(err);
        } else {
          campground.comments.push(comment);
          campground.save();
          res.redirect('/campgrounds/' + campground._id);
        }
      });
    }
  });
  // create new comment

  // connect new comment to campground

  // redirect to campground show page
});

// Auth routes

// show register form
app.get('/register', function (req, res) {
  res.render('register.ejs');
});

// handle sign up logic
app.post('/register', function (req, res) {
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
app.get('/login', function (req, res) {
  res.render('login.ejs');
});

// Login logic
app.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/campgrounds',
    failureRedirect: '/login',
  }),
  function (req, res) {}
);

// Logout
app.get('/logout', function (req, res) {
  req.logOut();
  res.redirect('/campgrounds');
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.listen(process.env.PORT || 3000, process.env.IP, function () {
  console.log('The YelpCamp server has started!');
});
