#!/usr/bin/env node
// Generated by CoffeeScript 1.6.3
/*
  Staalplaat Phone Server
  -----------------------
  Connect a GSM/AT modem via osc
  * TODO: automated call control
  * TODO: SIM PIN call procedure
  * TODO: Forward signal information
*/

var BROADCAST, OscEmitter, PING_TIME, PORT, audio_devices, dtmfin, osc, ping_interval, startPing, stopPing;

BROADCAST = '255.255.255.255';

PORT = 57441;

PING_TIME = 5;

OscEmitter = require('osc-emitter');

dtmfin = require('node-dtmfin');

osc = new OscEmitter();

osc.add(BROADCAST, PORT);

osc._socket.bind();

ping_interval = null;

startPing = function(osc) {
  return ping_interval = setInterval((function() {
    return osc.emit('/staal/phone/ping');
  }), PING_TIME * 1000);
};

stopPing = function() {
  return clearInterval(ping_interval);
};

audio_devices = dtmfin.list();

if (audio_devices.length === 0) {
  process.exit(-1);
}

setTimeout((function() {
  var e, info;
  osc._socket.setBroadcast(true);
  startPing(osc);
  try {
    return info = dtmfin.open(0, function(code) {
      return osc.emit('/staal/phone/key', code);
    });
  } catch (_error) {
    e = _error;
    return console.error("Failed to open audio device. Exiting");
  }
}), 1000);
