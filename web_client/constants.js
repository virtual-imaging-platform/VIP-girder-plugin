const carminURL = "http://vip.creatis.insa-lyon.fr/rest";
//const carminURL = "http://newk.grid.creatis.insa-lyon.fr:4040/cors/rest";
//const carminURL = "http://newk.grid.creatis.insa-lyon.fr:4040/rest";

const Status = {
  INITIALIZING: "Initializing",
  READY: "Ready",
  RUNNING: "Running",
  FINISHED: "Finished",
  PUSHED: "Finished and results pushed",
  INITIALIZATIONFAILED: "Initializing failed",
  EXECUTIONFAILED: "Execution failed",
  UNKNOWN: "Unknown",
  KILLED: "Killed"
};

export {
  carminURL,
  Status
};
