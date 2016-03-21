/**
 * Controlador de rotas do mapeador
 * 
 * @author André Ferreira <andrehrf@gmail.com>
 */

var fs = require("fs"),
    path = require("path"),
    cp = require('child_process'),
    url = require("url");
    
var stopFork = false;

module.exports = function(dirname, settings, app, io, mongodb, debug, threads){
    mongodb.collection("mappers").update({}, {$set: {"pid": 0, "stats": null}}, function(err, result){});
    
    app.get("/mappers", function(req, res){ res.redirect("/#mappers"); });
    app.get("/mappers-add", function(req, res){ res.redirect("/#mappers-add"); });
    
    app.post("/start-mapper", function(req, res){
        var ObjectID = require('mongodb').ObjectID;
        var id = new ObjectID(req.body.id);
        
        mongodb.collection("mappers").find({"_id": id}).toArray(function(err, docs){
            var pathname = path.join(dirname, "mapper.js");
            var filter = JSON.parse(fs.readFileSync(docs[0].filter.path).toString());
            var pid = startFork(id, pathname, docs, filter);
            sendStats();
        });
        
        res.send("ok");
    });
    
    app.post("/stop-mapper", function(req, res){
        var ObjectID = require('mongodb').ObjectID;
        var id = new ObjectID(req.body.id);
        
        mongodb.collection("mappers").find({"_id": id}).toArray(function(err, result){    
            setTimeout(function(){
                mongodb.collection("mappers").update({"_id": id}, {$set: {"pid": 0, "stats": null}}, function(err, result){});  
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
    
    app.post("/remove-mapper", function(req, res){
        var ObjectID = require('mongodb').ObjectID;
        var id = new ObjectID(req.body.id);         
        mongodb.collection("mappers").deleteOne({"_id": id}, function(err, result){});
        
        sendStats();
        res.send("ok");
    });
    
    app.get("/data-mappers", function(req, res){ 
        mongodb.collection("mappers").find({}).toArray(function(err, docs){
            for(var key in docs)
                docs[key].filter = JSON.parse(fs.readFileSync(docs[key].filter.path).toString());
            
            res.send({
                error: err,
                data: docs
            });
        });
    });
    
    app.post("/mappers-add", function(req, res){
        mongodb.collection("mappers").insert(req.body);
        res.send("ok");
    });
    
    app.post("/get-to-database", function(req, res){
        var collection = req.body.collection;
        var filters = (req.body.filters) ? req.body.filters : {};
        var pg = (req.body.page > 0) ? req.body.page : 1;
        var offset = (pg*10)-10;
        
        mongodb.collection(collection).count(filters, function(error, numOfDocs){
            if(error){
                res.send({error: error});
            }
            else{
                mongodb.collection(collection).find(filters).skip(offset).limit(10).toArray(function(error, docs){
                    if(error)
                        res.send({error: error});
                    else
                        res.send({docs: docs, total: numOfDocs-1});
                });
            }
        });
    });
    
    app.post("/clear-database", function(req, res){
        var collection = req.body.collection;
        var filters = (req.body.filters) ? req.body.filters : null;
        
        if(filters === null){
            mongodb.collection(collection).drop();
            res.send("ok");
        }
        else{
            mongodb.collection(collection).remove(filters);
            res.send("ok");
        }
    });
        
    setInterval(sendStats, 1000);
    
    function startFork(id, pathname, stg, filter){
        var thread = cp.fork(pathname, null, {silent: false});
        thread.starttime = new Date().getTime();
        thread.send({"cmd": "settings", "settings": stg});
        thread.send({"cmd": "filter", "filter": filter});

        thread.on('message', function(data){
            switch(data.type){
                case "stats": 
                    data["cpus"] = require('os').cpus().length;                    
                    mongodb.collection("mappers").update({"_id": id}, {$set: {"pid": thread.pid, "stats": data}}, function(err, result){}); 
                break;
                case "error": io.emit("error", data.msg); break;
                case "end": stopFork = true; break;
            }
        });

        thread.on('close', function(){
            if(stopFork){
                console.log("Mapeador parado pela administração "+thread.pid);
                mongodb.collection("mappers").update({"_id": id}, {$set: {"pid": 0, "stats": null}}, function(err, result){});
                io.emit("msgerror", "The mapper "+thread.pid+" was finalized by an internal error");
                sendStats();
            }
            else{
                startFork(id, pathname, stg, filter);
                console.log("Mapeador parado por erros internos "+thread.pid+", reiniciando...");
            }
        });
        
        mongodb.collection("mappers").update({"_id": id}, {$set: {"pid": thread.pid, "starttime": thread.starttime}}, function(err, result){});
    }
    
    function sendStats(){
        mapthreads(function(data){
            io.emit("mappers", data);
        });
    }
    
    function mapthreads(cb){        
        mongodb.collection("mappers").find({}).toArray(function(err, docs){
            r = {};
            
            for(var key in docs)
                r[docs[key]._id] = docs[key];
            
            cb(r);
        });
    }
}; 

/**
 * @see http://phpjs.org/functions/array_key_exists/
 */
function array_key_exists(key, search) {
  if (!search || (search.constructor !== Array && search.constructor !== Object)) {
    return false;
  }

  return key in search;
}
