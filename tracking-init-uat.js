(function () {
  if (typeof Traek === "undefined") {
    Traek = {};
  }
  Traek.namespace = function () {
    if (arguments.length == 0) {
      return;
    }
    var namespace = {};
    for (var i = 0, a = arguments; i < a.length; i = i + 1) {
      var nslvl = a[i].split(".");
      namespace = Traek;
      for (var j = nslvl[0] == "Traek" ? 1 : 0; j < a[i].length; j = j + 1) {
        namespace[nslvl[j]] = namespace[nslvl[j]] || {};
        namespace = namespace[nslvl[j]];
      }
    }
    return namespace;
  };
  var $debug = false;
  Traek.register = function (module, myClass, ns) {
    var namespace = Traek[ns];
    if (!namespace && ns) {
      namespace = Traek.namespace(ns);
    }
    if (namespace && !namespace[module]) {
      namespace[module] = myClass || {};
    } else if (!namespace && !Traek[module]) {
      Traek[module] = myClass;
    }
    return namespace;
  };
  Traek.log = function () {
    if (window.console && $debug) {
      window.console.log.apply(window.console, arguments);
    }
  };
  Traek.warn = function () {
    if (window.console && $debug) {
      window.console.warn.apply(window.console, arguments);
    }
  };
  Traek.error = function () {
    if (window.console && $debug) {
      window.console.error.apply(window.console, arguments);
    }
  };
  Traek.info = function () {
    if (window.console && $debug) {
      window.console.info.apply(window.console, arguments);
    }
  };
  Traek.setDebugOn = function () {
    $debug = true;
  };
})();

