/**
 * Filters controller
 */

'use strict';

define(['app', 'jquery', 'bootstrap', 'services/FilterService'], function (app) {
    app.controller("filters", function($scope, $rootScope, $http, FilterService, ngProgressFactory){
        $scope.progressbar = ngProgressFactory.createInstance();
        function loadFilters() {
          FilterService.list()
            .then(function(res){
              if(res.error)
                  $scope.error = res.error;
              else
                  $scope.filters = res;
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        }
        loadFilters();

        $rootScope.remove = function(filter){
          FilterService.remove(filter.namespace)
            .then(function(res){
              if(res.error)
                $scope.error = res.error;
              else
                $scope.filters = res;
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
          loadFilters();
        };

        $rootScope.setfitler = function(filter){
            $rootScope.test.filter = filter;
        };
    });

    app.controller("testfilter", function($scope, $rootScope, $http, $location, FilterService, ngProgressFactory){
        $rootScope.test = function(){
          FilterService.test($rootScope.test.filter, urlencode($scope.test.url))
            .then(function(res){
              $scope.progressbar.complete();

              if(res.error)
                  $scope.error = res.error;
              else
                  $scope.test.data = res;
            }, function(res){
                $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
            });
        };
    });

    /**
     * @see  http://phpjs.org/functions/urlencode/
     */
    function urlencode(str) {
        str = (str + '').toString();

        return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A')
        .replace(/%20/g, '+');
    }
});
