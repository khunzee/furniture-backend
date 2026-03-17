import helmet from "helmet";

const secCheck = helmet({
  crossOriginResourcePolicy: false,
});

export default secCheck;
