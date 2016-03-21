/**
 * Módulo de filtros do Hawk
 */

var fs = require("fs"),
    url = require("url"),
    glob = require("glob"),
    path = require("path"),
    request = require("superagent"),
    absoluteurl = require("superagent-absoluteurl"),
    glob = require('glob'),
    cheerio = require("cheerio");

module.exports = function(dirname, settings, app, io, mongodb, debug){
    app.get("/filters", function(req, res){ res.redirect("/#filters"); });
    app.get("/filters-add", function(req, res){ res.redirect("/#filters-add"); });
    app.get("/filters-edit", function(req, res){ res.redirect("/#filters"); });
        
    app.get("/filters-list", function(req, res){
        glob(dirname+"/filters/**/*.json", function (er, files) { 
            var filters = [];
            
            for(var key in files)
                filters.push({
                    name: path.basename(files[key], '.json'),
                    path: files[key]
                });
            
            res.send(JSON.stringify(filters));
        });
    });
            
    app.get("/data-filters", function(req, res){
        glob(dirname+"/filters/**/*.json", function (er, files) {
            var filters = [];
            
            for(var key in files){
                var filter = {path: files[key]};
                var filterJSON = JSON.parse(fs.readFileSync(files[key]).toString());
                var filterStats = fs.statSync(files[key]);
                
                for(var key in filterStats)
                    filter[key] = filterStats[key];
                
                for(var key in filterJSON)
                    filter[key] = filterJSON[key];
                
                filters.push(filter);
            }
                                    
            res.send(JSON.stringify(filters));
        });
    });
    
    app.get("/data-filter", function(req, res){
        var filterJSON = JSON.parse(fs.readFileSync(req.query.path).toString());
        res.send(JSON.stringify(filterJSON));
    });
    
    app.post("/filter-save", function(req, res){
        fs.writeFile(dirname+"/filters/"+req.body.namespace+".json", JSON.stringify(req.body), 'utf8', function(err){
            if(err)
                res.send(JSON.stringify({error: err}));
            else
                res.send(JSON.stringify({status: "ok"}));
        });
    });
    
    app.get("/filter-autocomplete", function(req, res){
        glob(dirname+"/filters/**/*.json", function(err, files){
            var extractions = [];
            
            for(var key in files){
                var filter = JSON.parse(fs.readFileSync(files[key]));
                    
                for(var key2 in filter.extracts)
                    extractions.push(key2);
            }
                                
            res.send(JSON.stringify(array_unique(extractions)));
        });
    });
    
    app.get("/filter-test", function(req, res){
        request.get(req.query.url)
        .set('Accept-Encoding', 'gzip')
        .redirects(1)
        .on('error', function(err, page){
            res.send(JSON.stringify({error: err}));
        })
        .end(function(err, page){
             if(page.status == 200){
                var $ = cheerio.load(page.text);
                var filterJSON = JSON.parse(fs.readFileSync(dirname+"/filters/"+req.query.filter+".json").toString());
                var extractor = require(dirname+'/extractor.js')($, filterJSON, true);
                res.send(JSON.stringify(extractor));
             }
        });      
    });
    
    app.post("/filter-get", function(req, res){
        var filter = fs.readFileSync(dirname+"/filters/"+req.body.namespace+".json");
        res.send(filter);
    });
            
    /*app.post("/filter-remove", function(req, res){
        fs.
    });*/
    
    app.get("/getpage", function(req, res){
        request.get(req.query.url)
        .set('Accept-Encoding', 'gzip')
        .redirects(1)
        .on('error', function(err, res){
            res.send(err);
        })
        .end(function(err, page){
             if(page.status == 200){
                 page = absoluteurl(page);
         
                if(req.query.insp == "true" || req.query.insp == true){
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

                    res.send(trim($.html()));
                }
                else{
                    res.send(page.text);
                }
             }
             else{
                 res.send('<html><head><title>Error: '+req.query.url+'</title><link type="text/css" rel="stylesheet" href="css/bootstrap.min.css" /></head><body><pre>'+JSON.stringify(page)+'</pre></body></html>');
             }
        });
    });
}; 

function trim(str, charlist) {
  var whitespace, l = 0,
    i = 0;
  str += '';

  if (!charlist) {
    // default list
    whitespace =
      ' \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000';
  } else {
    // preg_quote custom list
    charlist += '';
    whitespace = charlist.replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '$1');
  }

  l = str.length;
  for (i = 0; i < l; i++) {
    if (whitespace.indexOf(str.charAt(i)) === -1) {
      str = str.substring(i);
      break;
    }
  }

  l = str.length;
  for (i = l - 1; i >= 0; i--) {
    if (whitespace.indexOf(str.charAt(i)) === -1) {
      str = str.substring(0, i + 1);
      break;
    }
  }

  return whitespace.indexOf(str.charAt(0)) === -1 ? str : '';
}

function array_unique(inputArr) {
  var key = '',
    tmp_arr2 = {},
    val = '';

  var __array_search = function(needle, haystack) {
    var fkey = '';
    for (fkey in haystack) {
      if (haystack.hasOwnProperty(fkey)) {
        if ((haystack[fkey] + '') === (needle + '')) {
          return fkey;
        }
      }
    }
    return false;
  };

  for (key in inputArr) {
    if (inputArr.hasOwnProperty(key)) {
      val = inputArr[key];
      if (false === __array_search(val, tmp_arr2)) {
        tmp_arr2[key] = val;
      }
    }
  }

  return tmp_arr2;
}