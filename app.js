const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Campground = require('./models/campground');
const seedDB = require('./seeds');

seedDB();
mongoose.connect('mongodb://localhost/yelp_camp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

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
      res.render('index.ejs', { campgrounds: allCampgrounds });
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
  res.render('new.ejs');
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
        res.render('show.ejs', { campground: foundCampground });
      }
    });
});

app.listen(process.env.PORT || 3000, process.env.IP, function () {
  console.log('The YelpCamp server has started!');
});
