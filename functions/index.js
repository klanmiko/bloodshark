const functions = require('firebase-functions');
const {Storage} = require('@google-cloud/storage');
const storage = new Storage()
const spawn = require('child-process-promise').spawn;
const admin = require('firebase-admin')
const os = require('os')
const path = require('path')
const fs = require('fs')
const parse = require('csv-parse')
var Promise = require('promise')

var parser = parse()

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://blood-shark.firebaseio.com'
});

var db = admin.database()
var plots = db.ref("plots");

const express = require('express');
const cors = require('cors');

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Add middleware to authenticate requests
app.use(myMiddleware);

// build multiple CRUD interfaces:
app.get('/export/:plot', (request, response) => {
  var clusters = plots.child(request.param.plot).child("clusters")
  clusters.once("value").then((snapshot) => {
    var data = snapshot.val();
    response.json(data);
  })
});

// Expose Express API as a single Cloud Function:
exports.exportResearch = functions.https.onRequest(app);


exports.loadPlot = functions.storage.object().onFinalize((object) => {
  const bucket = storage.bucket(object.bucket);
  const tempFilePath = path.join(os.tmpdir(), object.name);

  return bucket.file(object.name).download({
    destination: tempFilePath,
  }).then(() => {
    console.log('File downloaded locally to', tempFilePath);

    console.log("Fuck")
    return new Promise((resolve, reject) => {
      let stream = fs.createReadStream(tempFilePath);

      var games = []
  
      parser.on('readable', () => {
        let record = parser.read();
        while(record) {
          if(record.length === 3) {
            let gameId = record[2].replace(/\r|\n/g,"")
            if(!games.includes(gameId)) games.push(gameId)
            let game = plots.child(gameId).child("points")
            let coordinate = {
              x: parseFloat(record[0]),
              y: parseFloat(record[1])
            }
            game.push().set(coordinate)
          }
          record = parser.read()
        }
      });
  
      parser.on('end', () => {
        fs.unlinkSync(tempFilePath)
        resolve(true);
      });
  
      stream.pipe(parser)
    })
  });
});