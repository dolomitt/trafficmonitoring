var snapshotModel = require('../models/snapshot');

exports.index = function(req, res) {
  snapshotModel.find({}, {camera_id : 1, filename : 1, location : 1, timestamp : 1, _id : 0})
    .sort( { timestamp: -1 } )
    .limit(70)
    .exec(function(err, results) {
      res.send(results);
    });
};
