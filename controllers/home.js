var handleError = function(req, error) {
  req.flash('errors', [{ msg : error}]);
};

exports.index = function(req, res) {
    res.render('home', { title: 'Home' });
};
