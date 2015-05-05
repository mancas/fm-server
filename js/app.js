(function(window) {
  'use strict';

  function debug(str) {
    console.log("MANU - FMRadioService -*-:" + str);
  }

  // This is a very basic sample app that uses a SW and acts as a server for
  // navigator.connect. I'm going to mark with a comment where the app MUST
  // add some extra code to use the navigator.connect SHIM
  // So if you just want to know that, search for:
  // ADDED FOR SHIM

  var register = function(evt) {
    debug('APP executing register...');
    navigator.serviceWorker.
      register('/fm-server/sw.js', {scope: './'}).
      then(function(reg) {
        debug('APP Registration succeeded. Scope: ' + reg.scope);
        if (reg.installing) {
          debug('APP registration --> installing');
        } else if (reg.waiting) {
          debug('APP registration --> waiting');
        } else if (reg.active) {
          debug('APP registration --> active');
        }
      }).catch(function(error) {
        debug('APP Registration failed with ' + error);
      });
  };

  var unregister = function(evt) {
    debug('APP Unregister...');
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => {
        reg.unregister();
        debug('APP Unregister done');
      });
    });
  };

  // Ok, this kinda sucks because most APIs (and settings is one of them) cannot
  // be accessed from outside the main thread. So basically everything has to go
  // down to the SW thread, then back up here for processing, then back down to
  // be sent to the client. Yay us!
  var processSWRequest = function(channel, evt) {

    var _mozFMRadio = navigator.mozFMRadio;
    // We can get:
    // * get
    // * methodName
    // * onpropertychange
    // All the operations have a requestId
    var remotePortId = evt.data.remotePortId;
    var request = evt.data.remoteData;
    var requestOp = request.data;

    function onPropertyChangeTemplate(handler, property) {
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: request.id,
          result: {
            handler: handler,
            propertyValue: _mozFMRadio[property]
          }
        }
      });
    }

    if (requestOp.operation === 'get') {
      // It's a get...
      // Let's assume this works always..
      channel.postMessage({
        remotePortId: remotePortId,
        data: {
          id: request.id,
          result: {
            name: requestOp.name,
            value: _mozFMRadio[requestOp.name]
          }
        }
      });
    } else if (requestOp.operation === 'onpropertychange') {
      _mozFMRadio[requestOp.handler] =
        onPropertyChangeTemplate.bind(null, requestOp.handler,
          requestOp.property);
    } else {
      if (typeof _mozFMRadio[requestOp.operation] === 'function') {
        _mozFMRadio[requestOp.operation](requestOp.params).then(result => {
          channel.postMessage({
            remotePortId: remotePortId,
            data: {
              id: request.id,
              result: result
            }
          });
        }).catch(error => {
          channel.postMessage({
            remotePortId: remotePortId,
            data: {
              id: request.id,
              error: error
            }
          });
        });
      }
    }
  };

  // Testing purpose only!!!!
  window.addEventListener('load', function () {
    if ('serviceWorker' in navigator) {
      debug('APP serviceWorker in navigator');
      register();
      navigator.serviceWorker.ready.then(sw => {
        // Let's pass the SW some way to talk to us...
        var mc = new MessageChannel();
        mc.port1.onmessage = processSWRequest.bind(this, mc.port1);
        sw.active && sw.active.postMessage({}, [mc.port2]);
      });
    } else {
      debug('APP navigator does not have ServiceWorker');
      return;
    }
  });

})(window);
