const functions = require('firebase-functions');
const admin = require('firebase-admin')

admin.initializeApp();

exports.createUserProfile = functions.https.onCall(async (data, context) => {
  checkAuthentication(context);
  dataValidator(data, { username: 'string' });

  // This checks if the current user already has a username (public profile)
  const userProfile = await admin.firestore().collection('user_profiles')
    .where('user_id', '==', context.auth.uid).limit(1).get();
    if (!userProfile.empty) {
      throw new functions.https.HttpsError('already-exists', "This user already has a username.")
    }

  // The below checks if the entered username has already been taken
  const existingProfile = await admin.firestore().collection('user_profiles').doc(data.username).get();
  if (existingProfile.exists) {
    throw new functions.https.HttpsError('already-exists', "This username already exists.")
  }

  return admin.firestore().collection('user_profiles').doc(data.username).set({
    user_id: context.auth.uid
  })
});


exports.postComment = functions.https.onCall((data, context) => {
  checkAuthentication(context);
  dataValidator(data, {
    bookId: 'string',
    text: 'string'
  })

  const db = admin.firestore();
  return db.collection('user_profiles').where('user_id', '==', context.auth.uid)
    .limit(1)
    .get().then((snapshot) => {
      return db.collection('comments').add({
        text: data.text,
        username: snapshot.docs[0].id,
        dateCreated: new Date(),
        book: db.collection('books').doc(data.bookId),
      });
    });
});

function dataValidator(data, validKeys) {
  if(Object.keys(data).length !== Object.keys(validKeys).length) {
    throw new functions.https.HttpsError('invalid-argument', "Data object contains invalid number of properties")
  } else {
    for(let key in data) {
      if(!validKeys[key] || typeof data[key] !== validKeys[key]) {
        throw new functions.https.HttpsError('invalid-argument', "Data object contains invalid keys")
      }
    }
  }
}

function checkAuthentication(context) {
  if(!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', "You must be logged in to perform this action.")
  }
}