const functions = require('firebase-functions');
const {Storage} = require('@google-cloud/storage');
const storage = new Storage()
const spawn = require('child-process-promise').spawn;
const admin = require('firebase-admin')
const os = require('os')
const path = require('path')
const fs = require('fs')
const parse = require('csv-parse')

var parser = parse()

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://blood-shark.firebaseio.com'
});

var db = admin.database()
var plots = db.ref("plots");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
exports.loadPlot = functions.storage.object().onFinalize((object) => {
  const bucket = storage.bucket(object.bucket);
  const tempFilePath = path.join(os.tmpdir(), object.name);

  return bucket.file(object.name).download({
    destination: tempFilePath,
  }).then(() => {
    console.log('File downloaded locally to', tempFilePath);

    let stream = fs.createReadStream(tempFilePath);

    var games = []

    parser.on('readable', () => {
      let record = parser.read();
      while(record) {
        if(record.length === 3) {
          let gameId = record[2].replace(/\r|\n/g,"")
          if(!games.includes(gameId)) games.push(gameId)
          let game = plots.child(gameId)
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
      for(let game of games) {
        let game = plots.child(game)
        game.once("value").then((support) => {
          let data = support.val()
          let points = Object.values(data)
          let max = {}
          let min = {}
          max.x = points.reduce((a, b) => Math.max(a.x,b.x))
          max.y = points.reduce((a, b) => Math.max(a.y,b.y))
          min.x = points.reduce((a, b) => Math.min(a.x,b.x))
          min.y = points.reduce((a, b) => Math.min(a.y,b.y))

          game.set({min: min, max: max})
        })
      }
      fs.unlink(tempFilePath)
    });

    stream.pipe(parser)

    return true
  });
});