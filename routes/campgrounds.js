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

//INDEX - show all campgrounds
router.get('/', function (req, res) {
  var perPage = 8;
  var pageQuery = parseInt(req.query.page);
  var pageNumber = pageQuery ? pageQuery : 1;
  var noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Campground.find({ name: regex })
      .skip(perPage * pageNumber - perPage)
      .limit(perPage)
      .exec(function (err, allCampgrounds) {
        Campground.count({ name: regex }).exec(function (err, count) {
          if (err) {
            console.log(err);
            res.redirect('back');
          } else {
            if (allCampgrounds.length < 1) {
              noMatch = 'No campgrounds match that query, please try again.';
            }
            res.render('campgrounds/index', {
              campgrounds: allCampgrounds,
              currentUser: req.user,
              current: pageNumber,
              pages: Math.ceil(count / perPage),
              noMatch: noMatch,
              search: req.query.search,
            });
          }
        });
      });
  } else {
    // get all campgrounds from DB
    Campground.find({})
      .skip(perPage * pageNumber - perPage)
      .limit(perPage)
      .exec(function (err, allCampgrounds) {
        Campground.count().exec(function (err, count) {
          if (err) {
            console.log(err);
          } else {
            res.render('campgrounds/index', {
              campgrounds: allCampgrounds,
              currentUser: req.user,
              current: pageNumber,
              pages: Math.ceil(count / perPage),
              noMatch: noMatch,
              search: false,
            });
          }
        });
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
  var cost = req.body.cost;

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
    .populate('comments likes')
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
        campground.name = req.body.campground.name;
        campground.description = req.body.campground.description;
        campground.image = req.body.campground.image;
        campground.cost = req.body.campground.cost;
        campground.save(function (err) {
          if (err) {
            console.log(err);
            res.redirect('/campgrounds');
          } else {
            req.flash('success', 'Successfully Updated!');
            res.redirect('/campgrounds/' + campground._id);
          }
        });
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

// Campground Like Route
router.post('/:id/like', middleware.isLoggedIn, function (req, res) {
  Campground.findById(req.params.id, function (err, foundCampground) {
    if (err) {
      console.log(err);
      return res.redirect('/campgrounds');
    }

    // check if req.user._id exists in foundCampground.likes
    var foundUserLike = foundCampground.likes.some(function (like) {
      return like.equals(req.user._id);
    });

    if (foundUserLike) {
      // user already liked, removing like
      foundCampground.likes.pull(req.user._id);
    } else {
      // adding the new user like
      foundCampground.likes.push(req.user);
    }

    foundCampground.save(function (err) {
      if (err) {
        console.log(err);
        return res.redirect('/campgrounds');
      }
      return res.redirect('/campgrounds/' + foundCampground._id);
    });
  });
});

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = router;
