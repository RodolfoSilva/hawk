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


function __redirect(to) {
  return (req, res) => res.redirect(to);
}


// Redirecionamentos para o client
router.get("/filters", __redirect("/#filters"));
router.get("/filters-add", __redirect("/#filters-add"));
router.get("/filters-edit", __redirect("/#filters"));


// Rotas de filtros
router.get("/filters-list", function (req, res) {
  glob(PATH_PATTERN_FILTERS, function (err, files) {
    var filters = [];

    for (var key in files) {
      filters.push({
        name: path.basename(files[key], '.json'),
        path: files[key]
      });
    }

    res.json(filters);
  });
});


router.get("/data-filters", function (req, res) {
  glob(PATH_PATTERN_FILTERS, function (er, files) {
    var filters = [];

    for (var key in files) {
      var filter = {path: files[key]};
      var filterJSON = JSON.parse(fs.readFileSync(files[key]).toString());
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
});


router.get("/data-filter", function (req, res) {
  var filterJSON = JSON.parse(fs.readFileSync(req.query.path).toString());
  res.json(filterJSON);
});


router.post("/filter-save", function (req, res) {
  var filter_file_name = BASE_PATH_FILTERS + "/" + req.body.namespace + ".json";

  fs.writeFile(filter_file_name, JSON.stringify(req.body), 'utf8', function (err) {
    if (err) {
      return res.json({error: err});
    }
    res.json({status: "ok"});
  });
});


router.get("/filter-autocomplete", function (req, res) {
  glob(PATH_PATTERN_FILTERS, function (err, files) {
    var extractions = [];

    for(var key in files) {
      var filter = JSON.parse(fs.readFileSync(files[key]));

      for(var key2 in filter.extracts) {
        extractions.push(key2);
      }
    }

    res.json(_.uniq(extractions));
  });
});


router.get("/filter-test", function (req, res) {
  request.get(req.query.url)
    .set('Accept-Encoding', 'gzip')
    .redirects(1)
    .on('error', function (err, page) {
      res.json({ error: err });
    })
    .end(function (err, page) {
      if (page.status == 200) {
        var filter_file_name = BASE_PATH_FILTERS + "/" + req.body.filter + ".json";
        var $ = cheerio.load(page.text);
        var filterJSON = JSON.parse(fs.readFileSync(filter_file_name).toString());
        var extractor = require(BASE_PATH + "/extractor.js")($, filterJSON, true);

        res.json(extractor);
      }
    });
});


router.post("/filter-get", function (req, res) {
  var filter_file_name = BASE_PATH_FILTERS + "/" + req.body.namespace + ".json";
  var filter = fs.readFileSync(filter_file_name);
  res.send(filter);
});


/*
router.post("/filter-remove", function(req, res){});
*/


router.get("/getpage", function (req, res) {
  request.get(req.query.url)
    .set('Accept-Encoding', 'gzip')
    .redirects(1)
    .on('error', function (err) {
      res.send(err);
    })
    .end(function (err, page) {
      if (page.status == 200) {
        page = absoluteurl(page);

        if (req.query.insp == "true" || req.query.insp == true) {
          var $ = cheerio.load(page.text);

          $("head").append('<link rel="stylesheet" href="./css/font-awesome.min.css" />');
          $("head").append('<link rel="stylesheet" href="./css/dom_insp.css" />');
          $("body").append('<script type="text/javascript">window.onerror = function () { return true; };</script>');
          $("body").append('<script type="text/javascript" src="./js/plugins/jquery-2.2.0.min.js"></script>');
          $("body").append('<script type="text/javascript" src="./js/plugins/bootstrap.min.js"></script>');
          $("body").append('<script type="text/javascript" src="./js/plugins/jquery.balloon.js"></script>');
          $("body").append('<script type="text/javascript" src="./js/dom_insp.js"></script>');
          $("body").html('<div id="DomInsp_loading" class="DomInsp_loading" style="position: fixed; font-size: 100px; padding: 20px; background-color: #FFF; top: 0px; left: 0px; right: 0px; bottom: 0px; opacity: 0.5; z-index:999999;">Carregando...</div><div class="DomInspPage">'+$("body").html()+'</div>\
                           <div class="DomInsp_dropMenu">\
                             <ul>\
                                 <li class="DomInspCopyvalue"><a href="javascript:DomInspCopyvalue();"><i class="fa fa-align-left"></i> &nbsp; Copiar</a></li>\
                                 <!--<li class="DomInspIngored"><a href="javascript:DomInspIngored();"><i class="fa fa-ban"></i> &nbsp; Ignorar</a></li>-->\
                                 <li class="DomInspGo"><a href="javascript:DomInspGo();"><i class="fa fa-arrow-right"></i> &nbsp; Ir ao link</a></li>\
                             </ul>\
                         </div>');

          res.send(_.trim($.html()));
        } else {
          res.send(page.text);
        }
    } else {
      res.send('<html><head><title>Error: '+req.query.url+'</title><link type="text/css" rel="stylesheet" href="css/bootstrap.min.css" /></head><body><pre>'+JSON.stringify(page)+'</pre></body></html>');
    }
  });
});


module.exports = router;
