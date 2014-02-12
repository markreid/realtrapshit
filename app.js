/**
 * RealTrapShit.
 * WHUT.
 */


// module dependencies
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var cookie = require('cookie');
var passport = require('passport');
var passportGoogleStrategy = require('passport-google').Strategy;
// todo - this looks dodgy
var MemoryStore = require('./node_modules/express/node_modules/connect/lib/middleware/session/memory');

// settings file
var config = require('./config');


// instantiate and configure expressjs
var app = express();
var sessionStore = new MemoryStore();

app.set('port', config.port || 4000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({secret:'secrety secrets', store:sessionStore}));
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
	console.info('successfully authenticated via google');
	res.redirect('/');
});



// configure passport auth
passport.serializeUser(function(user, done){
	done(null, user);
});
passport.deserializeUser(function(obj, done){
	done(null, obj);
});

passport.use(new passportGoogleStrategy({
	returnURL: config.googleReturnURL,
	realm: config.googleRealm
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
    io.set('authorization', function socketHandshake(handshakeData, accept){
    	if(!handshakeData.headers.cookie) return accept('No cookies in handshakeData');

		var handshakeCookie = cookie.parse(handshakeData.headers.cookie);
		var sessionId = handshakeCookie['connect.sid'];
		if(!sessionId) return accept('No Express SID in cookie');

		sessionStore.get(sessionId.substr(2,24), function(err, session){
			if(err || !session) return accept('No matching session in store.');

			// attach the session to handshakedata so we can grab it later
			handshakeData.session = session;
			accept(null, true);
		});
    });
});


var onlineUsers = {};
var getOnlineUserNames = function(){
	var usernames = [];
	for(var i in onlineUsers){
		if(!onlineUsers.hasOwnProperty(i)) return;
		usernames.push(onlineUsers[i].name.givenName);
	}
	return usernames;
};

// socket listeners
io.sockets.on('connection', function(socket){
	try{
		var user = socket.handshake.session.passport.user;
	} catch(e){}
	if(!user){
		console.error('No user in handshake session');
		return socket.disconnect();
	}

	console.info(user.name.givenName + ' connected to socket');
	onlineUsers[user.identifier] = user;

	socket.emit('user.online', getOnlineUserNames());

    socket.broadcast.emit('user.connected', user.name.givenName);

    socket.on('play', function(sampleId){
        console.log(sampleId);
        socket.broadcast.emit('play', sampleId);
    });

    socket.on('disconnect', function(){
    	delete(onlineUsers[user.identifier]);
    	io.sockets.emit('user.online', getOnlineUserNames());
    });

});
