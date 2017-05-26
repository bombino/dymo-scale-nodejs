# Read data from DYMO M25/M10 digital scale using nodejs

This app opens a websocket server that reads data from DYMO M25/M10 digital scale and
publishes via a local WebSocket.

This app is tested in Windows 10 and Mac OS Sierra and works great on
both platforms.  No driver installation is needed for the scale.  Unlike
other solutions, this app does not require installing a dummy kernel
driver on Mac OS.


## Installation

Simply clone this repository and install the dependencies via NPM:

```
npm install
```

## Running as a Daemon

We suggest using the `pm2` process manager to launch the server.  After
installing pm2 (`npm install -g pm2`), you can run this:

```
pm2 start app
```
