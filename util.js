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

module.exports = {
  checkOrCreateFile,
  copyAsJpeg,
  promisify,
  writeText,
  readText,
  getFiles,
  mkdir,
  log,
  cp,
  rm
}
