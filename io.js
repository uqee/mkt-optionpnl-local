module.exports = function (server) {
  'use strict';
  var io = require('socket.io')(server);
  var ib = require('./connectors/ib');
  var log = require('./log');

  function _requestContract (socket, contract) {
    log.print(log.LVL_DETAILS, 'requests', socket.id, contract);

    // create subscription
    var sub = { contract: contract };
    socket.app_data.subs.push(sub);

    // subscribe
    ib.reqMktData(
      contract,

      // callback_init
      function (err, res) {
        if (!err) {

          // save unsubscriber
          if (!sub.cancel) sub.cancel = res;

          // unsubscribe was already scheduled -> do it immediately
          else {
            res();
            log.print(log.LVL_DETAILS, 'cancels', socket.id, sub.contract);
          }
        }
      },

      // callback_data
      function (err, res) {
        if (!err) {
          socket.emit('mktdata', { contract: sub.contract, key: res.type, val: res.value });
          log.print(log.LVL_XXL, 'got update for', socket.id, sub.contract);
        }
      }
    );
  }

  function _cancelAll (socket) {
    log.print(log.LVL_INFO, 'cancels all', socket.id);

    // cancel all
    var subs = socket.app_data.subs;
    var i = subs.length;
    var sub;
    while (--i >= 0) {
      sub = subs[i];

      // unsibscribe if available
      if (typeof sub.cancel === 'function') {
        sub.cancel();
        log.print(log.LVL_DETAILS, 'cancels', socket.id, sub.contract);
      }

      // no unsubscriber -> schedule it
      else sub.cancel = true;
    }

    // reset subs array
    socket.app_data.subs = [];
  }

  function _disconnect (socket) {
    _cancelAll(socket);
    log.print(log.LVL_INFO, 'disconnected', socket.id);
  }

  io.on('connection', function (socket) {
    log.print(log.LVL_INFO, 'connected', socket.id);

    // allocate data
    socket.app_data = { subs: [] };

    // reset
    socket.on('disconnect', _disconnect.bind(null, socket));

    // cancelAll
    socket.on('cancelAll', _cancelAll.bind(null, socket));

    // req
    socket.on('requestExpiration', function (message) {
      var ticker = message.ticker;
      var expiration = message.expiration.split('-').join('');
      var strikes = message.strikes;

      // reset
      if (socket.app_data.subs.length) _cancelAll(socket);
      log.print(log.LVL_INFO, 'requests expiration', socket.id);

      // stock
      _requestContract(socket, { type: 'stock', ticker: ticker });

      // options
      var i = strikes.length;
      while (--i >= 0) {
        _requestContract(socket, { type: 'option', ticker: ticker, expiration: expiration, strike: strikes[i], right: 'C' });
        _requestContract(socket, { type: 'option', ticker: ticker, expiration: expiration, strike: strikes[i], right: 'P' });
      }
    });
  });
};
