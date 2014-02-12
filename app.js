/**
 * RealTrapShit.
 * WHUT.
 */


// module dependencies
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var passport = require('passport');
var passportGoogleStrategy = require('passport-google').Strategy;

// settings file
var config = require('./config');


// instantiate and configure expressjs
var app = express();

app.set('port', config.port || 4000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({secret:'secrety secrets'}));
// passport middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


// dev env middleware
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// configure routes
app.get('/', routes.index);
app.get('/login', routes.login);

app.get('/auth/google', passport.authenticate('google', {failureRedirect: '/login'}), function googleSuccessHandler(req, res){
	res.redirect('/');
});
app.get('/auth/google/return', passport.authenticate('google', {failureRedirect: '/login'}), function(req, res){
	console.info('success, i think');
	res.redirect('/');
});



// configure passport auth
passport.serializeUser(function(user, done){
	// console.log('serialize');
	// console.log(user);
	done(null, user);
});
passport.deserializeUser(function(obj, done){
	// console.log('deserialize');
	// console.log(obj);
	done(null, obj);
});

passport.use(new passportGoogleStrategy({
	//returnURL: 'http://realtrapshit.votetong.com/auth/google/return',
	//realm: 'http://realtrapshit.votetong.com/'
	returnURL: 'http://localhost:4000/auth/google/return',
	realm: 'http://localhost:4000/'

}, function googleAuthCallback(identifier, profile, done){
	// attach the identifier to the profile, which is our user object
	profile.identifier = identifier;
	done(null, profile);
}));


// listen for incoming connections
var server = http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});



// set up the sockets
var io = require('socket.io').listen(server);
io.configure(function(){
    io.enable('log');
    io.set('log level', 2);
});

// socket listeners
io.sockets.on('connection', function(socket){
    console.info('socket connected');

    socket.on('play', function(sampleId){
        console.log(sampleId);
        socket.broadcast.emit('play', sampleId);
    });

});
