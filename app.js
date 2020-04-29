require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const methodOveride = require('method-override');
const LocalStrategy = require('passport-local');
const Campground = require('./models/campground');
const Comment = require('./models/comment');
const seedDB = require('./seeds');
const User = require('./models/user');
const commentRoutes = require('./routes/comments');
const campgroundRoutes = require('./routes/campgrounds');
const authRoutes = require('./routes/index');

mongoose.connect('mongodb://localhost:27017/yelp_camp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(methodOveride('_method'));
app.use(flash());
//seedDB();

app.locals.moment = require('moment');

// Passport Configuration
// App is making use of express session
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

app.use(async function (req, res, next) {
  res.locals.currentUser = req.user;
  if (req.user) {
    try {
      let user = await User.findById(req.user._id)
        .populate('notifications', null, { isRead: false })
        .exec();
      res.locals.notifications = user.notifications.reverse();
    } catch (err) {
      console.log(err.message);
    }
  }
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

app.use('/', authRoutes);
app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:slug/comments', commentRoutes);

app.listen(process.env.PORT || 3000, process.env.IP, function () {
  console.log('The YelpCamp server has started!');
});
