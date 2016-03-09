/*jshint
    expr:   true
*/
/*global self, respecEvents, respecConfig */

// Module core/base-runner
// The module in charge of running the whole processing pipeline.
// CONFIGURATION:
//  - trace: activate tracing for all modules
//  - preProcess: an array of functions that get called (with no parameters)
//      before anything else happens. This is not recommended and the feature is not
//      tested. Use with care, if you know what you're doing. Chances are you really
//      want to be using a new module with your own profile
//  - postProcess: the same as preProcess but at the end and with the same caveats
//  - afterEnd: a single function called at the end, after postProcess, with the
//      same caveats. These two coexist for historical reasons; please not that they
//      are all considered deprecated and may all be removed.
"use strict";
(function (GLOBAL) {
    // pubsub
    // freely adapted from http://higginsforpresident.net/js/static/jq.pubsub.js
    var handlers = {}
    ,   embedded = (top !== self)
    ;
    if (!("respecConfig" in window)) window.respecConfig = {};
    GLOBAL.respecEvents = {
        pub:    function (topic) {
            var args = Array.prototype.slice.call(arguments);
            args.shift();
            if (embedded && window.postMessage) {
                // Make sure all args are structured-cloneable.
                args = args.map(function(arg) {
                    return (arg.stack || arg) + '';
                });
                parent.postMessage({ topic: topic, args: args}, "*");
            }
            $.each(handlers[topic] || [], function () {
                this.apply(GLOBAL, args);
            });
        }
    ,   sub:    function (topic, cb) {
            if (!handlers[topic]) handlers[topic] = [];
            handlers[topic].push(cb);
            return [topic, cb];
        }
    ,   unsub:  function (opaque) { // opaque is whatever is returned by sub()
            var t = opaque[0];
            handlers[t] && $.each(handlers[t] || [], function (idx) {
                if (this == opaque[1]) handlers[t].splice(idx, 1);
            });
        }
    };
}(this));

// these need to be improved, or complemented with proper UI indications
if (window.console) {
    respecEvents.sub("warn", function (details) {
        console.warn("WARN: ", details);
    });
    respecEvents.sub("error", function (details) {
        console.error("ERROR: ", details);
    });
    respecEvents.sub("start", function (details) {
        if (respecConfig && respecConfig.trace) console.log(">>> began: " + details);
    });
    respecEvents.sub("end", function (details) {
        if (respecConfig && respecConfig.trace) console.log("<<< finished: " + details);
    });
}

define([], function() {
  return {
    runAll: function(plugs) {
      respecEvents.pub("start-all");
      respecEvents.pub("start", "core/base-runner");
      ["postProcess", "preProcess", "afterEnd"].map(function(deprecated) {
        if (deprecated in respecConfig) {
          var msg = "Using " + deprecated +
            " in respecConfig is deprecated.";
          messages.pub("error", msg)
        }
      })
      var promisesToFinish = plugs
        .filter(function(plug) {
          // excludes self, non-runnable, and modules that return falsy objects
          return plug && typeof plug.run === "function" && plug !==
            this;
        })
        .map(function(plug) {
          // to a promise
          return new Promise(function(resolve) {
            plug.run(respecConfig, document, resolve, respecEvents);
          });
        });
      Promise.all(promisesToFinish)
        .then(function() {
          respecEvents.pub("end", "core/base-runner");
          respecEvents.pub("end-all", "core/base-runner");
          document.respecDone = true;
        })
        .catch(function(err) {
          // Runtime errors should not be reported to user. Only explicity messages.
          throw err;
        });
    },
  };
});
