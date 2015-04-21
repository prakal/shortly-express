var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var crypto = require('crypto');
var session = require('express-session');

var app = express();
app.use(cookieParser('Frank and Pranav sign'));
app.use(session());

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

var checkUser = function(req, res, callback) {
  if (req.session.cookie.maxAge > 0) {
    // render links
    console.log('get links: our cookie age is alright');
    callback(req, res);
    // Links.reset().fetch().then(function(links) {
    //   res.send(200, links.models);
    // });
  } else {
    // if cookie is invalid,
    // then redirect
    res.redirect(302, "http://" + req.headers.host + "/login");
  }
};


app.get('/', function(req, res) {
  // check the session whether the user is signed in
    // if the user is signed in,
      // show index.html
    // else
      // render login page
    console.log("/ session", req.session);
    console.log("/ session maxAge: ", req.session.cookie.maxAge);
    checkUser(req, res, function(req, res) {
      res.render('index');
    });
});


app.get('/create',
function(req, res) {
  res.redirect(302, "http://" + req.headers.host + "/login");
  //res.render('index');
});

app.get('/links',
function(req, res) {
  console.log("links session", req.session);
  console.log("links session maxAge: ", req.session.cookie.maxAge);
  checkUser(req, res, function(req, res) {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;
  console.log('req.body',req.body,' typeof req.body', typeof req.body);
  console.log('post to /links, uri, isValidUrl:', uri, util.isValidUrl(uri));
  checkUser(req, res, function(req, res) {
    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }

    new Link({ url: uri }).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }

          var link = new Link({
            url: uri,
            title: title,
            base_url: req.headers.origin
          });

          link.save().then(function(newLink) {
            Links.add(newLink);
            res.send(200, newLink);
          });
        });
      }
    });
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/logout', function(req, res) {
  req.session.destroy(function(){
    res.redirect(302, '/login');
  });
});


app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  console.log('username: ', req.body.username, 'password: ', req.body.password);
  var qb = Users.query();
  qb.where({username: req.body.username}).select().then(function(resp) {
    console.log('login response: ', resp);
    Users.resetQuery();
    if (resp.length > 0 && resp[0].password === req.body.password) {
      req.session.regenerate(function(){
        req.session.user = req.body.username;
        req.session.cookie.maxAge = 15*60*1000;
        res.redirect('/');
        });
    } else {
      res.redirect(302, "/login");
    }
  });
})

app.get('/signup', function(req, res) {
  res.render('signup');
});


app.post('/signup', function(req, res) {
  console.log('username: ', req.body.username, 'password: ', req.body.password);
  new User({ username: req.body.username }).fetch().then(function(found) {
    if (found) {
      // console.log('our request is',req);
      // user is found in DB. Prompt to provide a different username.
      res.redirect(302, "http://" + req.headers.host + req.url);
    } else {
      var user = new User({
        username: req.body.username,
        password: req.body.password,
      });

      user.save().then(function(newUser) {
        Users.add(newUser);
        res.redirect(302, '/');
      });
    }
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
