'use strict';
var async = require('async');
var log = require('../log');
var ib = new (require('ib'))({
  clientId: process.env.IB_CLIENTID || 0,
  host: process.env.IB_HOST || '127.0.0.1',
  port: process.env.IB_PORT || 7496
});

// connection

  var connected;
  var connectTimeout = 1000;

  function connect () {
    //log.print(log.LVL_INFO, 'ib', 'connecting...');
    ib.connect();
  }

  ib.on('connected', function () {
    log.print(log.LVL_INFO, 'ib', 'connected');
    connected = true;
  });

  ib.on('disconnected', function () {
    log.print(log.LVL_INFO, 'ib', 'disconnected');
    connected = false;

    // reconnect
    connectTimeout += 1000;
    setTimeout(connect, connectTimeout);
  });

// io

  function inContract (contract) {

    var ticker;
    if (/^[a-zA-Z]{1,5}$/.test(contract.ticker))
      ticker = contract.ticker.toUpperCase();

    var expiration;
    if (/^201[0-9]{5}$/.test('' + contract.expiration))
      expiration = '' + contract.expiration;

    var strike;
    if (/^\d+(\.\d{1,2})?$/.test(contract.strike))
      strike = parseFloat(contract.strike);

    var right;
    if (/^(?:put|call)$/.test(contract.right))
      right = contract.right.toUpperCase();

    if (!ticker) {
      log.print(log.LVL_XXL, 'ib', 'invalid contract', null, contract);
      return null;
    }
    
    else if (expiration && strike && right)
      return ib.contract.option(ticker, expiration, strike, right);
    
    else
      return ib.contract.stock(ticker);
  }

// requests

  var reqTasks = [];
  var reqQueue = async.queue(function (task, callback) {
    
    if (!connected) {
      var err = { code: -1, msg: 'No connection' };

      // done
      task.active = false;
      task.end(err);

      // release the queue now
      callback(err);
    }

    else {

      // save callback to release the queue later
      task.callback = callback;

      task.id = reqTasks.length;
      reqTasks.push(task);
      task.start(task.id);

      //
      if (task.name === 'subscribe') task.end(null, task.id);
    }
  }, /* REQUEST_CONCURRENCY */ 100);

  ib.on('result', function (event, data) {

    log.print(log.LVL_DEBUG, 'ib', event, data);
  });
  
  ib.on('error', function (err, data) {
    var msg = ('' + err).substring(7 /* removes 'Error: ' */);

    if (!data) {
      log.print(log.LVL_ERROR, 'ib', msg);
      if (msg.indexOf('ECONNREFUSED') !== -1) process.exit();
    }

    else {    
      var lvl = (data.code >= 2000 ? log.LVL_XXL : (data.code >= 1000 ? log.LVL_WARNING : log.LVL_ERROR));
      log.print(lvl, 'ib', msg, JSON.stringify(data));

      var id = data.id;
      if (id >= 0) {
        var task = reqTasks[id];
        if (task) {
          task.active = false;
          task.callback({ code: data.code, msg: msg });
        }
      }
    }
  });

