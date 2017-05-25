  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  var config = require('./config'),
      HID = require('node-hid'),
      usb = require('usb'),
      log4js = require('log4js'),
      util = require('util'),
      server = require('./server').start();

  log4js.configure(config.log);
  var logger = log4js.getLogger();

  logger.info('started in ' + process.env.NODE_ENV + ' mode');

  var reading = false,
      interval,
      vid = 0x922,
      pid = 0x8003,
      msg = '';

  interval = setInterval(startReading, 1000);

  usb.on('attach', function (device) {
      if (device.deviceDescriptor.idVendor === vid && device.deviceDescriptor.idProduct === pid) {
          msg = 'Dymo M10 attached';
          logger.info(msg);

          server.subscriber.emit('message', {
              type: 'status',
              code: 'connected',
              content: msg
          });

      }
  });

  usb.on('detach', function (device) {
      if (device.deviceDescriptor.idVendor === vid && device.deviceDescriptor.idProduct === pid) {
          msg = 'Dymo M10 detached';
          logger.warn(msg);

          server.subscriber.emit('message', {
              type: 'status',
              code: 'disconnected',
              content: msg
          });

          reading = false;
      }
  });

  function startReading() {
      if (reading) return;
      try {
          var d = new HID.HID(vid, pid);
          reading = true;

          d.on('data', function (data) {
              var buf = new Buffer(data);
              logger.debug(util.format('0: %s\t1: %s\t2: %s\t3: %s', buf[0], buf[1], buf[2], buf[3]));

              var factor = buf[3];
              if (factor > 127) factor -= 256;
              var weight = (buf[4] + (256 * buf[5])) * Math.pow(10, factor);
              var ounces, grams;
              if (buf[2] == 11) {
                  ounces = weight;
                  grams = ounces * 28.3495;
                  var description = "ounces";
              } else {
                  grams = weight;
                  ounces = grams / 28.3495;
                  var description = "grams";
              }

              if (buf[1] === 5) {
                  logger.warn("Weight is Negative");
                  server.subscriber.emit('message', {
                      status: 'error',
                      error: 'negative_weight'
                  });
              } else if (buf[1] === 6) {
                  logger.warn("Scale Overloaded");
                  server.subscriber.emit('message', {
                      status: 'error',
                      error: 'overloaded'
                  });
              } else if (buf[1] === 3) {
                  logger.warn("Stabilizing");
                  server.subscriber.emit('message', {
                      status: 'error',
                      error: 'stabilizing'
                  });
              } else {
                  logger.debug(weight + ' ' + description);
                  server.subscriber.emit('message', {
                      status: 'ok',
                      mode: description,
                      grams: grams,
                      ounces: ounces
                  });
              }
          });

          d.on('error', function (err) {
              if (!/could not read from HID device/.test(err.message)) {
                  logger.error(err);
                  server.subscriber.emit('message', {
                      type: 'status',
                      code: 'disconnected',
                      content: err.message
                  });
              }

              reading = false;
              d.close();
          });
      } catch (err) {
          if (/cannot open device/.test(err.message)) {
              msg = 'Dymo M10 cannot be found';
              server.subscriber.emit('message', {
                  type: 'status',
                  code: 'disconnected',
                  content: msg
              });
              logger.warn(msg);
          } else {
              logger.error(err);
              server.subscriber.emit('message', {
                  type: 'status',
                  code: 'unknown',
                  message: err.message
              });
          }
      }
  }
