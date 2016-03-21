/**
 * Mapeador do Hawk
 * 
 * O mapeador é o serviço responsável por percorer todo website de
 * acordo com os parâmetros do filtro, coletando links, e enviando o conteúdo
 * para o extrator coletar as informações definidas no filtro.
 * 
 * @author André Ferreira <andrehrf@gmail.com>
 */

var fs = require("fs"),
    os = require("os"),
    url = require("url"),
    crc32 = require("crc-32"),
    md5 = require("md5"),
    MongoServer = require("mongodb").MongoClient,
    AWS = require('aws-sdk');
    request = require('superagent'),
    cheerio = require("cheerio"),
    php = require("phpjs"),
    _ = require("lodash"),
    async = require("async"),
    exec = require('child_process').exec,
    extractor = require("./extractor.js");
    
process.on('uncaughtException', function(err){ 
    console.log(err); 
    HawkMapper.init();
});
    
var cpuusage = 0;
var settings, filter = null;
var stats = {
    requests: 0,
    error: 0,
    verified: 0,
    extractions: 0,   
    linkextraction: 0,
    redirect: 0,
    linktoextract: 0,
    ignoredlinks: 0,
    removeduplicate: 0,
    extractionerror: 0,
};

var arrExtractions = [];
var arrLink = [];
var arrLinkVerified = [];
var networkUsage = 0;
var linksProcessed = [];
var linkPerSec = 0;

