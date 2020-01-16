const express = require('express');
const app = express();

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  res.render('landing');
});

app.get('/campgrounds', function(req, res) {
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

  res.render('campgrounds', { campgrounds: campgrounds });
});

app.listen(process.env.PORT || 3000, process.env.IP, function() {
  console.log('The YelpCamp server has started!');
});
