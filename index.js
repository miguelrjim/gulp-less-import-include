'use strict';
var gutil = require('gulp-util');
var through = require('through2');
var path = require('path');
var minimatch = require('minimatch');
var glob = require('glob');
var _ = require('lodash');
var vinyl_fs = require('vinyl-fs');

function processPatterns(patterns, fn) {
  // Filepaths to return.
  var result = [];
  // Iterate over flattened patterns array.
  _.flatten(patterns).forEach(function(pattern) {
    // If the first character is ! it should be omitted
    var exclusion = pattern.indexOf('!') === 0;
    // If the pattern is an exclusion, remove the !
    if (exclusion) { pattern = pattern.slice(1); }
    // Find all matching files for this pattern.
    var matches = fn(pattern);
    if (exclusion) {
      // If an exclusion, remove matching files.
      result = _.difference(result, matches);
    } else {
      // Otherwise add matching files.
      result = _.union(result, matches);
    }
  });
  return result;
};

function lookForImport(options) {
  var lessToInclude = [];
  var lessToExclude = [];
  var alreadyAdded = [];
  if (!options.import) {
    throw new gutil.PluginError('gulp-less-import-include', '`src` required');
  }

  return through.obj(
    function(file, enc, cb) {
      if(minimatch(file.relative, options.import)) {
        var folderToLookFor = file.base + path.sep;
        var position = file.relative.indexOf(path.sep);
        if(position != -1)
          folderToLookFor += file.relative.substring(0, position);
        folderToLookFor += path.sep;

        lessToInclude.push(folderToLookFor + '**/*.less');
        lessToExclude.push('!' + folderToLookFor + options.import);

        cb();
      }
      else {
        alreadyAdded.push(file.path);
        this.push(file);
        cb();
      }
    }, 
    function(cb) {
      var that=this;
      lessToInclude = _.uniq(lessToInclude);
      lessToExclude = _.uniq(lessToExclude);
      vinyl_fs.src(lessToInclude.concat(lessToExclude), {read: false})
        .pipe(through.obj(function(file, enc, cb) {
          if(alreadyAdded.indexOf(file.path) == -1) {
            alreadyAdded.push(file.path);
            that.push(file);
          }
          cb();
        }, function(icb) {
          icb();
          cb();
        }));
    }
  );
};

module.exports = lookForImport;
