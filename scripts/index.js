/**
 * Módulo de interface do Hawk
 */

module.exports = function(dirname, settings, app, io, mongodb, debug){
    app.get("/", function(req, res){ res.sendFile(dirname + "/public/index.html"); });
}; 