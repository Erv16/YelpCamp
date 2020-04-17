const express = require('express');
// merge params from campgrounds and comments routes together and access :id
const router = express.Router({ mergeParams: true });
const middleware = require('../middleware');
const Campground = require('../models/campground');
const Comment = require('../models/comment');

// Comments Routes
router.get('/new', middleware.isLoggedIn, function (req, res) {
  // find campground by id
  Campground.findById(req.params.id, function (err, campground) {
    if (err) {
      console.log(err);
    } else {
      res.render('comments/new.ejs', { campground: campground });
    }
  });
});

// Comments Create
router.post('/', middleware.isLoggedIn, function (req, res) {
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
          // add username and id to comments
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          // save comment
          comment.save();
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

// Comments edit route
router.get('/:comment_id/edit', middleware.checkCommentOwnership, function (
  req,
  res
) {
  // id refers to the campground id which was defined in app.js
  Comment.findById(req.params.comment_id, function (err, foundComment) {
    if (err) {
      res.redirect('back');
    } else {
      res.render('comments/edit.ejs', {
        campground_id: req.params.id,
        comment: foundComment,
      });
    }
  });
});

// Comments update
router.put('/:comment_id', middleware.checkCommentOwnership, function (
  req,
  res
) {
  Comment.findByIdAndUpdate(
    req.params.comment_id,
    req.body.comment,
    { useFindAndModify: false },
    function (err, updatedComment) {
      if (err) {
        res.redirect('back');
      } else {
        res.redirect('/campgrounds/' + req.params.id);
      }
    }
  );
});

// Destroy comment route
router.delete('/:comment_id', middleware.checkCommentOwnership, function (
  req,
  res
) {
  // find by id and remove
  Comment.findByIdAndRemove(
    req.params.comment_id,
    { useFindAndModify: false },
    function (err) {
      if (err) {
        res.redirect('back');
      } else {
        res.redirect('/campgrounds/' + req.params.id);
      }
    }
  );
});

module.exports = router;
