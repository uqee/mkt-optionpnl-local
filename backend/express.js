'use strict';
var app = require('express')();

// custom data storage
app.use(function (req, res, next) {
  req.app_data = {};
  next();
});

// routes
var router = require('./router');
app.use('/', router);

// result sender
app.use(function (req, res, next) {
  var $data = req.app_data;
  res
    .status($data.status ? $data.status : ($data.result ? 200 : 404))
    .json($data.result)
    .end();
});

// exception handler
app.use(function (err, req, res, next) {
  if (!err.mycode && !err.mytext) console.trace(err);
  res
    .status(err.mycode || 500)
    .send(err.mytext || 'internal server error');
});

// done
var server = require('http').createServer(app);
module.exports = server;
