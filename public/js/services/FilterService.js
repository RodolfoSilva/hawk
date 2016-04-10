define(['app', 'jquery', 'bootstrap'], function (app) {
  'use strict';
  app.factory('FilterService', FilterService);

  FilterService.$inject = ['$http'];

  function FilterService($http) {
    return {
      get: get,
      list: list,
      test: test,
      save: save,
      remove: remove
    };

    /////////////////////////

    function get(namespace) {
      return $http.get('/api/v1/filters/' + namespace)
        .then(function (res) {
          return res.data;
        });
    }

    function list() {
      return $http.get('/api/v1/filters')
        .then(function (res) {
          return res.data;
        });
    }

    function remove(namespace) {
      return $http.delete('/api/v1/filters/' + namespace)
        .then(function (res) {
          return res.data;
        });
    }

    function test(namespace, url) {
      return $http.get('/api/v1/filters/' + namespace + '/test/' + url)
        .then(function (res) {
          return res.data;
        });
    }

    function save(data) {
      return $http.post('/api/v1/filters', data)
        .then(function (res) {
          return res.data;
        });
    }
  }
});
