var Express = require("express");
var notes = new Express.Router();
var marked = require("marked");
const fs = require("fs-extra");
const rootDir = require("helper/rootDir");

const NOTES_DIRECTORY = rootDir + "/notes";
let buildTOC = require("./tools/toc");

let TOC = buildTOC(NOTES_DIRECTORY);

const chokidar = require("chokidar");
const config = require("config");

if (config.environment === "development")
  chokidar
    .watch(NOTES_DIRECTORY, { cwd: NOTES_DIRECTORY })
    .on("all", () => (TOC = buildTOC(NOTES_DIRECTORY)));

notes.use(function (req, res, next) {
  res.locals.base = "/about/notes";
  next();
});

notes.param("section", function (req, res, next) {
  res.locals.selected[req.params.section] = "selected";
  res.locals.toc = TOC.map((section) => {
    section.isSelected = req.params.section === section.id ? "selected" : false;
    return section;
  });

  res.locals.section = "/about/notes/" + req.params.section;
  next();
});

notes.param("article", function (req, res, next) {
  res.locals.selected[req.params.article] = "selected";

  next();
});

notes.get("/", function (req, res, next) {
  res.locals.showToc = true;
  res.locals.toc = TOC.map((section) => {
    section.isSelected = false;
    return section;
  });
  res.locals.body = marked(
    fs.readFileSync(NOTES_DIRECTORY + "/README", "utf-8")
  );
  next();
});

notes.get("/:section", function (req, res, next) {
  res.locals.body = marked(
    fs.readFileSync(
      NOTES_DIRECTORY + "/" + req.params.section + "/README",
      "utf-8"
    )
  );

  res.locals.subsections = TOC.filter(
    (section) => section.id === req.params.section
  )[0].items;

  next();
});

notes.get("/:section/:article", function (req, res, next) {
  try {
    res.locals.body = marked(
      fs.readFileSync(
        NOTES_DIRECTORY +
          "/" +
          req.params.section +
          "/" +
          req.params.article +
          ".txt",
        "utf-8"
      )
    );
  } catch (e) {}
  next();
});

notes.get(["/", "/:section/:article", "/:section"], function (req, res, next) {
  // For some reason we couldn't find the file
  if (!res.locals.body) return next();

  res.render("about/notes/layout");
});
module.exports = notes;
