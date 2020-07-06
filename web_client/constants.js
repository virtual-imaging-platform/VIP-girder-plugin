const carminURL = "http://vip.creatis.insa-lyon.fr/rest";
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

export {
  carminURL,
  Status,
  ChunkSize
};
