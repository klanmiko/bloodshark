var points = [
  { x:1,
    y: 0.5},
    {x:2,
    y: 0.01},
    {x: 10, y: 5}
]

let max = {}
let min = {}
let XS = points.map(value => value.x)
let YS = points.map(value => value.y)
max.x = XS.reduce((a, b) => Math.max(a,b))
max.y = YS.reduce((a, b) => Math.max(a,b))
min.x = XS.reduce((a, b) => Math.min(a,b))
min.y = YS.reduce((a, b) => Math.min(a,b))

console.log(max)
console.log(min)