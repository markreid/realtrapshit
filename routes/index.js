/* eslint-disable no-param-reassign */

/**
 * Routes
 */

const _ = require('lodash');
const crypto = require('crypto');

const config = require('../config.js');


function Routes(onlineUserList) {
  this.onlineUsers = onlineUserList;
}


/**
 * Index. Make sure you've given a name.
 */
Routes.prototype.index = (req, res) => {
  // authed users only
  if (!req.session.name) return res.redirect('/login');

  return res.clearCookie('dumdum').render('index', {
    samples: config.samples,
    samplesVersion: crypto.createHash('md5').update(JSON.stringify(config.samples)).digest('hex'),
  });
};


/**
 * Dumdum mode. Works without a login, but you can only receive.
 * Useful for putting on people's computers while they're away from their desk.
 */

Routes.prototype.dumdum = (req, res) => {
  res.cookie('dumdum', true);
  res.render('index', {
    samples: config.samples,
    samplesVersion: crypto.createHash('md5').update(JSON.stringify(config.samples)).digest('hex'),
    dumdum: true,
  });
};

/**
 * Render a login form
 */
Routes.prototype.login = (req, res) => {
  res.render('login');
};


/**
 * Take the form value and put it on your session
 */
Routes.prototype.loginPost = function loginPost(req, res) {
  // no name provided
  if (!req.body.name || !req.body.name.trim()) return res.render('login', { error: 'Gimme a name, sheeeit.' });

  // trim and escape
  const name = _.escape(req.body.name.trim());

  // name taken
  if (this.onlineUsers.has(name)) return res.render('login', { error: 'Name taken, try again.' });

  // all good
  req.session.name = name;
  return res.redirect('/');
};


module.exports = Routes;
