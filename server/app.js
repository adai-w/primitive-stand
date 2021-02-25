var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var fs = require("fs")
var app = express();
var port = 3000;
var imgPath = path.join(__dirname, '/public/save/')
app.use(express.static("public"));
function makeVideo(images, timestamp) {
  // console.log(images)
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  const ffprobePath = require('@ffprobe-installer/ffprobe').path;
  const ffmpeg = require('fluent-ffmpeg');
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
  // ffmpeg.setFfmpegPath(path.join(__dirname, '/ffmpeg/bin/ffmpeg.exe'));
  // ffmpeg.setFfprobePath(path.join(__dirname, '/ffmpeg/bin/ffprobe.exe'));
  var videoshow = require("videoshow");
  // console.log("gh")
  // var images = ["me.jpeg", "me.jpeg", "me.jpeg", "me.jpeg"];

  var videoOptions = {
    fps: 25,
    loop: 0.1, // seconds
    transition: false,
    transitionDuration: 0, // seconds
    videoBitrate: 1024,
    videoCodec: 'libx264',
    size: '640x?',
    audioBitrate: '128k',
    audioChannels: 2,
    format: 'mp4',
    pixelFormat: 'yuv420p'
  }
  // console.log("gh")
  videoshow(images, videoOptions)
    .save(imgPath+timestamp+".mp4")
    .on("start", function (command) {
      console.log("ffmpeg process started:", command);
    })
    .on("error", function (err, stdout, stderr) {
      console.error("Error:", err);
      console.error("ffmpeg stderr:", stderr);
    })
    .on("end", function (output) {
      console.error("Video created in:", output);
    });
}
app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({limit:'50mb',extended:true}));

//设置允许跨域访问该服务.
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  //Access-Control-Allow-Headers ,可根据浏览器的F12查看,把对应的粘贴在这里就行
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Content-Type', 'application/json;charset=utf-8');
  next();
});

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.use(bodyParser.urlencoded({
  extended: true
}));

app.post("/make-video", function(req, res){
  // console.log(req)
  let imageNames=[]
  let imageBase64=req.body.data
  let timestamp = req.body.timestamp
  let savedNum = 0;
  // console.log(imageBase64)
  for(let i = 0; i < imageBase64.length;  i++){
    var base64Data = imageBase64[i].replace(/^data:image\/\w+;base64,/, "");
    var dataBuffer = Buffer.from(base64Data, 'base64'); // 解码图片
    fs.writeFile(imgPath+i+".jpg", dataBuffer, function(err) {
        if(err){
          // res.send(err);
          console.log(err);
        }else{
          // res.send("保存成功！");
          savedNum += 1;
          console.log(i+'.jpg保存成功！');
          imageNames[i]=imgPath+i+'.jpg'
          if(savedNum >= imageBase64.length){
            makeVideo(imageNames, timestamp)
          }
        }
    });
  }
  
  res.json({"success":true})
})

app.post("/getsvg", function (req, res) {
  var Jimp = require('jimp');
  var Geo = require('geometrizejs');
  (async () => {
    var startTime = new Date()
    // load png/jpeg/gif,bmp/tiff image from url, file path or Buffer using jimp:
    var imageBuffer = Buffer.from(req.body.data.split(',')[1], 'base64');
    const image = await Jimp.read(imageBuffer)
    const bitmap = Geo.Bitmap.createFromByteArray(image.bitmap.width,
      image.bitmap.height, image.bitmap.data)
    const runner = new Geo.ImageRunner(bitmap)
    const options = {
      shapeTypes: [Geo.ShapeTypes.RECTANGLE],
      candidateShapesPerStep: 1,
      shapeMutationsPerStep: 58,
      alpha: 128
    }
    const iterations = 300
    const svgData = []
    for (var i = 0; i < iterations; i++) {
      //console.log(Geo.SvgExporter.exportShapes(runner.step(options)))
      svgData.push(Geo.SvgExporter.exportShapes(runner.step(options)))
    }
    const svg = Geo.SvgExporter.getSvgPrelude() +
      Geo.SvgExporter.getSvgNodeOpen(bitmap.width, bitmap.height) +
      svgData.join('\n') +
      Geo.SvgExporter.getSvgNodeClose()

    // in node.js:
    var result = {}

    result.data = svg
    var endTime = new Date()
    console.log((endTime - startTime) / 1000 + " seconds")
    res.json(result)
  })()
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

module.exports = app;
