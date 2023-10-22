const { access, readdir } = require("fs").promises
const { writeFile, readFile } = require("fs").promises
const { Buffer } = require("buffer")

const sharp = require("sharp")
const fs = require("fs")

const mkdir = promisify(fs.mkdir, { recursive: true })
const cp = promisify(fs.copyFile)
const rm = promisify(fs.rm, { force: true, recursive: true })

function promisify(fn, opts = null) {
  return (...p) =>
    new Promise((res, rej) =>
      opts === null
        ? fn(...p, (e = false, r = true) => (e ? rej(e) : res(r)))
        : fn(...p, opts, (e = false, r = true) => (e ? rej(e) : res(r)))
    )
}

function getAsyncInvoker(task) {
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

function log(msg, verbosity = 1) {
  if (process.env.VERBOSE >= verbosity) {
    console.log(msg)
  }
}

async function getFiles(directoryPath) {
  try {
    return await readdir(directoryPath, { withFileTypes: true })
  } catch (err) {
    console.error(err)
  }
}

async function writeText(file, text) {
  log(`Writing ${file}`, 1)
  const data = new Uint8Array(Buffer.from(text))
  return await writeFile(file, data)
}

async function readText(file) {
  log(`Reading ${file}`, 1)
  return await readFile(file, "utf8")
}

async function copyAsJpeg(file, destination) {
  log(`Copying ${file} to ${destination}`, 2)
  return await sharp(file).jpeg({ mozjpeg: true }).toFile(destination)
}

async function checkOrCreateFile(filePath, text = "") {
  try {
    log(`Checking if exists: ${filePath}`, 2)
    await access(filePath, fs.constants.F_OK)
    log(`...exists`, 3)
    return true
  } catch (err) {
    log(`...not exists, creating.`, 3)
    await writeText(filePath, text)
    return false
  }
}

class PageData {
  constructor(fileName) {
    this.fileName = fileName
    this.data = []
    this.cached = false
    if (checkOrCreateFile(this.fileName, JSON.stringify(this.data))) {
      this.data = JSON.parse(readText(this.fileName))
      this.cached = true
    }
  }
  add(data) {
    this.data.push(data)
  }
  async persistToFile() {
    return await writeText(this.fileName, JSON.stringify(this.data))
  }
  async *[Symbol.iterator]() {
    for (let i = 0; i < this.data.length; i++) {
      yield this.data[i]
    }
  }
}

async function processCss(from, to) {
  const autoprefixer = require("autoprefixer")
  const postcss = require("postcss")
  const postcssNested = require("postcss-nested")
  const rawpostcss = await readText(from)
  log(`Processing ${from}`, 2)
  const { map, css } = await postcss().process(
    rawpostcss,
    { from, to }
  )
  log(`Writing ${to}`, 2)
  await writeText(to, css)
  if (map) {
    log(`Writing ${to}.map`, 2)
    await writeText(`${to}.map`, map.toString())
  }
}

module.exports = {
  checkOrCreateFile,
  getAsyncInvoker,
  processCss,
  copyAsJpeg,
  promisify,
  writeText,
  readText,
  getFiles,
  PageData,
  mkdir,
  log,
  cp,
  rm
}
