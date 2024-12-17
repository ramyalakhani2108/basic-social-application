const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

//setting up the disk storage
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/profiles')
    },
    filename: function (req, file, cb) {
      const newFn = crypto.randomBytes(16, (err, buf) => {
          cb(null,  buf.toString('hex') + path.extname(file.originalname));
        });
    }
  })

//creating the upload variable and exporting it 
const upload = multer({ storage: profileStorage })

module.exports = upload;