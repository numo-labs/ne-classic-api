var request = require('./http-request');
var HOTEL_INFO_CACHE = {}; // use lambda memory to serve requests even faster

/**
 * getHotelInfo does exactly what it's name suggests; gets hotel info
 * from the NE API. the twist is that it first checks the Lambda's
 * HOTEL_INFO_CACHE and only does the request if it's not cached.
 * @param {Number} hid - the hotel id
 * @param {Function} callback - called once we have a result
 */
function getHotelInfo (hid, callback) {
  if (hid && HOTEL_INFO_CACHE[hid]) {
    return callback(null, HOTEL_INFO_CACHE[hid]);
  } else {
    var params = {hotelIds: hid, path: 'hotels'};
    request(params, function (err, data) {
      if (err) {
        return callback(err, data);
      } else {
        HOTEL_INFO_CACHE[hid] = data.result; // cache for next time
        return callback(err, data.result);
      }
    });
  }
}

module.exports.getHotelInfo = getHotelInfo;
