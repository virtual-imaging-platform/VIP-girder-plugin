const CARMIN_URL = "https://vip.creatis.insa-lyon.fr/rest";

const VIP_PLUGIN_API_KEY = "vipPluginApiKey";

// to change to the id of the external storage from VIP for this girder instance
const VIP_EXTERNAL_STORAGE_NAME = "girderxxx";

// the plugin will only work on the collections whose ids are listed here
const COLLECTIONS_IDS = [];

// Set this variable to 'true' to access to multi files menu
const ENABLE_MULTIFILES = false;

const STATUSES = {
  INITIALIZING: { order : 0, text: "Initializing"},
  READY:  { order : 10, text: "Ready"},
  RUNNING:  { order : 20, text: "Running"},
  FINISHED:  { order : 30, text: "Completed, results available"},
  INITIALIZATIONFAILED:  { order : 40, text: "Initializing failed"},
  EXECUTIONFAILED:  { order : 50, text: "Execution failed"},
  UNKNOWN:  { order : 60, text: "Unknown"},
  KILLED:  { order : 70, text: "Killed"}
};

const NEEDED_TOKEN_SCOPES = ['core.data.read', 'core.data.write'];

export {
  CARMIN_URL,
  COLLECTIONS_IDS,
  STATUSES,
  ENABLE_MULTIFILES,
  VIP_PLUGIN_API_KEY,
  VIP_EXTERNAL_STORAGE_NAME,
  NEEDED_TOKEN_SCOPES
};
