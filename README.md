### What
This application provides realtime quotes from your Interactive Brokers terminal for the online option risk calculator [www.optionpnl.info](http://www.optionpnl.info). Other data providers currently available ([Google](http://www.google.com/finance) and [Yahoo Finance](http://finance.yahoo.com/)) deliver delayed quotes only.

### Installation

1. Download and install [node.js](http://nodejs.org) framework.
2. Download and unarchive [this app](https://github.com/uqee/mkt-optionpnl-local/archive/master.zip).
3. Open terminal, navigate to the app directory and run `npm install` to install dependencies.

### Using

1. Start [IB Gateway](http://www.interactivebrokers.com/en/software/api/apiguide/api/run_the_api_through_the_ib_gateway.htm).
2. Run `npm start` from the app's directory.
3. Open [www.optionpnl.info](http://www.optionpnl.info) from your browser.
4. To stop the service press `Ctrl-C` in terminal where it was started.

### Parameters

Quotes server starts at `localhost:9999`, please make sure this port is available. Additional startup parameters can be found in the [`.env`](https://github.com/uqee/mkt-optionpnl-local/blob/master/.env) file. To alter them all at once, you may launch the app with [`foreman`](http://github.com/ddollar/foreman) (i.e. `foreman run --env .env npm start`) or just set every environment variable one at a time with `export NAME=value` command (e.g. `export LOG_LEVEL=5`) and run the app afterwards.
