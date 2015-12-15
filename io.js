module.exports = function (server) {
  'use strict';
  var io = require('socket.io')(server);
  var ib = require('./api/ib');
  var log = require('./log');

  io.on('connection', function (socket) {
    log.print(log.LVL_INFO, 'client #' + socket.id, 'connected');

    socket.on('disconnect', function () {
      log.print(log.LVL_DETAILS, 'client #' + socket.id, 'disconnected');
      ib.mktdata.cancelall();
    });

    socket.on('/ib/snapshot', function (msg) {
      log.print(log.LVL_DETAILS, 'client #' + socket.id, '/ib/snapshot', null, msg.contract);
      ib.mktdata.snapshot(msg.contract, function (err, res) {
        log.print(log.LVL_DETAILS, 'server', '/ib/snapshot', JSON.stringify(res), msg.contract);
        socket.emit('/ib/snapshot', { req: msg, res: res });
      });
    });

    socket.on('/ib/subscribe', function (msg) {
      log.print(log.LVL_DETAILS, 'client #' + socket.id, '/ib/subscribe', null, msg.contract);
      ib.mktdata.subscribe(msg.contract, function (err, res) {
        log.print(log.LVL_DETAILS, 'server', '/ib/subscribe', JSON.stringify(res), msg.contract);
        socket.emit('/ib/subscribe', { req: msg, res: res });
      });
    });

    socket.on('/ib/unsubscribe', function (msg) {
      log.print(log.LVL_DETAILS, 'client #' + socket.id, '/ib/unsubscribe', null, msg.contract);
      ib.mktdata.unsubscribe(msg.contract);
    });

    socket.on('/ib/cancel', function () {
      log.print(log.LVL_DETAILS, 'client #' + socket.id, '/ib/cancelall');
      ib.mktdata.cancel();
    });
  });
};
