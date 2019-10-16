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
