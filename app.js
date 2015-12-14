'use strict';

// create server
var server = require('./backend/express');

// bind socket.io
require('./backend/io')(server);

// run server
var log = require('./backend/log');
server.listen(process.env.PORT || 9999, function () { log.print(log.LVL_INFO, 'server', 'started'); });
