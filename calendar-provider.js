const romcal = require('romcal');
const moment = require('moment');

/**
 * An event on the liturgical calendar.
 * @typedef {{date: string, name: string, colour: string, importance: string, season: string}} Celebration
 */

/**
 * An event on the liturgical calendar.
 * @typedef {{celebrations: Celebration[], currentLiturgicalWeek: number, currentSeason: string, currentYear: string}} Calendar
 */

/**
 * The number of weeks in the current period.
 * @returns {number}
 */
function weekCount(celebrations) {
  const todayDate = new Date();
  const index = celebrations.findIndex((c) => moment(c.date).isSame(todayDate, "day"));
  const season = celebrations[index].season;
  let daysInPeriod = 0;
  for (let i = index; i > 0; i--) {
    daysInPeriod++;
    if (celebrations[i].season !== season)
      break;
  }
  return Math.floor(daysInPeriod / 7);
}

module.exports = {
  /**
   * @todo refactor to new format.
   * @returns {Promise<Calendar>}
   */
  localFileProvider: () => {
    return fetch(`${this.data.path}/data/data.json`)
      .then((response) => response.json())
      .then((json) => {
        const startDate = moment().subtract(1, 'days');
        const endDate = moment(startDate).add(this.config.numberOfDaysOnCalendar, 'days');

        // Get celebrations for the next n days.
        this.retrievedData = json.filter((celebration) => moment(celebration.date).isBetween(startDate, endDate));
        this.currentWeekInPeriod = weekCount(json);
      });
  },

  /**
   * @returns {Calendar}
   */
  romcalFileProvider: () => {
    const todayDate = moment();
    // Configure according to https://www.npmjs.com/package/romcal
    // Verify your country with http://www.gcatholic.org/calendar/2022/ZA-en.htm
    const celebrationsThisYear = romcal.calendarFor({
        year: todayDate.year(),
        country: 'southAfrica',
        locale: 'en',
        christmastideEnds: 'o',
        epiphanyOnJan6: false,
        christmastideIncludesTheSeasonOfEpiphany: true,
        corpusChristiOnThursday: false, // The Most Holy Body and Blood of Christ
        ascensionOnSunday: true,
        type: 'calendar'
      },
      false);

    const currentDay = celebrationsThisYear.find((calendarEvent) => moment(calendarEvent.moment).isSame(todayDate, "day"));
    const celebrations = celebrationsThisYear.map((calendarEvent) => ({
      date: calendarEvent.moment,
      name: calendarEvent.name,
      colour: calendarEvent.data.meta.liturgicalColor.key,
      importance: calendarEvent.type.toUpperCase(),
      season: calendarEvent.data.season.key.toLowerCase()
    }));

    return {
      currentLiturgicalWeek: currentDay.data.meta.psalterWeek.key,
      currentSeason: currentDay.data.season.key.toLowerCase(),
      currentYear: {0: 'year-a', 1: 'year-b', 2: 'year-c'}[currentDay.data.meta.cycle.key],
      celebrations
    };
  }
}