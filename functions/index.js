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

    return new Promise((resolve, reject) => {
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
        for(let gameId of games) {
          game = plots.child(gameId)
          game.once("value").then((support) => {
            let data = support.val()
            let points = []

            for(let key in data) {
              points.push(data[key])
            }

            let max = {}
            let min = {}
            let XS = points.map(value => value.x)
            let YS = points.map(value => value.y)
            max.x = XS.reduce((a, b) => Math.max(a,b))
            max.y = YS.reduce((a, b) => Math.max(a,b))
            min.x = XS.reduce((a, b) => Math.min(a,b))
            min.y = YS.reduce((a, b) => Math.min(a,b))
  
            game.set({min: min, max: max})

            resolve(true)
          })
        }
        fs.unlinkSync(tempFilePath)
      });
  
      stream.pipe(parser)
    })
  });
});