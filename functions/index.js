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

    parser.on('readable', () => {
      let record = parser.read();
      while(record) {
        console.log(record)
        let gameId = record[2]
        let game = plots.child(gameId)
        let coordinate = {
          x: record[0],
          y: record[1]
        }
        game.push().set(coordinate)
        record = parser.read()
      }
    });

    parser.on('end', () => fs.unlinkSync(tempFilePath))

    return stream.pipe(parser)
  });
});