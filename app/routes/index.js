module.exports = (function () {
  var files = [];

  // http://stackoverflow.com/questions/5364928/node-js-require-all-files-in-a-folder/17204293#17204293
  require('fs').readdirSync(__dirname + '/').forEach(function (file) {
    if (file.match(/\.js$/) !== null && file !== 'index.js') {
      files.push(require('./' + file));
    }
  });

  return files;
}());
