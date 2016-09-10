'use strict';
var log = require('./log');

// check version
var version = require('./version');
version.validate(function (err, res) {
  if (err || !res) log.print(log.LVL_ERROR, 'server', 'version check failed', err);
  else if (!res.ok) log.print(log.LVL_ERROR, 'server', 'please, update me', res.current + ' -> ' + res.latest);
  else {

    // create server
    var server = require('http').createServer(function (req, res) { res.status(200).end(); });

    // bind socket.io
    require('./io')(server);

    // run server
    server.listen(process.env.PORT || 9999, function () { log.print(log.LVL_INFO, 'server', 'started'); });
  }
});
