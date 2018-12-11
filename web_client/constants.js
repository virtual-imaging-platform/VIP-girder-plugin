const carminURL = "http://vip.creatis.insa-lyon.fr/rest";
//const carminURL = "http://vip.creatis.insa-lyon.fr/vip-portal-1.23/rest";
//const carminURL = "http://vip.creatis.insa-lyon.fr:4040/rest";
//const carminURL = "http://newk.grid.creatis.insa-lyon.fr:4040/cors/rest";
//const carminURL = "http://newk.grid.creatis.insa-lyon.fr:4040/rest";

const Status = {
  INITIALIZING: "Initializing",
  READY: "Ready",
  RUNNING: "Running",
  FINISHED: "Completed, fetching results",
  FETCHED: "Completed, results ready",
  NOTFETCHED: "Completed, unable to fetch results",
  INITIALIZATIONFAILED: "Initializing failed",
  EXECUTIONFAILED: "Execution failed",
  UNKNOWN: "Unknown",
  KILLED: "Killed"
};

const ChunkSize = 10000000;

// Set this variable to 'true' to access to multi files menu
const EnabledMultiFiles = false;

const GIRDER_API_KEY_NAME_TO_BE_USED_FROM_VIP = "vipPluginApiKey";

export {
  carminURL,
  Status,
  ChunkSize,
  EnabledMultiFiles,
  GIRDER_API_KEY_NAME_TO_BE_USED_FROM_VIP
};
