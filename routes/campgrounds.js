const express = require('express');
const router = express.Router();
const Campground = require('../models/campground');

// shows all campgrounds
router.get('/', function (req, res) {
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
router.post('/', function (req, res) {
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
router.get('/new', function (req, res) {
  res.render('campgrounds/new.ejs');
});

// Show - shows more info about campground
router.get('/:id', function (req, res) {
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

module.exports = router;
