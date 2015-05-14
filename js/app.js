(function(window) {
  'use strict';

  function debug(str) {
    console.log('Manu FMRadioService -*-:' + str);
  }

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

    function _cloneObject(obj) {
      var cloned = {};
      for (var key in obj) {
        if (typeof obj[key] === 'object') {
          cloned[key] = obj[key];
          continue;
        }

        if (typeof obj[key] !== 'function') {
          cloned[key] = obj[key];
        }
      }
      return cloned;
    }

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
              error: _cloneObject(error)
            }
          });
        });
      }
    }
  };

  // Testing purpose only!!!!
  window.addEventListener('load', function () {
    if (window.ServiceHelper) {
      debug('APP serviceWorker in navigator');
      window.ServiceHelper.register(processSWRequest);
    } else {
      debug('APP navigator does not have ServiceWorker');
      return;
    }
  });

})(window);
