//const carminURL = "http://newk.grid.creatis.insa-lyon.fr:4040/cors/rest";
//const carminApiKey = "jnvp6d45h5un3dhb8v73jivhhb";
const carminURL = "http://vip.creatis.insa-lyon.fr/rest";
const carminApiKey = "e5vt6d9bvqrmi7f932684an5a9";
//const carminURL = "http://newk.grid.creatis.insa-lyon.fr:4040/rest";
//const carminApiKey = "jnvp6d45h5un3dhb8v73jivhhb";

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
  carminApiKey,
  Status
};
