const fs=require('fs');
const util=require('util');

var HttpsProxyAgent = require('https-proxy-agent');
var https = require('https');
var request = require('request');
var traffic = require('./traffic');
var snapshotModel = require('./models/snapshot');
var GeoJSON = require('mongoose-geojson-schema');
var mongoose = require('mongoose');

var proxy = process.env.PROXY;
var agent = new HttpsProxyAgent(proxy);

var log = function(message){
  fs.appendFile('output.log', message, 'utf8', null);
};

var getFileNameFromUrl = function(str) {
  var arr = str.split("/");
  return arr[arr.length-1];
};

var imagesToDownload = [];

var downloadLoop = function(downloadArray, index, callback) {
  if (index <= downloadArray.length - 1) {

    var cameraInfo = downloadArray[index];
    console.log('Downloading ' + cameraInfo.camera_id +  ' file = ' + cameraInfo.camera_url);
    var folder = __dirname + '/public/images/' + cameraInfo.camera_id + '/';
    var fileName = folder + getFileNameFromUrl(cameraInfo.camera_url);

    fs.existsSync(folder) || fs.mkdirSync(folder);

    var path = cameraInfo.camera_url.replace("https://images.data.gov.sg","");

    var file = fs.createWriteStream(fileName);
    var downreq = https.get({
      host: "images.data.gov.sg",
      path: path,
      port: '443',
      method: "GET",
      agent: agent,
      timeout: 30000 },
      function(response) {
        response.pipe(file);
        downloadLoop(downloadArray, index+1, callback);
    });

    downreq.on('error', function(error) {
      console.error(error);
    });
  }
  else {
    callback();
  }
};

var getCurrentDate = function(d) {
  return d.getFullYear() + '-' + ("0" + (d.getMonth()+1)).slice(-2) + '-' + ("0" + d.getDate()).slice(-2) + 'T' + ("0" + d.getHours()).slice(-2) + ':' + ("0" + d.getMinutes()).slice(-2) + ':00';
};

exports.loop = function() {
  var dateTime = getCurrentDate(new Date());
  console.log('Requesting data for ' + dateTime);

  var post_req = https.request({
      host: "api.data.gov.sg",
      path: "/v1/transport/traffic-images?date_time=" + dateTime,
      port: '443',
      method: "GET",
      headers: {
          'Accept-Encoding': '*/*',
          'Accept-Language': 'en-US',
          'api-key' : process.env.TRAFFIC_API_KEY
      },
      agent: agent,
      timeout: 60000,
      followRedirect: true,
      maxRedirects: 10
  }, function(response) {
      log('statusCode: ' + response.statusCode);
      log('headers: ' + response.headers);
      response.setEncoding('utf8');

      var body = '';

      response.on('data', function(chunk) {
        body += chunk;
      });

      response.on('end', function () {
        var result = JSON.parse(body);

        if (result && result.items) {
          for(var i = 0; i < result.items.length ; i++) {
            var currentItem = result.items[i];

            for(var j = 0; j < currentItem.cameras.length; j++){

              var cameraInfo = currentItem.cameras[j];
              var camera_id = cameraInfo.camera_id;
              var camera_url = cameraInfo.image;

              var snapshot = new snapshotModel({
                camera_id : cameraInfo.camera_id,
                originalUrl : cameraInfo.image,
                timestamp : cameraInfo.timestamp,
                image_metadata : cameraInfo.image_metadata,
                filename : getFileNameFromUrl(cameraInfo.image),
                location : { type: 'Point', coordinates: [cameraInfo.location.longitude, cameraInfo.location.latitude] }
              });

              snapshot.save(function(err) {
                if (err)
                  console.log(util.inspect(err));
              });

              imagesToDownload.push({
                camera_id : camera_id,
                camera_url : camera_url
              });
            }
          }
        }
        else
        {
          console.log('no results received from gov API');
        }

        console.log('Starting download');
        downloadLoop(imagesToDownload, 0,
          function() {
            imagesToDownload = [];
            console.log('download over');
            setTimeout(traffic.loop, 60000);
          });
      });
  });

  post_req.on('error', function(error) {
    console.error(error);
  });

  post_req.end();
};
