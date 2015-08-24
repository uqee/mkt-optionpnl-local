'use strict';
var colors = require('colors/safe');

// get priority
var LVL_ERROR = 0;
var LVL_WARNING = 1;
var LVL_INFO = 2;
var LVL_DETAILS = 3;
var LVL_XXL = 4;
var LVL = Math.round(process.env.LOG_LEVEL || LVL_XXL);

function _getTime () {
  return ((new Date(Date.now())).toTimeString()).substr(0, 8);
}

function _contractToString (contract) {
  if (!contract) return undefined;
  else {
    var result = contract.ticker;
    if (contract.expiration) result += '-' + contract.expiration;
    if (contract.right) result += '-' + contract.right;
    if (contract.strike) result += '-' + contract.strike;
    return result;
  }
}

// api

  function _print (level, msg, socketId, contract) {
    if (level <= LVL) {

      // timestamp
      var now = _getTime();
      var timestamp;
      switch (level) {
        case LVL_ERROR:   timestamp = colors.red(now);     break;
        case LVL_WARNING: timestamp = colors.magenta(now); break;
        case LVL_INFO:    timestamp = colors.yellow(now);  break;
        case LVL_DETAILS: timestamp = colors.cyan(now);    break;
        case LVL_XXL:     timestamp = colors.gray(now);    break;
      }
      process.stdout.write(timestamp);

      // message
      if (socketId) process.stdout.write('   client ' + socketId);
      process.stdout.write('   ' + colors.green(msg.stack || msg));
      if (contract) process.stdout.write('   ' + _contractToString(contract));
      process.stdout.write('\n');
    }
  }

// exit

  var exited = false;

  function _exit (err) {
    if (err) _print(LVL_ERROR, err);
    if (!exited) {
      exited = true;
      _print(LVL_INFO, 'stopped');
      process.exit();
    }
  }

  process.on('exit', _exit);
  process.on('SIGINT', _exit);
  process.on('uncaughtException', _exit);

module.exports = {
  print: _print,
  LVL_ERROR:   LVL_ERROR,
  LVL_WARNING: LVL_WARNING,
  LVL_INFO:    LVL_INFO,
  LVL_DETAILS: LVL_DETAILS,
  LVL_XXL:     LVL_XXL
};
