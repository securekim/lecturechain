var myArr = [1,2,3,4];
var result = myArr.map(v => v + 1)

result = myArr.map(v => {
	if(v%2) return '홀';
	return '짝';
})

result = myArr.reduce((acc, cur, index, arr)=>{
    console.log("acc : "+acc, " cur : "+cur
    + " index : " + index + " arr : " + arr);
    return acc+cur+index
});

const express = require("express"),
  _ = require("lodash"),
  cors = require("cors"),
  bodyParser = require("body-parser"),
  morgan = require("morgan");
  const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(morgan("combined"));


var resultArr = myArr.reduce((acc,val)=>{
    if (val % 2 != 0)
      acc.push(val * 2);
    return acc;
  },[]);

var result1 = data.reduce(reducer, initialValue);

app
  .route("/blocks")
  .get((req, res) => {
    res.send("NONE");
  })

app.post("/peers", (req, res) => {
  res.send("ONLY U");
});

const PORT = process.env.HTTP_PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(`HTTP Server running on port ${PORT} ✅`)
);