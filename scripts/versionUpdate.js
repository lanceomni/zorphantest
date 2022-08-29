const fs = require('fs');
const path = require("path");

const config = {
  filePath: '../src/assets/version.json'
};

const relativeFilePath = path.join(__dirname, config.filePath);

function unixifyPath(filepath) {
  return process.platform === 'win32' ? filepath.replace(/\\/g, '/') : filepath;
};

function read() {
  console.log('********* Reading file..... *******');
  fs.readFile(unixifyPath(relativeFilePath), 'utf8', (err, data) => {
    if (err) {
      console.log(err);
      process.exit();
    } else {
      try {
        console.log(data);
        let jsonData = JSON.parse(data);
        if (jsonData.version) {
          jsonData.version = new Date().getTime().toString();
        }
        update(JSON.stringify(jsonData));
      } catch (error) {
        console.log(error);
        process.exit();
      }
    }
  });
}

function update(dataString) {
  fs.writeFile(unixifyPath(relativeFilePath), dataString, (err, data) => {
    if (err) {
      console.log(err);
      process.exit();
    } else {
      console.log('******* Updated app version number ********');
      console.log(dataString);
    }
  })
}

read();
