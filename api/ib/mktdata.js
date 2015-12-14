module.exports = function (ib, _getId, _convertContract) {
  'use strict';
  var async = require('async');
  var log = require('../../log');
  var CONCURRENCY = 100;

  // inner

    function _reqMktData (task, callback) {
      var id = _getId();
      log.print(log.LVL_XXL, 'ib', '_reqMktData', '(' + id + ', ' + JSON.stringify(task) + ')');

      // save task
      task._callback = callback;
      task.cancel = _cancelMktData.bind(null, id);
      tasks[id] = task;

      // request
      ib.reqMktData(id, task.contract, '', task._snapshot);
    }

    function _cancelMktData (id) {
      log.print(log.LVL_XXL, 'ib', '_cancelMktData', '(' + id + ')');

      // cancel subscription
      ib.cancelMktData(id);

      // dequeue
      tasks[id]._callback();

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
            case ib.TICK_TYPE.ASK:      task.callback(null, { type: 'a',  value: value }); break;
            case ib.TICK_TYPE.BID:      task.callback(null, { type: 'b',  value: value }); break;
            case ib.TICK_TYPE.ASK_SIZE: task.callback(null, { type: 'as', value: value }); break;
            case ib.TICK_TYPE.BID_SIZE: task.callback(null, { type: 'bs', value: value }); break;
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
            task.callback(null, task.data);
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
        task.callback(null, task.data);

        // release queue
        task._callback();

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

    function _snapshot (contract, callback) {
      var contractib = _convertContract(contract);
      if (contractib)
        queue.push({
          _snapshot: true,
          _contractHash: log.contractToString(contract),
          contract: contractib,
          data: {},
          callback: callback
        });
    }

    function _subscribe (contract, callback) {
      var contractib = _convertContract(contract);
      if (contractib)
        queue.push({
          _snapshot: false,
          _contractHash: log.contractToString(contract),
          contract: contractib,
          //data: {},
          callback: callback
        });
    }

    function _unsubscribe (contract) {
      var contractib = _convertContract(contract);
      if (contractib) {
        var contractHash = log.contractToString(contract);
        for (var id in tasks)
          if (tasks.hasOwnProperty(id) && tasks[id]._contractHash === contractHash)
            return tasks[id].cancel();
      }
    }

    function _cancelall () {
      for (var id in tasks)
        if (tasks.hasOwnProperty(id))
          tasks[id].cancel();
    }

    return {
      snapshot: _snapshot,
      subscribe: _subscribe,
      unsubscribe: _unsubscribe,
      cancelall: _cancelall
    };
};
