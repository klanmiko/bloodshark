const admin = require('firebase-admin')
admin.initializeApp({
  credential: admin.credential.cert("credentials.json"),
  databaseURL: 'https://blood-shark.firebaseio.com'
});

var db = admin.database()
db.ref().remove()