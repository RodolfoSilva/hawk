/**
 * Módulo de filtros do Hawk
 */
'use strict';

const fs = require("fs");
const glob = require("glob");
const path = require("path");
const cheerio = require("cheerio");
const express = require('express');
const request = require("superagent");
const absoluteurl = require("superagent-absoluteurl");
const config = require("../config");
const _ = require("lodash");


const router = express.Router();


const BASE_PATH = config.get('BASE_PATH');
const BASE_PATH_FILTERS = config.get('BASE_PATH_FILTERS');
const PATH_PATTERN_FILTERS = BASE_PATH_FILTERS + "/**/*.json";


// Rotas de filtros
router.route("/filters")
  .get(function (req, res) {
    glob(PATH_PATTERN_FILTERS, function (er, files) {
      var filters = [];

      for (var key in files) {
        var filter = {
          name: path.basename(files[key], '.json'),
          path: files[key]
        };
        var filterJSON = require(files[key]);
        var filterStats = fs.statSync(files[key]);

        for (var key in filterStats) {
          filter[key] = filterStats[key];
        }

        for(var key in filterJSON) {
            filter[key] = filterJSON[key];
        }

        filters.push(filter);
      }

      res.json(filters);
    });
  })
  .post(function (req, res) {
    var filter_file_name = BASE_PATH_FILTERS + "/" + req.body.namespace + ".json";

    fs.writeFile(filter_file_name, JSON.stringify(req.body), 'utf8', function (err) {
      console.log("Hello");
      if (err) {
        return res.json({error: err});
      }
      res.json({status: "ok"});
    });
  });

router.route("/filters/:namespace")
  .get(function (req, res) {
    var filter_file_name = BASE_PATH_FILTERS + "/" + req.params.namespace + ".json";
    var filterJSON = JSON.parse(fs.readFileSync(filter_file_name).toString());
    res.json(filterJSON);
  })
  .delete(function (req, res) {
    var filter_file_name = BASE_PATH_FILTERS + "/" + req.params.namespace + ".json";
    fs.unlink(filter_file_name);
    res.json({status: "ok"});
  });


router.get("/filters/:namespace/test/:url", function (req, res) {
  request.get(req.params.url)
    .set('Accept-Encoding', 'gzip')
    .redirects(1)
    .on('error', function (err, page) {
      res.json({ error: err });
    })
    .end(function (err, page) {
      if (page.status == 200) {
        var filter_file_name = BASE_PATH_FILTERS + "/" + req.params.namespace + ".json";
        var $ = cheerio.load(page.text);
        var filterJSON = JSON.parse(fs.readFileSync(filter_file_name).toString());
        var extractor = require(BASE_PATH + "/extractor.js")($, filterJSON, true);

        res.json(extractor);
      }
    });
});


module.exports = router;
