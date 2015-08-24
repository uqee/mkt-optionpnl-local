'use strict';

// inner

  // init
  var ib = new (require('ib'))({
    clientId: process.env.IB_CLIENTID || 0,
    host: process.env.IB_HOST || '127.0.0.1',
    port: process.env.IB_PORT || 7496
  });

  // provide unique order ids
  var _orderid;
  ib.once('nextValidId', function (value) { _orderid = value || 1; });

  // provide unique request ids
  var _id = 0;
  var _getId = function () { return _id++; };

  // connect
  ib.connect();

// outer

  var contractdetails = require('./contractdetails')(ib, _getId);
  var mktdata = require('./mktdata')(ib, _getId);

  module.exports = {
    reqMktData: mktdata.reqMktData,
    getContractDetails: contractdetails.getContractDetails
  };
