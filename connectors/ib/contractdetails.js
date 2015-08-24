module.exports = function (ib, _getId) {
  'use strict';

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

};
