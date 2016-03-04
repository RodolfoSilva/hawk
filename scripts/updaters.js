/**
 * Controlador de rotas do atualizador
 * 
 * @author André Ferreira <andrehrf@gmail.com>
 */

var fs = require("fs"),
    path = require("path"),
    cp = require('child_process'),
    url = require("url");

var stopFork = false;

module.exports = function(dirname, settings, app, io, mongodb, debug, threads){
    mongodb.collection("updaters").update({}, {$set: {"pid": 0, "stats": null}}, function(err, result){});
    
    app.get("/updaters", function(req, res){ res.redirect("/#updaters"); });
    app.get("/updaters-add", function(req, res){ res.redirect("/#updaters-add"); });
    
    app.post("/start-updater", function(req, res){
        var ObjectID = require('mongodb').ObjectID;
        var id = new ObjectID(req.body.id);
        
        mongodb.collection("updaters").find({"_id": id}).toArray(function(err, docs){
            var pathname = path.join(dirname, "updater.js");
            var filter = JSON.parse(fs.readFileSync(docs[0].filter.path).toString());
            var pid = startFork(id, pathname, docs, filter);
            sendStats();
        });
        
        res.send("ok");
    });
    
    app.post("/stop-updater", function(req, res){
        var ObjectID = require('mongodb').ObjectID;
        var id = new ObjectID(req.body.id);
        
        mongodb.collection("updaters").find({"_id": id}).toArray(function(err, result){    
            setTimeout(function(){
                mongodb.collection("updaters").update({"_id": id}, {$set: {"pid": 0, "stats": null}}, function(err, result){});  
                sendStats();
            }, 1000);
            
            setTimeout(function(){
                switch(process.platform){
                    case "win32": cp.exec("TASKKILL /F /PID "+result[0].pid); break;
                    case "linux": cp.exec("kill "+result[0].pid); break;
                }    
            }, 2000); 
            
            stopFork = true;
        });
                
        res.send("ok");
    });
    
    app.post("/remove-updater", function(req, res){
        var ObjectID = require('mongodb').ObjectID;
        var id = new ObjectID(req.body.id);
        
        mongodb.collection("updaters").find({"_id": id}).toArray(function(err, result){      
            if(typeof result[0]["pid"] == "number"){
                stopFork = true;
                
                setTimeout(function(){
                    switch(process.platform){
                        case "win32": cp.exec("TASKKILL /F /PID "+result[0].pid); break;
                        case "linux": cp.exec("kill "+result[0].pid); break;
                    }    
                }, 2000); 
            }
        });
         
        mongodb.collection("updaters").deleteOne({"_id": id}, function(err, result){});
        
        sendStats();
        res.send("ok");
    });
    
    app.get("/data-updaters", function(req, res){ 
        mongodb.collection("updaters").find({}).toArray(function(err, docs){
            for(var key in docs)
                docs[key].filter = JSON.parse(fs.readFileSync(docs[key].filter.path).toString());
            
            res.send({
                error: err,
                data: docs
            });
        });
    });
    
    app.post("/updaters-add", function(req, res){
        mongodb.collection("updaters").insert(req.body);
        res.send("ok");
    });
    
    setInterval(sendStats, 1000);
    
    function startFork(id, pathname, stg, filter){
        var thread = cp.fork(pathname, null, {silent: false});
        thread.starttime = new Date().getTime();
        thread.send({"cmd": "settings", "settings": stg});
        thread.send({"cmd": "filter", "filter": filter});

        thread.on('message', function(data){
            switch(data.type){
                case "stats": mongodb.collection("updaters").update({"_id": id}, {$set: {"pid": thread.pid, "stats": data}}, function(err, result){}); break;
                case "error": io.emit("error", data.msg); break;
                case "end": stopFork = true; break;
            }
        });

        thread.on('close', function(){
            if(stopFork){
                console.log("Atualizador parado pela administração "+thread.pid);
                mongodb.collection("updaters").update({"_id": id}, {$set: {"pid": 0, "stats": null}}, function(err, result){});
                io.emit("msgerror", "The updater "+thread.pid+" was finalized by an internal error");
                sendStats();
            }
            else{
                startFork(id, pathname, stg, filter);
                console.log("Atualizador parado por erros internos "+thread.pid+", reiniciando...");
            }
        });
        
        mongodb.collection("updaters").update({"_id": id}, {$set: {"pid": thread.pid, "starttime": thread.starttime}}, function(err, result){});
    }
    
    function sendStats(){
        mapthreads(function(data){
            io.emit("updaters", data);
        });
    }
    
    function mapthreads(cb){        
        mongodb.collection("updaters").find({}).toArray(function(err, docs){
            r = {};
            
            for(var key in docs)
                r[docs[key]._id] = docs[key];
            
            cb(r);
        });
    }
};
