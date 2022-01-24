#! /usr/bin/env node

const createUdpStream = require('./');

const port = +process.argv[2] || 8999;

const stream = createUdpStream(port);

stream.on('data', function (message) {
  console.error(message.toString());
  console.log(
    message.address + ':' + message.port,
    message.loopback ? 'loopback' : '',
  );
});

setInterval(function () {
  stream.write(Date.now() + '\n');
}, 1000);
