const AWS = require("aws-sdk");
const mime = require('mime-types');
const fs = require("fs");
const path = require("path");

const config = {
  s3BucketName: process.env.bucket,
  folderPath: process.env.dist_path
};

console.log(`******** deploying to ${config.s3BucketName} from source ${config.folderPath} ***********`);

const s3 = new AWS.S3({
  signatureVersion: 'v4'
});


const distFolderPath = path.join(__dirname, config.folderPath);

// Normalize \\ paths to / paths.
function unixifyPath(filepath) {
  return process.platform === 'win32' ? filepath.replace(/\\/g, '/') : filepath;
};
let totaFiles = 0;
let uploadefiles = 0;
let erroredFiles = 0;
// Recurse into a directory, executing callback for each file.
function walk(rootdir, callback, subdir) {
  const isSubdir = subdir ? true : false;
  const abspath = subdir ? path.join(rootdir, subdir) : rootdir;

  fs.readdir(abspath, (err, files) => {
    if(err){
      console.log(err);
      return;
    }
    totaFiles = files.length;
    console.log('Total files - ', totaFiles);
    files.forEach((filename) => {
      const filepath = path.join(abspath, filename);
      if (fs.statSync(filepath).isDirectory()) {
        walk(rootdir, callback, unixifyPath(path.join(subdir || '', filename || '')))
      } else {
        fs.readFile(filepath, (error, fileContent) => {
          if (error) {
            throw error;
          }
  
          const mimeType = mime.lookup(filepath)
  
          let s3Obj;
          if (filename == 'index.html' || filename == 'version.json') {
            s3Obj = {
              Bucket: isSubdir ? `${config.s3BucketName}/${subdir}` : config.s3BucketName,
              Key: filename,
              ACL: 'public-read',
              CacheControl: 'max-age=0,no-cache,no-store,must-revalidate',
              Body: fileContent,
              ContentType: mimeType
            }
          } else {
            s3Obj = {
              Bucket: isSubdir ? `${config.s3BucketName}/${subdir}` : config.s3BucketName,
              Key: filename,
              ACL: 'public-read',
              CacheControl: 'max-age=604800',
              Body: fileContent,
              ContentType: mimeType
            }
          }
  
          // upload file to S3
          s3.putObject(s3Obj, (err, res) => {
            if (err) {
              console.log(`Error in uploading '${filepath}' with MIME type '${mimeType} '`, err);
              erroredFiles += 1;
            } else {
              console.log(`Successfully uploaded '${filepath}' with MIME type '${mimeType}'`);
              uploadefiles += 1;
            }
          });
        })
      }
    });
  });
}

setTimeout(() => {
  walk(distFolderPath, (filepath, rootdir, subdir, filename) => {
    console.log('Filepath', filepath);
  });
}, 2000);
