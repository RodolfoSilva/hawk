/**
 * Módulo de integrações do Hawk
 */

var fs = require("fs"),
    url = require("url"),
    glob = require("glob"),
    request = require("superagent"),
    MongoServer = require("mongodb").MongoClient,
    AWS = require("aws-sdk"),
    cheerio = require("cheerio");

module.exports = function(dirname, settings, app, io, mongodb, debug){
    app.get("/databases", function(req, res){ res.redirect("/#databases"); });
    app.get("/databases-add", function(req, res){ res.redirect("/#databases-add"); });
    
    /**
     * Requisição listar bases de dados
     */ 
    app.get("/databases-list", function(req, res){
        mongodb.collection("databases").find({}).toArray(function(err, result){
            var databases = {};
            
            for(var key in result)
                databases[key] = result[key];
            
            if(err)
                res.send(JSON.stringify({error: err}));
            else
                res.send(JSON.stringify(databases));
        });
    });
    
    /**
     * Requisição para testar conexão com databases
     */ 
    app.post("/databases-test", function(req, res){ 
        switch(req.body.type){
            case "mongodb":
                var connString = "mongodb://";
                
                if(req.body.username != undefined && req.body.password != undefined)
                    connString += req.body.username+":"+req.body.password+"@";
                
                connString += req.body.hostname+":"+req.body.port;
                
                if(req.body.database != undefined)
                    connString += "/"+req.body.database;
                                
                MongoServer.connect(connString, function(err, db){
                    if(err)
                        res.send(JSON.stringify({error: err}));
                    else
                        res.send(JSON.stringify({msg: "Ok"}));

                    db.close();
                });
            break;
            case "dynamodb":
                AWS.config.update({accessKeyId: req.body.awsaccesskey, secretAccessKey: req.body.awssecretkey});
                AWS.config.update({region: req.body.awsregion});
                
                var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
                dynamodb.listTables({}, function(err, data) {
                    if (err) 
                        res.send(JSON.stringify({error: err.message}));
                    else
                        res.send(JSON.stringify({msg: "Ok"}));
                });
            break;
            default: res.send(JSON.stringify({error: "invalid type"})); break;
        }
    });
    
    /**
     * Requisição para salvar databases
     */ 
    app.post("/databases-save", function(req, res){ 
        mongodb.collection("databases").insert(req.body, function(err, result){
            if(err)
                res.send(JSON.stringify({error: err}));
            else
                res.send(JSON.stringify({status: "ok"}));
        });
    });
    
    /**
     * Requisição para remover databases
     */ 
    app.post("/databases-remove", function(req, res){ 
        var ObjectID = require('mongodb').ObjectID;
        var id = new ObjectID(req.body.id);
        
        mongodb.collection("databases").deleteOne({"_id": id}, function(err, result){
            if(err)
                res.send(JSON.stringify({error: err}));
            else
                res.send(JSON.stringify({status: "ok"}));
        });
    });
    
    /**
     * Requisição dos dados de databases
     */    
    app.get("/date-databases", function(req, res){
        mongodb.collection("databases").find({}).toArray(function(err, docs){
            var databases = [];
            
            if(err) debug(err);
            
            for(var key in docs)
                databases[key] = docs[key];            
            
            res.send(JSON.stringify(databases));
        });
    });
}; 