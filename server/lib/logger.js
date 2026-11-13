const isTest = process.env.NODE_ENV === "test";

const write = (level, msg, extra = {}) => {
  if (isTest && level !== "error") return;

  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    ...extra,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
};

module.exports = {
  info: (msg, extra) => write("info", msg, extra),
  warn: (msg, extra) => write("warn", msg, extra),
  error: (msg, extra) => write("error", msg, extra),
};
