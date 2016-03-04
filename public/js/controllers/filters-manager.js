/**
 * Filters controller
 */

'use strict';

define(['app', 'jquery', 'bootstrap'], function (app) {
    app.controller("filters-manager", function($scope, $rootScope, $http, $location, ngProgressFactory){
        $scope.progressbar = ngProgressFactory.createInstance();

        $rootScope.data = {
            urlfilter: "",
            urlpriority: "",
            urlignore: "",
            extracts: {}
        };

        var query = $location.search();
        if(query.path != "" && query.path != undefined){
            var time = new Date().getTime();
            $scope.progressbar.start();

            $http({
                method: "GET",
                url: "data-filter?path="+query.path+"&"+time,
            }).then(function(res){
                $scope.progressbar.complete();

                if(res.data.error)
                    $scope.error = res.data.error;
                else 
                    $rootScope.data = res.data;

                if(typeof $rootScope.data.extracts != "object")
                    $rootScope.data.extracts = [];

                var protocol = (res.data.protocol)? res.data.protocol : "http";

                $http({
                    method: "GET",
                    url: "getpage?url="+urlencode(protocol+"://"+res.data.domain)+"&"+time+"&insp=false",
                }).then(function(res){
                    var links = [];

                    res.data.replace(/<a\s.*href=[\'"]?([^\'" >]+)/ig, function(){ 
                        var bruteLink = arguments[1];
                        links.push(bruteLink);       
                    });

                    $rootScope.test.links = links;
                });

                refreshTagsInput($rootScope.data);
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        }
        else{
            setTimeout(function(){
                refreshTagsInput($rootScope.data);
            }, 100);
        }

        //load autocomplete
        $http({
            method: "GET",
            url: "filter-autocomplete",
        }).then(function(res){
            var autocomplete = [];

            for(var key in res.data)
                autocomplete.push(res.data[key]);

            if(res.data.error)
                $scope.error = res.data.error;
            else 
                $rootScope.autocomplete = autocomplete;
        }, function(res){
            $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
        });

        $scope.getdata = function(){
            return $rootScope.data;
        };

        $scope.enviar = function(){
            //$scope.progressbar.start();

            $http({
                method: "POST",
                url: "filter-save",
                data: $rootScope.data
            }).then(function(res){
                //$scope.progressbar.complete();

                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $location.path("/filters");
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };

        $rootScope.changeurl = function(){
            $rootScope.url = $scope.url;
            $rootScope.loadpage($scope.url);
        };

        $rootScope.changeinput = function(url){
            $scope.url = url;
            $scope.$apply();
        };

        $rootScope.loadpage = function(url){
            $scope.progressbar.set(0);
            $scope.progressbar.start();
            var time = new Date().getTime();
            $rootScope.browser.url = "getpage?url="+urlencode(url)+"&"+time+"&insp=true";

            document.getElementById('browser').onload = function() {
                $scope.progressbar.complete();
            };
        };

        $rootScope.parselink = function(url){
            var parseHref = parseUri(url);

            if(parseHref.host == $rootScope.data.domain || parseHref.host == "www."+$rootScope.data.domain){
                url = removerAcentos(url);
                var removehash = url.split("#");//Evitando links que tenham conteúdo após #
                url = removehash[0];     

                var removesearchexception = infilter(url, $rootScope.data.exceptionremovesearch, $rootScope.data.exceptionremovesearchregex);

                if($rootScope.data.removesearch && !removesearchexception){
                    var removequery = url.split("?");//Evitando links que tenham conteúdo após #
                    url = removequery[0];
                }

                var urlfilter = infilter(url, $rootScope.data.urlfilter, $rootScope.data.urlfilterregex);
                var priority = infilter(url, $rootScope.data.urlpriority, $rootScope.data.urlpriorityregex);
                var ignore = infilter(url, $rootScope.data.urlignore, $rootScope.data.urlignoreregex);

                if($rootScope.data.urlfilter == undefined || $rootScope.data.urlfilter == "" || urlfilter){
                    if(!ignore && $rootScope.data.urlignore != undefined){
                        if(!priority)
                            url = patternlink(url, $rootScope.data.urlpatterns, $rootScope.data.urlpatternsonly);

                        if(url != null)
                            return url+"(<span class='green'>Ok</span>)";
                        else
                            return "<span class='red'>Não passa nos padrões de limite de url</span>";
                    }
                    else{
                        return "<span class='red'>Ignorado pelo filtro</span>";
                    }
                }
                else{
                    return "<span class='red'>Não está no filtro de url</span>";
                }            
            }
            else{
                return "<span class='red'>Não é um link do dominio</span>";
            }        
        };

        $rootScope.browser = {url: ""};
    });
    
    app.controller("newextraction", function($scope, $rootScope, ngProgressFactory){
        $rootScope.newe = {};
        $scope.datenow = Date.now();

        var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
        var eventer = window[eventMethod];
        var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

        eventer(messageEvent,function(e) {
            var key = e.message ? "message" : "data";
            var data = e[key];

            if(data.action == "go"){
                $rootScope.$apply();
                $rootScope.loadpage(data.url);
                $rootScope.changeinput(data.url);
            }
            else{
                $rootScope.newe = data;
                $scope.$apply();
                $rootScope.newe.originalpreview = $rootScope.newe.preview;
                $scope.refreshpreview();
                $("#newextraction").modal("show");
            }
        },false);

        $rootScope.editExtraction = function(key){
            if(array_key_exists(key, $rootScope.data.extracts)){
                $rootScope.newe = $rootScope.data.extracts[key];
                openModalExtraction();
            }
        };

        $rootScope.removeExtraction = function(keyRemove){
            var newExtraction = {};

            for(var key in $rootScope.data.extracts){
                if(key != keyRemove)
                    newExtraction[key] = $rootScope.data.extracts[key];
            }

            $rootScope.data.extracts = newExtraction;
        };

        $scope.add = function(){
            $rootScope.data.extracts[$rootScope.newe.namespace] = $rootScope.newe;
            $rootScope.newe = {};
            closeModalExtraction();
        };

        $scope.refreshpreview = function(){
            $rootScope.newe.preview = [];

            for(var key in $rootScope.newe.originalpreview){
                var value = $rootScope.newe.originalpreview[key];

                switch($rootScope.newe.type){
                    case "int": 
                        value.replace(/(\d{1,})/i, function(){ 
                            value = parseInt(arguments[1]); 
                        });
                    break;
                    case "float":
                        value.replace(/(\d{1,}.\d{1,})/i, function(){ 
                            value = parseFloat(arguments[1]); 
                        });
                    break;
                    case "date": value = new Date(value).toDateString(); break;
                    case "time": value = new Date(value).toTimeString(); break;
                    case "datetime": value = new Date(value).toGMTString(); break;
                    case "table": value = maptable(value); break;
                    case "img": value = getattr(value, "src"); break;
                    case "imagegallery": value = mapimages(value); break;
                    case "currency": 
                        switch($rootScope.newe.currencyl10n){
                            case "en": 
                            case "en-gb": 
                                var mask = /[^0-9\.-]+/g; 
                                value = parseFloat(value.replace(mask, "")); 
                            break;
                            case "pt-br": 
                                var mask = /[^0-9\,-]+/g; 
                                value = parseFloat(value.replace(mask, "").replace(",", ".")); 
                            break;
                        }

                        numeral.language($rootScope.newe.currencyl10n);
                        value = numeral(value).format('$0,0.00');
                    break;   
                    case "linklist": 
                        value = maplinks(value, $rootScope.newe.linkremovequery); 

                         if($rootScope.newe.linkunique && (typeof value == "object" || typeof value == "array"))
                             value = array_unique(value);                        
                    break;
                    case "link":
                        if($rootScope.newe.linkremovequery){
                            var parse = value.split("?");
                            value = parse[0];
                        }
                    break;
                }

                var removehtml = (typeof $rootScope.newe.removehtml == "boolean") ? $rootScope.newe.removehtml : false;
                var converthtmlentitiesdecode = (typeof $rootScope.newe.htmlentitiesdecode == "boolean") ? $rootScope.newe.htmlentitiesdecode : false;
                var removelinebreakandtabs = (typeof $rootScope.newe.removelinebreakandtabs == "boolean") ? $rootScope.newe.removelinebreakandtabs : false;

                if(removehtml){
                    value = replaceInReturn(value, function(v){
                        return strip_tags(v);
                    }); 
                }

                if(converthtmlentitiesdecode){
                    value = replaceInReturn(value, function(v){
                        return html_entity_decode(v);
                    });
                }

                if(removelinebreakandtabs){
                    value = replaceInReturn(value, function(v){
                        return v.replace(/(\r\n|\n|\r|\t)/gm, "");
                    });
                }

                //Correção de trim
                value = replaceInReturn(value, function(v){
                    return v.replace(/ +(?= )/g,'');
                });            

                $rootScope.newe.preview[key] = value;                
            }
        };
    });
    
    function openModalExtraction(){
        $("#newextraction").modal("show");
    }

    function closeModalExtraction(){
        $("#newextraction").modal("hide");
    }
    
    function replaceInReturn(value, cb){
        if(typeof value == "string"){
            value = cb(value);
        }
        else if(typeof value == "array" || typeof value == "object"){
            for(var key2 in value){
                if(typeof value[key2] == "string"){
                    value[key2] = cb(value[key2]);
                }
                else{
                    for(var key3 in value[key2])
                        if(typeof value[key2][key3] == "string")
                            value[key2][key3] = cb(value[key2][key3]);
                }
            }
        }

        return value;
    }
    
    function refreshTagsInput(data){      
        var filter = data;

        if($("[data-role='tagsinput']").length > 0){
            $("[data-role='tagsinput']").each(function(){
                 var $element = $(this);
                 $element.tagsinput({trimValue: false, confirmKeys: [13, 32]});
                 var id = $element.attr("id");

                 if(array_key_exists(id, filter)){
                    if(filter[id] != ""){
                        var dataFilter = filter[id].split(",");

                        if(typeof dataFilter == "object")
                            for(var key in dataFilter)
                                $element.tagsinput('add', dataFilter[key]);
                    }
                 }
            });
        }
    }
    
    function parse_key(key){
        key = utf8_encode(key);
        key = removerAcentos(key);
        key = key.replace(/(\r\n|\n|\r|\t)/gm, "");//Removendo espaçamentos e tabs
        key = html_entity_decode(key);//Removendo HTML Entity
        key = strip_tags(key);//Removendo qualquer HTML que possa ter
        key = key.replace(/(,|\.|\(|\))/gmi, "");//Removendo . e ,
        key = key.replace(/(\s|\/|\\)/ig, "-");//Alterando espaços \ e / para -
        key = key.replace(/\u0000/g, "");//Removendo caracter \u0000
        return key.toLowerCase();
    }

    function getattr(html, atribute){
        return $(html).attr(atribute);
    }

    function maptable(html){
        html = html.trim();
        var r = {};
        var count = 0;

        $(html).find("tr").each(function(){
            var value = [];
            var key = ($("th", $(this)).length > 0) ? $("th", this).html().trim() : count;

            if(typeof key === "string")
                key = parse_key(key);

            if($("td", this).length > 0){
                $("td", this).each(function(){
                    value.push($(this).html().trim());
                });
            }

            r[key] = value;
            count++;
        });

        $(html).find("dl").each(function(){
            var value = [];

            //console.log($("dt", this).length);

            if($("dt", this).length <= 1){
                var key = ($("dt", this).length > 0) ? $("dt", this).html().trim() : count;

                if(typeof key === "string")
                    key = parse_key(key);

                if($("dd", this).length > 0){
                    $("dd", this).each(function(){
                        value.push($(this).html().trim());
                    });
                }     

                r[key] = value;
            } 
            else if($("dt", this).length > 1){//Casos que o programador cotoco colocou vários DT no mesmo DL
                var keys = [];
                var values = [];

                $("dt", this).each(function(){
                    keys.push($(this).html().trim());
                });

                $("dd", this).each(function(){
                    values.push($(this).html().trim());
                });

                for(var key in keys){
                    r[parse_key(keys[key])] = values[key];
                }            
            }

            count++;
        });

        return r;
    }

    function mapimages(html){
        var r = [];

        $(html).find("img").each(function(){
            r.push($(this).attr("src"));
        });

        return r;
    }

    function maplinks(html, linkremovequery){
        var r = [];

        $(html).find("a").each(function(){
            var href = $(this).attr("href");

            if(linkremovequery){
                var parse = href.split("?");
                href = parse[0];
            }

            r.push(href);
        });

        return r;
    }

    /**
     * @see  http://phpjs.org/functions/urlencode/
     */
    function urlencode(str) {
        str = (str + '').toString();

        return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A')
        .replace(/%20/g, '+');
    }

    /**
     * @see http://phpjs.org/functions/strip_tags/
     */
    function strip_tags(input, allowed) {
      allowed = (((allowed || '') + '')
        .toLowerCase()
        .match(/<[a-z][a-z0-9]*>/g) || [])
        .join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
      var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
      return input.replace(commentsAndPhpTags, '')
        .replace(tags, function($0, $1) {
          return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
        });
    }

    /**
     * @see http://phpjs.org/functions/html_entity_decode/
     */
    function html_entity_decode(string, quote_style) {
      var hash_map = {},
        symbol = '',
        tmp_str = '',
        entity = '';
      tmp_str = string.toString();

      if (false === (hash_map = get_html_translation_table('HTML_ENTITIES', quote_style))) {
        return false;
      }

      // fix &amp; problem
      // http://phpjs.org/functions/get_html_translation_table:416#comment_97660
      delete(hash_map['&']);
      hash_map['&'] = '&amp;';

      for (symbol in hash_map) {
        entity = hash_map[symbol];
        tmp_str = tmp_str.split(entity)
          .join(symbol);
      }
      tmp_str = tmp_str.split('&#039;')
        .join("'");

      return tmp_str;
    }

    /**
     * @see http://phpjs.org/functions/get_html_translation_table/
     */
    function get_html_translation_table(table, quote_style) {
      var entities = {},
        hash_map = {},
        decimal;
      var constMappingTable = {},
        constMappingQuoteStyle = {};
      var useTable = {},
        useQuoteStyle = {};

      // Translate arguments
      constMappingTable[0] = 'HTML_SPECIALCHARS';
      constMappingTable[1] = 'HTML_ENTITIES';
      constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
      constMappingQuoteStyle[2] = 'ENT_COMPAT';
      constMappingQuoteStyle[3] = 'ENT_QUOTES';

      useTable = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
      useQuoteStyle = !isNaN(quote_style) ? constMappingQuoteStyle[quote_style] : quote_style ? quote_style.toUpperCase() :
        'ENT_COMPAT';

      if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
        throw new Error('Table: ' + useTable + ' not supported');
        // return false;
      }

      entities['38'] = '&amp;';
      if (useTable === 'HTML_ENTITIES') {
        entities['160'] = '&nbsp;';
        entities['161'] = '&iexcl;';
        entities['162'] = '&cent;';
        entities['163'] = '&pound;';
        entities['164'] = '&curren;';
        entities['165'] = '&yen;';
        entities['166'] = '&brvbar;';
        entities['167'] = '&sect;';
        entities['168'] = '&uml;';
        entities['169'] = '&copy;';
        entities['170'] = '&ordf;';
        entities['171'] = '&laquo;';
        entities['172'] = '&not;';
        entities['173'] = '&shy;';
        entities['174'] = '&reg;';
        entities['175'] = '&macr;';
        entities['176'] = '&deg;';
        entities['177'] = '&plusmn;';
        entities['178'] = '&sup2;';
        entities['179'] = '&sup3;';
        entities['180'] = '&acute;';
        entities['181'] = '&micro;';
        entities['182'] = '&para;';
        entities['183'] = '&middot;';
        entities['184'] = '&cedil;';
        entities['185'] = '&sup1;';
        entities['186'] = '&ordm;';
        entities['187'] = '&raquo;';
        entities['188'] = '&frac14;';
        entities['189'] = '&frac12;';
        entities['190'] = '&frac34;';
        entities['191'] = '&iquest;';
        entities['192'] = '&Agrave;';
        entities['193'] = '&Aacute;';
        entities['194'] = '&Acirc;';
        entities['195'] = '&Atilde;';
        entities['196'] = '&Auml;';
        entities['197'] = '&Aring;';
        entities['198'] = '&AElig;';
        entities['199'] = '&Ccedil;';
        entities['200'] = '&Egrave;';
        entities['201'] = '&Eacute;';
        entities['202'] = '&Ecirc;';
        entities['203'] = '&Euml;';
        entities['204'] = '&Igrave;';
        entities['205'] = '&Iacute;';
        entities['206'] = '&Icirc;';
        entities['207'] = '&Iuml;';
        entities['208'] = '&ETH;';
        entities['209'] = '&Ntilde;';
        entities['210'] = '&Ograve;';
        entities['211'] = '&Oacute;';
        entities['212'] = '&Ocirc;';
        entities['213'] = '&Otilde;';
        entities['214'] = '&Ouml;';
        entities['215'] = '&times;';
        entities['216'] = '&Oslash;';
        entities['217'] = '&Ugrave;';
        entities['218'] = '&Uacute;';
        entities['219'] = '&Ucirc;';
        entities['220'] = '&Uuml;';
        entities['221'] = '&Yacute;';
        entities['222'] = '&THORN;';
        entities['223'] = '&szlig;';
        entities['224'] = '&agrave;';
        entities['225'] = '&aacute;';
        entities['226'] = '&acirc;';
        entities['227'] = '&atilde;';
        entities['228'] = '&auml;';
        entities['229'] = '&aring;';
        entities['230'] = '&aelig;';
        entities['231'] = '&ccedil;';
        entities['232'] = '&egrave;';
        entities['233'] = '&eacute;';
        entities['234'] = '&ecirc;';
        entities['235'] = '&euml;';
        entities['236'] = '&igrave;';
        entities['237'] = '&iacute;';
        entities['238'] = '&icirc;';
        entities['239'] = '&iuml;';
        entities['240'] = '&eth;';
        entities['241'] = '&ntilde;';
        entities['242'] = '&ograve;';
        entities['243'] = '&oacute;';
        entities['244'] = '&ocirc;';
        entities['245'] = '&otilde;';
        entities['246'] = '&ouml;';
        entities['247'] = '&divide;';
        entities['248'] = '&oslash;';
        entities['249'] = '&ugrave;';
        entities['250'] = '&uacute;';
        entities['251'] = '&ucirc;';
        entities['252'] = '&uuml;';
        entities['253'] = '&yacute;';
        entities['254'] = '&thorn;';
        entities['255'] = '&yuml;';
      }

      if (useQuoteStyle !== 'ENT_NOQUOTES') {
        entities['34'] = '&quot;';
      }
      if (useQuoteStyle === 'ENT_QUOTES') {
        entities['39'] = '&#39;';
      }
      entities['60'] = '&lt;';
      entities['62'] = '&gt;';

      // ascii decimals to real symbols
      for (decimal in entities) {
        if (entities.hasOwnProperty(decimal)) {
          hash_map[String.fromCharCode(decimal)] = entities[decimal];
        }
      }

      return hash_map;
    }

    /**
     * @see http://phpjs.org/functions/array_unique/
     */
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

    /**
     * @see http://phpjs.org/functions/array_key_exists/
     */
    function array_key_exists(key, search) {
      if (!search || (search.constructor !== Array && search.constructor !== Object)) {
        return false;
      }

      return key in search;
    }


    /**
     * @http://blog.stevenlevithan.com/archives/parseuri
     */
    function parseUri (str) {
            var	o   = parseUri.options,
                    m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
                    uri = {},
                    i   = 14;

            while (i--) uri[o.key[i]] = m[i] || "";

            uri[o.q.name] = {};
            uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
                    if ($1) uri[o.q.name][$1] = $2;
            });

            return uri;
    };

    parseUri.options = {
            strictMode: false,
            key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
            q:   {
                    name:   "queryKey",
                    parser: /(?:^|&)([^&=]*)=?([^&]*)/g
            },
            parser: {
                    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
                    loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
            }
    };

    function infilter(url, filtersStr, isRegex){
        isRegex = (typeof isRegex == "boolean") ? isRegex : false;

        if(typeof url == "string" && url != "" &&  typeof filtersStr == "string" && filtersStr != ""){
            var filtersArr = filtersStr.split(",");

            if(filtersArr.length > 0){
                for(var key in filtersArr){
                    var filter = filtersArr[key];

                    if(isRegex){
                        var regex = new RegExp(filter, "img");

                        if(regex.test(url)){
                            return true;
                            break;
                        }
                    }
                    else{
                        if(url.search(filter) != -1){
                            return true;
                            break;
                        }
                    }
                }
            }

            return false;
        }
        else{
            return false;
        }
    }

    function patternlink(link, patterns, deleteextra){
        var r = null;
        deleteextra = (deleteextra) ? deleteextra : false;

        if(typeof link == "string" && link != "" &&  typeof patterns == "string" && patterns != ""){
            var patternsArr = patterns.split(",");

            if(patternsArr.length > 0){
                for(var key in patternsArr){
                    var regex = new RegExp(patternsArr[key], "img");

                    if(regex.test(link)){
                        if(deleteextra){
                            link.replace(regex, function(){
                                r = arguments[1];
                            });
                        }
                        else{
                            r = link;
                        }

                        break;
                    }
                }
            }
        }
        else{
            r = link;
        }

        return r;
    }

    /**
     * @see https://gist.github.com/marioluan/6923123
     * @see http://www.ogenial.com.br/javascript-funcao-remover-acentos
     */
    function removerAcentos( strToReplace ) {
        strToReplace =  strToReplace.replace(/&#(\w+);/gi, function(match, dec){
            var mask = {
                "xe0": "a", "xe1": "a", "xe2": "a", "xe3": "a", "xe4": "a", "xe5": "a", "xe6": "a",
                "xe8": "e", "xe9": "e", "xeA": "e", "xeB": "e",
                "xec": "i", "xed": "i", "xee": "i", "xef": "i",
                "xf2": "o", "xf3": "o", "xf4": "o", "xf5": "o", "xf6": "o",
                "xf9": "u", "xfa": "u", "xfb": "u", "xfc": "u",
                "xe7": "c",
                "xf1": "n"
            }

            return (mask[dec.toLowerCase()] != undefined && mask[dec.toLowerCase()] != "undefined") ? mask[dec.toLowerCase()] : "&"+dec+";";
        });    

        return strToReplace;
    }

    /**
     * @see http://phpjs.org/functions/utf8_encode/
     */
    function utf8_encode(argString) {
      if (argString === null || typeof argString === 'undefined') {
        return '';
      }

      var string = (argString + ''); // .replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      var utftext = '',
        start, end, stringl = 0;

      start = end = 0;
      stringl = string.length;
      for (var n = 0; n < stringl; n++) {
        var c1 = string.charCodeAt(n);
        var enc = null;

        if (c1 < 128) {
          end++;
        } else if (c1 > 127 && c1 < 2048) {
          enc = String.fromCharCode(
            (c1 >> 6) | 192, (c1 & 63) | 128
          );
        } else if ((c1 & 0xF800) != 0xD800) {
          enc = String.fromCharCode(
            (c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
          );
        } else { // surrogate pairs
          if ((c1 & 0xFC00) != 0xD800) {
            throw new RangeError('Unmatched trail surrogate at ' + n);
          }
          var c2 = string.charCodeAt(++n);
          if ((c2 & 0xFC00) != 0xDC00) {
            throw new RangeError('Unmatched lead surrogate at ' + (n - 1));
          }
          c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000;
          enc = String.fromCharCode(
            (c1 >> 18) | 240, ((c1 >> 12) & 63) | 128, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
          );
        }
        if (enc !== null) {
          if (end > start) {
            utftext += string.slice(start, end);
          }
          utftext += enc;
          start = end = n + 1;
        }
      }

      if (end > start) {
        utftext += string.slice(start, stringl);
      }

      return utftext;
    }
});