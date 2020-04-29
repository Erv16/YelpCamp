const express = require('express');
const router = express.Router();
const Campground = require('../models/campground');
const Comment = require('../models/comment');
const User = require('../models/user');
var Notification = require('../models/notification');
const middleware = require('../middleware');

var NodeGeocoder = require('node-geocoder');

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null,
};

var geocoder = NodeGeocoder(options);

// shows all campgrounds
router.get('/', function (req, res) {
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Campground.find({ name: regex }, function (err, allCampgrounds) {
      if (err) {
        console.log(err);
      } else {
        if (allCampgrounds.length < 1) {
          req.flash(
            'error',
            'No campgrounds matched your search. Please try again.'
          );
          return res.redirect('back');
        }
        res.render('campgrounds/index.ejs', {
          campgrounds: allCampgrounds,
          currentUser: req.user,
          page: 'campgrounds',
        });
      }
    });
  } else {
    // Get campgrounds from db
    Campground.find({}, function (err, allCampgrounds) {
      if (err) {
        console.log(err);
      } else {
        res.render('campgrounds/index.ejs', {
          campgrounds: allCampgrounds,
          currentUser: req.user,
          page: 'campgrounds',
        });
      }
    });
  }
});

//CREATE - add new campground to DB
router.post('/', middleware.isLoggedIn, async function (req, res) {
  // get data from form and add to campgrounds array
  var name = req.body.name;
  var image = req.body.image;
  var desc = req.body.description;
  var author = {
    id: req.user._id,
    username: req.user.username,
  };
  var cost = req.body.price;

  geocoder.geocode(req.body.location, async function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var location = data[0].formattedAddress;
    var newCampground = {
      name: name,
      image: image,
      description: desc,
      cost: cost,
      author: author,
      location: location,
      lat: lat,
      lng: lng,
    };
    // Create a new campground and save to DB
    try {
      let campground = await Campground.create(newCampground);
      let user = await User.findById(req.user._id).populate('followers').exec();
      let newNotification = {
        username: req.user.username,
        campgroundId: campground.id,
      };
      for (const follower of user.followers) {
        let notification = await Notification.create(newNotification);
        follower.notifications.push(notification);
        follower.save();
      }

      //redirect back to campgrounds page
      res.redirect(`/campgrounds/${campground.id}`);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
  });
});

// form for making a new campground
router.get('/new', middleware.isLoggedIn, function (req, res) {
  res.render('campgrounds/new.ejs');
});

// Show - shows more info about campground
router.get('/:id', function (req, res) {
  // Find the campground with provided id
  Campground.findById(req.params.id)
    .populate('comments')
    .exec(function (err, foundCampground) {
      if (err || !foundCampground) {
        req.flash('error', 'Campground not found');
        res.redirect('back');
      } else {
        // Render show template with campground
        res.render('campgrounds/show.ejs', { campground: foundCampground });
      }
    });
});

// Edit Campground route
router.get('/:id/edit', middleware.checkCampgroundOwnership, function (
  req,
  res
) {
  Campground.findById(req.params.id, function (err, foundCampground) {
    res.render('campgrounds/edit.ejs', { campground: foundCampground });
  });
});

// UPDATE CAMPGROUND ROUTE
router.put('/:id', middleware.checkCampgroundOwnership, function (req, res) {
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;

    Campground.findByIdAndUpdate(req.params.id, req.body.campground, function (
      err,
      campground
    ) {
      if (err) {
        req.flash('error', err.message);
        res.redirect('back');
      } else {
        req.flash('success', 'Successfully Updated!');
        res.redirect('/campgrounds/' + campground._id);
      }
    });
  });
});

// Destroy Campground
router.delete('/:id', middleware.checkCampgroundOwnership, function (req, res) {
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

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = router;
