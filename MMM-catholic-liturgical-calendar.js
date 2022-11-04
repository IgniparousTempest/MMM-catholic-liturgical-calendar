/**
 * An event on the liturgical calendar.
 * @typedef {{date: string, name: string, colour: string, importance: string, season: string}} Celebration
 */

/**
 * An event on the liturgical calendar.
 * @typedef {{celebrations: Celebration[], currentLiturgicalWeek: number, currentSeason: string, currentYear: string}} Calendar
 */

Module.register("MMM-catholic-liturgical-calendar", {
  defaults: {
    fade: true,
    numberOfDaysOnCalendar: 7,
    requiredChurchEvents: ['SOLEMNITY', 'SUNDAY', 'TRIDUUM', 'HOLY_WEEK', 'FEAST', 'MEMORIAL']
  },
  /** @type {Calendar | null} */
  retrievedData: null,

  start: function() {
    // Add custom filters
    this.addFilters();
    this.sendSocketNotification("REQUEST_CALENDAR_DATA", {});
    setInterval(() => this.sendSocketNotification("REQUEST_CALENDAR_DATA", {}), 3600000);
  },

  /**
   * Define required scripts.
   * @overrides
   * https://docs.magicmirror.builders/development/core-module-file.html#subclassable-module-methods
   */
  getScripts: function() {
    return ["moment.js"];
  },

  /**
   * @overrides
   */
  getStyles: function() {
    return ['font-awesome.css', 'MMM-catholic-liturgical-calendar.css'];
  },

  /**
   * @overrides
   */
  getTranslations: function() {
    return {
      af: "translations/af.json",
      en: "translations/en.json",
      la: "translations/la.json"
    };
  },

  /**
   * Determines the template file to be used.
   * @overrides
   */
  getTemplate: function() {
    return "MMM-catholic-liturgical-calendar.njk";
  },

  /**
   * @override
   */
  getHeader: function() {
    if (!this.retrievedData) {
      return 'Liturgical Calendar';
    }

    const day = this.translate(moment().format('dddd'));
    const season = this.translate(this.retrievedData.currentSeason);
    return 'Liturgical Calendar: ' + this.translate('TITLE', {
      weekday: day,
      weekNumber: moment.localeData().ordinal(this.retrievedData.currentLiturgicalWeek),
      season: season,
      yearName: this.translate(this.retrievedData.currentYear)
    });
  },

  /**
   * Data used in the template.
   * @overrides
   */
  getTemplateData: function() {
    if (!this.retrievedData) {
      return {};
    }

    // Filter out feria days (ordinary days that do not have a celebration or feast).
    let celebrations = this.retrievedData.celebrations.filter((celebration) => celebration.importance !== "FERIA");

    // Mark if that days requires church attendance.
    celebrations = celebrations.map((celebration) => ({
      ...celebration,
      attendChurch: this.config.requiredChurchEvents.includes(celebration.importance)
    }));

    // Internationalise strings
    celebrations = celebrations.map((celebration) => ({
      ...celebration,
      colour: this.translate(celebration.colour),
      importance: this.translate(celebration.importance)
    }));

    return {
      celebrations: celebrations,
      config: this.config
    };
  },

  /**
   * Add custom nunjucks commands.
   */
  addFilters() {
    this.nunjucksEnvironment().addFilter(
      "formatDate",
      function(date) {
        date = moment(date);
        return date.isSame(moment(), 'day') ? this.translate('today') : date.format('Do MMM');
      }.bind(this)
    );

    this.nunjucksEnvironment().addFilter(
      "opacity",
      function(currentStep, numSteps) {
        if (this.config.fade) {
          // Nunjucks is 1 indexed.
          let fadeIndices = {
            [numSteps - 1]: 0.5,
            [numSteps]: 0.25
          };
          if (numSteps < 5) {
            fadeIndices = Object.fromEntries(Object.entries(fadeIndices).map(([k, v]) => [parseInt(k) + (5 - numSteps), v]));
          }
          return fadeIndices?.[currentStep] || 1;
        }
        return 1;
      }.bind(this)
    );
  },

  notificationReceived: function() {},

  /**
   * Retrieves data from the backend (node_helper.js).
   * @param {string} notification
   * @param {Calendar} payload
   * @override
   */
  socketNotificationReceived: function(notification, payload) {
    if (notification === "CALENDAR_DATA") {
      const startDate = moment().subtract(1, 'days');
      const endDate = moment(startDate).add(this.config.numberOfDaysOnCalendar, 'days');

      // Get celebrations for the next n days.
      const forecastEvents = payload.celebrations.filter((celebration) => moment(celebration.date).isBetween(startDate, endDate));
      this.retrievedData = {
        ...payload,
        celebrations: forecastEvents
      };
      this.updateDom(500);
    }
  },
})