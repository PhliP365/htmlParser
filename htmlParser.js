// A stateless html parser written in JavaScript
// Based on http://ejohn.org/blog/pure-javascript-html-parser/

(function() {
  // Regular Expressions for parsing tags and attributes
  var startTag = /^<([\-A-Za-z0-9_]+)((?:\s+[\w-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
  var endTag = /^<\/([\-A-Za-z0-9_]+)[^>]*>/;
  var attr = /([\-A-Za-z0-9_]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;

  var DEBUG = false;
  // Special Elements (can contain anything)
  var special = /^(SCRIPT|STYLE)$/i;

  function htmlParser(stream) {
    stream = stream || '';
    var stack = [];
        
    var append = function(str) {
      stream += str;
    };
    
    // Order of detection matters: detection of one can only 
    // succeed if detection of previous didn't
    var detect = {
      comment: /^<!--/,
      endTag: /^<\//,
      atomicTag: /^<\s*(script|style)[\s>]/i,
      startTag: /^</,
      chars: /^[^<]/
    };
    
    // Detection has already happened when a reader is called.    
    var reader = {
      
      comment: function() {
        var index = stream.indexOf("-->");
        if ( index >= 0 ) {
          return {
            content: stream.substr(4, index),
            length: idx + 3
          };
        }               
      },
      
      endTag: function() {
        var match = stream.match( endTag );

        if ( match ) {
          return {
            tagName: match[1],
            length: match[0].length           
          };
        }
      },
      
      atomicTag: function() {
        var start = reader.startTag();
        if(start) {
          var rest = stream.slice(start.length);
          var match = rest.match("([\\s\\S]*?)<\/" + start.tagName + "[^>]*>");
          if(match) {
            // good to go
            return {
              tagName: start.tagName,
              attrs: start.attrs,
              escapedAttrs: start.escapedAttrs,
              content: match[1],
              length: match[0].length + start.length
            }
          }
        }
      },
      
      startTag: function() {
        var match = stream.match( startTag );

        if ( match ) {
          var attrs = {};
          var escapedAttrs = {};

          match[2].replace(attr, function(match, name) {
            var value = arguments[2] || arguments[3] || arguments[4] || null;

            attrs[name] = value;
            // escape double-quotes for writing html as a string
            escapedAttrs[name] = value.replace(/(^|[^\\])"/g, '$1\\\"');
          });

          return {
            tagName: match[1],
            attrs: attrs,
            escapedAttrs: escapedAttrs,
            unary: match[3],
            length: match[0].length           
          }
        }       
      },
      
      chars: function() {
        var index = stream.indexOf("<");
        return {
          length: index >= 0 ? index : stream.length
        };
      }
    };
    
    var readToken = function() {

      // Enumerate detects in order
      for (var type in detect) {
        
        if(detect[type].test(stream)) {
          DEBUG && console.log('suspected ' + type);
          
          var token = reader[type]();
          if(token) {
            DEBUG && console.log('parsed ' + type, token);
            // Type
            token.type = token.type || type;
            // Entire text
            token.text = stream.substr(0, token.length);
            // Update the stream
            stream = stream.slice(token.length);

            return token;            
          }
          return null;
        }
      }
    };
    
    var readTokens = function(handlers) {
      var tok;
      while(tok = readToken()) {
        // continue until we get an explicit "false" return
        if(handlers[tok.type] && handlers[tok.type](tok) === false) {
          return;
        }
      }
    };
    
    var pushState = function() {
      stack.push(stream)
      stream = '';
    };
    
    var popState = function() {
      stream += stack.pop() || '';
    };        
        
    return {
      append: append,
      readToken: readToken,
      readTokens: readTokens,
      pushState: pushState,
      popState: popState,
      stack: stack
    };
    
  };
  
  this.htmlParser = htmlParser;
})();