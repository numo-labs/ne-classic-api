var STAGE = 'ci'; // re-assigned if necessary

function make_options (params) {
  return {
    host: process.env.API_GATEWAY_ENDPOINT,
    port: 443,
    path: '/' + STAGE + '/' + make_path_from_params(params)
  };
}

/**
 * make_path_from_params constructs the string that is used to request
 * data from the nordics API.
 * @param {Object} params - the parameters for the search
 * e.g: {adults:2, children:1, allInclusive: 'true'}
 */
function make_path_from_params (params) {
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
 * simple_http_request is a bare-bones http request using node.js core http
 * see: https://nodejs.org/api/http.html#http_http_request_options_callback
 * the NPM request module is 3.6 Megabytes and offers v. little benefit ...
 * This code achieves the same in less than 1kb. less code = faster response.
 * @param {Object} options - the standard http options (host, path, query, etc)
 * @param {Function} callback - a standard callback with error & response args
 * response is a JSON Object unless there is an error.
 */
module.exports = function simple_http_request (params, callback) {
  STAGE = (params.stage === '$LATEST' || !params.stage) ? 'ci' : params.stage;
  var options = make_options(params);
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
