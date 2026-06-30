var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// <define:import.meta.env>
var init_define_import_meta_env = __esm({
  "<define:import.meta.env>"() {
  }
});

// node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "node_modules/react/cjs/react.production.min.js"(exports) {
    "use strict";
    init_define_import_meta_env();
    var l = Symbol.for("react.element");
    var n = Symbol.for("react.portal");
    var p = Symbol.for("react.fragment");
    var q = Symbol.for("react.strict_mode");
    var r = Symbol.for("react.profiler");
    var t = Symbol.for("react.provider");
    var u = Symbol.for("react.context");
    var v = Symbol.for("react.forward_ref");
    var w = Symbol.for("react.suspense");
    var x = Symbol.for("react.memo");
    var y = Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B2 = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B2;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B2;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports.Component = E;
    exports.Fragment = p;
    exports.Profiler = r;
    exports.PureComponent = G;
    exports.StrictMode = q;
    exports.Suspense = w;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports.act = X;
    exports.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports.createElement = M;
    exports.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports.isValidElement = O;
    exports.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports.unstable_act = X;
    exports.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports.useId = function() {
      return U.current.useId();
    };
    exports.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports.useState = function(a) {
      return U.current.useState(a);
    };
    exports.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports.useTransition = function() {
      return U.current.useTransition();
    };
    exports.version = "18.3.1";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    init_define_import_meta_env();
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState3(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect2(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create, deps);
        }
        function useInsertionEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create, deps);
        }
        function useLayoutEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create, deps);
        }
        function useImperativeHandle(ref, create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module && module[requireString];
              enqueueTaskImpl = nodeRequire.call(module, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.act = act;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect2;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef;
        exports.useState = useState3;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    init_define_import_meta_env();
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production_min();
    } else {
      module.exports = require_react_development();
    }
  }
});

// scripts/gen-db-invoice.mjs
init_define_import_meta_env();
import fs from "node:fs";

// src/core/invoiceHtml.js
init_define_import_meta_env();

// src/core/styleTokens.jsx
init_define_import_meta_env();
var import_react2 = __toESM(require_react(), 1);

// src/core/referenceCache.js
init_define_import_meta_env();
var FALLBACK_CURRENCY = { INR: { symbol: "\u20B9", name: "Indian Rupee", toINR: 1 } };
var SYMBOL_FALLBACK = { INR: "\u20B9", USD: "$", EUR: "\u20AC", GBP: "\xA3", AED: "\u062F.\u0625", KES: "KSh", TZS: "TSh", CDF: "FC" };
var FALLBACK_BRANCHES = [
  { code: "BOMMB", city: "Mumbai", country: "India", flag: "\u{1F1EE}\u{1F1F3}", currency: "INR", currencies: ["INR"] },
  { code: "BOM", city: "Mumbai", country: "India", flag: "\u{1F1EE}\u{1F1F3}", currency: "INR", currencies: ["INR"] },
  { code: "AMD", city: "Ahmedabad", country: "India", flag: "\u{1F1EE}\u{1F1F3}", currency: "INR", currencies: ["INR"] },
  { code: "NBO", city: "Nairobi", country: "Kenya", flag: "\u{1F1F0}\u{1F1EA}", currency: "USD", currencies: ["USD", "KES"] },
  { code: "DAR", city: "Dar es Salaam", country: "Tanzania", flag: "\u{1F1F9}\u{1F1FF}", currency: "USD", currencies: ["USD", "TZS"] },
  { code: "FBM", city: "Lubumbashi", country: "DR Congo", flag: "\u{1F1E8}\u{1F1E9}", currency: "USD", currencies: ["USD", "CDF"] }
];
var FALLBACK_CFG = { cur: "\u20B9", curCode: "INR", taxType: "GST", vatRate: null, gstRates: [5, 12, 18], hasIGST: true, psOptions: [], voucherPrefix: "BOM" };
var FALLBACK_CFG_ALL = { cur: "\u20B9", curCode: "INR", taxType: "MULTI", vatRate: null, gstRates: [5, 12, 18], hasIGST: true, psOptions: [], voucherPrefix: "BOMMB" };
var FALLBACK_ROLES = { "Super Admin": { name: "Super Admin", branches: "ALL", perms: {}, special: {}, _fullAccess: true } };
var _currency = { ...FALLBACK_CURRENCY };
var _branchCfg = {};
var _profiles = {};
var _hsnByModule = {};
var _roles = { ...FALLBACK_ROLES };
var BRANCHES = [...FALLBACK_BRANCHES];
var BRANCH_CODES = FALLBACK_BRANCHES.map((b) => b.code);
var ACTIVE_CURRENCIES = Object.keys(FALLBACK_CURRENCY);
function fxToINR(code2) {
  return _currency[code2]?.toINR ?? 1;
}
function currencySymbolOf(code2) {
  return _currency[code2]?.symbol || code2 || "";
}
var FX_RATES = new Proxy({}, {
  get: (_t, k) => fxToINR(String(k)),
  has: (_t, k) => String(k) in _currency,
  ownKeys: () => Reflect.ownKeys(_currency),
  getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: fxToINR(String(k)) })
});
var CURRENCY_META = new Proxy({}, {
  get: (_t, k) => _currency[k],
  has: (_t, k) => k in _currency,
  ownKeys: () => Reflect.ownKeys(_currency),
  getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: _currency[k] })
});
function resolveCurSym(code2) {
  if (!code2) return "";
  const meta2 = currencySymbolOf(code2);
  if (meta2 && meta2 !== code2) return meta2;
  return SYMBOL_FALLBACK[code2] || code2;
}
function profileToCfg(p) {
  const code2 = p.currency || BRANCHES.find((b) => b.code === p.code)?.currency || "INR";
  return {
    cur: p.cur_sym || resolveCurSym(code2),
    curCode: code2,
    taxType: p.taxType || "GST",
    vatRate: p.vatRate ?? null,
    gstRates: p.gstRates || [],
    hasIGST: !!p.hasIGST,
    psOptions: p.psOptions || [],
    voucherPrefix: p.voucherPrefix || p.code,
    secondaryCur: p.secondaryCurSym || "",
    secondaryCurCode: p.secondaryCurrency || "",
    isHO: !!p.isHO
  };
}
function setBranchCfg(profiles) {
  const map = {}, raw = {};
  (profiles || []).forEach((p) => {
    if (p && p.code) {
      map[p.code] = profileToCfg(p);
      raw[p.code] = p;
    }
  });
  if (Object.keys(map).length) {
    _branchCfg = map;
    _profiles = raw;
  }
}
var VAT_RATE = { NBO: 16, DAR: 18, FBM: 16 };
function deriveCfgFromBranch(code2) {
  const b = BRANCHES.find((x) => x.code === code2);
  if (!b) return null;
  const taxStr = String(b.tax || "");
  const isVat = VAT_RATE[code2] != null || /vat/i.test(taxStr);
  const vr = VAT_RATE[code2] ?? (parseFloat((taxStr.match(/(\d+(?:\.\d+)?)\s*%/) || [])[1]) || null);
  return {
    cur: resolveCurSym(b.currency),
    curCode: b.currency || "INR",
    taxType: isVat ? "VAT" : "GST",
    vatRate: isVat ? vr : null,
    gstRates: isVat ? [] : [5, 12, 18],
    hasIGST: !isVat,
    psOptions: [],
    voucherPrefix: code2,
    secondaryCur: "",
    secondaryCurCode: b.currencies && b.currencies[1] || "",
    isHO: !!b.isHO
  };
}
function branchCfg(code2) {
  if (code2 === "ALL") return _branchCfg.ALL || FALLBACK_CFG_ALL;
  return _branchCfg[code2] || deriveCfgFromBranch(code2) || _branchCfg.BOM || FALLBACK_CFG;
}
function companyProfile(code2) {
  return _profiles[code2] || _profiles.BOM || {};
}
function hsnSacFor(moduleName) {
  return _hsnByModule[String(moduleName || "").toLowerCase().trim()] || "";
}

