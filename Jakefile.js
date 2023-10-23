require("dotenv/config")
const {
  checkOrCreateFile,
  copyAsJpeg,
  processCss,
  writeText,
  readText,
  mkdir,
  log,
  rm,
  cp,
} = require("./util.js")
const {
  getAsyncInvoker,
  parseImages,
  makeThumb,
  PageData
} = require("./gallery.js")
const {
  TEMPLATEPATH,
  IMGDESTPATH,
  IMGSRCPATH,
  STATICPATH,
  THUMBPATH,
  DISTPATH,
} = require("./config.js")
const { task, directory, desc, exec, Task } = require("jake")
const { join } = require("path")
const path = require("path")
const pug = require("pug")

desc("clean folders")
task("clean", async function () {
  try {
    await rm(DISTPATH)
    log(`cleaned ${DISTPATH}`, 1)

    await mkdir(DISTPATH)
    log(`created ${DISTPATH}`, 2)

    await mkdir(IMGDESTPATH)
    log(`created ${IMGDESTPATH}`, 2)

    await mkdir(THUMBPATH)
    log(`created ${THUMBPATH}`, 2)
  } catch (err) {
    log("Could not clean: " + err, 1)
  }
})

desc("run tests")
task("test", async function () {
  exec("jasmine --config=damnl/test/support/jasmine.json")
})

desc("Generate blank metadata files")
task("gen-meta", async function () {
  const defaultMeta = await readText(join(TEMPLATEPATH, "default.yml"))
  let c = 0
  for await (let i of parseImages()) {
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
  let c = 0
  for await (let i of parseImages()) {
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
  const outputPath = path.normalize(path.join(DISTPATH, "index.html"))
  const html = pug.renderFile(join("src", "templates", "index.pug"), {
    data: { meta, pageData },
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

desc("Convert images")
task("images", async function (pageData) {
  log(`creating thumbs and moving images`, 2)
  let promises = []
  for await (const d of pageData.getFiles()) {
    promises.push(makeThumb(d.srcFile, d.distThumbFile))
    promises.push(copyAsJpeg(d.srcFile, d.distImgFile))
  }
  await Promise.all(promises)
})

desc("Full build")
task("build", async function () {
  try {
    const clean = getAsyncInvoker(Task["clean"])
    const templates = getAsyncInvoker(Task["templates"])
    const static = getAsyncInvoker(Task["static"])
    const images = getAsyncInvoker(Task["images"])
    await clean()
    await mkdir(join("./", ".cache"))
    let pageData = new PageData(join("./", ".cache", "pageData.json"))
    await pageData.hydrate()
    await images(pageData)
    await templates(pageData)
    await processCss(join(SRCPATH, "style.css"), join(DISTPATH, "style.css"))
    await static()
  } catch (err) {
    log("Could not finish: " + err, 1)
  }
})
