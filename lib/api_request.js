var http_request = require('./http_request');
var HOTEL_INFO_CACHE = {}; // use lambda memory to serve requests even faster

// sort by cheapest paxPrice
function sort_by_price_asc (a, b) { // as a user I want to see cheapest holidays
  return (a.paxPrice < b.paxPrice)
  ? 1 : ((b.paxPrice < a.paxPrice) ? -1 : 0);
}

/**
 * get_hotel_info does exactly what it's name suggests; gets hotel info
 * from the NE API. the twist is that it first checks the Lambda's
 * HOTEL_INFO_CACHE and only does the http_request if it's not cached.
 * @param {Number} hid - the hotel id
 * @param {Function} callback - called once we have a result
 */
function get_hotel_info (hid, callback) {
  if (hid && HOTEL_INFO_CACHE[hid]) {
    return callback(null, HOTEL_INFO_CACHE[hid]);
  } else {
    var params = {hotelIds: hid, path: 'hotels'};
    http_request(params, function (err, data) {
      if (err) {
        return callback(err, data);
      } else {
        HOTEL_INFO_CACHE[hid] = data.result; // cache for next time
        return callback(err, data.result);
      }
    });
  }
}

module.exports.get_hotel_info = get_hotel_info;
