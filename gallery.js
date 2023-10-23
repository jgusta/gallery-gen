const { normalize, parse, join } = require("path")
const { log, getFiles, readText, copyAsJpeg } = require("./util.js")
const { posix } = require("node:path")
const sharp = require("sharp")
const yml = require("yaml")
const {
  IMGSRCPATH,
  IMGDESTPATH,
  THUMBPATH,
  DISTPATH,
  SRCPATH
} = require("./config.js")

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

async function* parseImages() {
  const files = await getFiles(IMGSRCPATH)
  const filtered = files.filter(item =>
    item.isFile() && item.name.match(/\.(?:png|jpg|jpeg|gif|webm|tif)$/)
      ? true
      : false
  )
  for (const x of filtered) {
    const srcFile = join(IMGSRCPATH, x.name)
    const { name } = parse(srcFile)
    const distThumbFile = normalize(join(THUMBPATH, `${name}.thumb.png`))
    const distImgFile = normalize(join(IMGDESTPATH, `${name}.jpg`))
    const metaFile = normalize(join(IMGSRCPATH, `${name}.yml`))
    const ymlData = await readText(metaFile)
    Object.assign(data, yml.parse(ymlData))
    log(`data: ${JSON.stringify(data)}`, 3)
    yield {
      srcFile,
      name,
      distImgFile,
      distThumbFile,
      fullUrl: posix.relative(DISTPATH, distImgFile),
      thumbUrl: posix.relative(DISTPATH, distThumbFile),
      metaFile: normalize(join(IMGSRCPATH, `${name}.yml`))
    }
  }
}

function getAsyncInvoker(task) {
  const name = task.name
  return (...params) =>
    new Promise((res, rej) => {
      task.addListener("complete", () => {
        log(3, `Task ${task.name} completed.`)
        res()
      })
      task.addListener("error", err => {
        rej(`Task ${name} failed with the following error: ${err}`)
      })
      task.invoke.bind(task)(...params)
    })
}

async function processCss(from, to) {
  const postcss = require("postcss")
  const rawpostcss = await readText(from)
  log(`Processing ${from}`, 2)
  const { map, css } = await postcss().process(rawpostcss, { from, to })
  log(`Writing ${to}`, 2)
  await writeText(to, css)
  if (map) {
    log(`Writing ${to}.map`, 2)
    await writeText(`${to}.map`, map.toString())
  }
}

class PageData {
  constructor(fileName) {
    this.fileName = fileName
    this.data = []
    this.cached = false
  }
  async hydrate() {
    if (!this.cached) {
      this.data = []
      try {
        let data = JSON.parse(await readText(this.fileName))
        if (!Array.isArray(data)) {
          throw new Error("Invalid cache data")
        }
        this.data = data
        this.cached = true
        log(`pageData hydrated from cache file ${this.fileName}`, 2)
        return
      } catch (err) {
        log(err, 2)
      }
      for await (const i of parseImages()) {
        this.add(i)
      }
      log(`pageData populated. Writing to file.`, 2)
      await this.persistToFile()
    }
  }
  add(data) {
    this.data.push(data)
  }
  async persistToFile() {
    return await writeText(this.fileName, JSON.stringify(this.data))
  }
  async *getFiles() {
    for (let i = 0; i < this.data.length; i++) {
      yield this.data[i]
    }
  }
}

module.exports = {
  getAsyncInvoker,
  parseImages,
  processCss,
  makeThumb,
  PageData
}