// mktdata

  // inner

    function _valid (value) {

      return (value > -1e4 && value < 1e4);
    }

    function reqMktData (contract, snapshot, id) {
      log.print(log.LVL_XXL, 'ib', '_reqMktData', '(' + id + ', ' + JSON.stringify(contract) + ', ' + snapshot + ')');
      ib.reqMktData(id, contract, '', snapshot, false);
    }

    function cancelMktData (id) {
      log.print(log.LVL_XXL, 'ib', '_cancelMktData', '(' + id + ')');
      ib.cancelMktData(id);

      // release the queue
      var task = reqTasks[id];
      if (task) {
        task.active = false;
        task.callback();
      }
    }

    function onTickData (id, type, value) {
      log.print(log.LVL_XXL, 'ib', '_onTickData', '(' + id + ', ' + type + ', ' + value + ')');
      var task = reqTasks[id];
      if (task && value > 0 && _valid(value)) {
        switch (task.name) {

          case 'snapshot':
          case 'subscribe':

            // append data
            switch (type) {
              case ib.TICK_TYPE.ASK:       task.data.ask.price  = value; break;
              case ib.TICK_TYPE.ASK_SIZE:  task.data.ask.size   = value; break;
              case ib.TICK_TYPE.BID:       task.data.bid.price  = value; break;
              case ib.TICK_TYPE.BID_SIZE:  task.data.bid.size   = value; break;
              case ib.TICK_TYPE.LAST:      task.data.last.price = value; break;
              case ib.TICK_TYPE.LAST_SIZE: task.data.last.size  = value; break;
              case ib.TICK_TYPE.CLOSE:     if (!task.data.last.price) task.data.last.price = value; break;
              case ib.TICK_TYPE.VOLUME:    if (!task.data.last.size)  task.data.last.size  = value; break;
            }

            // if subscribed, send current state immediately
            if (task.name === 'subscribe') task.progress(task.data);

            break;
        }
      }
    }

    function onTickOptionComputation (id, type, iv, delta, optPrice, pvDividend, gamma, vega, theta, undPrice) {
      log.print(log.LVL_XXL, 'ib', '_onTickOptionComputation', '(' + id + ', ' + type + ', ' + iv + ', ' + delta + ', ' + optPrice + ', ' + pvDividend + ', ' + gamma + ', ' + vega + ', ' + theta + ', ' + undPrice + ')');
      var task = reqTasks[id];
      if (task) {
        switch (task.name) {

          case 'snapshot':
          case 'subscribe':

            // append data
            var dest;
            switch (type) {
              case ib.TICK_TYPE.BID_OPTION:   dest = task.data.bid;   break;
              case ib.TICK_TYPE.ASK_OPTION:   dest = task.data.ask;   break;
              case ib.TICK_TYPE.LAST_OPTION:  dest = task.data.last;  break;
              case ib.TICK_TYPE.MODEL_OPTION: dest = task.data.model; break;
            }
            if (_valid(undPrice))   dest.undprice = undPrice;
            if (_valid(optPrice))   dest.price = optPrice;
            if (_valid(iv))         dest.iv = iv * 100;
            if (_valid(delta))      dest.delta = delta;
            if (_valid(gamma))      dest.gamma = gamma;
            if (_valid(theta))      dest.theta = theta;
            if (_valid(vega))       dest.vega = vega;
            if (_valid(pvDividend)) dest.div = pvDividend;

            // if subscribed, send current state immediately
            if (task.name === 'subscribe') task.progress(task.data);

            break;
        }
      }
    }

    function onSnapshotEnd (id) {
      log.print(log.LVL_XXL, 'ib', '_onSnapshotEnd', '(' + id + ')');
      var task = reqTasks[id];
      if (task) {
        task.active = false;
        task.end(null, task.data);

        // release the queue
        task.callback();
      }
    }

    ib.on('tickPrice', onTickData);
    ib.on('tickSize',  onTickData);
    ib.on('tickOptionComputation', onTickOptionComputation);
    ib.on('tickSnapshotEnd', onSnapshotEnd);

  // outer

    function snapshot (_contract, callback) {
      var contract = inContract(_contract);
      if (contract)
        reqQueue.push({
          active: true,
          name: 'snapshot',
          contract: contract,
          contractHash: log.contractToString(contract),
          start: reqMktData.bind(/* this */ null, contract, /* snapshot */ true),
          end: callback,
          data: {
            bid: {
              // undprice
              // price
              // size
              // iv
              // delta
              // gamma
              // theta
              // vega
              // div
            },
            ask: {
              // ...
            },
            last: {
              // ...
            },
            model: {
              // ...
            }
          }
        });
    }

    function subscribe (_contract, callback, progress) {
      var contract = inContract(_contract);
      if (contract)
        reqQueue.push({
          active: true,
          name: 'subscribe',
          contract: contract,
          contractHash: log.contractToString(contract),
          start: reqMktData.bind(/* this */ null, contract, /* snapshot */ false),
          end: callback,
          progress: progress,
          data: {
            bid: {
              // undprice
              // price
              // size
              // iv
              // delta
              // gamma
              // theta
              // vega
              // div
            },
            ask: {
              // ...
            },
            last: {
              // ...
            },
            model: {
              // ...
            }
          }
        });
    }

    function unsubscribe (_id) {
      var task = reqTasks[_id];
      if (task.active && task.name === 'subscribe') {
        task.active = false;
        cancelMktData(_id);
      }
    }

    function cancel () {
      var id = reqTasks.length;
      var task;
      while (--id >= 0) {
        task = reqTasks[id];
        if (task.active && task.name === 'subscribe') {
          task.active = false;
          cancelMktData(id);
        }
      }
    }

// contractdetails
  /*
  
  // inner

    var tasks = {};

    ib.on('contractDetails', function (id, res) {
      tasks[id].data.push(res);
    });

    ib.on('contractDetailsEnd', function (id) {

      // get result
      var res = tasks[id];
      delete tasks[id];

      // send result
      res.callback(null, (res.data.length === 1) ? res.data[0] : res.data);
    });

  // outer

    function getContractDetails (contract, callback) {
      var id = _getId();

      // create task

        var task = {
          data: [],
          callback: callback
        };

        switch (contract.type) {
          
          case 'stock':
            task.contract = ib.contract.stock(
              contract.ticker
            );
            break;
          
          case 'option':
            task.contract = ib.contract.option(
              contract.ticker,
              contract.expiration || '',
              contract.strike || 0,
              contract.right || ''
            );
            break;

        }

      // queue task
      tasks[id] = task;
      ib.reqContractDetails(id, task.contract);
    }

    return {
      getContractDetails: getContractDetails
    };

  */

// orders
  /*

  var orderId = 1;
  ib.once('nextValidId', function (value) {
    if (value) orderId = value;
    log.print(log.LVL_XXL, 'ib', 'next valid order id', orderId);
  });

  */

//

  connect();
  module.exports = {
    snapshot: snapshot,
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    cancel: cancel
  };
