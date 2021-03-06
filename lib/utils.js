var fs = require('fs'),
    http = require('http'),
    win_versions = require('./windowsVersions'),
    AdmZip = require('adm-zip');

function downloadFile(url, cb) {
  var file_name, file, request;

  file_name = url.split('/').pop();
  file = fs.createWriteStream(file_name);
  request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(function() {
        cb(null, file);
      });
    });
  }).on('error', function(err) {
    fs.unlink(file_name);
    if (cb) cb(err.message, null);
  });
}

function unzipFile(file_path) {
  var zip = new AdmZip(file_path),
      dir_name = file_path.replace(/\.zip$/, '');

  zip.extractAllTo(dir_name, true);
}

function findFile(path, re, cb) {
  var files = [
          path.replace(/\/\s*$/, '')
      ],
      name;

  function traverseFiles() {
    if (files.length) {
      name = files.shift();
      fs.stat(name, function (err, stats) {
        if (stats.isDirectory()) {
          fs.readdir(name, function (err, dir_files) {
            if (err) {
              cb(err, null);
            } else {
              files = dir_files.map(function (file) {
                return name + '/' + file;
              }).concat(files);
              traverseFiles();
            }
          });
        } else {
          // if we've found INF file
          if (re.test(name)) {
            cb(null, name);
          } else {
            traverseFiles();
          }
        }
      })
    } else {
      cb('File is not found', null);
    }
  }

  traverseFiles();
}

function readFile(file_name, cb) {
  fs.readFile(file_name, function (err, data) {
    cb(err, data);
  });
}

function parseOS(text) {
  var re1, re2, matches;

  re1 = /\[Manufacturer\][^\[]+\%\w+\%\s*=\s*[^,]+,[^\r\n|\n|\r]+nt[\w]+(?:\.\d+\.\d+)?/ig;
  re2 = /nt[\w]+(?:\.\d+\.\d+)?/gi;

  matches = text.match(re1);
  if (matches) {
    matches = matches[0].match(re2);
  }

  return matches;
}

function formatOutput(versions) {
  var result = ['Supported OS:'],
      os, arc,
      matches,
      v;

  versions.forEach(function (e) {
    v = e.toLowerCase();
    arc = v.match(/(?:nt(x86|ia64|amd64))/);
    os = v.match(/nt[\w]+\.(\d+\.\d+)/);
    v = os && win_versions[os[1]] ? win_versions[os[1]] : 'Windows';
    v += /x86/.test(arc[1]) ? ' (32-bit)' : ' (64-bit)';
    if (result.indexOf(v) === -1) {
      result.push(v);
    }
  });

  return result.join('\n');
}

module.exports = {
  downloadFile: downloadFile,
  unzipFile: unzipFile,
  findFile: findFile,
  readFile: readFile,
  parseOS: parseOS,
  formatOutput: formatOutput
};
