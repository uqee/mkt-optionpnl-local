'use strict';

// create server
var server = require('http').createServer(function (req, res) { res.status(200).end(); });

// bind socket.io
require('./io')(server);

// run server
server.listen(process.env.PORT || 8080, function () { require('./log').msg('server started'); });
