/**
 * Mappers add controller
 */

'use strict';

define(['app', 'jquery', 'bootstrap', 'services/FilterService'], function (app) {
    app.controller("updaters-add", function($scope, $http, $location, FilterService){
        $scope.data = {
            requestpersecound: 5,
            cpuusage: 50,
            extractions: {}
        };

        FilterService.list()
          .then(function(res){
            if(res.error)
                $scope.error = res.error;
            else
                $scope.filters = res;
          }, function(res){
              $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
          });

        $http({
            method: "GET",
            url: "databases-list",
        }).then(function(res){
            if(res.data.error)
                $scope.error = res.data.error;
            else
                $scope.databases = res.data;
        }, function(res){
            $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
        });

        $scope.add = function(){
           $http({
                method: "POST",
                url: "updaters-add",
                data: $scope.data
            }).then(function(res){
                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $location.path("/updaters");
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };

        $scope.getfilter = function(){
            $http({
                method: "POST",
                url: "filter-get",
                data: {"namespace": $scope.data.filter.name}
            }).then(function(res){
                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $scope.filter = res.data;
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        }
    });
});
