module.exports = function (server) {
  'use strict';
  var io = require('socket.io')(server);
  var ib = require('./connectors/ib');

  function request (socket, contract) {

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
          else res();
        }
      },

      // callback_data
      function (err, res) {
        if (!err) socket.emit('mktdata', { contract: sub.contract, key: res.type, val: res.value });
      }
    );
  }

  function reset (socket) {

    // cancel all
    var subs = socket.app_data.subs;
    var i = subs.length;
    var sub;
    while (--i >= 0) {
      sub = subs[i];

      // unsibscribe if available
      if (typeof sub.cancel === 'function') sub.cancel();

      // no unsubscriber -> schedule it
      else sub.cancel = true;
    }

    // reset subs array
    socket.app_data.subs = [];
  }

  io.on('connection', function (socket) {

    // allocate data
    socket.app_data = { subs: [] };

    // reset
    var _reset = reset.bind(null, socket);
    socket.on('disconnect', _reset);
    socket.on('reset', _reset);

    // req
    socket.on('req', function (message) {
      var ticker = message.ticker;
      var expiration = message.expiration.split('-').join('');
      var strikes = message.strikes;

      // reset
      if (socket.app_data.subs.length) reset(socket);

      // stock
      request(socket, { type: 'stock', ticker: ticker });

      // options
      var i = strikes.length;
      while (--i >= 0) {
        request(socket, { type: 'option', ticker: ticker, expiration: expiration, strike: strikes[i], right: 'C' });
        request(socket, { type: 'option', ticker: ticker, expiration: expiration, strike: strikes[i], right: 'P' });
      }
    });
  });
};
