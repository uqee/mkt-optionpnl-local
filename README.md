### What
This application provides realtime quotes from your Interactive Brokers terminal for the online option risk calculator [www.optionpnl.info](http://www.optionpnl.info). Other data providers currently available ([Google](http://www.google.com/finance) and [Yahoo Finance](http://finance.yahoo.com/)) deliver delayed quotes only.

### Installation

1. Download and install [node.js](http://nodejs.org).
2. Download and unarchive [this app](https://github.com/uqee/mkt-optionpnl-local/archive/master.zip).
3. Open terminal, navigate to the app directory and run `npm install` to install dependencies.

### Using

1. Start [IB Gateway](http://www.interactivebrokers.com/en/software/api/apiguide/api/run_the_api_through_the_ib_gateway.htm).
2. Run `npm start` from the app's directory (if it crashes, please, make sure port `9999` is available).
3. Open [www.optionpnl.info](http://www.optionpnl.info) in your browser.
4. To stop the service press `Ctrl-C` in a terminal where it was started.

### Parameters

Set them before the launch command, like `env LOG_LEVEL=4 npm start`.

| Environment variable | Default value
| --- | ---
| `IB_HOST` | `127.0.0.1`
| `IB_PORT` | `7496`
| `IB_CLIENTID` | `0`
| `LOG_LEVEL` | `2`
