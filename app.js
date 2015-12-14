'use strict';

// create server
var server = require('http').createServer(function (req, res) { res.status(200).end(); });

// bind socket.io
require('./io')(server);

// run server
var log = require('./log');
server.listen(process.env.PORT || 9999, function () { log.print(log.LVL_INFO, 'server', 'started'); });
