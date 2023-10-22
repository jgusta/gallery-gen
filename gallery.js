const { normalize, parse, join } = require("path")
const { log, getFiles, readText, copyAsJpeg, PageData } = require("./util.js")
const { posix } = require("node:path")
const sharp = require("sharp")
const yml = require("yaml")
function imagesFilter(item) {
  return item.isFile() && item.name.match(/\.(?:png|jpg|jpeg|gif|webm|tif)$/)
    ? true
    : false
}



async function makeThumb(file, destination, width = 400) {
  log(`thumb ${destination}`, 2)
  let img = await sharp(file)
    .resize(width, null)
    .toFormat("png")
    .toBuffer()
    .then(buffer => sharp(buffer))
  const meta = await img.metadata()
  let svg = `<svg><rect x="0" y="0" width="${meta.width}" height="${meta.height}" rx="5" ry="5"/></svg>`
  const mask = Buffer.from(svg)
  return await img
    .composite([
      {
        input: mask,
        blend: "dest-in"
      }
    ])
    .toFile(destination)
}

async function* parseImages(files, imgSrcDir, imgDestPath, thumbDir) {
  const filtered = files.filter(imagesFilter)
  for (const x of filtered) {
    const srcFile = join(imgSrcDir, x.name)
    const info = parse(srcFile)
    yield {
      srcFile,
      name: info.name,
      distImgFile: normalize(join(imgDestPath, `${info.name}.jpg`)),
      distThumbFile: normalize(join(thumbDir, `${info.name}.thumb.png`)),
      metaFile: normalize(join(imgSrcDir, `${info.name}.yml`))
    }
  }
}

async function processImageData(
  IMGSRCPATH,
  IMGDESTPATH,
  THUMBPATH,
  DISTPATH,
  pageData
) {
  log(`processing images`, 1)
  const imgfiles = await getFiles(IMGSRCPATH)
  const promises = []

  for await (const i of parseImages(
    imgfiles,
    IMGSRCPATH,
    IMGDESTPATH,
    THUMBPATH
  )) {
    log(`processing ${i.srcFile}`, 2)
    const { distImgFile, distThumbFile, srcFile, metaFile } = i
    const thumbUrl = posix.relative(DISTPATH, distThumbFile)
    const fullUrl = posix.relative(DISTPATH, distImgFile)
    const data = {
      srcFile,
      distImgFile,
      distThumbFile,
      thumbUrl,
      fullUrl
    }
    const ymlData = await readText(metaFile)
    // add attributes from yaml file
    Object.assign(data, yml.parse(ymlData))
    log(`data: ${JSON.stringify(data)}`, 3)
    pageData.add(data)
  }
  await pageData.persistToFile()
  await Promise.all(promises)
  log(`thumbs generated`, 1)

  return pageData
}
module.exports = { makeThumb, parseImages, processImageData }
