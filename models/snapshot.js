var GeoJSON = require('mongoose-geojson-schema');
var mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
  camera_id: String,
  filename : String,
  originalUrl: String,
  timestamp: Date,
  location : mongoose.Schema.Types.Point,
  image_metadata : {
    height : Number,
    width: Number,
    md5 : String
  }
});

const snapshot = mongoose.model('Snapshot', snapshotSchema);

module.exports = snapshot;
