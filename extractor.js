/**
 * Extrator do Hawk
 * 
 * @author André Ferreira <andrehrf@gmail.com>
 */

var cheerio = require("cheerio");
    php = require("phpjs");

module.exports = function($, filter, debug){
    debug = (debug) ? debug : false;
    var debug_log = {};
    var extraction = {};
    
    for(var key in filter.extracts){
        var m1 = php.microtime(true);
        var namespace = parse_key(filter.extracts[key].namespace);
        var requered = filter.extracts[key].requered | false;
        var removehtml = filter.extracts[key].removehtml | false;
        var firstelement = filter.extracts[key].firstelement | false;
        var converthtmlentitiesdecode = filter.extracts[key].htmlentitiesdecode | false;
        var removelinebreakandtabs = filter.extracts[key].removelinebreakandtabs | false;
        extraction[namespace] = [];
        
        if($(filter.extracts[key].query).length <= 0 && requered && !debug){
            extraction = null;
            break;
        }
        else if($(filter.extracts[key].query).length <= 0 && requered && debug){
            extraction["error"] = "Requered item "+key+" not valid value";
        }
                        
        (function(key){
            $(filter.extracts[key].query).each(function(){
                switch($(this).prop('tagName')){
                    case "A": value = $(this).html(); break;
                    case "INPUT": value = $(this).val(); break;
                    case "IMG": value = $(this).attr("src"); break;
                    default: value =  $(this).html(); break;
                }
     
                if(value != undefined && value != null && value != NaN){     
                    if(typeof filter.extracts[key].maskregex == "string" && filter.extracts[key].maskregex != "" && filter.extracts[key].maskregex != null){
                        var reg = new RegExp(filter.extracts[key].maskregex, "gmi");

                        if(typeof value == "string"){
                            m = value.match(reg);
                            value = m;
                        }
                        else if(typeof value == "array" || typeof value == "object"){
                            for(var key2 in value){
                                if(typeof value[key2] == "string"){
                                    m = value[key2].match(reg);
                                    value[key2] =  m;
                                }
                                else{
                                    for(var key3 in value[key2]){
                                        if(typeof value[key2][key3] == "string"){
                                            m = value[key2][key3].match(reg);
                                            value[key2][key3] = m;
                                        }
                                    }
                                }
                            }
                        }
                    }  
                    
                    if(value !== null && value !== undefined){
                        switch(filter.extracts[key].type){
                            case "int":    
                                if(typeof value === "object" || typeof value === "array")
                                    value = value[0];

                                value.replace(/(\d{1,})/i, function(){ 
                                    value = parseInt(arguments[1]); 
                                });
                            break;
                            case "float":
                                if(typeof value === "object" || typeof value === "array")
                                    value = value[0];

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
                                value = value.replace(/(,|\.)+/gmi, "");//Removendo . e ,
                                value.replace(/(\d{1,})/i, function(){  
                                    value = arguments[1];
                                    value = (value.substring(0, value.length-2) + "." + value.substring(value.length-2, value.length));
                                    value = parseFloat(value);
                                });

                                if(isNaN(value))
                                    value = null;
                            break;   
                            case "linklist": 
                                value = maplinks(value, filter.extracts[key].linkremovequery); 

                                 if(filter.extracts[key].linkunique && (typeof value == "object" || typeof value == "array"))
                                     value = array_unique(value);                        
                            break;
                            case "link":
                                if(filter.extracts[key].linkremovequery){
                                    var parse = value.split("?");
                                    value = parse[0];
                                }
                            break;
                        }
                    }
                    
                    var m2 = php.microtime(true);
                                        
                    if(removehtml){
                        value = replaceInReturn(value, function(v){
                            return php.strip_tags(v);
                        }); 
                    }
                    
                    if(converthtmlentitiesdecode){
                        value = replaceInReturn(value, function(v){
                            return php.html_entity_decode(v);
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
                    
                    var m3 = php.microtime(true);
                    
                    debug_log[namespace] = {e: m2-m1, f: m3-m2, t: m3-m1}

                    if((typeof value === "object" || typeof value === "number" || typeof value === "string") && value !== null && value !== undefined)
                        if(!firstelement || (extraction[namespace].length <= 0 && firstelement))
                            extraction[namespace].push(value);
                }
            });
        })(key);
    }
    
    
    if(debug){
        var total = 0;
        
        for(var key in debug_log)
            total += debug_log[key].t 
        
        debug_log["total"] = total;
        extraction["debug"] = debug_log;
    }
    
    return extraction;
};

function parse_key(key){
    //key = php.utf8_encode(key);
    key = removerAcentos(key);
    key = key.replace(/(\r\n|\n|\r|\t)/gm, "");//Removendo espaçamentos e tabs
    key = php.html_entity_decode(key);//Removendo HTML Entity
    key = php.strip_tags(key);//Removendo qualquer HTML que possa ter
    key = key.replace(/(,|\.|\(|\))/gmi, "");//Removendo . e ,
    key = key.replace(/(\s|\/|\\)/ig, "-");//Alterando espaços \ e / para -
    key = key.replace(/\u0000/g, "");//Removendo caracter \u0000
    return key.toLowerCase();
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

function getattr(html, atribute){
    var $ = cheerio.load(html);
    return $("*").attr(atribute);
}

function maptable(html){
    html = html.trim();
    var r = {};
    var count = 0;
        
    var $ = cheerio.load(html);
    $("tr").each(function(){
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
    
    //console.log($(html).find("dt").length);
       
    //$(html).find("dl").each(function(){
        var value = [];
         
        /*if($("dt", this).length <= 1){
            var key = ($("dt", this).length > 0) ? $("dt", this).html().trim() : count;

            if(typeof key === "string")
                key = parse_key(key);
            
            if($("dd", this).length > 0){
                $("dd", this).each(function(){
                    value.push($(this).html().trim());
                });
            }     
            
            r[parse_key(key)] = value;
        } 
        else if($("dt", this).length > 1){//Casos que o programador cotoco colocou vários DT no mesmo DL*/
            var keys = [];
            var values = [];
            
            $("dt", html).each(function(){
                keys.push($(this).html().trim());
            });
            
            $("dd", html).each(function(){
                values.push($(this).html().trim());
            });
                                   
            for(var key in keys)
                r[parse_key(keys[key])] = values[key];        
        //}
                
        count++;
    //});
    
    return r;
}

function mapimages(html){
    var r = [];
          
    var $ = cheerio.load(html);
    $("img").each(function(){
        var src = $(this).attr("src");
        
        if(src != null && src != undefined)
            r.push(src);
    });
    
    return r;
}

function maplinks(html, linkremovequery){
    var r = [];
        
    var $ = cheerio.load(html);
    $("a").each(function(){
        var href = $(this).attr("href");
        
        if(linkremovequery){
            var parse = href.split("?");
            href = parse[0];
        }
        
        if(href != null && href != undefined)
            r.push(href);
    });
    
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
            "xe8": "e", "xe9": "e", "xea": "e", "xeb": "e",
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