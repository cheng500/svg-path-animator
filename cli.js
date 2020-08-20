#!/usr/bin/env node

const arg = require('arg')
const fs = require('fs')
const { parse, stringify } = require('svgson')
const path = require('svg-path-properties')

function parseArgumentsIntoOptions(rawArgs) {
  const args = arg({
    '--help': Boolean,
    '--delay': Number,
    '--destination': String,
    '--direction': String,
    '--duration': Number,
    '--file': String,
    '--iteration': String || Number,
    '--timing': String,
    '-h': '--help',
    '-w': '--delay',
    '-d': '--destination',
    '-p': '--direction',
    '-s': '--duration',
    '-f': '--file',
    '-i': '--iteration',
    '-t': '--timing'
  }, {
    argv: rawArgs.slice(2),
  })
  return {
    help: args['--help'] || false,
    delay: args['--delay'] || 0,
    destination:
      args['--destination']
      ? args['--destination']
      : args['--file']
        ? `${args['--file'].substr(0, args['--file'].lastIndexOf('.'))}-animated.svg`
        : false,
    direction: args['--direction'] || 'forwards',
    duration: args['--duration'] || 1500,
    file: args['--file'] || false,
    iteration: args['--iteration'] || 1,
    timing: args['--timing'] || 'linear'
  }
}

let options = parseArgumentsIntoOptions(process.argv)

if ( options.help ) {
  console.group('\nUsage: ')
  console.log('svgline [options]')
  console.groupEnd()
  console.group('\nOptions:')
  console.log(`${'-f, --file'.padEnd(55)}Path to original file`)
  console.log(`${'-w, --delay'.padEnd(55)}Delay before start of animation in ms`)
  console.log(`${'-d, --destination'.padEnd(55)}Path to save generated file`)
  console.log(`${'-p, --direction'.padEnd(55)}Animation direction`)
  console.log(`${'-s, --duration'.padEnd(55)}Duration of the animation in ms`)
  console.log(`${'-h, --help'.padEnd(55)}This screen`)
  console.log(`${'-i, --iteration'.padEnd(55)}Number of iteration for animation`)
  console.log(`${'-t, --timing'.padEnd(55)}Timing of the animation`)
  console.groupEnd()
  console.log('\nFor more information on the animation properties. Check it out here: https://www.w3schools.com/cssref/css3_pr_animation.asp\n')
  return
}

if ( ! options.file ) {
  console.error('--file option is required')
  console.info('Use --file "pathToFile.svg" or -f "pathToFile.svg"')
  return
}

const svg = fs.readFileSync(options.file)
parse(svg.toString()).then((json) => {
  const res = json
  const styleIndex = res.children.findIndex((el) => el.name == 'style')
  if ( styleIndex >= 0 ) {
    res.children[styleIndex] = {
      ...res.children[styleIndex],
      children: [{
        ...res.children[styleIndex].children[0],
        value: `${res.children[styleIndex].children[0].value}@keyframes animateLine{to{stroke-dashoffset: 0;}}`
      }]
    }
  } else {
    res.children = [{
      name: 'style',
      type: 'element',
      value: '',
      attributes: { type: 'text/css' },
      children: [{
        name: '',
        type: 'text',
        value: '@keyframes animateLine{stroke-dashoffset: 0;}',
        attributes: {},
        children: []
      }]
    }, ...res.children]
  }
  loop(res)
  fs.writeFile(options.destination, stringify(res), (err) => {
    if ( err ) throw err(err)
    console.log(`The new svg is saved under: ${options.destination}`);
  })
})

function loop(el) {
  let length = 0
  switch (el.name) {
    case 'style':
      el.children = [{
        ...el.children[0],
        value: `${el.children[0].value}@keyframes animateLine{to{stroke-dashoffset: 0;}}`
      }]
      break
    case 'circle':
      length = 2 * Math.PI * el.attributes.r
      el.attributes.style = `${el.attributes.style ? el.attributes.style + ';' : ''}stroke-dasharray:${length};stroke-dashoffset:${length};animation: animateLine ${options.duration}ms ${options.timing} ${options.delay}ms ${options.iteration} ${options.direction};`
      break
    case 'rect':
      length = Math.ceil(el.attributes.width * 2 + el.attributes.height * 2)
      el.attributes.style = `${el.attributes.style ? el.attributes.style + ';' : ''}stroke-dasharray:${length};stroke-dashoffset:${length};animation: animateLine ${options.duration}ms ${options.timing} ${options.delay}ms ${options.iteration} ${options.direction};`
      break
    case 'path':
      const pathProperties = new path.svgPathProperties(el.attributes.d)
      length = Math.ceil(pathProperties.getTotalLength())
      el.attributes.style = `${el.attributes.style ? el.attributes.style + ';' : ''}stroke-dasharray:${length};stroke-dashoffset:${length};animation: animateLine ${options.duration}ms ${options.timing} ${options.delay}ms ${options.iteration} ${options.direction};`
      break
    case 'polygon':
    case 'polyline':
      const helper = el.attributes.points.split(' ')
      let points = []
      if ( el.attributes.points.indexOf(',') >= 0 ) {
        for ( let i = 0; i < helper.length; i++ ) {
          points[i] = helper[i].split(',')
        }
      } else {
        for ( let i = 0; i < helper.length; i += 2 ) {
          let arr = []
          for ( let j = 0; j < 2; j++ ) {
            arr.push(helper[i + j])
          }
          points.push(arr)
        }
      }

      let res = ''
      for( let i = 0; i < points.length; i++ ){
        res += (i && "L" || "M") + points[i]
      }
      res = `${res}z`
      const polyProperties = new path.svgPathProperties(res)
      length = Math.ceil(polyProperties.getTotalLength())
      el.attributes.style = `${el.attributes.style ? el.attributes.style + ';' : ''}stroke-dasharray:${length};stroke-dashoffset:${length};animation: animateLine ${options.duration}ms ${options.timing} ${options.delay}ms ${options.iteration} ${options.direction};`
    break
    case 'line':
      const x1 = el.attributes.x1 || 0
      const x2 = el.attributes.x2 || 0
      const y1 = el.attributes.y1 || 0
      const y2 = el.attributes.y2 || 0
      length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      el.attributes.style = `${el.attributes.style ? el.attributes.style + ';' : ''}stroke-dasharray:${length};stroke-dashoffset:${length};animation: animateLine ${options.duration}ms ${options.timing} ${options.delay}ms ${options.iteration} ${options.direction};`
      break
    default:
      for ( let i = 0; i < el.children.length; i++ ) {
        loop(el.children[i])
      }
      break
  }
}
