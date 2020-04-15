const express = require('express');
const router = express.Router();
const Campground = require('../models/campground');
const Comment = require('../models/comment');

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
router.post('/', isLoggedIn, function (req, res) {
  // get data from form and add to campgrounds
  let name = req.body.name;
  let image = req.body.image;
  let desc = req.body.description;
  let author = {
    id: req.user._id,
    username: req.user.username,
  };
  let newCampground = {
    name: name,
    image: image,
    description: desc,
    author: author,
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
router.get('/new', isLoggedIn, function (req, res) {
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

// Edit Campground route
router.get('/:id/edit', checkCampgroundOwnership, function (req, res) {
  Campground.findById(req.params.id, function (err, foundCampground) {
    res.render('campgrounds/edit.ejs', { campground: foundCampground });
  });
});

// Update Campground route
router.put('/:id', checkCampgroundOwnership, function (req, res) {
  // find and update the correct campground
  Campground.findByIdAndUpdate(
    req.params.id,
    req.body.campground,
    { useFindAndModify: false },
    function (err, updatedCampground) {
      if (err) {
        res.redirect('/campgrounds');
      } else {
        res.redirect('/campgrounds/' + req.params.id);
      }
    }
  );
  // redirect show page
});

// Destroy Campground
router.delete('/:id', checkCampgroundOwnership, function (req, res) {
  Campground.findByIdAndRemove(
    req.params.id,
    { useFindAndModify: false },
    (err, campgroundRemoved) => {
      if (err) {
        res.redirect('/campgrounds');
      }
      Comment.deleteMany(
        { _id: { $in: campgroundRemoved.comments } },
        (err) => {
          if (err) {
            console.log(err);
          }
          res.redirect('/campgrounds');
        }
      );
    }
  );
});

// Middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

function checkCampgroundOwnership(req, res, next) {
  if (req.isAuthenticated()) {
    Campground.findById(req.params.id, function (err, foundCampground) {
      if (err) {
        res.redirect('back');
      } else {
        // does user own campground post
        // foundCampground.author.id - mongoose object
        if (foundCampground.author.id.equals(req.user._id)) {
          next();
        } else {
          res.redirect('back');
        }
      }
    });
  } else {
    res.redirect('back');
  }
}

module.exports = router;
