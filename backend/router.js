'use strict';

// input

  function _inType (req, res, next) {
    var $data = req.app_data;
    var type = req.query.type;

    if (/^(?:stock|option)$/.test(type)) {
      if (!$data.contract) $data.contract = {};
      $data.contract.type = type;
      return next();
    }

    else next({
      mycode: 400,
      mytext: 'invalid type'
    });
  }

  function _inTicker (req, res, next) {
    var $data = req.app_data;
    var ticker = req.query.ticker;

    if (/^((nasdaq|nyse):)?[a-zA-Z]{1,5}$/.test(ticker)) {
      if (!$data.contract) $data.contract = {};
      $data.contract.ticker = ticker.toUpperCase();
      return next();
    }

    else next({
      mycode: 400,
      mytext: 'invalid ticker'
    });
  }

  function _inExpiration (req, res, next) {
    var $data = req.app_data;
    var expiration = req.query.expiration;

    if (/^201[0-9]{5}$/.test(expiration)) {
      if (!$data.contract) $data.contract = {};
      $data.contract.expiration = expiration;
      return next();
    }

    else next({
      mycode: 400,
      mytext: 'invalid expiration'
    });
  }

  function _inStrike (req, res, next) {
    var $data = req.app_data;
    var strike = req.query.strike;

    if (/^\d+(\.\d{1,2})?$/.test(strike)) {
      if (!$data.contract) $data.contract = {};
      $data.contract.strike = parseFloat(strike);
      return next();
    }

    else next({
      mycode: 400,
      mytext: 'invalid strike'
    });
  }

  function _inRight (req, res, next) {
    var $data = req.app_data;
    var right = req.query.right;

    if (/^(?:put|call)$/.test(right)) {
      if (!$data.contract) $data.contract = {};
      $data.contract.right = right.toUpperCase();
      return next();
    }

    else next({
      mycode: 400,
      mytext: 'invalid right'
    });
  }

  function _optionalExpiration (req, res, next) {
    if (!req.query.expiration) return next();
    else _inExpiration(req, res, next);
  }

  function _optionalStrike (req, res, next) {
    if (!req.query.strike) return next();
    else _inStrike(req, res, next);
  }

  function _optionalRight (req, res, next) {
    if (!req.query.right) return next();
    else _inRight(req, res, next);
  }

  function _verifyContract (req, res, next) {
    var contract = req.app_data.contract;
    if (
      contract &&
      (
        (
          contract.type === 'stock' &&
          contract.ticker &&
          !contract.expiration &&
          !contract.strike &&
          !contract.right
        ) || (
          contract.type === 'option' &&
          contract.ticker &&
          contract.expiration &&
          contract.strike &&
          contract.right
        )
      )
    ) next();
    else next({
      mycode: 400,
      mytext: 'invalid contract'
    });
  }

// routes

  var router = require('express').Router();
  var api = require('./api');

  // ib

    router.get('/api/ib/snapshot',
      _inType,
      _inTicker,
      _optionalExpiration,
      _optionalStrike,
      _optionalRight,
      _verifyContract,
      api.ib.mktdata.snapshot
    );

module.exports = router;
