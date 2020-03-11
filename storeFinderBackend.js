const fs = require('fs');
const csv = require('csv-parser');

var bodyParser = require('body-parser');
var cors = require('cors');
var express = require('express');
var app = express();
// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies
app.use(cors({ origin: '*' }));
// Settings for CORS
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4201');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
var server = require( "http" ).createServer( app );
let stores = [];
const filepath = './directory.csv'

fs.createReadStream(filepath)
.on('error', () => {
  // handle error
})

.pipe(csv())
.on('data', (row) => {
  // identical to the store type on angular side.
  store = {
    name: row['Store Name'],
    location: {lat: +row.Latitude, lng: +row.Longitude},
    address: row['Street Address'],
    brand: row.brand,
    storeNumber: row['Store Number'],
    ownership: row['Ownership Type'],
    City: row.City,
    State: row['State/Province'],
    Country: row.Country,
    Postcode: row.Postcode,
    phoneNumber: row['Phone Number']
  };
  stores.push(store);
})

.on('end', () => {
  // handle end of CSV
  console.log('ready!', stores.length);
})

var io = require('socket.io').listen(server, {
    log: false,
    agent: false,
    origins: '*:*',
    transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling']
});

io.on("connection", socket => {
  socket.on("request", data => {
    let nearByStores = [];
    stores.forEach((store) => {
      let distance = distanceCalc(store.location, data.location);
      if(distance < data.distance) {
        store.distance = distance;
        nearByStores.push(store);
      }
    });
    nearByStores = nearByStores.sort(function(a, b){
      return a.distance - b.distance;
    })
    socket.emit('result',nearByStores);
  });
});

server.listen(3003);

// Haversine formula for converting two points of the earth to miles 
// reference https://www.movable-type.co.uk/scripts/latlong.html
function distanceCalc(point1, point2) {
  
  var R = 6371; // Radius of the earth in km
  var dLat = (point2.lat - point1.lat) * Math.PI / 180;  // deg2rad below
  var dLon = (point2.lng - point1.lng) * Math.PI / 180;
  var a = 
     0.5 - Math.cos(dLat)/2 + 
     Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
     (1 - Math.cos(dLon))/2;
  var d = R * 2 * Math.asin(Math.sqrt(a));

  //this returns all measurements in KM
  var miles = d/1.609344;
  
  return miles;
}