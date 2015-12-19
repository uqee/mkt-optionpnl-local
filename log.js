'use strict';
var colors = require('colors/safe');

// get priority
var LVL_ERROR = 0;
var LVL_WARNING = 1;
var LVL_INFO = 2;
var LVL_DETAILS = 3;
var LVL_XXL = 4;
var LVL_DEBUG = 5;
var LVL = Math.round(process.env.LOG_LEVEL || LVL_INFO);

function _timeToString (level) {
  var now = ((new Date(Date.now())).toTimeString()).substr(0, 8);
  switch (level) {
    case LVL_ERROR:   return colors.red(now);
    case LVL_WARNING: return colors.yellow(now);
    case LVL_INFO:    return colors.blue(now);
    case LVL_DETAILS: return colors.cyan(now);
    case LVL_XXL:     return colors.gray(now);
    case LVL_DEBUG:   return colors.white(now);
  }
}

function _contractToString (contract) {
  if (!contract) return undefined;
  else {
    var result = (contract.ticker || contract.symbol);
    if (contract.expiration || contract.expiry) result += '-' + (contract.expiration || contract.expiry);
    if (contract.right) result += '-' + contract.right.toUpperCase();
    if (contract.strike) result += '-' + contract.strike;
    return result;
  }
}

// api

  function _print (level, source, msg, data, contract) {
    if (level <= LVL) {
      process.stdout.write(' ' + _timeToString(level) + ' ');
      if (source) process.stdout.write(' ' + source + ' ');
      if (msg) process.stdout.write(' ' + colors.green((msg.stack || msg)) + ' ');
      if (contract) process.stdout.write(' ' + _contractToString(contract) + ' ');
      if (data) process.stdout.write(' ' + colors.gray(data) + ' ');
      process.stdout.write('\n');
    }
  }

// exit

  var exited = false;

  function _exit (err) {
    if (err) _print(LVL_ERROR, err);
    if (!exited) {
      exited = true;
      _print(LVL_INFO, 'server', 'stopped');
      process.exit();
    }
  }

  process.on('exit', _exit);
  process.on('SIGINT', _exit);
  process.on('uncaughtException', _exit);

module.exports = {
  LVL_ERROR: LVL_ERROR,
  LVL_WARNING: LVL_WARNING,
  LVL_INFO: LVL_INFO,
  LVL_DETAILS: LVL_DETAILS,
  LVL_XXL: LVL_XXL,
  LVL_DEBUG: LVL_DEBUG,
  print: _print,
  contractToString: _contractToString
};
