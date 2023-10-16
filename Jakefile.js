require("dotenv/config")
const {
  writeText,
  readText,
  rm,
  cp,
  mkdir,
  getFiles,
  checkOrCreateFile,
  log
} = require("./util.js")
const { parseImages, processImages } = require("./gallery.js")
const {
  DISTPATH,
  IMGDESTPATH,
  IMGSRCPATH,
  TEMPLATEPATH,
  THUMBPATH,
  STATICPATH
} = require("./config.js")
const { task, directory, desc, exec, Task } = require("jake")
const { join } = require("path")
const path = require("path")
const pug = require("pug")

desc("clean folders")
task("clean", async function () {
  await rm(DISTPATH)
  log(`cleaned ${DISTPATH}`, 1)

  mkdir(DISTPATH)
  log(`created ${DISTPATH}`, 2)

  mkdir(IMGDESTPATH)
  log(`created ${IMGDESTPATH}`, 2)

  mkdir(THUMBPATH)
  log(`created ${THUMBPATH}`, 2)
})

desc("run tests")
task("test", async function () {
  exec("jasmine --config=damnl/test/support/jasmine.json")
})

desc("process images")
task("convert", async function () {
  const jsonData = await processImages(IMGSRCPATH, IMGDESTPATH, THUMBPATH)
  return jsonData
})

desc("Generate blank metadata files")
task("gen-meta", async function () {
  const defaultMeta = await readText(join(TEMPLATEPATH, "default.yml"))
  const imgfiles = await getFiles(IMGSRCPATH)
  let c = 0
  for await (let i of parseImages(
    imgfiles,
    IMGSRCPATH,
    IMGDESTPATH,
    THUMBPATH
  )) {
    // see if a metatdata file exists for the image with the same basename
    const result = await checkOrCreateFile(i.metaFile, defaultMeta)
    if (result) {
      log(`${i.metaFile} exists`, 2)
    } else {
      c++
      log(`${i.metaFile} created`, 2)
    }
  }
  log(`generated ${c} metafiles`)
})

desc("remove metadata files")
task("rm-meta", async function () {
  const imgfiles = await getFiles(IMGSRCPATH)
  let c = 0
  for await (let i of parseImages(
    imgfiles,
    IMGSRCPATH,
    IMGDESTPATH,
    THUMBPATH
  )) {
    // see if a metatdata file exists for the image with the same basename
    const result = await rm(i.metaFile)
    if (result) {
      c++
      log(`${i.metaFile} removed`, 2)
    } else {
      log(`${i.metaFile} does not exist`, 2)
    }
  }
  log(`removed ${c} metafiles`)
})

desc("Process pug templates")
task("templates", async function (pageData) {
  log(`processing templates`, 1)
  log (`pageData :\n ${pageData}`, 3)
  const outputPath = path.normalize(path.join(DISTPATH, "index.html"))
  const html = pug.renderFile(join("src", "templates", "index.pug"), {
    data: pageData,
    basedir: TEMPLATEPATH
  })
  await writeText(outputPath, html)
})

desc("Copy static files")
task("static", async function () {
  log(`copying static files`, 1)
  // await cp(join(SRC, `index.html`), join(DISTPATH, `index.html`))
  await cp(join(STATICPATH, `robots.txt`), join(DISTPATH, `robots.txt`))
  await cp(join(STATICPATH, `default.png`), join(DISTPATH, `default.png`))
})

desc("Full build")
task("build", async function () {
  await Task["clean"].invoke()
  const jsonData = await Task["convert"].invoke()
  await Task["templates"].invoke(jsonData)
})