var HawkMapper = {
    /**
     * Última atividade do mapeador
     * @type integer
     */
    lastactivity: 0,
    
    /**
     * Tempo máximo de inatividade
     * @type integer
     */
    timeoutinactivity: 300,
    
    /**
     * Define se mapeador está em progresso
     * @type boolean
     */
    inprogress: false,
        
    /**
     * Quantidade máxima de requisições por segundo
     * @type integer
     */
    linkspersecond: 5,
    
    /**
     * Database 
     * @type object
     */
    db: null,
    
    /**
     * Timer para fixar paradas 
     * @type function
     */
    fixstop: null,
        
    /**
     * Iniciando o mapeador
     * @return void
     */
    init: function(){
        //Incluindo URL semente no banco de dados
        HawkMapper.infinity(function(){
            if(filter != null && HawkMapper.db != null){ 
                var protocol = (filter.protocol == undefined || filter.protocol == "undefined" || filter.protocol == "") ? "http" : filter.protocol;
                var link = protocol+"://"+filter.domain;
                
                var cpuusage = (typeof settings.cpuusage === "number") ? settings.cpuusage : 30;
                exec("cpulimit -p "+process.pid+" -l "+cpuusage);
                
                switch(settings.database.type){
                    case "mongodb": 
                        HawkMapper.db.collection("links_"+settings.namespace).insertOne({"_id": Math.abs(crc32.str(link)), "link": link, "queued": false, "verified": false});//Url Semente
                        HawkMapper.db.collection("links_"+settings.namespace).indexInformation(function(error, indexinformation){
                            if(error){}
                            else{
                                if(indexinformation.queued_1){
                                    HawkMapper.db.collection("links_"+settings.namespace).createIndex({"queued": 1}, function(){});
                                }
                                if(indexinformation.priority_1){
                                    HawkMapper.db.collection("links_"+settings.namespace).createIndex({"priority": 1}, function(){});
                                }
                                if(indexinformation.verified_1 == null){
                                    HawkMapper.db.collection("links_"+settings.namespace).createIndex({"verified": 1}, function(){});
                                }
                            }
                        });

                        return "stop"; 
                    break;
                    case "dynamodb":
                        HawkMapper.db.listTables({}, function(err, data){
                            if(error){}
                            else{
                                console.log(data);
                            }
                        });
                        
                        return "stop"; 
                    break;
                }
            }
        }, 1000);
        
        //Armazenando consumo de CPU do processo
        HawkMapper.infinity(function(){
            switch(process.platform){
                case "win32": 
                    var cpu = require("windows-cpu");
                    cpu.nodeLoad(function(error, results) {
                        for(var key in results.found){
                            if(results.found[key].pid == process.pid){
                                cpuusage = results.found[key].load;
                                break;
                            }
                        }
                    });
                break;
                case "linux": 
                    var usage = require("usage");
                    usage.lookup(process.pid, function(err, result) {
                        cpuusage = result.cpu;
                    });
                break;
            }
        }, 1000);
        
        //Verificando registros no mongo
        HawkMapper.infinity(function(){
            switch(settings.database.type){
                case "mongodb": 
                    HawkMapper.db.collection("links_"+settings.namespace).count({"queued": false, "verified": false}, function(error, numOfDocs){
                        stats.linktoextract = numOfDocs;
                    });
                    
                    HawkMapper.db.collection("links_"+settings.namespace).count({"verified": true}, function(error, numOfDocs){
                        stats.verified = numOfDocs;
                    });
                    
                    HawkMapper.db.collection("extractions_"+settings.namespace).count(function(error, numOfDocs){
                        stats.extractions = numOfDocs;
                    });
                break;
                case "dynamodb":
                        
                break;
            }
        }, 20000);

        //Enviando estatisticas
        HawkMapper.infinity(function(){
            process.send({
                type: "stats",
                memory: process.memoryUsage(),
                cpu: cpuusage,
                progress: stats,
                lastactivity: HawkMapper.lastactivity,
                networkusage: networkUsage,
                linkPerSec: linkPerSec
            });
            
            networkUsage = 0;
            linkPerSec = 0;
        }, 1000);
        
        HawkMapper.infinity(HawkMapper.checkMyExistence, 3000);
        HawkMapper.infinity(HawkMapper.checkTimeoutLinks, 60000);
        HawkMapper.checkTimeoutLinks();
    },
        
    /**
     * Função de persistência 
     * 
     * @param function func
     * @param integer wait
     * @return void
     */
    infinity: function(func, wait){
        var t = null;
        var interv = function(w){
            return function(){
                t = setTimeout(interv, w);
                
                try{
                    p = func.call(null);
                    
                    if(p === "stop"){
                        clearTimeout(t);
                    }
                }
                catch(e){
                    console.log(e.toString());
                }
            };
        }(wait);
                
        t = setTimeout(interv, wait);
    },
    
    /**
     * Verifica timeout dos links que foram solicitados mais não processados
     * @return void
     */
    checkTimeoutLinks: function(){
        var now = new Date().getTime();
        HawkMapper.db.collection("links_"+settings.namespace).count({queued: true, verified: false, queued_timeout: {$lt : now}},function(error, numOfDocs){
            if(numOfDocs > 0){
                HawkMapper.db.collection("links_"+settings.namespace).update({queued: true, verified: false, queued_timeout: {$lt : now}}, {$set: {queued: false}}, { multi: true }, function(){});
            }
        });
    },
    
    /**
     * Verifica a necessidade de existencia do mapeador
     * @return void
     */
    checkMyExistence: function(){
        var now = new Date().getTime();
        var inactivity = now - this.lastactivity;
        
        //Verifica se a invatividade
        if(inactivity > this.timeoutinactivity){
            process.send({"type": "error", "msg": "Mapper "+process.pid+": It was finalized by downtime"});
            process.send({"type": "end"});
            setTimeout(function(){ process.exit(1); }, 3000);
        }      
                                
        if(filter != null && !HawkMapper.inprogress && HawkMapper.db != null){
            HawkMapper.getLinksLot();        
        }
    },
    
    /**
     * Solicita lote de links da base de dados
     * @return void
     */
    getLinksLot: function(){   
        HawkMapper.inprogress = true;
        
        async.series([
            function(next){//Enviando pacote de links verificados
                if(arrLinkVerified.length > 0){
                    var now = new Date().getTime();
                    var bulkLinkVerified = HawkMapper.db.collection("links_"+settings.namespace).initializeUnorderedBulkOp();

                    for(var key in arrLinkVerified){
                        bulkLinkVerified.find({"_id": arrLinkVerified[key]}).update({$set: {"queued": true, "verified": true, "verified_datetime": now}});
                    }

                    bulkLinkVerified.execute(function(err, result) { next(); });
                    arrLinkVerified = [];
                }
                else{
                    next();
                }
            },
            function(next){//Enviando pacote de dados extraidos
                if(arrExtractions.length > 0){
                    var bulkExtractions = HawkMapper.db.collection("extractions_"+settings.namespace).initializeUnorderedBulkOp();

                    for(var key in arrExtractions){
                        bulkExtractions.insert(arrExtractions[key]);
                    }

                    bulkExtractions.execute(function(err, result) { next(); });
                    arrExtractions = [];
                }
                else{
                    next();
                }
            },
            function(next){//Enviando pacote de links coletados
                if(arrLink.length > 0){
                    var bulkLink = HawkMapper.db.collection("links_"+settings.namespace).initializeUnorderedBulkOp();

                    for(var key in arrLink){
                        bulkLink.insert(arrLink[key]);
                    }

                    bulkLink.execute(function(err, result) { next(); });
                    arrLink = [];
                }
                else{
                    next();
                }
            }
        ], function(){
            global.gc();
        
            switch(settings.database.type){
               case "mongodb": 
                    HawkMapper.db.collection("links_"+settings.namespace).find({"queued": false, "verified": false}, {"_id": 1, "link": 1}, {limit: 100, sort: {"priority": -1}}).toArray(function(err, docs){
                       var now = new Date().getTime();
                       if(err){ 
                           HawkMapper.db.collection("links_"+settings.namespace+"_logs").insertOne({"datetime": now, "error": "MongoDB: "+ err});
                           HawkMapper.inprogress = false;
                       }
                       else{
                            if(docs.length > 0){
                                var now = new Date().getTime();
                                var bulkQueued = HawkMapper.db.collection("links_"+settings.namespace).initializeUnorderedBulkOp();

                                for(var key in docs)
                                     bulkQueued.find({"_id": docs[key]["_id"]}).update({$set: {"queued": true, "queued_timeout": now+120000}});

                                bulkQueued.execute(function(err, result) {});

                                HawkMapper.inprogress = true;
                                HawkMapper.requests(docs);
                            }
                            else{
                                HawkMapper.inprogress = false;
                            }
                       }
                    });
               break;
            }
        });        
    },
    
    /**
     * Função para verificar se link pertence a um filtro
     * @param string url
     * @param string filtersStr
     * @return boolean
     */
    infilter: function(url, filtersStr, isRegex){
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
    },
    
    /**
     * Altera links relativos para absoluto
     * @param string path
     * @param string absolteUrl
     * @return string
     */
    getabsolutelink: function(path, absolteUrl){
        if(typeof path == "string"){
            if(path.substr(0, 1) == "/" && path.substr(0, 2) != "//"){
                var absolutePath = absolteUrl + path;
                return absolutePath;
            } else if(path.substr(0, 2) == "./"){
                var absolutePath = path.replace("./", absolteUrl+"/");
                return absolutePath;
            } else if(path.substr(0, 3) == "../"){
                var parseUrl = url.parse(absolteUrl);
                var parseHost = parseUrl.host.split("/");
                var absolutePath = parseUrl.protocol+"//";

                for(var i = 0; i < parseHost.length-1; i++){
                    absolutePath += parseHost[i]+"/";
                }

                absolutePath += path.replace("../", "");

                return absolutePath;        
            } else if(path.substr(0, 4) != "http" && path.substr(0, 2) != "//"){
                var absolutePath = absolteUrl + "/" + path;
                return absolutePath;
            }
            else{
                return path;
            }
        }
        else{
            return path;
        }
    },
    
    /**
     * Função para verificar se link está dentro dos padrões pré definidos, caso não remover da lista ou apagar o extra
     * 
     * @param string link
     * @param string patterns
     * @param boolean deleteextra
     * @return void
     */
    patternlink: function(link, patterns, deleteextra){
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
    },
        
    /**
     * Função para realizar os requerimentos
     * 
     * @param array data
     * @return void
     */
    requests: function(data){
        //console.log("Iniciando requisições");
                                
        if(data.length > 0){
            var bruteLinks = [];
            
            var now = new Date().getTime();
            HawkMapper.inprogress = true;
            HawkMapper.lastactivity = now;
            var progress = 0;
            
            var interval = 1000/HawkMapper.linkspersecond;
            
            if(HawkMapper.fixstop !== null){
                clearTimeout(HawkMapper.fixstop);
                HawkMapper.fixstop = null;
            }
            
            HawkMapper.fixstop = setTimeout(function(){//Segurança contra trava no sistema
                HawkMapper.inprogress = false;
                console.log("Reiniciando aplicação");
            }, 300000);
            
            for(var key in data){
                (function(key){
                    var id = data[key]["_id"];
                    
                    //Marcando registro como requerido para caso seja iniciado outro bot não pegue os mesmo registros 
                    //HawkMapper.db.collection("links_"+settings.namespace).updateOne({"_id": id}, {$set: {"queued": true, "queued_timeout": now+180}}, function(err, results){});
                  
                    var timer = setTimeout(function(link, id){
                        if(link != undefined && link != "undefined"){
                            //console.log("Requerendo: "+link);
                            stats.requests++;
                            
                            request.get(link)
                            .set('Content-Type', 'text/html')
                            .set('Accept-Encoding', 'gzip')
                            .redirects(1)
                            .on('error', function(err, res){
                                stats.error++;
                                var now = new Date().getTime();
                        
                                if(err){ HawkMapper.db.collection("links_"+settings.namespace+"_logs").insertOne({"datetime": now, "link": link, "error": "Request: "+ err}); }
                                arrLinkVerified.push(id);
                                //HawkMapper.db.collection("links_"+settings.namespace).updateOne({"_id": id}, {$set: {"queued": true, "verified": true, "verified_datetime": now}});//Definindo o link como verificado
                                progress++;
                                
                                res = null;//Liberando memoria
                                
                                if(progress === data.length){
                                    HawkMapper.inprogress = false;
                                }
                                else{
                                    HawkMapper.lastactivity = now;
                                }
                                
                                clearTimeout(timer);
                            })
                            .end(function(err, res){
                                linkPerSec++;
                                var now = new Date().getTime();
                        
                                if(typeof res === "object"){ 
                                    //HawkMapper.db.collection("links_"+settings.namespace).updateOne({"_id": id}, {$set: {"queued": true, "verified": true, "verified_datetime": now}});//Definindo o link como verificado
                                    arrLinkVerified.push(id);
                                    progress++;
                                
                                    if(res.status === 200){   
                                        networkUsage += res.text.length;
                                        var protocol = (filter.protocol == undefined || filter.protocol == "undefined" || filter.protocol == "") ? "http" : filter.protocol;
                                        var absolteUrl = protocol+"://"+filter.domain;

                                        var extractLink = (filter.extrationfilter != undefined && filter.extrationfilter != null) ? HawkMapper.infilter(link, filter.extrationfilter, filter.extrationfilterregex) : true;

                                        if(extractLink){
                                            //console.log("Extraindo: "+link);
                                            var $ = cheerio.load(res.text);
                                            var newextration = extractor($, filter, false);

                                            if(newextration != null){
                                                newextration["_id"] = Math.abs(crc32.str(link));
                                                newextration["link"] = link;
                                                newextration["createat"] = now;
                                                arrExtractions.push(newextration);   
                                            }       
                                            else{
                                                stats.extractionerror++;
                                                HawkMapper.db.collection("extractions_"+settings.namespace+"_logs").insertOne({"datetime": now, "link": link});
                                            }

                                            //global.gc();
                                        }

                                        res.text.replace(/<a\s.*?href=["\']([^"\']*)/img, function(){ 
                                            var bruteLink = arguments[1];
                                            bruteLinks.push(bruteLink);       
                                        });
                                    }
                                }
                                
                                res = null;//Liberando memoria
                                                                
                                if(progress === data.length){
                                    bruteLinks = _.uniq(bruteLinks);                                                                        
                                    bruteLinks.forEach(function(bruteLink){
                                        var crc32link = Math.abs(crc32.str(bruteLink));

                                        if(typeof bruteLink == "string"){
                                            //linksProcessed.push(crc32link);
                                            bruteLink = bruteLink.replace(/(\'|")/gm, "");//Removendo ' e ""
                                            bruteLink = bruteLink.replace(/(\r\n|\n|\r|\t)/gm, "");//Removendo espaços e tabs
                                            bruteLink = bruteLink.trim();
                                            bruteLink = HawkMapper.getabsolutelink(bruteLink, absolteUrl);
                                            var parseHref = url.parse(bruteLink);

                                            if(parseHref.host == filter.domain || parseHref.host == "www."+filter.domain){
                                                var removehash = bruteLink.split("#");//Evitando links que tenham conteúdo após #
                                                bruteLink = removehash[0];

                                                var removesearchexception = HawkMapper.infilter(bruteLink, filter.exceptionremovesearch, filter.exceptionremovesearchregex);
                                                //console.log(removesearchexception+" - "+bruteLink);
                                                if(filter.removesearch && !removesearchexception){
                                                    var removequery = bruteLink.split("?");//Evitando links que tenham conteúdo após #
                                                    bruteLink = removequery[0];
                                                }

                                                var newlink = bruteLink;
                                                var urlfilter = HawkMapper.infilter(newlink, filter.urlfilter, filter.urlfilterregex);
                                                var priority = HawkMapper.infilter(newlink, filter.urlpriority, filter.urlpriorityregex);
                                                var ignore = HawkMapper.infilter(newlink, filter.urlignore, filter.urlignoreregex);
                                                var extractLink = HawkMapper.infilter(newlink, filter.extrationfilter);
                                                                                                
                                                if(filter.urlfilter == undefined || filter.urlfilter == "" || urlfilter){
                                                    if(!ignore && filter.urlignore != undefined){                                                        
                                                        if(!priority && !extractLink)
                                                            newlink = HawkMapper.patternlink(newlink, filter.urlpatterns, filter.urlpatternsonly);

                                                        if(newlink != null){
                                                            //console.log(Math.abs(crc32.str(newlink))+" - "+newlink);
                                                            arrLink.push({
                                                                "_id": Math.abs(crc32.str(newlink)), 
                                                                "link": newlink, 
                                                                "queued": false, 
                                                                "verified": false, 
                                                                "priority": priority
                                                            });

                                                            stats.linkextraction++;
                                                        }
                                                        else{
                                                            stats.ignoredlinks++;
                                                        }
                                                    }
                                                    else{
                                                        stats.ignoredlinks++;
                                                    }
                                                }
                                                else{
                                                    stats.ignoredlinks++;
                                                }
                                            }
                                        }
                                    });
                                    
                                    global.gc();                                        
                                    setTimeout(function(){ HawkMapper.inprogress = false; }, 3000);
                                }
                                else{
                                    HawkMapper.lastactivity = now;
                                }
                                
                                clearTimeout(timer);                                
                            });
                        }
                    }, (interval*key), data[key].link, id);
                })(key);
            }
        }
    }
};

process.on("message", function(data){
    switch(data.cmd){
        case "exit": process.exit(1); break;
        case "settings": 
            settings = data.settings[0];
            HawkMapper.linkspersecond = settings.requestpersecound;
            
            switch(settings.database.type){
                case "mongodb":
                    var connString = "mongodb://";

                    if(settings.database.username != undefined && settings.database.password != undefined){
                        connString += settings.database.username+":"+settings.database.password+"@";
                    }

                    connString += settings.database.hostname+":"+settings.database.port;

                    if(settings.database.database != undefined){
                        connString += "/"+settings.database.database;
                    }

                    MongoServer.connect(connString, function(err, db){
                        HawkMapper.db = db;
                                              
                        if(err){ process.send({"type": "error", "msg": "Mapper "+process.pid+": Error when trying to connect to MongoDB"})}
                        else{ HawkMapper.init();}
                    });
                break;
                case "dynamodb":
                    AWS.config.update({accessKeyId: settings.database.awsaccesskey, secretAccessKey: settings.database.awssecretkey});
                    AWS.config.update({region: settings.database.awsregion});

                    var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
                    dynamodb.listTables({}, function(err, data) {
                        HawkMapper.db = dynamodb;

                        if(!err){ process.send({"type": "error", "msg": "Mapper "+process.pid+": Error when trying to connect to DynamoDB ("+err.message+")"})}
                        else{ HawkMapper.init();}
                    });
                break;
                default:
                    process.send({"type": "error", "msg": "Mapper "+process.pid+": The type of database selected is not supported, I do not know how you could do this more ok"});
                break;
            }    
        break;
        case "filter": 
            filter = data.filter;
        break;
    }
});