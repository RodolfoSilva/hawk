/**
 * Atualizador do Hawk
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
    HawkUpdater.init();
});
    
var cpuusage = 0;
var settings, filter = null;
var stats = {
    extraction: 0,
    extractionerror: 0,
    verified: 0
};

var arrLinkVerified = [];
var arrExtractions = [];
var networkUsage = 0;
var linkPerSec = 0;

var HawkUpdater = {
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
        HawkUpdater.infinity(function(){                
            var cpuusage = (typeof settings.cpuusage === "number") ? settings.cpuusage : 30;
            //HawkUpdater.db.collection("extractions_"+settings.namespace).update({}, {$set: {"queued_update": false, "verified_update": false, "queued_update_timeout": 0}}, { multi: true });
            exec("cpulimit -p "+process.pid+" -l "+cpuusage);
            return "stop"; 
        }, 1000);
        
        //Armazenando consumo de CPU do processo
        HawkUpdater.infinity(function(){
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
        HawkUpdater.infinity(function(){
            switch(settings.database.type){
                case "mongodb": 
                    HawkUpdater.db.collection("extractions_"+settings.namespace).count({$or: [{"queued_update": false, "verified_update": false}, {"queued_update": null, "verified_update": null}]}, function(error, numOfDocs){
                        stats.linktoextract = numOfDocs;
                        
                        //if(numOfDocs.length === 0)
                        //    setTimeout(HawkUpdater.end, 60000);
                    });
                    
                    HawkUpdater.db.collection("extractions_"+settings.namespace).count({"verified_update": true}, function(error, numOfDocs){
                        stats.verified = numOfDocs;
                    });
                break;
                case "dynamodb":
                        
                break;
            }
        }, 5000);

        //Enviando estatisticas
        HawkUpdater.infinity(function(){
            process.send({
                type: "stats",
                memory: process.memoryUsage(),
                cpu: cpuusage,
                progress: stats,
                lastactivity: HawkUpdater.lastactivity,
                networkusage: networkUsage,
                linkPerSec: linkPerSec
            });
            
            networkUsage = 0;
            linkPerSec = 0;
        }, 1000);
        
        HawkUpdater.infinity(HawkUpdater.checkMyExistence, 3000);
        HawkUpdater.infinity(HawkUpdater.checkTimeoutLinks, 60000);
        HawkUpdater.checkTimeoutLinks();
    },
          
    /**
     * Função chamada quando a rotina termina
     * 
     * @return void
     */
    end: function(){
        console.log("Atualizador terminou!");
        process.send({"type": "error", "msg": "Updater "+process.pid+": end rotine"});
        process.send({"type": "end"});
        setTimeout(function(){ process.exit(1); }, 3000);
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
                    
                    if(p === "stop")
                        clearTimeout(t);
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
        HawkUpdater.db.collection("extractions_"+settings.namespace).count({queued_update: true, verified_update: false, queued_update_timeout: {$or: [{$lt : now}, {$lt : null}]}},function(error, numOfDocs){
            if(numOfDocs > 0)
                HawkUpdater.db.collection("extractions_"+settings.namespace).update({queued_update: true, verified_update: false, queued_update_timeout: {$or: [{$lt : now}, {$lt : null}]}}, {$set: {queued_update: false}}, function(){});
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
            process.send({"type": "error", "msg": "Updater "+process.pid+": It was finalized by downtime"});
            process.send({"type": "end"});
            setTimeout(function(){ process.exit(1); }, 3000);
        }      
                                
        if(filter != null && !HawkUpdater.inprogress && HawkUpdater.db != null)
            HawkUpdater.getLinksLot();        
    },
    
    /**
     * Solicita lote de links da base de dados
     * @return void
     */
    getLinksLot: function(){   
        HawkUpdater.inprogress = true;
        
        //Enviando pacote de dados extraidos
        async.series([
            function(next){                
                if(arrExtractions.length > 0){
                    arrExtractions = _.uniq(arrExtractions);
                    var bulk = HawkUpdater.db.collection("extractions_"+settings.namespace).initializeUnorderedBulkOp();

                    (function(bulkExtractions){
                        var pointer = 0;

                        for(var keyE in arrExtractions){
                            (function(key){
                                HawkUpdater.db.collection("extractions_"+settings.namespace).find({"_id": arrExtractions[key]["_id"]}, {}, {limit: 1}).toArray(function(err, docs){
                                    var hasChanges = false;
                                    
                                    for(var key2 in settings.extractions){
                                        var currentvalue = md5(JSON.stringify(docs[0][key2]));
                                        var newvalue = md5(JSON.stringify(arrExtractions[key][key2]));

                                        //Caso o registro atual não tenha historico
                                        if((docs[0][key2+"_historic"] === null || docs[0][key2+"_historic"] === undefined) && settings.extractions[key2]["historic"] === true){
                                            var setHistoric = {};
                                            setHistoric[key2+"_historic"] = {
                                                value: docs[0][key2],
                                                datetime: docs[0].createat
                                            };

                                            bulkExtractions.find({"_id": docs[0]["_id"]}).upsert().update({$addToSet:  setHistoric});
                                        }

                                        //Caso haja alteração
                                        if(currentvalue != newvalue){
                                            hasChanges = true;
                                            var now = new Date().getTime();

                                            if(settings.extractions[key2]["update"] === true){
                                                var setObject = {};
                                                setObject[key2] = arrExtractions[key][key2];
                                                setObject["lastupdate"] = now;
                                                bulkExtractions.find({"_id": arrExtractions[key]["_id"]}).update({$set: setObject});
                                            }
                                            else{
                                                bulkExtractions.find({"_id": arrExtractions[key]["_id"]}).update({$set: {lastupdate: now}});
                                            }

                                            if(settings.extractions[key2]["historic"] === true){                       
                                                var setHistoric = {};
                                                setHistoric[key2+"_historic"] = {
                                                    value: arrExtractions[key][key2],
                                                    datetime: now
                                                };

                                                bulkExtractions.find({"_id": arrExtractions[key]["_id"]}).upsert().update({
                                                    $addToSet:  setHistoric
                                                });
                                            }
                                        }
                                    }
                                    
                                    if(hasChanges)
                                        console.log("Alteração no registro: "+docs[0]["_id"]);

                                    bulkExtractions.find({"_id": arrExtractions[key]["_id"]}).update({$set: {"queued_update": true, "verified_update": true, "verified_datetime": now}});
                                    pointer++;

                                    if(pointer == arrExtractions.length){
                                        arrExtractions = [];
                                        //console.log("Enviando pacote de alterações");
                                        bulkExtractions.execute(function(err, result) { next(); });
                                        global.gc();
                                    }
                                });
                            })(keyE);
                        }                
                    })(bulk);
                }    
                else{
                    next();
                }
            }
        ], function(){
            global.gc();
        
            switch(settings.database.type){
               case "mongodb": 
                    HawkUpdater.db.collection("extractions_"+settings.namespace).find({$or: [{"queued_update": false, "verified_update": false}, {"queued_update": null, "verified_update": null}]}, {"_id": 1, "link": 1}, {limit: 100}).toArray(function(err, docs){
                       var now = new Date().getTime();
                       if(err){ 
                           HawkUpdater.db.collection("extractions_"+settings.namespace+"_logs").insertOne({"datetime": now, "error": "MongoDB: "+ err});
                           HawkUpdater.inprogress = false;
                       }
                       else{
                            if(docs.length > 0){
                                var now = new Date().getTime();
                                var bulkQueued = HawkUpdater.db.collection("extractions_"+settings.namespace).initializeUnorderedBulkOp();

                                for(var key in docs)
                                     bulkQueued.find({"_id": docs[key]["_id"]}).update({$set: {"queued_update": true, "queued_update_timeout": now+500000}});

                                bulkQueued.execute(function(err, result) {});
                                HawkUpdater.inprogress = true;
                                HawkUpdater.requests(docs);
                            }
                            else{
                                HawkUpdater.inprogress = false;
                                setTimeout(HawkUpdater.end, 60000);
                            }
                       }
                    });
               break;
            }
        });            
        
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
            var now = new Date().getTime();
            HawkUpdater.inprogress = true;
            HawkUpdater.lastactivity = now;
            var progress = 0;
            
            var interval = 1000/HawkUpdater.linkspersecond;
            
            if(HawkUpdater.fixstop !== null){
                clearTimeout(HawkUpdater.fixstop);
                HawkUpdater.fixstop = null;
            }
            
            HawkUpdater.fixstop = setTimeout(function(){//Segurança contra trava no sistema
                HawkUpdater.inprogress = false;
                console.log("Reiniciando aplicação");
            }, 300000);
            
            for(var key in data){
                (function(key){
                    var id = data[key]["_id"];
 
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
                        
                                if(err) HawkUpdater.db.collection("extractions_"+settings.namespace+"_logs").insertOne({"datetime": now, "link": link, "error": "Request: "+ err});
                                arrLinkVerified.push(id);
                                //HawkUpdater.db.collection("extractions_"+settings.namespace).updateOne({"_id": id}, {$set: {"queued_update": true, "verified_update": true, "verified_update_datetime": now}});//Definindo o link como verificado
                                progress++;
                                
                                res = null;//Liberando memoria
                                
                                if(progress === data.length)                                                                        
                                    setTimeout(function(){ HawkUpdater.inprogress = false; }, 3000);
                                else
                                    HawkUpdater.lastactivity = now;
                                
                                clearTimeout(timer);
                            })
                            .end(function(err, res){
                                linkPerSec++;
                                var now = new Date().getTime();
                        
                                if(typeof res === "object"){ 
                                    arrLinkVerified.push(id);
                                    //HawkUpdater.db.collection("extractions_"+settings.namespace).updateOne({"_id": id}, {$set: {"queued_update": true, "verified_update": true, "verified_update_datetime": now}});//Definindo o link como verificado
                                    progress++;
                                
                                    if(res.status === 200){   
                                        networkUsage += res.text.length;

                                        var $ = cheerio.load(res.text);
                                        var newextration = extractor($, filter, false);

                                        if(newextration != null){
                                            newextration["_id"] = Math.abs(crc32.str(link));
                                            arrExtractions.push(newextration);   
                                        }                                            
                                    }
                                }
                                
                                res = null;//Liberando memoria
                                                                
                                if(progress === data.length)                                                                        
                                    setTimeout(function(){ HawkUpdater.inprogress = false; }, 3000);
                                else
                                    HawkUpdater.lastactivity = now;
                                                                
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
            HawkUpdater.linkspersecond = settings.requestpersecound;
            
            switch(settings.database.type){
                case "mongodb":
                    var connString = "mongodb://";

                    if(settings.database.username != undefined && settings.database.password != undefined)
                        connString += settings.database.username+":"+settings.database.password+"@";

                    connString += settings.database.hostname+":"+settings.database.port;

                    if(settings.database.database != undefined)
                        connString += "/"+settings.database.database;

                    MongoServer.connect(connString, function(err, db){
                        HawkUpdater.db = db;
                                              
                        if(err) process.send({"type": "error", "msg": "Mapper "+process.pid+": Error when trying to connect to MongoDB"})
                        else HawkUpdater.init();
                    });
                break;
                case "dynamodb":
                    AWS.config.update({accessKeyId: settings.database.awsaccesskey, secretAccessKey: settings.database.awssecretkey});
                    AWS.config.update({region: settings.database.awsregion});

                    var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
                    dynamodb.listTables({}, function(err, data) {
                        HawkUpdater.db = dynamodb;

                        if(!err) process.send({"type": "error", "msg": "Mapper "+process.pid+": Error when trying to connect to DynamoDB ("+err.message+")"})
                        else HawkUpdater.init();
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