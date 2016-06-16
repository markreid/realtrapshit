/* eslint-disable no-param-reassign */
/**
 * REAL TRAP SHIT
 */

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const cookie = require('cookie');
const session = require('express-session');
const MemoryStore = session.MemoryStore;
const crypto = require('crypto');
const log = require('winston');
const _ = require('lodash');


// parse config
const config = require('./config.js');

log.level = process.env.LOG_LEVEL || config.LOG_LEVEL || 'debug';

const app = express();
const sessionStore = new MemoryStore();

app.use(express.favicon());


app.set('port', process.env.PORT || config.server.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser());
app.use(express.session({ secret: 'oh oh oh secrety secrets', store: sessionStore }));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// dev env middleware
if (app.get('env') === 'development') {
  app.use(express.errorHandler());
}


const server = require('http').Server(app);
const io = socketio(server);

server.listen(app.get('port'), () => {
  log.debug(`Express is listening on port ${app.get('port')}`);
});


// routes - they need access to the onlineUsers array for rejecting in-use usernames
const onlineUsers = new Set();

const Routes = require('./routes');
const routes = new Routes(onlineUsers);

app.get('/', routes.index);
app.get('/dumdum', routes.dumdum);
app.get('/login', routes.login);
app.post('/login', routes.loginPost.bind(routes));


io.use((socket, next) => {
  const socketCookie = cookie.parse(socket.request.headers.cookie);

  // user is in dumdum mode, they don't need a name.
  if (!!socketCookie.dumdum) {
    log.info('Authenticated a dumdum');
    socket.request.session = {
      name: 'dumdum',
    };
    socket.request.dumdum = true;
    return next();
  }

  const sessionId = socketCookie['connect.sid'];
  if (!sessionId) return next('No connect.sid in cookie');

  sessionStore.get(sessionId.substr(2, 32), (err, foundSession) => {
    if (err || !foundSession) {
      return next('No matching session in store');
    }
    socket.request.session = foundSession;
    return next(null, true);
  });

  return true;
});


io.on('connection', (socket) => {
  const username = socket.request.session.name;
  if (!username) {
    // dunno how this could happen, but we'll abort if it does.
    log.error('No username on handshake session...');
    return socket.disconnect();
  }

  const dumdum = !!socket.request.dumdum;

  onlineUsers.add(username);
  log.info(`${username} opened a socket connection (${onlineUsers.size} online)`);

  io.emit('users', [...onlineUsers]);
  io.emit('user.connected', username);
  io.emit('samplesVersion', crypto.createHash('md5').update(JSON.stringify(config.samples)).digest('hex'));

  socket.on('disconnect', () => {
    onlineUsers.delete(username);
    io.emit('users', [...onlineUsers]);
    io.emit('user.disconnected', username);
    log.info(`${username} closed their connection (${onlineUsers.size} online)`);
  });


    // if you're a dumdum user, we return here, because you can't emit a play event.
  if (dumdum) return false;

  socket.on('play', (sampleId) => {
    socket.broadcast.emit('play', sampleId, username);
    const sampleName = config.samples[sampleId].name;
    log.debug(`${username} fired a ${sampleName} to ${onlineUsers.size -1} other users` );
  });

  return true;
});
