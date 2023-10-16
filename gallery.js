const { normalize, parse, join } = require("path")
const { log, getFiles, readText } = require("./util.js")
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
  
  log(meta, 3)
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
    log(info, 2)
    yield {
      srcFile,
      distImgFile: normalize(join(imgDestPath, `${info.name}.jpg`)),
      distThumbFile: normalize(join(thumbDir, `${info.name}.thumb.png`)),
      metaFile: normalize(join(imgSrcDir, `${info.name}.yml`))
    }
  }
}

async function processImages(IMGSRCPATH, IMGDESTPATH, THUMBPATH) {
  log(`processing images`, 1)
  const imgfiles = await getFiles(IMGSRCPATH)
  const promises = []
  const pageData = []
  const threads = 5
  let running = 0
  for await (const i of parseImages(
    imgfiles,
    IMGSRCPATH,
    IMGDESTPATH,
    THUMBPATH
  )) {
    running += 1
    log(`processing ${i.srcFile}`, 2)
    const { distImgFile, distThumbFile, srcFile } = i
    const data = {
      distImgFile,
      distThumbFile
    }
    log(`data: ${JSON.stringify(data)}`, 3)
    // get path to matching.yml file
    const ymlFile = join(IMGSRCPATH, `${i.name}.yml`)
    const ymlData = await readText(ymlFile)
    const ymlJson = JSON.parse(ymlData)
    Object.assign(data, ymlJson)
    if (running >= threads) {
      const fileData = await readText ()
      pageData.push(data)
      promises.push(makeThumb(srcFile, distThumbFile))
      promises.push(copyAsJpeg(srcFile, distImgFile))
    } else {
      pageData.push(data)
      promises.push(await makeThumb(srcFile, distThumbFile))
      promises.push(await copyAsJpeg(srcFile, distImgFile))
    }
  }

  // await writeText("pageData.json", jsonData)
  await Promise.all(promises)
  log(`thumbs generated`, 1)
  return pageData
}
module.exports = { makeThumb, parseImages, processImages }
