var parser = new (require('node-expat').Parser)('UTF-8')
var camelize = require('camelize')

var fileName = process.argv[2]

var currentNode

var booleanProperties = require('./boolean-properties')

function parseBoolean(value) {
  return value === 'T' }

var allSpace = /^\s+$/

function childrenToProperties(object) {
  var type = typeof object
  if (type === 'object') {
    if (Array.isArray(object)) {
      object.forEach(function(element) {
        childrenToProperties(object) })  }
    else {
      if ('$children' in object) {
        var children = object['$children']
        delete object['$children']
        delete object['$name']
        children.forEach(function(child, index, children) {
          var name = child['$name']
          var anotherChildWithName = children.some(function(otherChild) {
            return otherChild['$name'] === name })
          if (!anotherChildWithName) {
            delete child['$name']
            var hasGrandchildren = ( '$children' in child )
            if (!hasGrandchildren) {
              object[name] = child['$text'] }
            else {
              object[name] = child } }
          else {
            childrenToProperties(children)
            object.children = children }}) }
      Object.keys(object)
        .forEach(function(key) {
          var value = object[key]
          if (typeof value === 'object' && '$text' in value ) {
            object[key] = value['$text'] }
          else {
            childrenToProperties(object[key]) } })} } }

function removeEmptyText(object) {
  var type = typeof object
  if (type === 'object') {
    if (Array.isArray(object)) {
      object.forEach(function(element) { removeEmptyText(element) }) }
    else {
      if ('$text' in object && allSpace.test(object['$text'])) {
       delete object['$text' ] }
      Object.keys(object)
        .forEach(function(key) {
          removeEmptyText(object[key]) }) } } }

function onNode(node) {
  process.nextTick(function() {
    removeEmptyText(node)
    childrenToProperties(node)
    node = camelize(node)
    console.log(JSON.stringify(node)) }) }

parser

  .on('startElement', function(name, attributes) {
    if (name === 'case-file' || currentNode) {
      currentNode = {
        $name: name,
        $attributes: attributes,
        $parent: currentNode }
      if (Object.keys(attributes).length < 1) {
        delete currentNode.$attributes }} })

  .on('text', function(text) {
    if (currentNode) {
      if (!currentNode.$text) {
        currentNode.$text = '' }
      currentNode.$text += text } })

  .on('endElement', function(name) {
    if (currentNode) {
      if (currentNode.$name === 'case-file') {
        if (currentNode.$parent) {
          throw new Error() }
        currentNode.archive = fileName
        onNode(currentNode) }
      parent = currentNode.$parent
      if (parent) {
        delete currentNode.$parent
        if (!parent.$children) {
          parent.$children = [] }
        parent.$children.push(currentNode)
        parent[currentNode.$name] = currentNode }
      currentNode = parent } })

require('fs').createReadStream(fileName)

  .on('data', function(data) {
    parser.parse(data.toString()) })

