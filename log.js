'use strict';
var colors = require('colors/safe');

function _getTime () {
  return (new Date(Date.now())).toTimeString();
}

// api

  function _printMsg (msg) {
    console.log(colors.yellow(_getTime()), msg);
  }

  function _printErr (err) {
    console.log(colors.red(_getTime()), err.stack || err);
  }

// exit

  var exited = false;

  function _exit (err) {
    if (err) _printErr(err);
    if (!exited) {
      exited = true;
      _printMsg('server stopped');
      process.exit();
    }
  }

  process.on('exit', _exit);
  process.on('SIGINT', _exit);
  process.on('uncaughtException', _exit);

module.exports = {
  msg: _printMsg,
  err: _printErr
};
