// Generated by CoffeeScript 1.6.3
var ATSerialDevice, EventEmitter, Module, Q, Serial,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Module = require('coffeescript-module').Module;

EventEmitter = require('events').EventEmitter.EventEmitter;

Q = require('q');

Serial = require('serialport');

exports.ATSerialDevice = ATSerialDevice = (function(_super) {
  __extends(ATSerialDevice, _super);

  ATSerialDevice.delegate('_emit', process.EventEmitter);

  ATSerialDevice.delegate('_on', process.EventEmitter);

  ATSerialDevice.delegate('_removeListener', process.EventEmitter);

  ATSerialDevice.prototype.on = function() {
    return _on.call(arguments);
  };

  ATSerialDevice.prototype.emit = function() {
    return _emit.call(arguments);
  };

  ATSerialDevice.prototype.removeListener = function() {
    return _removeListener.call(arguments);
  };

  ATSerialDevice.listDevices = Serial.list;

  function ATSerialDevice(device, baudrate) {
    this.device = device;
    this.send = __bind(this.send, this);
    this.ping = __bind(this.ping, this);
    this.poll = __bind(this.poll, this);
    this._onData = __bind(this._onData, this);
    this._onOpen = __bind(this._onOpen, this);
    this._onClose = __bind(this._onClose, this);
    this._onError = __bind(this._onError, this);
    this.close = __bind(this.close, this);
    this.open = __bind(this.open, this);
    this.on = __bind(this.on, this);
    this.isOpen = false;
    this.responseBuffer = [];
    this.baudrate = baudrate || 115200;
    this.port = new Serial.SerialPort(device, {
      baudrate: this.baudrate
    }, false);
  }

  ATSerialDevice.prototype.open = function() {
    var promise,
      _this = this;
    this.port.on('open', this._onOpen);
    this.port.on('close', this._onClose);
    promise = Q.ninvoke(function(cb) {
      return _this.port.open(cb);
    });
    return promise;
  };

  ATSerialDevice.prototype.close = function() {
    var promise,
      _this = this;
    promise = Q.ninvoke(function(cb) {
      return _this.port.close(cb);
    });
    return promise;
  };

  ATSerialDevice.prototype._onError = function(err) {
    this.isOpen = false;
    console.log("Serial port failed with: \t", err);
    return this.port.removeListener('data', this._onData);
  };

  ATSerialDevice.prototype._onClose = function() {
    this.isOpen = false;
    return this.port.removeListener('data', this._onData);
  };

  ATSerialDevice.prototype._onOpen = function() {
    this.port.on('error', this._onError);
    this.responseBuffer = [];
    this.isOpen = true;
    return this.port.on('data', this._onData);
  };

  ATSerialDevice.prototype._buffer = '';

  ATSerialDevice.prototype._cmd_match = /(.+?)\r\r\n((.|[\r\n])*?(OK|ERROR.*))\r\n/g;

  ATSerialDevice.prototype._onData = function(data) {
    var cmd, isErr, request, res, response, responses, u, unsolicited, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _results;
    this._buffer += data.toString();
    responses = this._buffer.match(this._cmd_match);
    if ((responses != null ? responses.length : void 0) > 0) {
      for (_i = 0, _len = responses.length; _i < _len; _i++) {
        response = responses[_i];
        _ref = response.replace(/\r\n$/, '').split(/\r\r\n/), cmd = _ref[0], res = _ref[1];
        if (((_ref1 = this.responseBuffer) != null ? _ref1[0].request : void 0) === cmd) {
          isErr = /ERROR.*?$/.test(res);
          request = this.responseBuffer.shift();
          if (isErr) {
            if ((_ref2 = request.deferred) != null) {
              _ref2.reject(res, cmd);
            }
          } else {
            if ((_ref3 = request.deferred) != null) {
              _ref3.resolve(res, cmd);
            }
          }
          this.emit(cmd, res);
        }
        this._buffer = this._buffer.replace(response, '');
      }
    }
    if (!(this.responseBuffer.length > 0 && this._buffer.indexOf((_ref4 = this.responseBuffer) != null ? _ref4[0].request : void 0) >= 0)) {
      unsolicited = this._buffer.match(/\r\n(.*)\r\n/g);
      if ((unsolicited != null ? unsolicited.length : void 0) > 0) {
        _results = [];
        for (_j = 0, _len1 = unsolicited.length; _j < _len1; _j++) {
          u = unsolicited[_j];
          _ref5 = u.replace(/\r\n/g, '').split(/:\s/), cmd = _ref5[0], res = _ref5[1];
          this.emit('unsolicited', cmd, res);
          _results.push(this._buffer = this._buffer.replace(u, ''));
        }
        return _results;
      }
    }
  };

  ATSerialDevice.prototype._poller = null;

  ATSerialDevice.prototype._pollID = null;

  ATSerialDevice.prototype.poll = function(start, forever) {
    var _this = this;
    this._poller = this._poller || Q.defer();
    if ((start == null) || start === true) {
      this._pollID = setInterval((function() {
        return _this.ping().then(function() {
          return _this._poller.notify(true);
        }).fail(function() {
          _this._poller.notify(false);
          if (!forever && !_this.isOpen) {
            _this._poller.reject();
            return _this.poll(false);
          }
        })["finally"]((function() {}));
      }), 2500);
    } else {
      clearInterval(this._pollID);
      this._pollID = null;
      if (this._poller.isPending()) {
        this._poller.resolve(true);
      }
      this._poller = null;
    }
    return this._poller.promise;
  };

  ATSerialDevice.prototype.ping = function() {
    var sendPromise;
    sendPromise = this.send('');
    return sendPromise;
  };

  ATSerialDevice.prototype.send = function(request) {
    var deferred, request_index, timeout, wait, _request,
      _this = this;
    deferred = Q.defer();
    if (this.isOpen) {
      wait = this.responseBuffer.length * 100;
      timeout = wait + 2000;
      request = 'AT' + request;
      _request = {
        request: request,
        deferred: deferred
      };
      request_index = this.responseBuffer.push(_request);
      Q.delay(wait).done(function() {
        return _this.port.write(request + '\r', function(err, results) {
          deferred.notify(results);
          if (err) {
            return deferred.reject(new Error(err));
          }
        });
      });
      deferred.promise = deferred.promise.timeout(timeout, "Phone not available");
      deferred.promise["finally"](function() {
        var index;
        index = _this.responseBuffer.indexOf(_request);
        if (index >= 0) {
          return _this.responseBuffer.splice(index, 1);
        }
      });
    } else {
      deferred.reject("phone not connected");
    }
    return deferred.promise;
  };

  return ATSerialDevice;

})(Module);
