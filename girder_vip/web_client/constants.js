const carminURL = "https://vip.creatis.insa-lyon.fr/rest";
//const carminURL = "http://vip.creatis.insa-lyon.fr/vip-portal-1.23/rest";
//const carminURL = "http://vip.creatis.insa-lyon.fr:4040/rest";
//const carminURL = "http://newk.grid.creatis.insa-lyon.fr:4040/cors/rest";
//const carminURL = "http://newk.grid.creatis.insa-lyon.fr:4040/rest";

const Status = {
  INITIALIZING: { order : 0, text: "Initializing"},
  READY:  { order : 10, text: "Ready"},
  RUNNING:  { order : 20, text: "Running"},
  FINISHED:  { order : 30, text: "Completed, results available"},
  INITIALIZATIONFAILED:  { order : 40, text: "Initializing failed"},
  EXECUTIONFAILED:  { order : 50, text: "Execution failed"},
  UNKNOWN:  { order : 60, text: "Unknown"},
  KILLED:  { order : 70, text: "Killed"}
};

// Set this variable to 'true' to access to multi files menu
const EnabledMultiFiles = false;

const GIRDER_API_KEY_NAME_TO_BE_USED_FROM_VIP = "vipPluginApiKey";

export {
  carminURL,
  Status,
  EnabledMultiFiles,
  GIRDER_API_KEY_NAME_TO_BE_USED_FROM_VIP
};
