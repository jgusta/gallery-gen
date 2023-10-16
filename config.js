require("dotenv/config")
const { join } = require("path")
const DIR = __dirname
const STATICPATH = process.env.STATICPATH || join(DIR, 'src', 'public')
const IMGSRCPATH = process.env.IMIGSRCPATH || join(DIR, "img")
const DISTPATH = process.env.DISTPATH || join(DIR, 'dist')
const IMGDESTPATH = process.env.IMGDESTPATH || join(DISTPATH, "img")
const THUMBPATH = process.env.THUMBPATH || join(DISTPATH, "thumbs")
const TEMPLATEPATH = process.env.TEMPLATEPATH || join(DIR, 'src', 'templates')
module.exports = {
  DISTPATH,
  IMGDESTPATH,
  IMGSRCPATH,
  TEMPLATEPATH,
  THUMBPATH,
  STATICPATH
}
