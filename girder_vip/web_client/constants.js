const VIP_PLUGIN_API_KEY = "vipPluginApiKey";
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
  STATUSES,
  ENABLE_MULTIFILES,
  VIP_PLUGIN_API_KEY,
  NEEDED_TOKEN_SCOPES
};
