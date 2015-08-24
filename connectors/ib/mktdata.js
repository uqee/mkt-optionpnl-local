module.exports = function (ib, _getId) {
  'use strict';
  var async = require('async'),
      CONCURRENCY = 100;

  // inner

    function _subscribe (task, callback) {
      var id = _getId();

      // save task
      tasks[id] = task;

      // request initial data
      ib.reqMktData(id, task.contract, '', /* snapshot = */ true);
      queue.concurrency -= 10;

      // return unsubscriber func
      callback(null, _unsubscribe.bind(null, id));
    }

    function _unsubscribe (id) {

      // unsubscribe from data
      ib.cancelMktData(id);

      // delete task
      delete tasks[id];
      queue.concurrency++;
    }

    function _onTickData (id, type, value) {
      if (!tasks[id]) return;
      switch (type) {
        case ib.TICK_TYPE.ASK:      tasks[id].callback(null, { type: 'a',  value: value }); break;
        case ib.TICK_TYPE.BID:      tasks[id].callback(null, { type: 'b',  value: value }); break;
        case ib.TICK_TYPE.ASK_SIZE: tasks[id].callback(null, { type: 'as', value: value }); break;
        case ib.TICK_TYPE.BID_SIZE: tasks[id].callback(null, { type: 'bs', value: value }); break;
      }
    }

    function _onSnapshotEnd (id) {
      if (!tasks[id]) return;
      ib.reqMktData(id, tasks[id].contract, '', /* snapshot = */ false);
      queue.concurrency += 9;
    }

    var tasks = {};
    var queue = async.queue(_subscribe, CONCURRENCY);

    ib.on('tickPrice', _onTickData);
    ib.on('tickSize',  _onTickData);
    ib.on('tickSnapshotEnd', _onSnapshotEnd);

  // outer

    function reqMktData (contract, callback_init, callback_data) {

      // create task
      var task = { callback: callback_data };
      switch (contract.type) {
        
        case 'stock':
          task.contract = ib.contract.stock(
            contract.ticker
          );
          break;
        
        case 'option':
          task.contract = ib.contract.option(
            contract.ticker,
            contract.expiration,
            contract.strike,
            contract.right
          );
          break;
      }

      // queue task
      queue.push(task, callback_init);
    }

    return {
      reqMktData: reqMktData
    };
};