// src/core/hooks.js
init_define_import_meta_env();
var import_react = __toESM(require_react(), 1);

// src/core/data.js
init_define_import_meta_env();
var NOTIFICATIONS_DATA = [];

// src/core/notifStore.js
init_define_import_meta_env();
var _NOTIFS = [...NOTIFICATIONS_DATA];

// src/core/styleTokens.jsx
var B = new Proxy({}, {
  get: (_t, code2) => branchCfg(code2 === "ALL" ? "ALL" : String(code2)),
  has: () => true
});
function bc(branch2) {
  return branch2 === "ALL" ? B.ALL : B[branch2?.code] || B.BOM;
}

// src/core/invoiceHtml.js
var MODULE_NAME = {
  SF: "Flight",
  RF: "Flight",
  RI: "Flight",
  SH: "Hotel",
  SHT: "Holiday",
  HP: "Holiday",
  SC: "Car",
  SV: "Visa",
  SI: "Insurance",
  SM: "Misc",
  MS: "Misc"
};
var GST_STATES = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};
var SAC_BY_MODULE = {
  SF: "996421",
  RF: "996421",
  RI: "996421",
  // air ticketing / refund / reissue
  SH: "996311",
  // hotel accommodation
  SHT: "998555",
  HP: "998555",
  // holiday / tour package
  SC: "996601",
  SV: "998212",
  SI: "997131",
  // car rental / visa / travel insurance
  SM: "998599",
  MS: "998599"
  // misc travel arrangement
};
var ISSUER_FALLBACK = {
  BOM: {
    entity: "Travkings Tours & Travels",
    gstin: "27AAMCT1096J1ZU",
    state: "Maharashtra",
    stateCode: "27",
    operAddr: "Venus Tower, B 603, Veera Desai Rd, Azad Nagar 2, Mhada Colony, Jeevan Nagar, Andheri West, Mumbai, Maharashtra 400053",
    phone: "+91 88280 06599",
    email: "accounts.bom@travkings.com",
    cur_sym: "\u20B9",
    authSignatory: "Afshin Dhanani",
    authDesignation: "Founder & Director",
    banks: [
      { bankName: "ICICI Bank", acName: "Travkings Tours & Travels Private Limited", branch: "Versova Link Road Branch, Andheri West", acNo: "333805003566", ifsc: "ICIC0003338", swift: "ICICINBBCTS", type: "Current", primary: true }
    ]
  },
  AMD: {
    entity: "Travkings Tours & Travels",
    gstin: "24AABCT1234H1Z2",
    state: "Gujarat",
    stateCode: "24",
    operAddr: "202, Shapath IV, SG Highway, Ahmedabad 380 054",
    phone: "+91 79 4000 5678",
    email: "ahmedabad@travkings.com",
    cur_sym: "\u20B9",
    authSignatory: "Afshin Dhanani",
    authDesignation: "Founder & Director",
    banks: [{ bankName: "ICICI Bank", branch: "CG Road", acNo: "987654321098", ifsc: "ICIC0005678", type: "Current", primary: true }]
  }
};
var esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
function inWords(num) {
  num = Math.round(num);
  if (num === 0) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const seg = (x) => {
    let s = "";
    if (x > 99) {
      s += a[Math.floor(x / 100)] + " Hundred ";
      x %= 100;
    }
    if (x > 19) {
      s += b[Math.floor(x / 10)] + " ";
      x %= 10;
    }
    if (x > 0) s += a[x] + " ";
    return s;
  };
  let out = "", cr = Math.floor(num / 1e7);
  num %= 1e7;
  const lk = Math.floor(num / 1e5);
  num %= 1e5;
  const th = Math.floor(num / 1e3);
  num %= 1e3;
  if (cr) out += seg(cr) + "Crore ";
  if (lk) out += seg(lk) + "Lakh ";
  if (th) out += seg(th) + "Thousand ";
  if (num) out += seg(num);
  return out.trim();
}
var CSS = `
  .iv{--gold:#A07828;--gold-l:#C49A3C;--dark:#111;--ink:#1A1A1A;--ink2:#3A3A3A;--ink3:#6A6A6A;--ink4:#9A9A9A;--rule:#DEDBD4;--bg-lt:#F2EFE9;--paper:#FFF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--ink);background:var(--paper)}
  .iv *{box-sizing:border-box;margin:0;padding:0}
  .iv .sheet{max-width:860px;margin:0 auto;background:var(--paper);padding:30px 40px}
  .iv .title{text-align:center;font-size:30px;font-weight:800;letter-spacing:2px}
  .iv .title-rule{height:1px;background:var(--gold);margin:9px 0 22px}
  .iv .tophead{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
  .iv .brandcol{display:flex;flex-direction:column;align-items:flex-start}
  .iv .tk-logo{height:104px;width:auto;display:block;image-rendering:-webkit-optimize-contrast}
  .iv .titlebar{position:relative;display:flex;align-items:center;justify-content:center}
  .iv .iata-badge{position:absolute;right:0;top:50%;transform:translateY(-50%);height:26px;width:auto;display:block}
  .iv .inv-meta{text-align:right;min-width:260px}
  .iv .inv-meta .row{display:flex;justify-content:flex-end;gap:18px;align-items:baseline;padding:3px 0}
  .iv .inv-meta .k{font-size:9px;letter-spacing:1px;color:var(--ink4);text-transform:uppercase}
  .iv .inv-meta .v{font-size:12.5px;font-weight:700;min-width:120px;text-align:right}
  .iv .inv-meta .v.big{font-size:17px;font-weight:800}
  .iv .inv-meta .firstline{border-bottom:1px solid var(--rule);padding-bottom:6px;margin-bottom:4px}
  .iv .blackrule{height:2.5px;background:var(--dark);margin:16px 0 20px}
  .iv .parties{display:flex;margin-bottom:22px}
  .iv .party{flex:1;padding-right:24px}
  .iv .party+.party{padding-left:24px;border-left:1px solid var(--rule)}
  .iv .party .lab{font-size:9.5px;font-weight:700;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px}
  .iv .party .nm{font-size:16px;font-weight:800;margin-bottom:8px}
  .iv .party .ln{font-size:11px;color:var(--ink3);line-height:1.8}
  .iv .fb-label{font-size:9.5px;font-weight:700;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px}
  .iv table{width:100%;border-collapse:collapse}
  .iv thead th{font-size:9px;font-weight:700;color:var(--ink3);text-transform:uppercase;text-align:right;padding:8px;background:var(--bg-lt);border-top:2px solid var(--dark);border-bottom:2px solid var(--dark)}
  .iv thead th.l{text-align:left}
  .iv tbody td{padding:12px 8px;border-bottom:1px solid var(--rule);font-size:11.5px;text-align:right;vertical-align:top}
  .iv tbody td.l{text-align:left}
  .iv .desc .nm{font-size:12.5px;font-weight:800;line-height:1.35;margin-bottom:5px}
  .iv .desc .sub{font-size:10px;line-height:1.6}
  .iv .desc .idl{color:var(--ink2)}
  .iv .desc .secs{margin-top:6px;display:flex;flex-direction:column;gap:4px}
  .iv .desc .sub.sec{color:var(--ink4);padding-left:12px;position:relative;white-space:nowrap;font-size:9px}
  .iv .desc .sub.sec::before{content:"\u203A";position:absolute;left:0;color:var(--gold);font-weight:700}
  .iv td.tf{font-weight:800}
  .iv .summary{display:flex;justify-content:flex-end;margin-top:14px}
  .iv .sumtbl{width:360px}
  .iv .sumtbl .r{display:flex;justify-content:space-between;padding:8px 4px;font-size:12px;border-bottom:1px solid var(--rule)}
  .iv .sumtbl .r .k{color:var(--ink2)} .iv .sumtbl .r .v{font-weight:800}
  .iv .sumtbl .net{display:flex;justify-content:space-between;align-items:center;background:var(--dark);color:#fff;padding:12px 16px;margin-top:4px}
  .iv .sumtbl .net .k{font-size:11.5px;font-weight:700;letter-spacing:1px}
  .iv .sumtbl .net .v{font-size:19px;font-weight:800;color:var(--gold-l)}
  .iv .botrule{height:1px;background:var(--rule);margin:20px 0 14px}
  .iv .botgrid{display:flex;justify-content:space-between;gap:30px}
  .iv .botleft{flex:1}
  .iv .lab2{font-size:9.5px;font-weight:700;letter-spacing:1.1px;color:var(--gold);text-transform:uppercase;margin-bottom:6px}
  .iv .words{font-size:11.5px;font-style:italic;color:var(--ink2);margin-bottom:16px}
  .iv .pay{font-size:11px;color:var(--ink2);line-height:1.8}
  .iv .botright{width:280px;text-align:right}
  .iv .botright .for{font-size:11px;font-weight:700;color:var(--gold)}
  .iv .botright .sigline{margin-top:48px;border-top:1px solid var(--ink3);padding-top:6px}
  .iv .botright .sigline .a{font-size:11.5px;font-weight:700}
  .iv .botright .sigline .b{font-size:9.5px;color:var(--ink4)}
  .iv .terms{margin-top:20px;font-size:9px;color:var(--ink4);line-height:1.7;border-top:1px solid var(--rule);padding-top:11px}
  @media print{@page{size:A4 portrait;margin:9mm} .iv .sheet{padding:0;max-width:100%} .iv *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
var partyBlock = (lab, p, cur, idLabel = "GSTIN") => `<div class="party"><div class="lab">${esc(lab)}</div><div class="nm">${esc(p.name || "\u2014")}</div><div class="ln">${[p.address, p.gstin ? `${idLabel} : ${esc(p.gstin)}` : "", p.email ? `Email : ${esc(p.email)}` : "", p.contact ? `Contact : ${esc(p.contact)}` : ""].filter(Boolean).map(esc).join("<br>")}</div></div>`;
function buildBookingInvoice(booking2 = {}, side = "sale", branch2, master = {}, opts = {}) {
  const isSale = side === "sale";
  const isPkg = String(booking2.module || "") === "SH";
  const code2 = String(branch2?.code || booking2.branch || "BOM").toUpperCase();
  const live = companyProfile(code2) || {};
  const fb = ISSUER_FALLBACK[code2] || {};
  const pv = (k) => live[k] != null && live[k] !== "" ? live[k] : fb[k];
  const prof = {
    ...fb,
    ...live,
    entity: pv("entity"),
    operAddr: pv("operAddr"),
    gstin: pv("gstin"),
    email: pv("email"),
    phone: pv("phone"),
    state: pv("state"),
    stateCode: pv("stateCode"),
    cur_sym: pv("cur_sym"),
    authSignatory: pv("authSignatory"),
    authDesignation: pv("authDesignation"),
    banks: Array.isArray(live.banks) && live.banks.length ? live.banks : fb.banks || []
  };
  const isVat = ["NBO", "DAR", "FBM"].includes(code2);
  const taxLabel = isVat ? "VAT" : "GST";
  const idLabel = isVat ? "VAT Reg No" : "GSTIN";
  const foldSvc2IntoBase = isVat || isPkg;
  const fx = opts && Number(opts.fxRate) > 0 ? Number(opts.fxRate) : 1;
  const localCcy = opts && opts.localCurrency || "";
  const converting = fx !== 1 && !!localCcy;
  const LOCAL_SYM = { KES: "KSh ", TZS: "TSh ", CDF: "FC " };
  const baseCur = prof.cur_sym || (bc(branch2) || {}).cur || "\u20B9";
  const cur = converting ? LOCAL_SYM[localCcy] || `${localCcy} ` : baseCur;
  const curCode = converting ? localCcy : isVat ? "USD" : "INR";
  const n22 = (n) => (Number(n || 0) * fx).toLocaleString(curCode === "INR" ? "en-IN" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const company = { name: prof.entity || "Travkings Tours & Travels Pvt. Ltd.", address: prof.operAddr || "", gstin: prof.gstin || "", email: prof.email || "", contact: prof.phone || "" };
  const sac = hsnSacFor(MODULE_NAME[booking2.module] || "") || SAC_BY_MODULE[booking2.module] || "998599";
  const assetBase = (typeof window !== "undefined" && window.location ? window.location.origin : "") + "/";
  const TK_LOGO = assetBase + "travkings-logo.png";
  const IATA_LOGO = assetBase + "iata-logo.png";
  const raw = isSale ? booking2.customer || {} : booking2.supplier || {};
  const m = master || {};
  const mAddr = m.address || [m.city, m.country].filter(Boolean).join(", ");
  const snap = (isSale ? booking2.so : booking2.po) || {};
  const rows = Array.isArray(booking2.rows) ? booking2.rows : [];
  const isB2C = isSale && /b2c/i.test(raw.ledgerGroup || raw.group || "");
  const firstPax = rows.map((p) => [p.fn, p.sn].filter(Boolean).join(" ").trim()).find(Boolean) || "";
  const freeName = raw.name && raw.name !== raw.ledgerName ? raw.name : "";
  const billToName = isB2C ? firstPax || freeName || m.name || raw.ledgerName || raw.name || "" : raw.name || m.name || "";
  const party = {
    name: billToName || "",
    gstin: raw.gstin || m.gstin || "",
    address: raw.address || mAddr || "",
    email: raw.email || m.email || "",
    contact: raw.contact || m.contact || m.phone || ""
  };
  const headerRef = booking2.headerRef || "";
  const vno = isSale ? booking2.saleVno || "" : booking2.purchaseVno || "";
  const psCode = (party.gstin || prof.gstin || "").slice(0, 2);
  const placeOfSupply = GST_STATES[psCode] ? `${GST_STATES[psCode]} \u2014 ${psCode}` : prof.state ? `${prof.state} \u2014 ${prof.stateCode || ""}` : "";
  const fareRows = rows.map((p) => {
    const base = Number(p.base) || 0, k3 = Number(p.k3) || 0, tax = Number(p.tax) || 0, markup = Number(p.markup) || 0, psvc = Number(p.psvc) || 0;
    const incentive2 = Number(p.incentive) || 0, tds2 = Number(p.tds) || 0;
    const pax = [p.fn, p.sn].filter(Boolean).join(" ");
    const secs = Array.isArray(p.sectors) ? p.sectors.filter((s) => s && (s.sector || s.airline || s.flightNo || s.ticketNo || s.pnr || s.travelDate)) : [];
    const secLines = secs.map((s) => {
      const parts = [s.sector, s.airline, s.flightNo, s.ticketNo ? `TKT ${s.ticketNo}` : "", s.pnr ? `PNR ${s.pnr}` : "", s.travelDate].filter(Boolean).map(esc).join(" \xB7 ");
      return parts ? `<div class="sub sec">${parts}</div>` : "";
    }).join("");
    const idline = secs.length ? pax ? `PAX: ${esc(pax)}` : "" : [pax ? `PAX: ${esc(pax)}` : "", p.tkt || p.pkg || p.htl ? `TKT: ${esc(p.tkt || p.pkg || p.htl)}` : "", p.pnr || p.ref || p.conf ? `PNR: ${esc(p.pnr || p.ref || p.conf)}` : ""].filter(Boolean).join(" &nbsp;|&nbsp; ");
    const idHtml = idline ? `<div class="sub idl">${idline}</div>` : "";
    const secHtml = secLines ? `<div class="secs">${secLines}</div>` : "";
    const desc = `<td class="l desc"><div class="nm">${esc(headerRef || "Booking")}</div>${idHtml}${secHtml}</td>`;
    if (isSale) {
      const totalFare = base + k3 + tax + markup;
      const baseShown = foldSvc2IntoBase ? base + markup : base;
      const taxShown = foldSvc2IntoBase ? tax : tax + markup;
      return `<tr>${desc}<td class="l">${esc(sac)}</td><td>${n22(baseShown)}</td><td>${n22(k3)}</td><td>${n22(taxShown)}</td><td class="tf">${cur}${n22(totalFare)}</td></tr>`;
    }
    const totalCost = base + k3 + tax + psvc - incentive2 + tds2;
    return `<tr>${desc}<td class="l">${esc(sac)}</td><td>${n22(base)}</td><td>${n22(k3)}</td><td>${n22(tax)}</td><td>${n22(psvc)}</td><td>${n22(incentive2)}</td><td>${n22(tds2)}</td><td class="tf">${cur}${n22(totalCost)}</td></tr>`;
  }).join("");
  const emptyRow = `<tr><td class="l" colSpan="${isSale ? 6 : 9}" style="text-align:center;color:#9A9A9A;padding:16px">No line detail captured for this booking.</td></tr>`;
  const otGst = r2(snap.otherTaxesGst || 0);
  const gst = r2(snap.gst || 0), tcs = r2(snap.tcs || 0), incentive = r2(snap.incentiveAmt || 0), tds = r2(snap.incentiveTds || 0);
  const subTotal = r2(r2(snap.lineTotal || 0) + otGst), service = r2(snap.serviceCharge || 0);
  const net = r2(snap.total || r2(snap.lineTotal || 0) + service + gst + otGst + tcs);
  const inter = booking2.gstMode === "inter";
  const half = r2(gst / 2);
  const gstRows = isVat ? `<div class="r"><span class="k">${taxLabel}</span><span class="v">${cur}${n22(gst)}</span></div>` : inter ? `<div class="r"><span class="k">IGST</span><span class="v">${cur}${n22(gst)}</span></div>` : `<div class="r"><span class="k">CGST</span><span class="v">${cur}${n22(half)}</span></div><div class="r"><span class="k">SGST</span><span class="v">${cur}${n22(r2(gst - half))}</span></div>`;
  const tcsRow = tcs ? `<div class="r"><span class="k">TCS</span><span class="v">${cur}${n22(tcs)}</span></div>` : "";
  const sumtbl = isSale ? `
    <div class="r"><span class="k">Sub Total</span><span class="v">${cur}${n22(subTotal)}</span></div>
    ${service ? `<div class="r"><span class="k">Service Fee</span><span class="v">${cur}${n22(service)}</span></div>` : ""}
    ${gst ? gstRows : ""}${tcsRow}
    <div class="net"><span class="k">NET TOTAL (${esc(curCode)})</span><span class="v">${cur}${n22(net)}</span></div>` : `
    <div class="r"><span class="k">Sub Total (Fares + Svc)</span><span class="v">${cur}${n22(subTotal)}</span></div>
    ${incentive ? `<div class="r" style="color:#A32D2D"><span class="k">Supplier Incentive</span><span class="v">-${cur}${n22(incentive)}</span></div>` : ""}
    ${gst ? gstRows : ""}
    ${tds ? `<div class="r" style="color:#A07828"><span class="k">${isVat ? "WHT" : "TDS (2%)"}</span><span class="v">${cur}${n22(tds)}</span></div>` : ""}
    <div class="net"><span class="k">NET COST (${esc(curCode)})</span><span class="v">${cur}${n22(r2(net - incentive + tds))}</span></div>`;
  const bank = (prof.banks || []).find((b) => b.primary) || (prof.banks || [])[0] || {};
  const bankLines = [
    bank.bankName ? `Bank: ${esc(bank.bankName)}` : "",
    bank.acName ? `A/c Name: ${esc(bank.acName)}` : "",
    bank.acNo ? `A/c No: ${esc(bank.acNo)}` : "",
    bank.ifsc ? `IFSC: ${esc(bank.ifsc)}` : "",
    bank.swift ? `SWIFT: ${esc(bank.swift)}` : "",
    bank.branch ? `Branch: ${esc(bank.branch)}` : ""
  ].filter(Boolean).join("<br>") || "Bank details on file.";
  const payBlock = isSale ? `<div class="lab2">Bank Details</div><div class="pay">${bankLines}</div>` : `<div class="lab2">Settlement</div><div class="pay">Payable to supplier per agreed credit terms.<br>Input ${taxLabel} credit claimed against supplier ${idLabel}.<br>Link No referenced for invoice-wise GP.</div>`;
  const headCols = isSale ? `<th class="l">Description</th><th class="l">HSN/SAC</th><th>Base Fare</th><th>K3 Tax</th><th>Taxes</th><th>Total Fare</th>` : `<th class="l">Description</th><th class="l">HSN/SAC</th><th>Base Fare</th><th>K3 Tax</th><th>Taxes</th><th>Supplier Service Charge</th><th>Supp Comm/Inc Rcvd</th><th>${isVat ? "WHT" : "TDS (2%)"}</th><th>Total Cost</th>`;
  const sheet = `<div class="iv"><div class="sheet">
    <div class="titlebar"><div class="title">${isSale ? "INVOICE" : "PURCHASE INVOICE"}</div><img class="iata-badge" src="${IATA_LOGO}" alt="IATA Accredited Agent" /></div><div class="title-rule"></div>
    <div class="tophead">
      <div class="brandcol">
        <img class="tk-logo" src="${TK_LOGO}" alt="${esc(company.name)}" />
      </div>
      <div class="inv-meta">
        <div class="row firstline"><span class="k">${isSale ? "Invoice No." : "Purchase Inv No."}</span><span class="v big">${esc(vno || "(on approval)")}</span></div>
        <div class="row"><span class="k">Date</span><span class="v">${esc(booking2.date || "")}</span></div>
        ${!isVat && placeOfSupply ? `<div class="row"><span class="k">Place of Supply</span><span class="v">${esc(placeOfSupply)}</span></div>` : ""}
        <div class="row"><span class="k">Link No.</span><span class="v" style="color:var(--gold)">${esc(booking2.linkNo || "\u2014")}</span></div>
      </div>
    </div>
    <div class="blackrule"></div>
    <div class="parties">${isSale ? partyBlock("Billed To", party, cur, idLabel) + partyBlock("Issued By", company, cur, idLabel) : partyBlock("Supplier", party, cur, idLabel) + partyBlock("Billed To (Buyer)", company, cur, idLabel)}</div>
    <div class="fb-label">${isSale ? "Fare Breakdown" : "Cost Breakdown"}</div>
    <table><thead><tr>${headCols}</tr></thead><tbody>${fareRows || emptyRow}</tbody></table>
    <div class="summary"><div class="sumtbl">${sumtbl}</div></div>
    <div class="botrule"></div>
    <div class="botgrid">
      <div class="botleft"><div class="lab2">Amount in Words</div><div class="words">${esc(curCode)} ${esc(inWords(Math.round(net * fx)))} Only</div>${converting ? `<div class="pay" style="margin-bottom:12px;font-style:italic">Converted at 1 USD = ${esc(Number(opts.fxRate).toFixed(2))} ${esc(localCcy)} (${esc(opts.fxDate || booking2.date || "")})</div>` : ""}${payBlock}</div>
      <div class="botright"><div class="for">For ${esc(company.name)}</div><div class="sigline"><div class="a">${esc(prof.authSignatory || "Authorised Signatory")}</div><div class="b">${esc(prof.authDesignation || company.name)}</div></div></div>
    </div>
    <div class="terms">${isSale ? "Terms &amp; Conditions: 1. Payment due as per agreed terms; delay attracts 18% p.a. 2. Service charges non-refundable; cancellations per supplier policy. 3. We act as intermediary; not liable for third-party delays/cancellations. E.&amp;O.E." : "Internal purchase record for accounting &amp; ITC. Cost net of supplier incentive per the GP working. Subject to reconciliation with the supplier statement / BSP. E.&amp;O.E."}</div>
  </div></div>`;
  return `<style>${CSS}</style>${sheet}`;
}

// scripts/gen-db-invoice.mjs
var SRC = "../kbiz360-erp-backend/scripts/_one-invoice.json";
var { booking, customerMaster = {}, supplierMaster = {} } = JSON.parse(fs.readFileSync(SRC, "utf8"));
var code = String(booking.branch || "BOM").toUpperCase();
setBranchCfg([{
  code: "BOM",
  entity: "Travkings Tours & Travels",
  pan: "AAMCT1096J",
  gstin: "27AAMCT1096J1ZU",
  tan: "MUMT12345A",
  operAddr: "Venus Tower, B 603, Veera Desai Rd, Azad Nagar 2, Mhada Colony, Jeevan Nagar, Andheri West, Mumbai, Maharashtra 400053",
  state: "Maharashtra",
  stateCode: "27",
  cur_sym: "\u20B9",
  currency: "INR",
  phone: "+91 88280 06599",
  email: "accounts.bom@travkings.com",
  website: "www.travkings.com",
  authSignatory: "Afshin Dhanani",
  authDesignation: "Founder & Director",
  banks: [{ bankName: "ICICI Bank", acName: "Travkings Tours & Travels Private Limited", branch: "Versova Link Road Branch, Andheri West", acNo: "333805003566", ifsc: "ICIC0003338", swift: "ICICINBBCTS", type: "Current", primary: true }]
}]);
var branch = { code };
var saleHtml = buildBookingInvoice(booking, "sale", branch, customerMaster);
var purHtml = buildBookingInvoice(booking, "purchase", branch, supplierMaster);
var esc2 = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var n2 = (n) => (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
var so = booking.so || {};
var po = booking.po || {};
var gp = booking.gp || {};
var soLines = Array.isArray(so.lines) ? so.lines : [];
var poLines = Array.isArray(po.lines) ? po.lines : [];
var paxName = (l) => [l.fn, l.sn].filter(Boolean).join(" ") || "\u2014";
var soBody = soLines.map((l) => `<tr>
  <td class="l">${esc2(paxName(l))}</td>
  <td>${n2(l.base)}</td><td>${n2(l.k3)}</td><td>${n2(l.tax)}</td>
  <td>${n2(l.markup)}</td><td>${n2(l.ssvc)}</td><td>${n2(l.gst != null ? l.gst : Number(l.gstMk || 0) + Number(l.gstSvc || 0))}</td>
  <td class="tf">${n2(l.total)}</td></tr>`).join("") || '<tr><td class="l" colspan="8" style="text-align:center;color:#9A9A9A;padding:14px">No SO lines.</td></tr>';
var poBody = poLines.map((l) => `<tr>
  <td class="l">${esc2(paxName(l))}</td>
  <td>${n2(l.base)}</td><td>${n2(l.k3)}</td><td>${n2(l.tax)}</td>
  <td>${n2(l.psvc)}</td><td>${n2(l.incentive)}</td><td>${n2(l.tds)}</td><td>${n2(l.gst)}</td>
  <td class="tf">${n2(l.total)}</td></tr>`).join("") || '<tr><td class="l" colspan="9" style="text-align:center;color:#9A9A9A;padding:14px">No PO lines.</td></tr>';
var sumRow = (k, v, cls = "") => `<div class="r ${cls}"><span class="k">${esc2(k)}</span><span class="v">\u20B9${n2(v)}</span></div>`;
var saleTot = Number(so.total) || 0;
var costTot = Number(po.total) || 0;
var gpAmt = gp.total != null ? Number(gp.total) : saleTot - costTot;
var gpPct = gp.pct != null ? Number(gp.pct) : saleTot ? gpAmt / saleTot * 100 : 0;
var STMT_CSS = `
  .st{--gold:#A07828;--gold-l:#C49A3C;--dark:#111;--ink:#1A1A1A;--ink2:#3A3A3A;--ink3:#6A6A6A;--ink4:#9A9A9A;--rule:#DEDBD4;--bg-lt:#F2EFE9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--ink);background:#fff}
  .st *{box-sizing:border-box;margin:0;padding:0}
  .st .sheet{max-width:860px;margin:0 auto;padding:30px 40px}
  .st .title{text-align:center;font-size:26px;font-weight:800;letter-spacing:2px}
  .st .title-rule{height:1px;background:var(--gold);margin:9px 0 18px}
  .st .meta{display:flex;flex-wrap:wrap;gap:6px 28px;margin-bottom:14px}
  .st .meta .m{font-size:11px;color:var(--ink3)} .st .meta .m b{color:var(--ink);font-weight:700}
  .st .blackrule{height:2.5px;background:var(--dark);margin:8px 0 18px}
  .st .sec{font-size:10px;font-weight:700;letter-spacing:1.2px;color:var(--gold);text-transform:uppercase;margin:18px 0 8px}
  .st table{width:100%;border-collapse:collapse;margin-bottom:6px}
  .st thead th{font-size:8.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;text-align:right;padding:7px 8px;background:var(--bg-lt);border-top:2px solid var(--dark);border-bottom:2px solid var(--dark)}
  .st thead th.l{text-align:left}
  .st tbody td{padding:9px 8px;border-bottom:1px solid var(--rule);font-size:11px;text-align:right}
  .st tbody td.l{text-align:left}
  .st td.tf{font-weight:800}
  .st .tt{display:flex;justify-content:flex-end;margin:4px 0 2px}
  .st .sumtbl{width:330px}
  .st .sumtbl .r{display:flex;justify-content:space-between;padding:6px 4px;font-size:11.5px;border-bottom:1px solid var(--rule)}
  .st .sumtbl .r .k{color:var(--ink2)} .st .sumtbl .r .v{font-weight:800}
  .st .sumtbl .r.dim .k,.st .sumtbl .r.dim .v{color:var(--ink4);font-weight:600}
  .st .gpcard{display:flex;gap:14px;margin-top:18px}
  .st .gpcard .box{flex:1;border:1px solid var(--rule);border-radius:8px;padding:14px 16px;text-align:center}
  .st .gpcard .box .lab{font-size:9px;letter-spacing:1px;color:var(--ink4);text-transform:uppercase;margin-bottom:6px}
  .st .gpcard .box .val{font-size:18px;font-weight:800}
  .st .gpcard .box.net{background:var(--dark);border-color:var(--dark)} .st .gpcard .box.net .lab{color:#cbb994} .st .gpcard .box.net .val{color:var(--gold-l)}
  @media print{@page{size:A4 portrait;margin:9mm} .st .sheet{padding:0;max-width:100%} .st *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
var stmtHtml = `<style>${STMT_CSS}</style><div class="st"><div class="sheet">
  <div class="title">SO / PO / GP WORKING</div><div class="title-rule"></div>
  <div class="meta">
    <div class="m">Booking <b>${esc2(booking.bookingNo || "")}</b></div>
    <div class="m">Link No <b style="color:#A07828">${esc2(booking.linkNo || "\u2014")}</b></div>
    <div class="m">Module <b>${esc2(booking.module || "")}</b></div>
    <div class="m">Date <b>${esc2(booking.date || "")}</b></div>
    <div class="m">GST Mode <b>${esc2(booking.gstMode || "")}</b></div>
    <div class="m">Customer <b>${esc2(booking.customer?.name || "")}</b></div>
    <div class="m">Supplier <b>${esc2(booking.supplier?.name || "")}</b></div>
    <div class="m">SO Vno <b>${esc2(booking.saleVno || "")}</b></div>
    <div class="m">PO Vno <b>${esc2(booking.purchaseVno || "")}</b></div>
  </div>
  <div class="blackrule"></div>

  <div class="sec">Sales Order (SO) \u2014 what the client is billed</div>
  <table><thead><tr><th class="l">Passenger</th><th>Base Fare</th><th>K3</th><th>Taxes</th><th>SVC2 (margin)</th><th>SVF (svc fee)</th><th>GST</th><th>Line Total</th></tr></thead>
    <tbody>${soBody}</tbody></table>
  <div class="tt"><div class="sumtbl">
    ${sumRow("Line Total", so.lineTotal)}
    ${sumRow("Service Fee (SVF)", so.serviceCharge)}
    ${sumRow("GST (SVF)", so.gst)}
    ${sumRow("GST on SVC2 margin (folded)", so.otherTaxesGst, "dim")}
    ${Number(so.tcs) ? sumRow("TCS", so.tcs) : ""}
    <div class="r" style="border-bottom:none;background:#111;color:#fff;padding:10px 12px;margin-top:4px"><span class="k" style="color:#fff;font-weight:700">SO TOTAL</span><span class="v" style="color:#C49A3C;font-size:15px">\u20B9${n2(so.total)}</span></div>
  </div></div>

  <div class="sec">Purchase Order (PO) \u2014 what we pay the supplier</div>
  <table><thead><tr><th class="l">Passenger</th><th>Base Fare</th><th>K3</th><th>Taxes</th><th>Supp Svc Chg</th><th>Incentive</th><th>TDS</th><th>GST</th><th>Line Total</th></tr></thead>
    <tbody>${poBody}</tbody></table>
  <div class="tt"><div class="sumtbl">
    ${sumRow("Line Total", po.lineTotal)}
    ${sumRow("Supplier Service Charge", po.serviceCharge)}
    ${Number(po.incentiveAmt) ? sumRow("Supplier Incentive", po.incentiveAmt) : ""}
    ${Number(po.gst) ? sumRow("GST", po.gst) : ""}
    ${Number(po.incentiveTds) ? sumRow("Incentive TDS", po.incentiveTds) : ""}
    <div class="r" style="border-bottom:none;background:#111;color:#fff;padding:10px 12px;margin-top:4px"><span class="k" style="color:#fff;font-weight:700">PO TOTAL</span><span class="v" style="color:#C49A3C;font-size:15px">\u20B9${n2(po.total)}</span></div>
  </div></div>

  <div class="sec">Gross Profit (GP)</div>
  <div class="gpcard">
    <div class="box"><div class="lab">Sale (SO Total)</div><div class="val">\u20B9${n2(saleTot)}</div></div>
    <div class="box"><div class="lab">Cost (PO Total)</div><div class="val">\u20B9${n2(costTot)}</div></div>
    <div class="box net"><div class="lab">Gross Profit</div><div class="val">\u20B9${n2(gpAmt)}</div></div>
    <div class="box net"><div class="lab">GP %</div><div class="val">${n2(gpPct)}%</div></div>
  </div>
</div></div>`;
var dataSvg = (w, h, inner) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${inner}</svg>`);
var tkHolder = dataSvg(210, 52, `<rect width="210" height="52" rx="6" fill="#FDFAF4" stroke="#C49A3C"/><text x="105" y="25" text-anchor="middle" font-family="Arial" font-size="16" font-weight="800" fill="#111" letter-spacing="2">TRAVKINGS</text><text x="105" y="41" text-anchor="middle" font-family="Arial" font-size="6.5" font-weight="700" fill="#6A6A6A" letter-spacing="2">TOURS &amp; TRAVELS PVT. LTD.</text>`);
var iataHolder = dataSvg(50, 30, `<rect width="50" height="30" rx="4" fill="#eee" stroke="#bbb"/><text x="25" y="20" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#111">IATA</text>`);
var dataUri = (p) => "data:image/png;base64," + fs.readFileSync(p).toString("base64");
var wire = (html) => {
  let out = html;
  out = out.split("/travkings-logo.png").join(fs.existsSync("public/travkings-logo.png") ? dataUri("public/travkings-logo.png") : tkHolder);
  out = out.split("/iata-logo.png").join(fs.existsSync("public/iata-logo.png") ? dataUri("public/iata-logo.png") : iataHolder);
  return out;
};
saleHtml = wire(saleHtml);
purHtml = wire(purHtml);
var meta = `${booking.bookingNo || ""} \xB7 ${booking.linkNo || ""} \xB7 ${booking.module || ""} \xB7 ${code}`;
var page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KBiz360 \u2014 ${esc2(meta)}</title>
<style>
  html,body{margin:0;padding:0;background:#9aa0ad;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:Arial,Helvetica,sans-serif}
  .bar{position:sticky;top:0;z-index:10;background:#0d1326;color:#fff;padding:10px 16px;font-size:12.5px;display:flex;gap:10px;align-items:center;justify-content:center;text-align:center}
  .bar b{color:#d4a437}
  .sheetwrap{max-width:900px;margin:18px auto;background:#fff;box-shadow:0 0 18px rgba(0,0,0,.32)}
  @media print{ body{background:#fff} .bar{display:none} .sheetwrap{box-shadow:none;margin:0;max-width:100%} .pb{page-break-before:always} @page{size:A4 portrait;margin:9mm} }
</style></head><body>
  <div class="bar">LIVE DB \xB7 <b>&nbsp;${esc2(meta)}&nbsp;</b> \xB7 Ctrl/Cmd + P \u2192 Save as PDF \xB7 P1 Sales Invoice (client) \xB7 P2 Purchase Invoice \xB7 P3 SO/PO/GP</div>
  <div class="sheetwrap">${saleHtml}</div>
  <div class="sheetwrap pb">${purHtml}</div>
  <div class="sheetwrap pb">${stmtHtml}</div>
</body></html>`;
fs.writeFileSync("public/invoice-db.html", page);
console.log("Wrote public/invoice-db.html (" + page.length + " bytes) for", booking.bookingNo, booking.linkNo);
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