(function (App) {
  App.TraekAnalytics = function (apiKey, hostUrl, cdnUrl) {
    if (sessionStorage.getItem("referrer")) {
      this.referrer = sessionStorage.getItem("referrer");
    } else {
      this.referrer = document.referrer || "direct";
      sessionStorage.setItem("referrer", document.referrer || "direct");
    }
    this.heatmapData = {};
    this.apiKey = apiKey;
    // this.allowLeads = false;
    // this.allowSession = false;
    this.allowForms = false;
    this.type = "";
    this.userKey = localStorage.getItem("traek_user_key");
    this.sessionKey = sessionStorage.getItem("SESSION_KEY");
    this.ip = sessionStorage.getItem("ip");
    this.firebaseAccessToken = null;
    this.visitedTime = new Date();
    this.duration = 0;
    this.callApi = true;
    this.propertyId = null;
    this.websiteUrl = null;
    this.pageTitle = document.title;
    this.pageUrl = document.URL;
    this.userAgent = navigator.userAgent;
    this.chatWidget = null;
    this.hostUrl = hostUrl;
    this.cdnUrl = cdnUrl;
    this.elementUrlData = null;
    this.isLoading = false;
    this.heatmaps = [];
    this.allowHeatmaps = false;
    this.newVisit = true;
    this.allowSessionRecord = true;
    this.isSessionAPIInProgress = false;
    this.lastClick = 0;
    this.secondLastClick = 0;
    this.target = null;
    this.clickedObject = null;
    this.currentClick = null;
    this.totalClick = null;
    this.rageclickfind = null;
    this.screenResolution = `${window.screen.width}x${window.screen.height} px`;
  };

  const SAVE_RECORDING_INTERVAL_TIME = 15 * 1000; // 15 second
  let sessionStartTime;
  let errorMessageObj = null;

  let clickedObject = {
    input: [],
    button: [],
    elementClick: [],
    formSubmit: [],
    windowResize: [],
    deadClick: [],
    linkClick: [],
    errorClick: [],
    pageNavigation: [],
    rageClick: []
  };

  let currentEvent = null;


  // custom attribute
  ((window) => {
    if (typeof window.ry !== 'undefined') {
      return;
    }

    const ry = {
      data: [],

      isValidType: (value) => {
        return (
          typeof value === 'number' ||
          typeof value === 'string' ||
          typeof value === 'boolean' ||
          value instanceof Date
        );
      },

      add: (obj) => {
        const isValidObject = Object.entries(obj).every(([key, value]) => {
          return ry.isValidType(value);
        });


        if (isValidObject) {
          const currentTime = new Date();
          obj.time = currentTime;
          ry.data.push(obj);
          ry.saveData();
          console.log('Updated data:', ry.data);
        } else {
          console.error('Invalid object provided. Only number, string, date, and boolean values are allowed.');
        }
      },

      saveData: () => {
        sessionStorage.setItem('ryData', JSON.stringify(ry.data));
      },
      clearData: () => {
        ry.data = [];
        ry.saveData();
        console.log('Data cleared');
      },
    };

    window.ry = (action, obj) => {
      if (action === 'associate') {
        ry.add(obj);
      } else if (action === 'clear') {
        ry.clearData();
      } else {
        console.error('Invalid action specified');
      }
    };

    window.addEventListener('beforeunload', () => {
      ry.saveData();
    });

  })(window);


  document.addEventListener(
    "click",
    (event) => {
      let timeValue = sessionStorage.getItem("sessionStartTime")
      const clickedElement = event.target;
      const elementType = clickedElement.tagName.toLowerCase();
      const elementName = clickedElement.nodeName;
      const elementClass = clickedElement.className;
      const elementId = clickedElement.id;
      const url = window.location.href;
      const onClickDetails = clickedElement.onclick ? clickedElement.onclick.toString() : "No onclick attribute";

      let clickDetails = { elementType, elementName, elementClass, elementId, url, onClickDetails };

      if (event.target.nodeName == "BUTTON") {
        this.currentClick = "BUTTON"
        clickedObject.button.push({ type: "BUTTON", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
      } else if (event.target.nodeName == "INPUT") {
        this.currentClick = "INPUT"
        clickedObject.input.push({ type: "INPUT", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
      }

      else if (event.target.tagName == "A") {
        if (event.target.getAttribute('href') == null) {
          clickedObject.deadClick.push({ type: "deadClick", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
        }
        if (event.target.getAttribute('href') === '#') {
          clickedObject.deadClick.push({ type: "deadClick", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
        }
        if (event.target.getAttribute('href') === '') {
          clickedObject.deadClick.push({ type: "deadClick", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
        }
        if (!event.target.hasAttribute('href')) {
          clickedObject.deadClick.push({ type: "deadClick", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
        }
        if (event.target.getAttribute('href')?.includes('http')) {
          clickedObject.linkClick.push({ type: "A", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
        }
        else {
          clickedObject.elementClick.push({ type: "A", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
        }
        this.currentClick = "A"
      }
      else if (event.target.nodeName == "FORM") {
        //this.currentClick = "FORM"
        // clickedObject.form.push({ type: "FORM", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
      }

      setTimeout(() => {
        if (errorMessageObj?.clickError) {
          clickedObject.errorClick.push({ type: "errorClick", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails, errorMessageObj })
          errorMessageObj = {}
        }
      }, 2000);

    }
    , true);


  window.navigation.addEventListener("navigate", function (event) {
    let timeValue = sessionStorage.getItem("sessionStartTime")
    let currentURL = event.destination.url;
    // const clone = JSON.parse(JSON.stringify(clickedObject));
    clickedObject.pageNavigation.push({ type: "TAB_CHANGE", tempTime: Date.now() - timeValue, url: currentURL, dateFormat: new Date() });
  });

  // window.addEventListener("visibilitychange", async () => {

  //     if (document.visibilityState === "visible") {
  //       let currentURL = window.location.href;
  //       let timeValue = localStorage.getItem("sessionStartTime")
  //       clickedObject.pageNavigation.push({ type: "TAB_CHANGE", tempTime: Date.now() - timeValue, url: currentURL, dateFormat: new Date() });
  //     }

  //   })

  document.addEventListener(
    "submit",
    (event) => {
      let timeValue = sessionStorage.getItem("sessionStartTime")
      let currentURL = window.location.href;
      clickedObject.formSubmit.push({ type: "FORM_SUBMIT", tempTime: Date.now() - timeValue, dateFormat: new Date(), url: currentURL })
    }
    , true);


  let resizeTimeout;
  const resizeInterval = 500; // Interval time in milliseconds

  window.addEventListener('resize', function (event) {
    // Clear the timeout if it has already been set
    clearTimeout(resizeTimeout);

    // Set a new timeout to capture the resize event after the specified interval
    resizeTimeout = setTimeout(function () {
      let timeValue = sessionStorage.getItem("sessionStartTime")
      let currentURL = window.location.href;
      clickedObject.windowResize.push({ type: "RESIZE", tempTime: Date.now() - timeValue, dateFormat: new Date(), url: currentURL });
    }, resizeInterval);
  });


  // window.onerror = function (message, source, lineno, colno, error) {
  //   console.log("dhyey ----------- ",message, source, lineno, colno, error);
  //   errorMessage = { message: "errorClick : " + message, source, lineno, colno, error }
  // };


  // add into session
  App.TraekAnalytics.prototype.sessionSet = function (key, value, expirationInMin = 30) {
    sessionStorage.getItem(key);
    let expirationDate = new Date(new Date().getTime() + 60000 * expirationInMin);

    // Log information for debugging
    console.log(expirationDate, expirationInMin, "expirationDate");

    let newValue = {
      value,
      expirationDate: expirationDate.toISOString(),
    };

    this.sessionKey = value;
    // clear indexDB store on new Session create
    clearStore();

    this.recordSessions();

    sessionStorage.setItem(key, JSON.stringify(newValue));
    window.sessionStorage.setItem("isSnapshotCaptured", "false");
    window.sessionStorage.setItem("SESSION_KEY", value);
    sessionStartTime = Date.now();
    sessionStorage.setItem("sessionStartTime", sessionStartTime)
  };


  // // Create a BroadcastChannel for communication
  // const channel = new BroadcastChannel('tab_channel');

  // // Function to update the tab count in localStorage
  // function updateTabCount(action) {
  //   let tabCount = parseInt(localStorage.getItem('tabCount')) || 0;
  //   if (action === 'increment') {
  //     tabCount++;
  //   } else if (action === 'decrement') {
  //     tabCount = Math.max(0, tabCount - 1);
  //   }
  //   localStorage.setItem('tabCount', tabCount);
  //   return tabCount;
  // }

  // // Function to check if there are no tabs left and perform the action
  // function checkTabsAndTakeAction() {
  //   const tabCount = parseInt(localStorage.getItem('tabCount')) || 0;
  //   if (tabCount === 0) {
  //     localStorage.removeItem("SESSION_KEY_OBJ");
  //     localStorage.removeItem("SESSION_KEY");
  //     localStorage.removeItem("sessionStartTime")
  //   }
  // }

  // // When a tab is loaded, increment the count and notify other tabs
  // window.addEventListener('load', () => {
  //   const tabCount = updateTabCount('increment');
  //   channel.postMessage({ type: 'tabCount', tabCount: tabCount });
  // });

  // // When a tab is unloaded, decrement the count and notify other tabs
  // window.addEventListener('beforeunload', () => {
  //   const tabCount = updateTabCount('decrement');
  //   channel.postMessage({ type: 'tabCount', tabCount: tabCount });
  //   checkTabsAndTakeAction();
  // });

  // // Listen for messages from other tabs
  // channel.onmessage = (event) => {
  //   if (event.data.type === 'tabCount') {
  //     checkTabsAndTakeAction();
  //   }
  // };

  // // Initial check on page load
  // document.addEventListener('DOMContentLoaded', checkTabsAndTakeAction);

  // get from session (if the value expired it is destroyed)
  App.TraekAnalytics.prototype.sessionGet = async function (key) {
    const stringValue = window.sessionStorage.getItem(key);

    if (stringValue !== null) {
      const value = JSON.parse(stringValue);
      const expirationDate = new Date(value.expirationDate);

      if (typeof value.value !== "undefined" && expirationDate > new Date()) {
        return value.value;
      }
    }
    // if session key not found or session key expired generate new one
    const sessionKey = await this.generateKey();
    this.sessionSet("SESSION_KEY_OBJ", sessionKey);
    return sessionKey;
  };

  // This works on all devices/browsers, and uses IndexedDBShim as a final fallback
  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
  var baseName = "TRT";
  var storeName = "events";

  function logerr(err) {
    console.log("logerr", err);
  }

  function connectDB(f) {
    // Open (or create) the database
    var request = indexedDB.open(baseName, 1);
    request.onerror = logerr;
    request.onsuccess = function () {
      f(request.result);
    };
    request.onupgradeneeded = function (e) {
      var Db = e.currentTarget.result; //var Db = e.target.result;

      //uncomment if we want to start clean
      //if(Db.objectStoreNames.contains(storeName)) Db.deleteObjectStore("note");

      //Create store
      if (!Db.objectStoreNames.contains(storeName)) {
        Db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
      }
      connectDB(f);
    };
  }

  function getAll(f) {
    connectDB(function (db) {
      var rows = [],
        store = db.transaction([storeName], "readonly").objectStore(storeName);

      if (store.mozGetAll)
        store.mozGetAll().onsuccess = function (e) {
          f(e.target.result);
        };
      else
        store.openCursor().onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor) {
            rows.push(cursor.value);
            cursor.continue();
          } else {
            f(rows);
          }
        };
    });
  }

  function add(obj, info) {
    info = typeof info !== "undefined" ? false : true;
    connectDB(function (db) {
      var transaction = db.transaction([storeName], "readwrite");
      var objectStore = transaction.objectStore(storeName);
      var objectStoreRequest = objectStore.add(obj);
      objectStoreRequest.onerror = logerr;
      objectStoreRequest.onsuccess = function () { };
    });
  }

  function clearStore() {
    connectDB(function (db) {
      var transaction = db.transaction([storeName], "readwrite");
      var objectStore = transaction.objectStore(storeName);
      var objectStoreRequest = objectStore.clear();
      objectStoreRequest.onerror = logerr;
      objectStoreRequest.onsuccess = function () { };
    });
  }
  function getLastStoredEvent(objectStore, callback) {
    var request = objectStore.openCursor(null, 'prev');

    request.onsuccess = function (event) {
      var cursor = event.target.result;
      if (cursor) {
        // Found the last stored event
        callback(cursor.value);
      }
    };
    request.onerror = function (event) {
      console.error("Error fetching last stored event:", event.target.error);
    };
  }
  let clickCounts = {};
  let rageThreshold = 3;
  function checkRageClick(event) {
    const target = event.target || event.srcElement;
    const elementKey = target.id || target.className;

    if (!clickCounts[elementKey]) {
      clickCounts[elementKey] = 1;
    } else {
      clickCounts[elementKey]++;
    }


    if (clickCounts[elementKey] > rageThreshold) {
      // Reset the click count when the rageThreshold is reached
      clickCounts[elementKey] = 0;
      return true;
    }

    var now = Math.floor(Date.now());

    if (
      now - this.lastClick < 500 &&
      now - this.secondLastClick &&
      clickCounts[elementKey] >= rageThreshold
    ) {
      clickCounts = {}
      return true;
    }

    this.secondLastClick = this.lastClick;
    this.lastClick = now;

    // No rage click detected for this element
    return false;
  }
  function updateLastStoredEvent(objectStore, key, updatedEvent) {
    var request = objectStore.put(updatedEvent, key);

    request.onsuccess = function () {
      // console.log("Event updated successfully");
    };

    request.onerror = function (event) {
      console.error("Error updating event:", event.target.error);
    };
  }

  document.addEventListener('click', (event) => {

    const isRageClick = checkRageClick(event);

    if (isRageClick) {
      let timeValue = sessionStorage.getItem("sessionStartTime")
      const clickedElement = event.target;
      const elementType = clickedElement.tagName.toLowerCase();
      const elementName = clickedElement.nodeName;
      const elementClass = clickedElement.className;
      const elementId = clickedElement.id;
      const url = window.location.href;
      const onClickDetails = clickedElement.onclick ? clickedElement.onclick.toString() : "No onclick attribute";
      let clickDetails = { elementType, elementName, elementClass, elementId, url, onClickDetails };
      // this.rageclickfind = true;
      clickedObject.rageClick.push({ type: "rageClick", tempTime: Date.now() - timeValue, dateFormat: new Date(), ...clickDetails })
    }
  }, false);

  let captureStartTime = null;
  App.TraekAnalytics.prototype.recordSessions = function () {
    if (typeof rrwebRecord !== "undefined") {
      rrwebRecord({
        emit(event) {
          if (event.data.source == 2) {
            event.element = this.currentClick;
            currentEvent = event
          }
          try {
            if (event) {
              add(event);
            }
          } catch (error) {
            console.error("rrwebRecord error =>", error);
          }
        },
        recordCanvas: true,
        inlineStylesheet: true,
        maskAllInputs: true,
        maskInputOptions: {
          password: true, // Mask some kinds of input
        },
      });
    }
  };


  function formatDuration(duration) {
    // Convert milliseconds to seconds
    const seconds = Math.floor(duration / 1000);
    // Calculate minutes
    const minutes = Math.floor(seconds / 60);
    // Calculate remaining seconds
    const remainingSeconds = seconds % 60;
    // Return formatted duration
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  let captureStartTimeData = parseFloat(sessionStorage.getItem("captureStartTime"));

  if (!isNaN(captureStartTimeData)) {
    // If the value exists in sessionStorage, use it
    captureStartTime = captureStartTimeData;
  } else {
    // If not found, initialize it with current time and store in sessionStorage
    captureStartTime = performance.now();
    sessionStorage.setItem("captureStartTime", captureStartTime.toString());
  }

  function captureDurationBasedOnEvent() {
    let getperfomance = sessionStorage.getItem("perfomance")
    let test = sessionStorage.getItem("ErrorPerformance")
    let timing;
    if (getperfomance) {
      let oldTime, newTime, timeDifference;
      if (sessionStorage.getItem('oldTime')) {
        // If oldTime is already stored, retrieve its value
        oldTime = parseFloat(sessionStorage.getItem('newTime'));
        newTime = performance.now();

        // Check if newTime is less than oldTime, then set it to 0
        if (newTime < oldTime) {
          newTime = 0;
          oldTime = 0;
        }
      } else {
        // If oldTime is not stored yet, initialize it to 0 and set newTime to performance.now()
        oldTime = 0;
        newTime = performance.now();
      }
      // Update oldTime and newTime in sessionStorage
      sessionStorage.setItem('oldTime', oldTime);
      sessionStorage.setItem('newTime', newTime);

      // Calculate the time difference
      timeDifference = Math.abs(newTime - oldTime);

      // Calculate timing by adding test and timeDifference
      timing = parseFloat(test) + timeDifference;

      // Store timing in sessionStorage
      sessionStorage.setItem("ErrorPerformance", timing.toString());

    }

    else {
      timing = performance.now()
    }
    let duration;
    if (test > timing) {
      sessionStorage.setItem("perfomance", true)
      duration = test - captureStartTime;
      sessionStorage.setItem("ErrorPerformance", test.toString())
    } else {
      duration = timing - captureStartTime;
      sessionStorage.setItem("ErrorPerformance", timing.toString())
    }
    // Calculate the duration since event capturing started
    const formattedDuration = formatDuration(duration);
    return formattedDuration;
  }

  function addConsoleMessage(type, args, stack, formattedDuration) {
    if (args.join(' ') === "Script error.") {
      return;
    }

    errorMessageObj = {
      level: type,
      clickError: true,
      payload: [
        args.join(' ')
      ],
      stackTrace: stack,
      duration: formattedDuration // Include duration in the payload
    }

    // Push console messages into capturedConsole with additional details
    add({
      type: 6,
      data: {
        plugin: "rrweb/console@1",
        payload: {
          level: type,
          payload: [
            args.join(' ')
          ],
          stackTrace: stack,
          duration: formattedDuration // Include duration in the payload
        }
      },
      timestamp: Date.now(),
    });
  }


  for (const methodName in console) {
    if (typeof console[methodName] === 'function' && methodName === "error") {
      const originalMethod = console[methodName];

      console[methodName] = function (...args) {
        // Capture the stack trace
        const error = new Error();
        const stack = error.stack;
        let getperfomance = sessionStorage.getItem("perfomance")
        let test = sessionStorage.getItem("ErrorPerformance")
        let timing;
        if (getperfomance) {
          let oldTime, newTime, timeDifference;
          if (sessionStorage.getItem('oldTime')) {
            // If oldTime is already stored, retrieve its value
            oldTime = parseFloat(sessionStorage.getItem('newTime'));
            newTime = performance.now();

            // Check if newTime is less than oldTime, then set it to 0
            if (newTime < oldTime) {
              newTime = 0;
              oldTime = 0;
            }
          } else {
            // If oldTime is not stored yet, initialize it to 0 and set newTime to performance.now()
            oldTime = 0;
            newTime = performance.now();
          }
          // Update oldTime and newTime in sessionStorage
          sessionStorage.setItem('oldTime', oldTime);
          sessionStorage.setItem('newTime', newTime);

          // Calculate the time difference
          timeDifference = Math.abs(newTime - oldTime);

          // Calculate timing by adding test and timeDifference
          timing = parseFloat(test) + timeDifference;

          // Store timing in sessionStorage
          sessionStorage.setItem("ErrorPerformance", timing.toString());

        }

        else {
          timing = performance.now()
        }
        let duration;
        if (test > timing) {
          sessionStorage.setItem("perfomance", true)
          duration = test - captureStartTime;
          sessionStorage.setItem("ErrorPerformance", test.toString())
        } else {
          duration = timing - captureStartTime;
          sessionStorage.setItem("ErrorPerformance", timing.toString())
        }
        // Calculate the duration since event capturing started
        const formattedDuration = formatDuration(duration);


        // Push console messages into capturedConsole with additional details
        addConsoleMessage(methodName, args, stack, formattedDuration)
        // Call the original console method
        originalMethod.apply(console, args);
      };
    }
  }

  // Function to capture network errors
  function captureNetworkErrors() {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = function (url, options) {
      const method = options && options.method ? options.method : 'GET'; // Default to GET if method is not provided
      return originalFetch(url, options).then(response => {
        if (!response.ok) {
          const error = new Error(`${method}: ${response.url} ${response.status}(${response.statusText})`);
          throw error;
        }
        return response;
      }).catch(error => {
        throw error.message;
      });
    };
  }

  // Call the function to start capturing network errors
  captureNetworkErrors();


  window.onerror = function (message, source, lineno, colno, error) {
    const stack = error ? error.stack : null;
    let getperfomance = sessionStorage.getItem("perfomance")
    let test = sessionStorage.getItem("ErrorPerformance")
    let timing;
    if (getperfomance) {
      let oldTime, newTime, timeDifference;
      if (sessionStorage.getItem('oldTime')) {
        // If oldTime is already stored, retrieve its value
        oldTime = parseFloat(sessionStorage.getItem('newTime'));
        newTime = performance.now();

        // Check if newTime is less than oldTime, then set it to 0
        if (newTime < oldTime) {
          newTime = 0;
          oldTime = 0;
        }
      } else {
        // If oldTime is not stored yet, initialize it to 0 and set newTime to performance.now()
        oldTime = 0;
        newTime = performance.now();
      }
      // Update oldTime and newTime in sessionStorage
      sessionStorage.setItem('oldTime', oldTime);
      sessionStorage.setItem('newTime', newTime);

      // Calculate the time difference
      timeDifference = Math.abs(newTime - oldTime);

      // Calculate timing by adding test and timeDifference
      timing = parseFloat(test) + timeDifference;

      // Store timing in sessionStorage
      sessionStorage.setItem("ErrorPerformance", timing.toString());

    }

    else {
      timing = performance.now()
    }
    let duration;
    if (test > timing) {
      sessionStorage.setItem("perfomance", true)
      duration = test - captureStartTime;
      sessionStorage.setItem("ErrorPerformance", test.toString())
    } else {
      duration = timing - captureStartTime;
      sessionStorage.setItem("ErrorPerformance", timing.toString())
    }
    const formattedDuration = formatDuration(duration);
    addConsoleMessage("error", [message], stack, formattedDuration); // Duration is set to 0 for JavaScript errors
  };

  App.TraekAnalytics.prototype.saveSessionRecording = async function (isFormSession = false) {
    await this.sessionGet("SESSION_KEY_OBJ");

    const { propertyId, userKey, sessionKey, hostUrl, ip, userAgent, pageUrl, pageTitle, referrer, screenResolution } = this;

    //get data

    getAll(async (events) => {
      const isExistsSnapshotSession = window.sessionStorage.getItem("isSnapshotCaptured") === "true";

      const isExistsSnapshotObject = events.findIndex(({ type }) => type === 4);
      let customAttribute = sessionStorage.getItem("ryData")
      customAttribute = JSON.parse(customAttribute)
      const attributeAll = customAttribute ? customAttribute : []

      if (isExistsSnapshotSession || isExistsSnapshotObject >= 0) {
        if (events?.length > 0) {
          const url = hostUrl + "/api/session-recording";
          const payload = {
            data: events,
            propertyId,
            userKey,
            sessionKey,
            ip,
            userAgent,
            screenResolution,
            pageUrl,
            page: pageTitle,
            isFormSession,
            referrer,
            clickedObject,
            attributeAll,
          };

          clickedObject = {
            input: [],
            button: [],
            elementClick: [],
            formSubmit: [],
            windowResize: [],
            deadClick: [],
            linkClick: [],
            errorClick: [],
            pageNavigation: [],
            rageClick: []
          };

          const requestOptions = {
            method: "POST",
            body: JSON.stringify(payload),
          };
          await fetch(url, requestOptions);
          clearStore();

          window.sessionStorage.setItem("isSnapshotCaptured", "true");
          ry('clear');
        }
      } else {
        window.sessionStorage.setItem("isSnapshotCaptured", "false");
        this.recordSessions();
      }
    });
  };

  App.TraekAnalytics.prototype.captureHeatmaps = function () {
    setInterval(() => {
      this.saveHeatmap();
    }, 10 * 1000);
    function getDomPath(el) {
      if (!el) {
        return;
      }
      var stack = [];
      var isShadow = false;
      while (el.parentNode != null) {
        var sibCount = 0;
        var sibIndex = 0;
        for (var i = 0; i < el.parentNode.childNodes.length; i++) {
          var sib = el.parentNode.childNodes[i];

          if (sib.nodeName == el.nodeName) {
            if (sib === el) {
              sibIndex = sibCount;
            }
            sibCount++;
          }
        }
        var nodeName = el.nodeName.toLowerCase();

        if (isShadow) {
          nodeName += "::shadow";
          isShadow = false;
        }

        if (sibCount > 1) {
          stack.unshift(nodeName + ":nth-of-type(" + (sibIndex + 1) + ")");
        } else {
          stack.unshift(nodeName);
        }

        el = el.parentNode;

        if (el.nodeType === 11) {
          isShadow = true;
          el = el.host;
        }
      }
      stack.splice(0, 1);
      return stack.join(" > ");
    }

    function getCoords(elem) {
      let box = elem.getBoundingClientRect();
      return {
        clientHeight: box.height,
        clientWidth: box.width,
      };
    }

    document.addEventListener(
      "click",
      ({ target, offsetX, offsetY }) => {
        let { clientHeight, clientWidth } = getCoords(target);
        if (document.body.contains(target)) {
          if (!this.heatmapData.click) {
            this.heatmapData.click = [];
          }
          const domPath = getDomPath(target);
          this.heatmapData.click.push({
            p: domPath,
            x: (offsetX * 100) / clientWidth,
            y: (offsetY * 100) / clientHeight,
            h: window.innerHeight,
            w: window.innerWidth,
          });
        }
      },
      true
    );
    let trackData = false;
    setInterval(function () {
      trackData = true;
    }, 50);

    document.onmousemove = ({ target, offsetX, offsetY }) => {
      if (trackData) {
        let { clientHeight, clientWidth } = getCoords(target);

        if (!this.heatmapData.move) {
          this.heatmapData.move = [];
        }

        this.heatmapData.move.push({
          p: getDomPath(target),
          x: (offsetX * 100) / clientWidth,
          y: (offsetY * 100) / clientHeight,
          h: window.innerHeight,
          w: window.innerWidth,
        });
        trackData = false;
      }
    };
  };

  function compareUrls(url, pageurl) {
    const cleanUrl = (matchurl) => matchurl.replace(/^https:\/\/(www\.)/i, "https://").toLowerCase();
    return cleanUrl(pageurl).includes(cleanUrl(url));
  }

  App.TraekAnalytics.prototype.saveHeatmap = function () {
    if (Object.keys(this.heatmapData).length > 0 && this.allowHeatmaps) {
      this.heatmaps
        .filter(({ url }) => compareUrls(url, this.pageUrl.replace(/\/$/, "")))
        .forEach(({ _id }) => {
          let url = this.hostUrl + "/api/heatmaps/save";
          var myHeaders = new Headers();
          myHeaders.append("Content-Type", "application/json");

          const raw = JSON.stringify({
            propertyId: this.propertyId,
            heatmapId: _id,
            events: this.heatmapData,
            userKey: this.userKey,
            newVisit: this.newVisit,
          });

          const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow",
          };
          fetch(url, requestOptions);
        });
      this.newVisit = false;
    }
    this.heatmapData = {};
  };

  App.TraekAnalytics.prototype.getUserIp = async function () {
    const getIpFromIpify = async () => {
      try {
        const response = await fetch("https://api.ipify.org/?format=json");
        const { ip } = await response.json();
        return ip;
      } catch (error) {
        console.log("getUserIp error => ", error);
        return null;
      }
    };

    if (RTCPeerConnection) {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302",
            },
          ],
        });
        pc.createDataChannel("");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        return await new Promise((resolve) => {
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const match = event.candidate.candidate.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
              if (match) {
                pc.close();
                resolve(match[0]);
              }
            }
          };
          setTimeout(() => {
            pc.close();
            resolve(null);
          }, 5000);
        });
      } catch (e) {
        return getIpFromIpify();
      }
    } else {
      return getIpFromIpify();
    }
  };
  App.TraekAnalytics.prototype.generateKey = function () {
    return fetch(this.hostUrl + "/api/generaterandomkey", { credentials: "same-origin" })
      .then((data) => data.json())
      .then(({ key }) => key)
      .catch((error) => {
        console.error("generateKey", error.message);
      });
  };

  function uploadVisitorRecords(url) {
    let visitors = JSON.parse(localStorage.getItem("visitors")) || [];

    const hostUrl = url + "/api/trackdata";
    navigator.sendBeacon(hostUrl, JSON.stringify({ visits: visitors, isBulkLeads: true }));

    localStorage.setItem("visitors", JSON.stringify([]));
  }

  App.TraekAnalytics.prototype.callFeedsApi = async function () {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const sessionKey = await this.sessionGet("SESSION_KEY_OBJ");

    const payload = {
      propertyId: this.propertyId,
      pageTitle: this.pageTitle,
      pageUrl: this.pageUrl,
      referrer: this.referrer,
      sessionKey,
      ip: this.ip,
      userKey: this.userKey,
    };

    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify(payload),
    };

    const hostUrl = "http://localhost:3333";

    fetch(hostUrl + "/api/leads/feeds", requestOptions).catch((error) => console.error("callFeedsApi error", error));
  };

  let timeOfPreviousVisit = sessionStorage.getItem("timeOfPreviousVisit") ? sessionStorage.getItem("timeOfPreviousVisit") : 0;
  sessionStorage.setItem("timeOfPreviousVisit", timeOfPreviousVisit)

  // add leads / visitor logs to table on tab change/close, page change
  App.TraekAnalytics.prototype.callTrackingApi = async function () {

    const sessionKey = await this.sessionGet("SESSION_KEY_OBJ");
    let temptimeOfPreviousVisit = sessionStorage.getItem("timeOfPreviousVisit")

    try {
      const hostUrl = this.hostUrl + "/api/trackdata";
      let time = Date.now();

      let pageUrlTemp = this.pageUrl
      if (pageUrlTemp.endsWith('/')) {
        pageUrlTemp = pageUrlTemp.slice(0, -1);
      }

      const payload = {
        propertyId: this.propertyId,
        time: time,
        pageTitle: this.pageTitle,
        pageUrl: pageUrlTemp,
        referrer: this.referrer,
        sessionKey,
        timeOfPreviousVisit: temptimeOfPreviousVisit,
        duration: time - temptimeOfPreviousVisit,
        ip: this.ip,
        userKey: this.userKey,
        userAgent: this.userAgent,
        screenResolution: this.screenResolution,
      };

      sessionStorage.setItem("timeOfPreviousVisit", time)

      // if (this.callApi) {
      //   if (this.type !== "isp") {
      //     // Set isVisitor to true in the payload
      //     const modifiedPayload = { ...payload, isVisitor: true };

      //     // Convert the modified payload to a Blob
      //     const blob = new Blob([JSON.stringify(modifiedPayload)], {
      //       type: "application/json",
      //     });

      //     // Use navigator.sendBeacon with the Blob
      //     const success = navigator.sendBeacon(hostUrl, blob);

      //     if (success) {
      //       console.log(
      //         "sendBeacon successfully queued the data for transfer."
      //       );
      //     } else {
      //       console.log("sendBeacon could not queue the data for transfer.");
      //     }
      //   }
      // }

      await fetch(hostUrl, {
        method: "POST",
        body: JSON.stringify({ ...payload, isVisitor: true }),
      })
        .then((resp) => { })
        .catch((err) => {
          console.log("isVisitor err => ", err);
        });
    } catch (error) {
      console.error("add leads error =>", error);
    }
  };

  App.TraekAnalytics.prototype.trackForms = function () {
    // allow form tracking if allow forms flag enabled
    if (this.allowForms) {
      let ignore = ["submit", "reset", "password", "file", "image", "radio", "checkbox", "button", "hidden", "g-recaptcha-response"];
      let sensitive = [
        "credit card",
        "card number",
        "expiration",
        "expiry",
        "ccv",
        "cvc",
        "cvv",
        "secure code",
        "mastercard",
        "american express",
        "amex",
        "cc-num",
        "cc-number",
      ];
      try {
        let forms = document.querySelectorAll("form");
        function formSubmitted(e, form, data, cb) {
          const formName = e.currentTarget.name.value;
          const formId = e.currentTarget.id;

          let formData = {
            sessionKey: data.sessionKey,
            userKey: data.userKey,
            userIp: data.ip,
            propertyId: data.propertyId,
            formName,
            formId,
            elements: [],
            referrer: data.referrer,
            page: data.pageTitle,
            pageUrl: data.pageUrl,
            userAgent: data.userAgent,
            screenResolution: data.screenResolution,
          };
          let checkEmpty = [];
          for (const element of form) {
            let type = element.type;
            let tag = element.tagName;
            let name = element.name;
            let label = element?.labels?.length > 0 ? element?.labels[0]?.innerText : name || "";
            for (let i = 0; i < sensitive.length; i++) {
              if (label.match(new RegExp(sensitive[i], ""))) {
                continue;
              }
            }
            let elementObject = { tag, type, label, name };
            const checkRequiredOrEmpty = (value) => {
              if (value === "" || value === null || value === undefined) {
                checkEmpty.push(null);
              } else {
                checkEmpty.push(true);
              }
            };

            if (tag === "TEXTAREA") {
              if (label !== "g-recaptcha-response" && name !== "g-recaptcha-response") {
                elementObject.value = element.value;
                checkRequiredOrEmpty(element.value);
                formData.elements.push(elementObject);
              }
            } else if (tag === "SELECT") {
              for (const option of element.selectedOptions) {
                if (!elementObject.value) {
                  elementObject.value = [];
                }
                elementObject.value.push(option.value);
              }
              formData.elements.push(elementObject);
            } else if (tag === "INPUT") {
              const excludedValues = ["g-recaptcha-response", "recaptcha"];

              if (!excludedValues.includes(label) && !excludedValues.includes(name)) {
                switch (type) {
                  case "radio":
                    if (element.checked) {
                      elementObject.value = element.value;
                      formData.elements.push(elementObject);
                    }
                    break;
                  case "checkbox":
                    if (element.checked) {
                      let checkIndex = formData.elements.findIndex((element) => element.type === type && element.name === name);
                      if (checkIndex === -1) {
                        elementObject.value = [];
                        elementObject.value.push(element.value);
                        formData.elements.push(elementObject);
                      } else {
                        elementObject = formData.elements[checkIndex];
                        elementObject.value.push(element.value);
                        formData.elements[checkIndex] = elementObject;
                      }
                    }
                    break;
                  default:
                    if (!ignore.find((val) => val === type)) {
                      elementObject.value = element.value;
                      formData.elements.push(elementObject);
                      checkRequiredOrEmpty(element.value);
                    }
                    break;
                }
              }
            }
          }

          if (checkEmpty.some((data) => data === true)) {
            navigator.sendBeacon("https://uat-app.traek.io" + "/api/track/forms", JSON.stringify(formData));
          }

          cb(true);
        }
        const _this = this;

        forms.forEach((form) => {
          form.onsubmit = function (e) {
            formSubmitted(e, form, _this, () => {
              // uploadVisitorRecords(_this.hostUrl);
              _this.saveSessionRecording(true);
            });
          };
        });
      } catch (error) {
        console.error("trackForms", error);
      }
    }
  };

  let tractDataCall = 0;

  App.TraekAnalytics.prototype.trackUserData = async function () {
    // const eventStateObj = JSON.parse(localStorage.getItem("eventState")) || null;
    window.sessionStorage.setItem("isSnapshotCaptured", "false");

    if (this.userAgent.match(/bot|spider|crawler|headlesschrome|phantomjs|bingpreview/i)) {
      return;
    } else {
      console.log("7 trackUserData this.userAgent else success=> ", this.userAgent);
    }

    if (!this.userKey) {
      try {
        let userKey = await this.generateKey();
        localStorage.setItem("traek_user_key", userKey);
        this.userKey = userKey;
      } catch (error) {
        console.log("11 trackUserData generateKey userKey error=> ", error);
      }
    }

    if (!this.sessionKey) {
      try {
        let sessionKey = await this.generateKey();
        sessionStorage.setItem("SESSION_KEY", sessionKey);
        this.sessionSet("SESSION_KEY_OBJ", sessionKey);
        this.sessionKey = sessionKey;
      } catch (error) {
        console.log("141 trackUserData generateKey sessionKey error => ", error);
      }
    }

    if (!this.ip) {
      try {
        let ip = await this.getUserIp();

        sessionStorage.setItem("ip", ip);
        this.ip = ip;
      } catch (error) {
        console.log("171 trackUserData generateKey ip error => ", error);
      }
    }

    this.isLoading = true;

    try {
      let propertyData = sessionStorage.getItem("propertyData");
      if (!propertyData) {
        try {
          let response = await fetch(this.hostUrl + "/api/properties/property/" + this.apiKey, {
            method: "POST",
            body: JSON.stringify({
              api_key: this.apiKey,
              ip: this.ip,
              originUrl: this.pageUrl,
              userKey: this.userKey,
            }),
          });

          response = JSON.stringify(await response.json());

          sessionStorage.setItem("propertyData", response);
          propertyData = response;
        } catch (error) {
          console.log("222 trackUserData propertyData error => ", error);
        }
      }

      const {
        realtime,
        property_id,
        verified,
        //shouldAllowLead,
        //shouldAllowSession,
        chat_widget,
        forms,
        website_url,
        // type,
        heatmaps,
        firebaseAccessToken,
        sessionRecording = false,
      } = JSON.parse(propertyData);

      Object.assign(this, {
        propertyId: property_id,
        chatWidget: chat_widget,
        websiteUrl: website_url,
        allowForms: forms,
        // type,
        heatmaps,
        firebaseAccessToken,
      });

      if (this.heatmaps?.length > 0) {
        this.allowHeatmaps = true;
        this.captureHeatmaps();
      }

      const url = window.location !== window.parent.location ? document.referrer : document.location.href;

      if (url !== "https://app.traek.io/") {
        this.getElementsData();
      }
      if (property_id) {
        if (verified) {
          // try {
          //   const response = await fetch(`${this.hostUrl}/api/subscription?propertyId=${property_id}`);
          //   if (!response.ok) {
          //     throw new Error(`HTTP error! Status: ${response.status}`);
          //   }
          //   const subscriptionResponse = await response.json();
          //   if (subscriptionResponse.status === "trial_ended" || subscriptionResponse.status === "cancelled") {
          //     return;
          //   }
          // } catch (error) {
          //   console.error('Error fetching subscription data:', error.message);
          // }
          // this.allowLeads = shouldAllowLead;
          // this.allowSession = shouldAllowSession;
          this.callFeedsApi();
          setInterval(() => {
            this.trackForms();
          }, 3000);
          // this.callTrackingApi();

          // load rrweb script if session storage allowed
          if (sessionRecording) {
            const traekRRWebScript = document.createElement("script");
            traekRRWebScript.src = "https://cdn.jsdelivr.net/npm/rrweb@latest/dist/record/rrweb-record.min.js";

            traekRRWebScript.onload = async () => {
              if (this.allowSessionRecord) {
                await this.recordSessions();
                this.callTrackingApi();

                setInterval(async () => {
                  await this.saveSessionRecording();
                }, SAVE_RECORDING_INTERVAL_TIME);
              }
            };
            document.head.appendChild(traekRRWebScript);
          }

          App.TraekAnalytics.currentObject = this;
          let realtimeSctipt = document.createElement("script");
          realtimeSctipt.src = this.cdnUrl + "/riyo-realtime-uat.js";
          realtimeSctipt.type = "text/javascript";
          document.head.appendChild(realtimeSctipt);

          const sessionKey = await this.sessionGet("SESSION_KEY_OBJ");

          if (this.propertyId && this.userKey && sessionKey && this.ip) {
            window.addEventListener("visibilitychange", async () => {
              if (document.visibilityState === "visible") {
                this.visitedTime = new Date();
              } else {
                // await this.callTrackingApi();
              }
              if (document.visibilityState === "hidden") {
                await this.saveSessionRecording();
                this.allowSessionRecord = false;
              } else {
                this.allowSessionRecord = true;
              }
            });

            // window.addEventListener("beforeunload", async(event) => {
            //   event.preventDefault(); 
            //   const date1 = new Date(this.visitedTime);
            //   const date2 = new Date();
            //   const differenceInMilliseconds = Math.abs(date2 - date1);
            //   const differenceInSeconds = differenceInMilliseconds / 1000;
            //   this.duration = differenceInSeconds;
            //   console.log("this.duration in unload:", this.duration);
            //   this.saveHeatmap();
            //   await this.callTrackingApi();
            //   this.callApi = false;
            //   await this.saveSessionRecording();
            // }); 

            // Add the beforeunload event listener to call saveSessionRecording when the page is about to be closed

            // window.addEventListener("beforeunload", async (event) => {
            //   await this.callTrackingApi();
            // });


            const beforeUnloadHandler = async (event) => {
              this.callTrackingApi();
              const date1 = new Date(this.visitedTime);
              const date2 = new Date();
              const differenceInMilliseconds = Math.abs(date2 - date1);
              const differenceInSeconds = differenceInMilliseconds / 1000;
              this.duration = differenceInSeconds;
              this.saveHeatmap();

              window.removeEventListener("beforeunload", beforeUnloadHandler);
              await this.saveSessionRecording();
            };

            window.addEventListener("beforeunload", beforeUnloadHandler);

            const observer = new MutationObserver(() => {
              let pageTitle = document.title;

              const currentUrl = document.URL.replace(/\/$/, "");

              if (this.pageUrl !== currentUrl && this.pageTitle !== pageTitle) {
                const date1 = new Date(this.visitedTime);
                const date2 = new Date();
                const differenceInMilliseconds = Math.abs(date2 - date1);
                const differenceInSeconds = differenceInMilliseconds / 1000;
                this.duration = differenceInSeconds;
                this.pageUrl = currentUrl;
                this.pageTitle = pageTitle;
                this.visitedTime = new Date();
                this.newVisit = true;
                this.callTrackingApi();
                this.saveHeatmap();
                this.callFeedsApi();

                setTimeout(() => {
                  this.trackForms();
                }, 2000);
              }
            });

            const config = { subtree: true, childList: true };
            observer.observe(document, config);
          } else {
            console.log("363 trackUserData property ceck if error =>", {
              propertyId: this.propertyId,
              userKey: this.userKey,
              sessionKey,
              ip: this.ip,
            });
          }
        } else {
          navigator.sendBeacon(
            this.hostUrl + "/api/verifyscript",
            JSON.stringify({
              API_KEY: this.apiKey,
              PAGE_URL: this.pageUrl,
              IP: this.ip,
            })
          );
        }
      } else {
        console.log("383 trackUserData Property Id not found => ");
      }
    } catch (error) {
      console.error("trackUserData error", error.message);
    } finally {
      this.isLoading = false;
    }
  };

  App.TraekAnalytics.prototype.getElementsData = async function () {
    return;
    try {
      const fetchedUrls = await fetch(`${this.cdnUrl}/themes/bars/${this.websiteUrl}/elementUrls.json`);
      const urlsObject = Object.values(JSON.parse(await fetchedUrls.text()));
      this.elementUrlData = urlsObject;

      App.TraekAnalytics.currentObject = this;
      let elementsScript = document.createElement("script");
      elementsScript.src = this.cdnUrl + "/riyo-elements-uat.js";
      elementsScript.type = "text/javascript";
      document.head.appendChild(elementsScript);
    } catch (error) {
      console.error("ERROR WHILE FETCHING ELEMENT URLS IN TRACKING-INIT-UAT", error);
    }
  };
})(Traek);

const apiKey = document
  .querySelector("script[id*=traek_script]")
  .id.split("&")[1];

const traek = new Traek.TraekAnalytics(
  apiKey,
  "https://uat-app.traek.io",
  "/cdn"
).trackUserData();
