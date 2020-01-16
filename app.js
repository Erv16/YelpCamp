const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

let campgrounds = [
  {
    name: 'Salmon Creek',
    image:
      'https://image.shutterstock.com/image-photo/sunbeam-morning-around-camping-site-260nw-649280029.jpg'
  },
  {
    name: 'Granite Hill',
    image:
      'https://australia.businessesforsale.com/australian/static/articleimage?articleId=12982&name=image2.jpg'
  },
  {
    name: 'Mountain Goats Coast',
    image:
      'https://i0.wp.com/campingseasonsupply.com/wp-content/uploads/2019/07/50.png?w=980&ssl=1'
  }
];

app.get('/', function(req, res) {
  res.render('landing');
});

app.get('/campgrounds', function(req, res) {
  res.render('campgrounds', { campgrounds: campgrounds });
});

app.post('/campgrounds', function(req, res) {
  // get data from form and add to campgrounds

  let name = req.body.name;
  let image = req.body.image;
  let newCampground = {
    name: name,
    image: image
  };
  campgrounds.push(newCampground);
  // redirect back to campgrounds page
  res.redirect('/campgrounds');
});

app.get('/campgrounds/new', function(req, res) {
  res.render('new.ejs');
});

app.listen(process.env.PORT || 3000, process.env.IP, function() {
  console.log('The YelpCamp server has started!');
});
