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

CarminClient.prototype.doRequest = function(path, method, callback, opts) {
    opts = opts || {};
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4) {
        // it's over
       /* if (xmlHttp.status == 200) {
          callback(opts.noJson ? xmlHttp.responseText : JSON.parse(xmlHttp.responseText));
	} else if (opts.errorCallback) {
          // error
          opts.errorCallback(JSON.parse(xmlHttp.responseText));
        }*/
	var response = opts.noJson ? xmlHttp.responseText : (isJson(xmlHttp.responseText) ? JSON.parse(xmlHttp.responseText) : xmlHttp.responseText);
	callback(response);
      }
    };
    //console.log("'"+method+"': "+ this.baseUrl+"/"+path);
    xmlHttp.open(method, this.baseUrl + "/" + path, true);
    if (!opts.noApiKey) {
      if (this.opts.useAuthorizationHeader) {
        xmlHttp.setRequestHeader("Authorization", "apikey" + " " + this.apiKey);
      } else {
        xmlHttp.setRequestHeader("apikey", this.apiKey);
      }
    }
    if (opts.postContent) {
      xmlHttp.setRequestHeader("Content-type", opts.contentType);
    }
    if (opts.postContent) {
      //console.log(opts);
      xmlHttp.send(opts.requestNoJSON ? opts.postContent : JSON.stringify(opts.postContent));
    } else {
      xmlHttp.send(null);
    }
}

CarminClient.prototype.doRequestBody = function(path, method, content, callback, opts) {
  var opts = opts || {};
  opts.postContent = content;
  this.doRequest(path, method, callback, opts);
}

CarminClient.prototype.getPlatformProperties = function(callback) {
  var opts = {};
  opts.contentType = "application/json";
  this.doRequest("platform", "GET", callback, opts);
}

CarminClient.prototype.listPipelines = function(callback) {
  var opts = {};
  opts.contentType = "application/json";
  this.doRequest("pipelines", "GET", callback, opts);
}

CarminClient.prototype.describePipeline = function(pipelineIdentifier, callback) {
  var opts = {};
  opts.contentType = "application/json";
  this.doRequest("pipelines/" + pipelineIdentifier, "GET", callback, opts);
}

CarminClient.prototype.initAndStart = function(executionName, pipelineIdentifier, inputValues, callback) {
  var content = {"name" : executionName,"pipelineIdentifier" : pipelineIdentifier, "inputValues" : inputValues};
  var opts = {};

  opts.contentType = "application/json";
  this.doRequestBody("executions", "POST", content, callback, opts);
}

CarminClient.prototype.getExecution = function(executionIdentifier, callback) {
  var opts = {};
  opts.contentType = "application/json";
  this.doRequest("executions/" + executionIdentifier, "GET", callback, opts);
}

// A CHANGER
/*CarminClient.prototype.downloadFile = function(filePath, callback) {
  this.doRequest("path/download?uri=vip://vip.creatis.insa-lyon.fr" + filePath, "GET", callback, {"noJson":true});
}*/

CarminClient.prototype.createFolder = function(completePath, callback) {
  var opts = {};
  opts.contentType = "application/json";
  this.doRequest("path/" + completePath, "PUT", callback, opts);
}

CarminClient.prototype.uploadData = function(completePath, fileData, callback) {
  var content = fileData;
  var opts = {};

  opts.contentType = "application/octet-stream";
  opts.requestNoJSON = true;
  this.doRequestBody("path/" + completePath, "PUT", content, callback, opts);
}

CarminClient.prototype.fileExists = function(completePath, callback) {
  var opts = {};
  opts.contentType = "application/json";
  this.doRequest("path/" + completePath + "?action=exists", "GET", callback, opts);
}

export default CarminClient;
