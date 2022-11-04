const NodeHelper = require("node_helper");
const Log = require("logger");
const CalendarProvider = require("./calendar-provider");

module.exports = NodeHelper.create({
  // Override start method.
  start: function() {
    Log.log("Starting node helper for: " + this.name);
    this.fetchers = [];
  },

  // Override socketNotificationReceived method.
  socketNotificationReceived: function(notification, payload) {
    if (notification === "REQUEST_CALENDAR_DATA") {
      this.sendSocketNotification("CALENDAR_DATA", {...CalendarProvider.romcalFileProvider()});
    }
  },
});