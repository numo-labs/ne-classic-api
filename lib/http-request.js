var STAGE = 'ci'; // re-assigned if necessary

function makeOptions (params) {
  return {
    host: process.env.API_GATEWAY_ENDPOINT,
    port: 443,
    path: '/' + STAGE + '/' + makePathFromParams(params)
  };
}

/**
 * makePathFromParams constructs the string that is used to request
 * data from the nordics API.
 * @param {Object} params - the parameters for the search
 * e.g: {adults:2, children:1, allInclusive: 'true'}
 */
function makePathFromParams (params) {
  var path = (params.path || 'trips') + '?'; // default to trips if unset
  delete params.path;  // ensure we don't send un-recognised params to NE API.
  delete params.searchId; // delete the params that the API does not recognise
  delete params.connectionId; // don't worry, this is a clone of the sns message
  delete params.userId; // so the params will still be sent back to client
  Object.keys(params).forEach(function (k, i) {
    path += k + '=' + params[k] + '&';
  });
  return path;
}

/**
 * httpRequest is a bare-bones http request using node.js core http
 * see: https://nodejs.org/api/http.html#http_http_request_options_callback
 * the NPM request module is 3.6 Megabytes and offers v. little benefit ...
 * This code achieves the same in less than 1kb. less code = faster response.
 * @param {Object} options - the standard http options (host, path, query, etc)
 * @param {Function} callback - a standard callback with error & response args
 * response is a JSON Object unless there is an error.
 */
module.exports = function httpRequest (params, callback) {
  STAGE = (params.stage === '$LATEST' || !params.stage) ? 'ci' : params.stage;
  var options = makeOptions(params);
  require('https').request(options, function (res) {
    res.setEncoding('utf8');
    var resStr = '';
    res.on('data', function (chunk) {
      resStr += chunk;
    }).on('end', function () {
      var json = null;
      var err = null;
      try { // avoid fatal error if ONE of the http requests has invalid JSON
        json = JSON.parse(resStr);
      } catch (e) {
        err = e;
      }

      return callback(err, json);
    });
  }).on('error', function (e) {
    return callback(e);
  }).end(); // end the request
};
