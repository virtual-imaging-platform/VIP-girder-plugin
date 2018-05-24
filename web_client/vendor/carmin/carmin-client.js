function CarminClient(baseUrl, apiKey, opts) {
  this.apiKey = apiKey;
  this.baseUrl = baseUrl;
  this.opts = opts || {};
}

function isJson(data) {
  try {
    JSON.parse(data);
  } catch (e) {
    return false;
  }
  return true;
}

// Global function to send the request
CarminClient.prototype.doRequest = function(path, method, opts) {
  var promiseObject = new Promise(function (resolve) {
    opts = opts || {};
    var xmlHttp = new XMLHttpRequest();

    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4) {

        if (opts.noJson)
          var response = xmlHttp.responseText;
        else if (opts.responseTypeBuffer)
          var response = xmlHttp.response;
        else if (isJson(xmlHttp.responseText))
          var response = JSON.parse(xmlHttp.responseText);
        else
          var response = xmlHttp.responseText;

          resolve(response);
      }
    };

    xmlHttp.open(method, this.baseUrl + "/" + path, opts.async);

    if (!opts.noApiKey) {
      if (this.opts.useAuthorizationHeader)
        xmlHttp.setRequestHeader("Authorization", "apikey" + " " + this.apiKey);
      else
        xmlHttp.setRequestHeader("apikey", this.apiKey);
    }

    if (opts.postContent)
      xmlHttp.setRequestHeader("Content-type", opts.contentType);

    if (opts.responseTypeBuffer)
      xmlHttp.responseType = "arraybuffer";

    if (opts.postContent)
      xmlHttp.send(opts.requestNoJSON ? opts.postContent : JSON.stringify(opts.postContent));
    else
      xmlHttp.send(null);
  }.bind(this));
  return promiseObject;
}

// Request with a body
CarminClient.prototype.doRequestBody = function(path, method, content, opts) {
  var opts = opts || {};
  opts.postContent = content;
  return this.doRequest(path, method, opts);
}

// Get platform properties
CarminClient.prototype.getPlatformProperties = function() {
  var opts = {};
  opts.async = true;
  opts.contentType = "application/json";
  return this.doRequest("platform", "GET", opts);
}

// Get the pipelines allowed for the user
CarminClient.prototype.listPipelines = function() {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  return this.doRequest("pipelines", "GET", opts);
}

// Get the description of a pipeline
CarminClient.prototype.describePipeline = function(pipelineIdentifier) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  return this.doRequest("pipelines/" + pipelineIdentifier, "GET", opts);
}

// initialize an execution of a pipeline
CarminClient.prototype.initAndStart = function(executionName, pipelineIdentifier, inputValues) {
  var content = {"name" : executionName,"pipelineIdentifier" : pipelineIdentifier, "inputValues" : inputValues};
  var opts = {};

  opts.contentType = "application/json";
  opts.async = true;
  return this.doRequestBody("executions", "POST", content, opts);
}

// Get the details of an execution
CarminClient.prototype.getExecution = function(executionIdentifier) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  return this.doRequest("executions/" + executionIdentifier, "GET", opts);
}

// Get the results paths of an finished execution
CarminClient.prototype.getExecutionResults = function(executionIdentifier) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  return this.doRequest("executions/" + executionIdentifier + '/results', "GET", opts);
}

// Create a folder in a path given
CarminClient.prototype.createFolder = function(completePath) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  return this.doRequest("path/" + completePath, "PUT", opts);
}

// Senf a file's content
CarminClient.prototype.uploadData = function(completePath, fileData) {
  var content = fileData;
  var opts = {};

  opts.contentType = "application/octet-stream";
  opts.requestNoJSON = true;
  opts.async = true;
  return this.doRequestBody("path/" + completePath, "PUT", content, opts);
}

// Get a file's content
CarminClient.prototype.downloadFile = function(filePath) {
  var opts = {};
  opts.contentType = "application/json";
  opts.responseTypeBuffer = true;
  opts.async = true;
  return this.doRequest("path" + filePath + "?action=content", "GET", opts);
}

// Get a folder's content
CarminClient.prototype.getFolderDetails = function(folderPath) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  return this.doRequest("path/" + folderPath + "?action=list", "GET", opts);
}

// Check if a file or a path exists
CarminClient.prototype.fileExists = function(completePath) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  return this.doRequest("path/" + completePath + "?action=exists", "GET", opts);
}






















