/**
 * RealTrapShit.
 * WHUT.
 */


// module dependencies
var express = require('express');
var _ = require('underscore');
var http = require('http');
var path = require('path');
var cookie = require('cookie');
var MemoryStore = require('./node_modules/express/node_modules/connect/lib/middleware/session/memory');
var crypto = require('crypto');

// parse our config
var config = require('./config.json');


// Alrighty, let's configure Express
var app = express();
var sessionStore = new MemoryStore();

app.set('port', process.env.PORT || config.server.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({secret:'oh oh oh secrety secrets', store:sessionStore}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// dev env middleware
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


// routes - they need access to the onlineUsers array for rejecting in-use usernames
var onlineUsers = [];
var Routes = require('./routes');
var routes = new Routes(onlineUsers);

app.get('/', routes.index);
app.get('/login', routes.login);
app.post('/login', routes.loginPost.bind(routes));


// listen for incoming connections
var server = http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});


// parse command line arguments
var LOGALL = _.contains(process.argv, '--logall');

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


// socket listeners
io.sockets.on('connection', function(socket){
    var username;
	try{
		username = socket.handshake.session.name;
	} catch(e){}

    if(!username){
		console.error('No username on handshake session...');
		return socket.disconnect();
	}

	console.info(username + ' connected to socket');
	onlineUsers.push(username);

	socket.emit('user.online', onlineUsers);
    socket.broadcast.emit('user.connected', username);

    socket.emit('samplesVersion', crypto.createHash('md5').update(JSON.stringify(config.samples)).digest('hex'));

    socket.on('play', function(sampleId){
        if(LOGALL) console.log(username + ' triggered ' + sampleId);
        socket.broadcast.emit('play', sampleId, username);
    });

    socket.on('disconnect', function(){
        onlineUsers = _.without(onlineUsers, username);
    	io.sockets.emit('user.online', onlineUsers);
    });

});
