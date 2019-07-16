let fs = require("fs");
let path = require("path");

let data = fs.readFileSync(path.join("www", "index.html"));
data = data.toString();
data = data.replace(/="\/static/g, "=\".\/static");
fs.writeFileSync(path.join("www", "index.html"), data);

let filesName = fs.readdirSync(path.join("www","static","css"));
for(let i = 0; i < filesName.length; i++) {
    if(/.css$/.test(filesName[i])){
        let data = fs.readFileSync(path.join("www","static", "css",filesName[i]));
        data = data.toString();
        data = data.replace(/url\(\/static/g, "url(..");
        fs.writeFileSync(path.join("www","static", "css",filesName[i]), data);
    }
}

let filesNameP = fs.readdirSync(path.join("www"));
for(let i = 0; i < filesNameP.length; i++) {
    if(/^precache/.test(filesNameP[i])){
        fs.unlinkSync(path.join("www", filesNameP[i]));
    }
}


console.error('done');