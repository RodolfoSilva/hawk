/**
 * Updaters controller
 */

'use strict';

define(['app', 'socket.io', 'd3', 'jquery', 'bootstrap'], function (app, io, d3) {
    app.controller("updaters", function($scope, $http){
        $scope.sparkline = {};
        var socket = io();
        
        socket.on("updaters", function(data){
            $scope.threads = data;
            
            for(var key in $scope.threads){
                
                (function(key){
                    if(typeof $scope.sparkline[key] !== "object")
                        $scope.sparkline[key] = {
                            "memory": {type: 'area', width: 70, class: "area-memory", data: []},
                            "cpu": {type: 'area', width: 70, class: "area-cpu", data: []},
                            "network": {type: 'area', width: 70, class: "area-network", data: []},
                        };

                    if(typeof $scope.threads[key].stats == "object" && $scope.threads[key].stats != null){
                        var total = $scope.threads[key].stats.progress.verified + $scope.threads[key].stats.progress.linktoextract;
                        var perc = (100/total)*$scope.threads[key].stats.progress.verified;
                        
                        if(!isNaN(perc))
                            $scope.threads[key].stats.progress.perc = perc.toFixed(2);
                        else
                            $scope.threads[key].stats.progress.perc = 0;
                
                        if($scope.threads[key].stats.memory != null)
                            $scope.sparkline[key]["memory"].data.push($scope.threads[key].stats.memory.heapTotal);  

                        if($scope.threads[key].stats.cpu != null){
                            var maxuse = 100/$scope.threads[key].stats.cpus;
                            var realperc = (maxuse*$scope.threads[key].stats.cpu)/100;
                            $scope.threads[key].stats.cpu = realperc;
                            $scope.sparkline[key]["cpu"].data.push(realperc);
                        }

                        if($scope.threads[key].stats.networkusage != null)
                            $scope.sparkline[key]["network"].data.push($scope.threads[key].stats.networkusage);

                        if($scope.sparkline[key]["memory"].data.length > 50)
                            $scope.sparkline[key]["memory"].data.shift();

                        if($scope.sparkline[key]["cpu"].data.length > 50)
                            $scope.sparkline[key]["cpu"].data.shift();

                        if($scope.sparkline[key]["network"].data.length > 50)
                            $scope.sparkline[key]["network"].data.shift();
                    }
                })(key);
            }

            $scope.$apply();
        });
        
        socket.on("msgerror", function(data){
            $scope.error = data;
            $scope.$apply();
        });
        
        $scope.start = function(id){
            $http({
                method: "POST",
                url: "start-updater",
                data: {id: id}
            });
        };

        $scope.stop = function(id){
            $http({
                method: "POST",
                url: "stop-updater",
                data: {id: id}
            });
        };

        $scope.remove = function(id){
            $http({
                method: "POST",
                url: "remove-updater",
                data: {id: id}
            }).then(function(res){
                $scope.list();
            });
        };
        
        $scope.list = function(){
            $http({
                method: "GET",
                url: "data-updaters",
            }).then(function(res){                
                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $scope.updaters = res.data;
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };
        
        $scope.list();
    });
    
    app.filter('bytes', function() {
        return function(bytes, precision) {
            if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
            if (typeof precision === 'undefined') precision = 1;
            var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
                    number = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
        };
    });
});