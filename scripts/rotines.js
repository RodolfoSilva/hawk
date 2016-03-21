/**
 * Controlador de rotas do atualizador
 * 
 * @author André Ferreira <andrehrf@gmail.com>
 */

var fs = require("fs");


module.exports = function(dirname, settings, app, io, mongodb, debug, threads){    
    app.get("/routines", function(req, res){ res.redirect("/#routines"); });
    app.get("/routines-add", function(req, res){ res.redirect("/#routines-add"); });
    
    app.get("/data-routines", function(req, res){ 
        mongodb.collection("routines").find({}).toArray(function(err, docs){
            for(var key in docs)
                docs[key].filter = JSON.parse(fs.readFileSync(docs[key].filter.path).toString());
            
            res.send({
                error: err,
                data: docs
            });
        });
    });
    
    app.post("/routines-add", function(req, res){
        mongodb.collection("rotines").insert(req.body);
        res.send("ok");
    });
};
