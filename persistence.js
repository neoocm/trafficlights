// Class peristence writes to disk state information of the traffic lights
const fs = require("fs");

function write(name, data) {
  let path = name + ".json";
  //write data to file whether it exists or not
  fs.writeFileSync(path, JSON.stringify(data));
}
function read(name) {
  let path = name + ".json";
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  }
  return null;
}
function append(name, data) {
  let savedData = read(name);
  if (savedData) {
    data = { ...savedData, ...data };
  }
  // call the static write function of this class
  write(name, data);
}
module.exports = {
  write: write,
  read: read,
  append: append,
};
