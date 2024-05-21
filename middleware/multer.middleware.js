const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    console.log("file.mimetype->", file.mimetype);
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/png"
    ) {
      if (!fs.existsSync("./images")) fs.mkdirSync("./images");
      callback(null, "./images");
    } else if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
      callback(null, "./uploads");
    } else callback(true, "");
  },
  filename: function (req, file, callback) {
    if (file.mimetype === "image/jpg") callback(null, Date.now() + ".jpg");
    else if (file.mimetype === "image/jpeg")
      callback(null, Date.now() + ".jpeg");
    else if (file.mimetype === "image/png") callback(null, Date.now() + ".png");
    else if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel"
    )
      callback(null, Date.now() + ".csv");
    else callback(true, "");
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5 MB file size limit
  },
});

module.exports = { storage, upload };
