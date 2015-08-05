/**
 * Routes
 */

var _ = require('underscore');
var crypto = require('crypto');


var config = require('../config.json');


var Routes = function(onlineUserList){
    this.onlineUsers = onlineUserList;
};


/**
 * Index. Make sure you've given a name.
 */
Routes.prototype.index = function(req, res){
    // authed users only
	if(!req.session.name) res.redirect('/login');
	res.render('index', {
        samples: config.samples,
        samplesVersion: crypto.createHash('md5').update(JSON.stringify(config.samples)).digest('hex')
    });
};

/**
 * Render a login form
 */
Routes.prototype.login = function(req, res){
    res.render('login');
};

/**
 * Take the form value and put it on your session
 */
Routes.prototype.loginPost = function(req, res){

    // no name provided
    if(!req.body.name || !req.body.name.trim()) return res.render('login', {error: 'Gimme a name, sheeeit.'});

    // trim and escape
    var name = _.escape(req.body.name.trim());

    // name taken
    if(_.contains(this.onlineUsers, name)) return res.render('login', {error: 'Name taken, try again.'});

    // all good
    req.session.name = name;
    res.redirect('/');
};


module.exports = Routes;
