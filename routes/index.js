
/*
 * GET home page.
 */

exports.index = function(req, res){
	// authed users only
	if(!req.user) res.redirect('/login');
	console.log(req.user);
	res.render('index');
};

exports.login = function(req, res){
	res.send('<html><body><a href="/auth/google">login with google</a></body></html>');
};
