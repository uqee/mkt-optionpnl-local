module.exports = function (ib, _getId) {
  'use strict';
  var async = require('async');
  var log = require('../../log');
  var CONCURRENCY = 100;

  // inner

    function _reqMktData (task, callback) {
      var id = _getId();
      log.print(log.LVL_XXL, 'ib', '_reqMktData', '(' + id + ', ' + JSON.stringify(task) + ')');

      // save task
      task.callback = callback;
      task.cancel = _cancelMktData.bind(null, id);
      tasks[id] = task;

      // request
      ib.reqMktData(id, task.contract, '', task._snapshot);
    }

    function _cancelMktData (id) {
      log.print(log.LVL_XXL, 'ib', '_cancelMktData', '(' + id + ')');
      log.print(log.LVL_INFO, 'server', 'unsubscribed', null, tasks[id].contract);

      // cancel subscription
      ib.cancelMktData(id);

      // dequeue
      tasks[id].callback();

      // cleanup
      delete tasks[id];
    }

    function _onTickData (id, type, value) {
      log.print(log.LVL_XXL, 'ib', '_onTickData', '(' + id + ', ' + type + ', ' + value + ')');
      if (tasks[id]) {
        var task = tasks[id];

        // subscribed
        if (!task._snapshot)
          switch (type) {
            case ib.TICK_TYPE.ASK:      task.callback_data(null, { type: 'a',  value: value }); break;
            case ib.TICK_TYPE.BID:      task.callback_data(null, { type: 'b',  value: value }); break;
            case ib.TICK_TYPE.ASK_SIZE: task.callback_data(null, { type: 'as', value: value }); break;
            case ib.TICK_TYPE.BID_SIZE: task.callback_data(null, { type: 'bs', value: value }); break;
          }

        // snapshot
        else {
          var data = task.data;

          // save
          switch (type) {
            case ib.TICK_TYPE.ASK:      data.a  = value; break;
            case ib.TICK_TYPE.BID:      data.b  = value; break;
            case ib.TICK_TYPE.ASK_SIZE: data.as = value; break;
            case ib.TICK_TYPE.BID_SIZE: data.bs = value; break;
          }

          // callback if already full
          if (data.a && data.b && data.as && data.bs) {
            task.callback_done(null, task.data);
            task.cancel();
          }
        }
      }
    }

    function _onSnapshotEnd (id) {
      log.print(log.LVL_XXL, 'ib', '_onSnapshotEnd', '(' + id + ')');
      if (tasks[id]) {
        var task = tasks[id];

        // expose result
        task.callback_done(null, task.data);

        // release queue
        task.callback();

        // release memory
        delete tasks[id];
      }
    }

    var tasks = {};
    var queue = async.queue(_reqMktData, CONCURRENCY);

    ib.on('tickPrice', _onTickData);
    ib.on('tickSize',  _onTickData);
    ib.on('tickSnapshotEnd', _onSnapshotEnd);

  // outer

    function _convertContract (contract) {

      if (contract.type === 'stock')
        return ib.contract.stock(
          contract.ticker
        );

      else if (contract.type === 'option')
        return ib.contract.option(
          contract.ticker,
          contract.expiration,
          contract.strike,
          contract.right
        );
    }

    function _snapshot (req, res, next) {
      log.print(log.LVL_INFO, 'client', 'snapshot requested', null, req.app_data.contract);
      queue.push({
        _snapshot: true,
        contract: _convertContract(req.app_data.contract),
        data: {},
        callback_done: function (err, data) {
          log.print(log.LVL_INFO, 'server', 'snapshot sent', JSON.stringify(data), req.app_data.contract);
          req.app_data.result = data;
          next(err);
        }
      });
    }

    function _subscribe (contract, callback_init, callback_data) {
      log.print(log.LVL_INFO, 'client', 'subscribe requested', null, contract);
      queue.push({
        _snapshot: false,
        contract: _convertContract(contract),
        //data: {},
        callback_init: callback_init,
        callback_data: callback_data
      });
    }

    return {
      snapshot: _snapshot,
      subscribe: _subscribe
    };
};
