/**
 * Main File Application
 * 
 * @use node --expose-gc --max-old-space-size=1024 --harmony app.js 
 * @author André Ferreira <andrehrf@gmail.com>
 * @license MIT
 */

'use strict';

var fs = require("fs"),
    argv = require('optimist').argv,
    requireDirectory = require('require-directory'),
    cluster = require("cluster"),//Usage Cluster of Node.js
    express = require("express"),//Starting Express
    app = express(),//Creating Application
    morgan = require('morgan'),//Managed logs
    http = require("http").Server(app),//Creating HTTP Server
    cookieParser = require("cookie-parser"),//Module for cookie management in Express
    bodyParser = require("body-parser"),//Module for processing HTTP requests in Express
    compression = require("compression"),//Gzip compression module for Express
    async = require("async"),
    io = require("socket.io")(http),
    MongoServer = require("mongodb").MongoClient;
    
/*if(cluster.isMaster){
    var cpuCount = require('os').cpus().length;

    for(var i = 0; i < cpuCount; i += 1)
        cluster.fork();
    
    cluster.on('exit', function (worker) {
        console.log('Worker %d died :(', worker.id);
        cluster.fork();
    });
}
else{*/
    var settings = JSON.parse(fs.readFileSync(__dirname + "/settings.json"));
    var mongodb = null;
    
    //app.use(morgan('dev'));//Enabling Express logs
    app.use(compression());//Enabling compression
    app.use(cookieParser("MyApp"));//Cookies Management
    app.use(bodyParser.urlencoded({extended: false, limit: '100mb'}));
    app.use(bodyParser.json());
    app.use(express.static("public"));
    
    async.series([
        function(cb){
            //Conectando serviço MongoDB
            MongoServer.connect(settings.mongodb, function(err, db){
                mongodb = db;

                if(err) console.log("MongoDB: "+err);
                else cb();
                
                //Limpando histórico dos mapeadores/atualizadores
                var bulkMappers = db.collection("mappers").initializeUnorderedBulkOp({useLegacyOps: true});
                bulkMappers.find({}).update({$set: {"pid": 0, "stats": null}});
                bulkMappers.execute(function(err, result) {});
                
                var bulkUpdaters = db.collection("updaters").initializeUnorderedBulkOp({useLegacyOps: true});
                bulkUpdaters.find({}).update({$set: {"pid": 0, "stats": null}});
                bulkUpdaters.execute(function(err, result) {});
            });
        }
    ], function(){
        requireDirectory(module, "scripts/", {
            visit: function(obj){ 
                new obj(__dirname, settings, app, io, mongodb, function(err){
                    console.log(err);
                });
            } 
        });
        
        var port = (typeof argv.port === "number") ? argv.port : settings.port;

        http.listen(port, function(){
            console.log("http://localhost:"+port);
            //console.log("http://localhost:5800 (cluster "+cluster.worker.id+")");
        });
    });
//}