/*function CarminClient(baseUrl, apiKey, opts) {
  this.apiKey = apiKey;
  this.baseUrl = baseUrl;
  this.opts = opts || {};
}

function isJson(data) {
  try {
    JSON.parse(data);
  } catch (e) {
    return false;
  }
  return true;
}

// Global function to send the request
CarminClient.prototype.doRequest = function(path, method, callback, opts) {
  var promiseObject = new Promise(function (resolve) {
    opts = opts || {};
    var xmlHttp = new XMLHttpRequest();

    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4) {

        if (opts.noJson)
          var response = xmlHttp.responseText;
        else if (opts.responseTypeBuffer)
          var response = xmlHttp.response;
        else if (isJson(xmlHttp.responseText))
          var response = JSON.parse(xmlHttp.responseText);
        else
          var response = xmlHttp.responseText;

          resolve(response);
      }
    };

    xmlHttp.open(method, this.baseUrl + "/" + path, opts.async);

    if (!opts.noApiKey) {
      if (this.opts.useAuthorizationHeader)
        xmlHttp.setRequestHeader("Authorization", "apikey" + " " + this.apiKey);
      else
        xmlHttp.setRequestHeader("apikey", this.apiKey);
    }

    if (opts.postContent)
      xmlHttp.setRequestHeader("Content-type", opts.contentType);

    if (opts.responseTypeBuffer)
      xmlHttp.responseType = "arraybuffer";

    if (opts.postContent)
      xmlHttp.send(opts.requestNoJSON ? opts.postContent : JSON.stringify(opts.postContent));
    else
      xmlHttp.send(null);
  });
  return promiseObject;
}

// Request with a body
CarminClient.prototype.doRequestBody = function(path, method, content, callback, opts) {
  var opts = opts || {};
  opts.postContent = content;
  this.doRequest(path, method, callback, opts);
}

// Get platform properties
CarminClient.prototype.getPlatformProperties = function(callback) {
  var opts = {};
  opts.async = true;
  opts.contentType = "application/json";
  this.doRequest("platform", "GET", callback, opts);
}

// Get the pipelines allowed for the user
CarminClient.prototype.listPipelines = function(callback) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  this.doRequest("pipelines", "GET", callback, opts);
}

// Get the description of a pipeline
CarminClient.prototype.describePipeline = function(pipelineIdentifier, callback) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  this.doRequest("pipelines/" + pipelineIdentifier, "GET", callback, opts);
}

// initialize an execution of a pipeline
CarminClient.prototype.initAndStart = function(executionName, pipelineIdentifier, inputValues, callback) {
  var content = {"name" : executionName,"pipelineIdentifier" : pipelineIdentifier, "inputValues" : inputValues};
  var opts = {};

  opts.contentType = "application/json";
  opts.async = true;
  this.doRequestBody("executions", "POST", content, callback, opts);
}

// Get the details of an execution
CarminClient.prototype.getExecution = function(executionIdentifier, callback) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  this.doRequest("executions/" + executionIdentifier, "GET", callback, opts);
}

// Get the results paths of an finished execution
CarminClient.prototype.getExecutionResults = function(executionIdentifier, callback) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  this.doRequest("executions/" + executionIdentifier + '/results', "GET", callback, opts);
}

// A CHANGER
/*CarminClient.prototype.downloadFile = function(filePath, callback) {
this.doRequest("path/download?uri=vip://vip.creatis.insa-lyon.fr" + filePath, "GET", callback, {"noJson":true});
}*/

/*
// Create a folder in a path given
CarminClient.prototype.createFolder = function(completePath, callback) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  this.doRequest("path/" + completePath, "PUT", callback, opts);
}

// Senf a file's content
CarminClient.prototype.uploadData = function(completePath, fileData, callback) {
  var content = fileData;
  var opts = {};

  opts.contentType = "application/octet-stream";
  opts.requestNoJSON = true;
  opts.async = true;
  this.doRequestBody("path/" + completePath, "PUT", content, callback, opts);
}

// Get a file's content
CarminClient.prototype.downloadFile = function(filePath, callback) {
  var opts = {};
  opts.contentType = "application/json";
  opts.responseTypeBuffer = true;
  opts.async = true;
  this.doRequest("path" + filePath + "?action=content", "GET", callback, opts);
}

// Get a folder's content
CarminClient.prototype.getFolderDetails = function(folderPath, callback) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  this.doRequest("path/" + folderPath + "?action=list", "GET", callback, opts);
}

// Check if a file or a path exists
CarminClient.prototype.fileExists = function(completePath, callback) {
  var opts = {};
  opts.contentType = "application/json";
  opts.async = true;
  this.doRequest("path/" + completePath + "?action=exists", "GET", callback, opts);
}*/

export default CarminClient;
