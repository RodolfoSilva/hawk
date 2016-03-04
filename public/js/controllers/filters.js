/**
 * Filters controller
 */

'use strict';

define(['app', 'jquery', 'bootstrap'], function (app) {
    app.controller("filters", function($scope, $rootScope, $http, ngProgressFactory){
        $scope.progressbar = ngProgressFactory.createInstance();

        $http({
            method: "GET",
            url: "data-filters",
        }).then(function(res){            
            if(res.data.error)
                $scope.error = res.data.error;
            else 
                $scope.filters = res.data;
        }, function(res){
            $scope.error = "Fails when trying to get data from the server Please try again or contact support.";
        });

        $rootScope.setfitler = function(filter){
            $rootScope.test.filter = filter;
        };
    });
    
    app.controller("testfilter", function($scope, $rootScope, $http, $location, ngProgressFactory){
        $rootScope.test = function(){
            $http({
                method: "GET",
                url: "filter-test?url="+urlencode($scope.test.url)+"&filter="+$rootScope.test.filter,
            }).then(function(res){
                $scope.progressbar.complete();

                if(res.data.error)
                    $scope.error = res.data.error;
                else
                    $scope.test.data = res.data;
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