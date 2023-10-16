require("dotenv/config")

const {
  copyAsJpeg,
  cp,
  getFiles,
  makeThumb,
  mkdir,
  parseImages,
  rm
} = require("./util.js")
const path = require("path")
const { chdir } = require("process")
const { fileURLToPath } = require("url")

const DIR = path.dirname(fileURLToPath(import.meta.url))
chdir(DIR)
const DIST = "dist"
const SRC = "src"
const imgpath = path.join(DIR, SRC, "img")
const distpath = path.join(DIR, DIST)

try {
  await rm(distpath)
  await mkdir(path.join(distpath, `img`))
  await mkdir(path.join(distpath, `thumb`))
  const imgfiles = await getFiles(imgpath)
  const promises = []
  const pageData = []
  for await (const i of parseImages(imgfiles)) {
    const { distImgFile, distThumbFile, srcFile } = i
    pageData.push({
      distImgFile,
      distThumbFile
    })
    promises.push(makeThumb(srcFile, distThumbFile))
    promises.push(copyAsJpeg(srcFile, distImgFile))
  }
  console.log("done with iterator, waiting")
  await Promise.all(promises)
  console.log("all have completed.")
  await cp(path.join(SRC, `index.html`), path.join(distpath, `index.html`))
  await cp(path.join(SRC, `robots.txt`), path.join(distpath, `robots.txt`))
  await cp(path.join(SRC, `default.png`), path.join(distpath, `default.png`))
} catch (err) {
  console.log(err)
}


/*
  {
    root: '',
    dir: 'src/img',
    base: 'art_prints_55.jpeg',
    ext: '.jpeg',
    name: 'art_prints_55',
    srcpath: 'src/img/art_prints_55.jpeg',
    destimgpath: 'dist/img/art_prints_55.jpg',
    thumbpath: 'dist/img/thumb/art_prints_55.thumb.jpg'
  }
  */
