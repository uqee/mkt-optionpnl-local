'use strict';
var fs = require('fs');
var agent = require('supertest').agent('https://api.github.com');

function validate (callback) {
  agent
    .get('/repos/uqee/mkt-optionpnl-local/tags')
    .set('User-Agent', 'mkt-optionpnl-local')
    .end(function (err, res) {

      if (err)
        return callback('remote: error ' + JSON.stringify(err));

      else if (res.status !== 200)
        return callback('remote: status ' + res.status + ' ' + res.text);

      else if (!res.body || !res.body[0] || !res.body[0].name)
        return callback('remote: body ' + JSON.stringify(res.body));

      else {
        var latest = res.body[0].name;
        fs.readFile('./package.json', 'utf8', function (err, res) {

          if (err)
            callback('local: error ' + JSON.stringify(err));

          else {
            var packagejson = JSON.parse(res);

            if (!packagejson || !packagejson.version)
              callback('local: body ' + res);

            else {
              var current = 'v' + packagejson.version;
              callback(null, {
                ok: (current === latest),
                current: current,
                latest: latest
              });
            }
          }
        });
      }
    });
}

module.exports = {
  validate: validate
};
