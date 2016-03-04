/**
 * Filters controller
 */

'use strict';

define(['app', 'socket.io', 'd3', 'jquery', 'bootstrap'], function (app, io, d3) {
    app.controller("mappers", function($scope, $http, $route, $routeParams, $location){
        $scope.sparkline = {};
        var socket = io();
        
        socket.on("mappers", function(data){
            $scope.threads = data;

            for(var key in $scope.threads){
                (function(key){
                    if(typeof $scope.sparkline[key] !== "object")
                        $scope.sparkline[key] = {
                            "memory": {type: 'area', width: 70, class: "area-memory", data: []},
                            "cpu": {type: 'area', width: 70, class: "area-cpu", data: []},
                            "network": {type: 'area', width: 70, class: "area-network", data: []},
                            "lps": {type: 'line', width: 70, class: "line-lps", data: []},
                        };

                    if(typeof $scope.threads[key].stats == "object" && $scope.threads[key].stats != null){
                        if($scope.threads[key].stats.memory != null)
                            $scope.sparkline[key]["memory"].data.push($scope.threads[key].stats.memory.heapTotal);  

                        if($scope.threads[key].stats.cpu != null)
                            $scope.sparkline[key]["cpu"].data.push($scope.threads[key].stats.cpu);

                        if($scope.threads[key].stats.networkusage != null)
                            $scope.sparkline[key]["network"].data.push($scope.threads[key].stats.networkusage);
                        
                        if($scope.threads[key].stats.linkPerSec != null)
                            $scope.sparkline[key]["lps"].data.push(-($scope.threads[key].stats.linkPerSec));

                        if($scope.sparkline[key]["memory"].data.length > 50)
                            $scope.sparkline[key]["memory"].data.shift();

                        if($scope.sparkline[key]["cpu"].data.length > 50)
                            $scope.sparkline[key]["cpu"].data.shift();

                        if($scope.sparkline[key]["network"].data.length > 50)
                            $scope.sparkline[key]["network"].data.shift();
                        
                        if($scope.sparkline[key]["lps"].data.length > 50)
                            $scope.sparkline[key]["lps"].data.shift();
                    }
                })(key);
            }

            $scope.$apply();
        });

        socket.on("msgerror", function(data){
            $scope.error = data;
            $scope.$apply();
        });

        $scope.list = function(){
            $http({
                method: "GET",
                url: "data-mappers",
            }).then(function(res){                
                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $scope.mappers = res.data;
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };

        $scope.start = function(id){
            $http({
                method: "POST",
                url: "start-mapper",
                data: {id: id}
            });
        };

        $scope.stop = function(id){
            $http({
                method: "POST",
                url: "stop-mapper",
                data: {id: id}
            });
        };

        $scope.remove = function(id){
            $http({
                method: "POST",
                url: "remove-mapper",
                data: {id: id}
            }).then(function(res){
                $scope.list();
            });
        };

        $scope.pagination = {
            current: 1
        };

        $scope.showdatabase = function(title, collection, filters, page){
            $scope.showdatabasetitle = title;
            $scope.showdatabasecollection = collection;
            $scope.showdatabasefilters = filters;
            $scope.page = page;

            $http({
                method: "POST",
                url: "get-to-database",
                data: {collection: collection, filters: filters, page: page}
            }).then(function(res){                
                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $scope.getdatabase = res.data;

                $scope.pagination.total = res.data.total;
                openShowDatabaseModal();
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        }

        $scope.pageChanged = function(newPage) {
            $scope.showdatabase($scope.showdatabasetitle, $scope.showdatabasecollection, $scope.showdatabasefilters, newPage);
        };

        $scope.clearCollection = function(collection, filters){
            $http({
                method: "POST",
                url: "clear-database",
                data: {collection: collection, filters: filters}
            }).then(function(res){                
                alert("Collection "+collection+" clean");
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        }

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
    
    function openShowDatabaseModal(){
        $("#showdatabase").modal("show");
    }
});